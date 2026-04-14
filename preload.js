const { ipcRenderer } = require('electron');

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
