const { app, BrowserWindow, BrowserView, screen, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store').default;

const BANNER_HEIGHT = 58;

const store = new Store({
  defaults: {
    windowBounds: { x: undefined, y: undefined, width: 1024, height: 768 },
    isMaximized: false,
  },
});

let mainWindow;
let view;

function updateViewBounds() {
  if (!mainWindow || !view) return;
  const [width, height] = mainWindow.getContentSize();
  view.setBounds({ x: 0, y: -BANNER_HEIGHT, width, height: height + BANNER_HEIGHT });
}

function createWindow() {
  const { windowBounds, isMaximized } = {
    windowBounds: store.get('windowBounds'),
    isMaximized: store.get('isMaximized'),
  };

  // Check if saved position is still on a visible display
  let positionValid = false;
  if (windowBounds.x !== undefined && windowBounds.y !== undefined) {
    const displays = screen.getAllDisplays();
    positionValid = displays.some((display) => {
      const b = display.bounds;
      return (
        windowBounds.x >= b.x - 50 &&
        windowBounds.x < b.x + b.width &&
        windowBounds.y >= b.y - 50 &&
        windowBounds.y < b.y + b.height
      );
    });
  }

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: positionValid ? windowBounds.x : undefined,
    y: positionValid ? windowBounds.y : undefined,
    autoHideMenuBar: true,
    title: 'Messenger',
  });

  // Hide the menu bar completely
  mainWindow.setMenuBarVisibility(false);

  // Create BrowserView offset upward to hide the banner
  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setBrowserView(view);

  if (isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', updateViewBounds);
  view.webContents.on('did-finish-load', updateViewBounds);

  updateViewBounds();

  view.webContents.loadURL('https://www.facebook.com/messages');

  // Open all new window links in default browser
  view.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Intercept navigation to non-facebook URLs and open in default browser
  view.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('facebook.com') && !parsed.hostname.endsWith('messenger.com')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Update view bounds on resize
  mainWindow.on('resize', updateViewBounds);

  // Save window state on move/resize
  const saveWindowState = () => {
    if (mainWindow.isMaximized() || mainWindow.isMinimized()) return;
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', () => {
    store.set('isMaximized', true);
    updateViewBounds();
  });
  mainWindow.on('unmaximize', () => {
    store.set('isMaximized', false);
    updateViewBounds();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    view = null;
  });
}

ipcMain.on('show-context-menu', (event, params) => {
  const menuItems = [];

  if (params.linkURL) {
    menuItems.push({
      label: 'Link megnyitasa bongeszoben',
      click: () => shell.openExternal(params.linkURL),
    });
    menuItems.push({
      label: 'Link masolasa',
      click: () => require('electron').clipboard.writeText(params.linkURL),
    });
    menuItems.push({ type: 'separator' });
  }

  if (params.isImage) {
    menuItems.push({
      label: 'Kep megnyitasa bongeszoben',
      click: () => shell.openExternal(params.srcURL),
    });
    menuItems.push({
      label: 'Kep URL masolasa',
      click: () => require('electron').clipboard.writeText(params.srcURL),
    });
    menuItems.push({ type: 'separator' });
  }

  if (params.selectionText) {
    menuItems.push({
      label: 'Masolas',
      role: 'copy',
    });
    menuItems.push({ type: 'separator' });
  }

  if (params.isEditable) {
    menuItems.push({ label: 'Visszavonas', role: 'undo' });
    menuItems.push({ label: 'Ujra', role: 'redo' });
    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Kivagás', role: 'cut' });
    menuItems.push({ label: 'Masolas', role: 'copy' });
    menuItems.push({ label: 'Beillesztes', role: 'paste' });
    menuItems.push({ label: 'Osszes kijelolese', role: 'selectAll' });
  }

  if (menuItems.length > 0) {
    // Remove trailing separator if present
    if (menuItems[menuItems.length - 1].type === 'separator') {
      menuItems.pop();
    }
    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
