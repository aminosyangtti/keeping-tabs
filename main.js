const { app, BrowserWindow, ipcMain, screen, dialog} = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { supabase } = require('./supabase.js');
const ClipboardManager = require('./clipboardManager.js');
const AuthManager = require('./authManager.js');
const log = require('electron-log');



let win;
let screenWidth;
let screenHeight;


app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu');
log.transports.file.level = 'info';
autoUpdater.logger = log;
log.info('App starting...');



function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  screenWidth = width
  screenHeight = height
  console.log(screenWidth * 0.15)
  console.log(screenHeight)
  win = new BrowserWindow({
    width: screenWidth * 0.15,
    height: screenHeight,
    x: screenWidth - (screenWidth * 0.15),
    y: 0,
    frame: false,
    resizable: false,
    alwaysOnTop: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      enableRemoteModule: true
    },
  });

  win.loadFile('index.html');
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({mode:'undocked'});
    }
}

let userId;
let store;
const clipboardManager = new ClipboardManager();
const authManager = new AuthManager();
  
  
  
  
//AUTOUPDATE
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.on('update-available', (info) => {
  log.info('Update available.');
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'A new update is available. Downloading now...',
  });
});
  
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded.');
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'A new update is ready. It will be installed on restart. Restart now?',
    buttons: ['Yes', 'Later']
  }).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});
  
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
});

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
    dialog.showErrorBox('Update Error: ' + err);
  });



  ipcMain.handle('check-update', () => {
    
    autoUpdater.checkForUpdates()
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available.');
      return 'Your app is up-to-date!'
  });
    autoUpdater.on('update-available', (info) => {
      log.info('Update available.');
      return `An update is available! Version: ${info.version}`
     
    });
    autoUpdater.on('error', (err) => {
      return 'Error checking for updates'
    });
  })

  ipcMain.handle('get-app-version', () => app.getVersion());




//AUTH 


  
ipcMain.handle('register-user', async (event, { email, password }) => {
  try {
    const data = await authManager.register(email, password);
    return data
  } catch (error) {
    console.error(error.message)
  }
});

  
ipcMain.handle('login-user', async (event, { email, password }) => {
  
  try {
    const data = await authManager.login(email, password);
    return data
  } catch (error) {
    console.error(error.message)
  }
});


ipcMain.handle('sign-out', async () => {
  await authManager.signOut(win);

});


ipcMain.handle('reset-password', async (event, { email }) => {
  try {
    const data = await authManager.resetPassword(email);
    return data
  } catch (error) {
    console.error(error.message)
  }
});





// CLIPBOARD

  
ipcMain.handle('fetch-clipboard-data', async () => {
  const substring = ''
  try {
    const data = await clipboardManager.fetch(userId, substring)
  return data
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);

  }
  
});

ipcMain.on('delete-item', async (event, itemId) => {
  await clipboardManager.deleteItem(userId, win, itemId);
});

ipcMain.on('delete-broken-item', async (event, itemId) => {
  await clipboardManager.deleteBrokenItem(userId, win, itemId);
});

ipcMain.on('get-user-id', async (event, user) => {
  userId = user
});

ipcMain.on('delete-old-items', async (event) => {
  await clipboardManager.deleteOldItems(userId, win);

});




// APP

  
ipcMain.on('minimize-window', () => {
  win.minimize();
});

ipcMain.on('close-window', () => {
  win.close();
});

ipcMain.on('resize-window', (event) => {
  
const { width: currentWidth, height: currentHeight } = win.getBounds();
  
  console.log(currentWidth)
  console.log(currentHeight)
  win.setResizable(true);
  if (currentWidth == screenWidth * 0.15 && currentHeight == screenHeight) {
    win.setSize(50, screenHeight);
    win.setPosition(screenWidth - 50, 0);
  } else {
    win.setSize(screenWidth * 0.15, screenHeight)
    win.setPosition(screenWidth - (screenWidth * 0.15), 0);
  }
  win.setResizable(false);

});


app.on('ready', async () => {
  createWindow();
  const ElectronStore = (await import('electron-store')).default;
  store = new ElectronStore();
  authManager.onAuthStateChange(store, win);

  authManager.autoLogin(store, win);
  
  setInterval(() => {
    if (userId) {
      clipboardManager.checkClipboardChange(userId, win);
    }  

  }, 1000);


});



app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});





  

