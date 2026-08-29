/**
 * In-memory and session storage cache for uploaded file data (DataURLs/Blobs).
 * Prevents loss of image data between questionnaire steps even if localStorage
 * is size-constrained.
 */

const memoryCache = new Map<string, string>();

export const storeFileDataUrl = (fileId: string, dataUrl: string, fileName?: string): void => {
  if (!fileId || !dataUrl) return;
  memoryCache.set(fileId, dataUrl);
  if (fileName) {
    memoryCache.set(`name:${fileName}`, dataUrl);
  }

  try {
    // Also backup in sessionStorage if space permits
    sessionStorage.setItem(`file_data_${fileId}`, dataUrl);
  } catch {
    // Ignore sessionStorage quota errors
  }
};

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
