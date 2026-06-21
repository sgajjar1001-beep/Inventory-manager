/**
 * Converts a date string into the display format DD/MM/YYYY.
 * Handle raw ISO, YYYY-MM-DD, and preserve custom free text (like "10/2028" or "2 Years").
 */
export function formatDateStr(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';

  const s = dateStr.trim();

  // If it's pure YYYY-MM-DD
  const matchYmd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYmd) {
    return `${matchYmd[3]}/${matchYmd[2]}/${matchYmd[1]}`;
  }

  // If it is ISO timestamp (like 2026-06-19T21:24:50Z)
  const matchIso = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (matchIso) {
    const parts = s.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Otherwise, if it's already in DD/MM/YYYY, or arbitrary text, return it directly.
  return s;
}

/**
 * Parses variable Expiry Date text strings to see if the item is expired.
 */
export function isExpired(expDateStr: string | undefined | null): boolean {
  if (!expDateStr) return false;
  
  const s = expDateStr.trim().toLowerCase();
  
  if (s === 'n/a' || s === 'none' || s === 'nil') return false;

  // Try direct date parsing
  const d = new Date(expDateStr);
  if (!isNaN(d.getTime())) {
    return d < new Date();
  }

  // Check DD/MM/YYYY format
  const ddmmyyyy = expDateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const parsedDate = new Date(year, month, day);
    return parsedDate < new Date();
  }

  // Check MM/YYYY format
  const mmyyyy = expDateStr.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    // Assume end of that month represents expiry
    const parsedDate = new Date(year, month, 0);
    return parsedDate < new Date();
  }

  return false;
}
