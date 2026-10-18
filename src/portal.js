// Open the real Trixa page without navigating the Fanaar page.
// Browsers may choose a tab instead; a blocked popup leaves native links/forms intact.
export function openPortalPopup(url) {
  if (window.matchMedia('(max-width: 720px)').matches) return false;

  const width = Math.max(320, Math.min(680, window.screen.availWidth - 32));
  const height = Math.max(480, Math.min(820, window.screen.availHeight - 64));
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

  let popup;
  try {
    popup = window.open(url, '_blank', `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) return false;
    // Disconnect the external page synchronously, before its scripts can load.
    popup.opener = null;
    popup.focus();
    return true;
  } catch {
    // The normal link or form remains the fallback if the browser rejects a popup.
    try { popup?.close(); } catch { /* no access to the window */ }
    return false;
  }
}
