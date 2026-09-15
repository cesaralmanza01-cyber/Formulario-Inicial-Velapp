/**
 * Utility for managing in-progress questionnaire drafts in localStorage and sessionStorage.
 * Allows safely clearing temporary in-browser draft progress for a new patient without
 * affecting previously completed and submitted clinical records or admin data.
 */

import { clearFileMemoryStore } from './fileMemoryStore';

export const DRAFT_STORAGE_KEYS = [
  'vela_step1_data',
  'vela_step2_data',
  'vela_step3_data',
  'vela_step4_data',
  'vela_step5_data',
  'vela_step6_data',
  'vela_step7_data',
  'vela_step9_data',
  'vela_step10_inbody_data',
  'vela_current_step',
  'vela_patient_has_saved',
  'vela_consent_accepted',
  'vela_consent_data',
  'vela_consent_scope',
  'vela_patient_anon_id',
] as const;

/**
 * Checks if there is any active unsubmitted draft in the current browser.
 */
export function hasActiveDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hasConsent = localStorage.getItem('vela_consent_accepted') === 'true';
    const step = parseInt(localStorage.getItem('vela_current_step') || '0', 10);
    const hasAnyStepData = DRAFT_STORAGE_KEYS.some((key) => {
      if (key === 'vela_patient_anon_id' || key === 'vela_current_step') return false;
      return Boolean(localStorage.getItem(key));
    });
    return hasConsent || step > 0 || hasAnyStepData;
  } catch {
    return false;
  }
}

/**
 * Clears all temporary draft data from localStorage, sessionStorage, and memory.
 * Preserves completed/submitted questionnaires (vela_submitted_questionnaires)
 * and Google Drive / Firebase admin settings intact.
 */
export function clearDraftStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Remove all draft keys from localStorage
    DRAFT_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore quota/permission errors
      }
    });

    // 2. Clear any lingering files from memory and sessionStorage
    clearFileMemoryStore();
  } catch (err) {
    console.error('[DraftStorage] Error clearing draft storage:', err);
  }
}

/**
 * Checks if the current URL contains the '?nuevo=1' (or '?nuevo=true') parameter.
 * If present, immediately clears any saved draft so the questionnaire starts completely blank,
 * and cleans the URL parameter without a page reload so subsequent patient interactions
 * will persist their new draft safely.
 *
 * @returns boolean True if a reset was triggered via the URL parameter
 */
export function checkAndHandleNuevoParam(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const hasNuevoInSearch =
      searchParams.get('nuevo') === '1' ||
      searchParams.get('nuevo') === 'true' ||
      searchParams.has('nuevo');

    // Also check if someone appended it inside or after the hash (e.g. #/?nuevo=1)
    const hasNuevoInHash =
      window.location.hash.includes('nuevo=1') ||
      window.location.hash.includes('nuevo=true');

    if (hasNuevoInSearch || hasNuevoInHash) {
      console.log('[DraftStorage] Parameter ?nuevo detected: Starting completely fresh questionnaire.');
      clearDraftStorage();

      // Clean the parameter from the URL using replaceState so it doesn't re-clear on manual F5/refresh
      if (hasNuevoInSearch) {
        searchParams.delete('nuevo');
        const newSearch = searchParams.toString();
        const cleanUrl =
          window.location.pathname +
          (newSearch ? `?${newSearch}` : '') +
          window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (hasNuevoInHash) {
        const cleanHash = window.location.hash
          .replace(/[?&]nuevo(=[^&]*)?/g, '')
          .replace(/^#\?$/, '');
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search + cleanHash
        );
      }

      return true;
    }
  } catch (err) {
    console.error('[DraftStorage] Error processing ?nuevo parameter:', err);
  }
  return false;
}

/**
 * Generates the shareable URL with '?nuevo=1' so any patient who opens it
 * is guaranteed to start with a fresh, blank questionnaire.
 */
export function getCleanNewPatientUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?nuevo=1`;
  } catch {
    return '?nuevo=1';
  }
}
