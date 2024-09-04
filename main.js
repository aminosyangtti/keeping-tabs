const { app, BrowserWindow, ipcMain, screen, dialog} = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const ClipboardManager = require('./clipboardManager.js');
const AuthManager = require('./authManager.js');
const log = require('electron-log');
const os = require('os');
const AutoLaunch = require('auto-launch');

const electronVersion = process.versions.electron;
const chromiumVersion = process.versions.chrome;
const nodeVersion = process.versions.node;
const v8Version = process.versions.v8;
const osType = os.type();
const osArch = os.arch();
const osRelease = os.release();
const appVersion = app.getVersion()




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
    message: `Version: ${info.version} is now available.`,
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

      win.webContents.send('update-status', 'Your app is up-to-date!');
  });
    autoUpdater.on('update-available', (info) => {
      log.info('Update available.');
       
      win.webContents.send('update-status', `An update is available!`);

     
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded.');
      win.webContents.send('update-status', `An update is available!`);

      dialog.showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `Version: ${info.version} is now avaialable! It will be installed on restart. Restart now?`,
        buttons: ['Yes', 'Later']
      }).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
      });
    });

    autoUpdater.on('error', (err) => {
       
      win.webContents.send('update-status', 'Error checking for updates');

    });
  })

  ipcMain.handle('get-app-info', () => getAppInfo());
    
function getAppInfo() {

  const appInfo = `
Version: ${appVersion}
Electron: ${electronVersion}
ElectronBuildId: 9870757
Chromium: ${chromiumVersion}
Node.js: ${nodeVersion}
V8: ${v8Version}
OS: ${osType} ${osArch} ${osRelease}
`
return appInfo
  
}

console.log(getAppInfo())

//AUTH 


  
ipcMain.handle('register-user', async (event, { email, password }) => {
  try {
    const data = await authManager.register(email, password);
    return data
  } catch (error) {
    console.error(error.message)
    throw error;
  }
});

  
ipcMain.handle('login-user', async (event, { email, password }) => {
  
  try {
    const data = await authManager.login(email, password);
    return data
  } catch (error) {
    console.error(error.message)
    throw error;
  }
});


ipcMain.handle('sign-out', async () => {
  try {
    await authManager.signOut(win);
  } catch (error) {
    throw error;
  }

});


ipcMain.handle('reset-password', async (event, { email }) => {
  try {
    const data = await authManager.resetPassword(email);
    return data
  } catch (error) {
    console.error(error.message)
    throw error;
  }
});





// CLIPBOARD

  
ipcMain.handle('fetch-clipboard-data', async (event, text) => {
  
  let substring = text ? text : ''

  console.log(text)
  try {
     const data = await clipboardManager.fetch(userId, substring, win)
     
     
  return data

  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);
    throw error;

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



let appPath = app.getPath('exe'); 

if (process.platform === 'darwin') {
    appPath = path.join(app.getAppPath(), '..', '..', '..', '..');
} else if (process.platform === 'linux') {
    appPath = '/usr/bin/env';
} else if (process.platform === 'win32') {
    appPath = app.getPath('exe');
}
console.log(appPath)
const appAutoLauncher = new AutoLaunch({
    name: 'Keeping Tabs',
    path: appPath
  });

// Enable auto-launch
appAutoLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) appAutoLauncher.enable();
}).catch((err) => {
    console.error('Failed to enable auto-launch:', err);
});





const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      // Focus the existing window if it's open
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

  
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





  

