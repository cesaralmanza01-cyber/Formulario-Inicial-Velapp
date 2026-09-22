/**
 * Robust in-memory, IndexedDB, and session storage cache for uploaded file data (DataURLs/Blobs).
 * Solves file loss issues across questionnaire steps and page refreshes by leveraging IndexedDB,
 * which provides hundreds of megabytes of reliable client-side storage, well beyond localStorage limits.
 */

import { UploadedLabFile } from '../types';

const DB_NAME = 'VelaFilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploaded_files';

const memoryCache = new Map<string, string>();

interface StoredFileRecord {
  id: string;
  dataUrl: string;
  fileName?: string;
  updatedAt: number;
}

/**
 * Open IndexedDB safely with fallback
 */
const openFilesDb = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('fileName', 'fileName', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to memory/sessionStorage', request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('Error opening IndexedDB', e);
      resolve(null);
    }
  });
};

/**
 * Pre-warm the memory cache from IndexedDB so synchronous lookups succeed
 */
if (typeof window !== 'undefined' && window.indexedDB) {
  openFilesDb()
    .then((db) => {
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result as StoredFileRecord[];
        if (records && Array.isArray(records)) {
          records.forEach((r) => {
            if (r.id && r.dataUrl) {
              memoryCache.set(r.id, r.dataUrl);
              if (r.fileName) {
                memoryCache.set(`name:${r.fileName}`, r.dataUrl);
              }
            }
          });
        }
      };
    })
    .catch((e) => {
      console.warn('Could not pre-warm memory cache from IndexedDB', e);
    });
}

/**
 * Clears memory cache, sessionStorage, and IndexedDB
 */
export const clearFileMemoryStore = (): void => {
  memoryCache.clear();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('file_data_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {
    // Ignore
  }

  // Clear IndexedDB
  openFilesDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch (e) {
      console.warn('Failed to clear IndexedDB store', e);
    }
  });
};

/**
 * Stores file data URL in memory, IndexedDB (durable), and sessionStorage (fast)
 */
export const storeFileDataUrl = (fileId: string, dataUrl: string, fileName?: string): void => {
  if (!fileId || !dataUrl) return;

  // 1. In-memory cache for instant synchronous access
  memoryCache.set(fileId, dataUrl);
  if (fileName) {
    memoryCache.set(`name:${fileName}`, dataUrl);
  }

  // 2. Durable IndexedDB storage
  openFilesDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record: StoredFileRecord = {
        id: fileId,
        dataUrl,
        fileName,
        updatedAt: Date.now(),
      };
      tx.objectStore(STORE_NAME).put(record);
    } catch (e) {
      console.warn('Failed to store file in IndexedDB', e);
    }
  });

  // 3. Best-effort sessionStorage backup (for small files)
  try {
    sessionStorage.setItem(`file_data_${fileId}`, dataUrl);
  } catch {
    // Ignore sessionStorage quota errors
  }
};

/**
 * Synchronously retrieves file data URL from memory or sessionStorage
 */
export const getFileDataUrl = (fileId?: string, fileName?: string): string | undefined => {
  if (fileId && memoryCache.has(fileId)) {
    return memoryCache.get(fileId);
  }
  if (fileName && memoryCache.has(`name:${fileName}`)) {
    return memoryCache.get(`name:${fileName}`);
  }

  if (fileId) {
    try {
      const stored = sessionStorage.getItem(`file_data_${fileId}`);
      if (stored) {
        memoryCache.set(fileId, stored);
        return stored;
      }
    } catch {
      // Ignore
    }
  }

  return undefined;
};

/**
 * Asynchronously retrieves file data URL with IndexedDB fallback
 */
export const getFileDataUrlAsync = async (
  fileId?: string,
  fileName?: string
): Promise<string | undefined> => {
  const syncVal = getFileDataUrl(fileId, fileName);
  if (syncVal) return syncVal;

  if (!fileId && !fileName) return undefined;

  const db = await openFilesDb();
  if (!db) return undefined;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      if (fileId) {
        const req = store.get(fileId);
        req.onsuccess = () => {
          const rec = req.result as StoredFileRecord | undefined;
          if (rec && rec.dataUrl) {
            memoryCache.set(fileId, rec.dataUrl);
            if (rec.fileName) memoryCache.set(`name:${rec.fileName}`, rec.dataUrl);
            resolve(rec.dataUrl);
            return;
          }
          checkFileNameFallback();
        };
        req.onerror = () => checkFileNameFallback();
      } else {
        checkFileNameFallback();
      }

      function checkFileNameFallback() {
        if (!fileName) {
          resolve(undefined);
          return;
        }
        try {
          const index = store.index('fileName');
          const nameReq = index.get(fileName);
          nameReq.onsuccess = () => {
            const rec = nameReq.result as StoredFileRecord | undefined;
            if (rec && rec.dataUrl) {
              if (fileId) memoryCache.set(fileId, rec.dataUrl);
              memoryCache.set(`name:${fileName}`, rec.dataUrl);
              resolve(rec.dataUrl);
            } else {
              resolve(undefined);
            }
          };
          nameReq.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }
    } catch (e) {
      console.warn('Error reading file from IndexedDB', e);
      resolve(undefined);
    }
  });
};

/**
 * Restores missing dataUrls on an array of UploadedLabFiles from memory or IndexedDB
 */
export const rehydrateUploadedFiles = async (
  files: UploadedLabFile[]
): Promise<UploadedLabFile[]> => {
  if (!files || files.length === 0) return [];

  const restored = await Promise.all(
    files.map(async (file) => {
      if (file.dataUrl && file.dataUrl.length > 50) {
        // Already has dataUrl, make sure it is in cache
        storeFileDataUrl(file.id, file.dataUrl, file.name);
        return file;
      }
      const dataUrl = await getFileDataUrlAsync(file.id, file.name);
      return {
        ...file,
        dataUrl: dataUrl || file.dataUrl,
      };
    })
  );

  return restored;
};

/**
 * Compresses an image file (JPG/PNG) to max dimension to ensure fast PDF embedding
 * and compact storage without visual quality loss.
 */
export const compressImageFileToDataUrl = (
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image, read standard DataURL
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
