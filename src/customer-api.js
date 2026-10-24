import { SERVICE_API_URL } from './config';

export async function serviceRequest(path, options = {}) {
  if (!SERVICE_API_URL) throw new Error('Online requests are temporarily unavailable. Please call or WhatsApp our team.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${SERVICE_API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      credentials: 'omit',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 404) throw new Error('We couldn’t find that reference. Please check it or contact our team.');
      if (response.status === 429) throw new Error('There have been too many requests. Please wait a moment and try again.');
      throw new Error(data?.error?.message || 'We couldn’t complete your request. Please try again or contact our team.');
    }
    if (!data) throw new Error('We couldn’t confirm the response. Please contact our team before trying again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('We couldn’t confirm your request in time. Try again here, or call our team.');
    if (error instanceof TypeError) throw new Error('We couldn’t connect. Check your connection and try again, or call our team.');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose JPG, PNG or WebP photos.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Please choose a photo smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob;
    for (const quality of [0.82, 0.65, 0.45]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1048576) break;
    }
    if (!blob || blob.size > 1048576) throw new Error('That photo is too large after resizing. Please choose a smaller photo.');
    const preview = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
    return { name: `${file.name.replace(/\.[^.]+$/, '').slice(0, 80)}.jpg`, type: 'image/jpeg', dataBase64: preview.split(',')[1], preview };
  } finally { bitmap.close(); }
}
