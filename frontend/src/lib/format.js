// Utility helpers
import { formatDistanceToNow, format } from 'date-fns';

export const TYPE_LABEL = {
  lost_pet: 'Lost Pet',
  found_pet: 'Found Pet',
  missing_person: 'Missing Person',
  found_person: 'Found Person',
};

export const STATUS_LABEL = {
  reported: 'Reported',
  verified: 'Verified',
  searching: 'Searching',
  possible_match: 'Possible Match',
  match_confirmed: 'Match Confirmed',
  recovered: 'Recovered',
  closed: 'Closed',
  under_investigation: 'Under Investigation',
  located: 'Located',
  spam: 'Spam',
};

export function timeAgo(iso) {
  if (!iso) return '';
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ''; }
}

export function niceDate(iso) {
  if (!iso) return '';
  try { return format(new Date(iso), 'MMM d, yyyy'); } catch { return ''; }
}

export function isLost(type) { return type === 'lost_pet' || type === 'missing_person'; }
export function isPerson(type) { return type === 'missing_person' || type === 'found_person'; }

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function compressImage(file, maxSize = 1200, quality = 0.8) {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
