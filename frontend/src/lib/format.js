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

// India defaults (map centering, timezone)
export const INDIA_CENTER = [22.9734, 78.6569];
export const INDIA_ZOOM = 5;
export const IST_TZ = 'Asia/Kolkata';

export const INDIAN_CITIES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

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

export async function compressImageToBlob(file, maxSize = 1400, quality = 0.82) {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const withName = new File([blob], (file.name || 'photo.jpg').replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        resolve(withName);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = dataUrl;
  });
}

// Legacy alias kept for any component still using old name
export const compressImage = async (f) => {
  const blob = await compressImageToBlob(f);
  return fileToDataUrl(blob);
};
