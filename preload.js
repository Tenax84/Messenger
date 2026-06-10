const { ipcRenderer } = require('electron');

window.__closeVideoOverlay = () => ipcRenderer.send('close-video-overlay');

// Messenger media links are handled by FB's in-page viewer whose close button
// falls into the cropped banner area — open them in the app dialog instead.
document.addEventListener(
  'click',
  (e) => {
    const a = e.target.closest('a');
    if (!a || !a.href) return;
    try {
      const u = new URL(a.href);
      if (u.hostname.endsWith('facebook.com') && u.pathname.startsWith('/messenger_media')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        ipcRenderer.send('open-media-dialog', a.href);
      }
    } catch {}
  },
  true
);

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ipcRenderer.send('show-context-menu', {
    x: e.x,
    y: e.y,
    linkURL: e.target.closest('a')?.href || '',
    srcURL: e.target.src || '',
    selectionText: window.getSelection().toString(),
    isEditable: e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA',
    isImage: e.target.tagName === 'IMG',
  });
});
