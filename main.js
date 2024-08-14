const { app, BrowserWindow, ipcMain, clipboard, screen, dialog} = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { supabase } = require('./supabase.js');
const ClipboardManager = require('./clipboardManager.js');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const { decode } = require('base64-arraybuffer');
const crypto = require('crypto');
const ogs = require('open-graph-scraper');
const log = require('electron-log');

const clipboardManager = new ClipboardManager();

let store;
let win;
let userId;

// let lastImageHash = '';

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


  
ipcMain.handle('register-user', async (event, { email, password }) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
});
  
ipcMain.handle('login-user', async (event, { email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
});

ipcMain.handle('sign-out', async () => {
  const result = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Yes', 'No'],
    title: 'Log out',
    message: 'Do you want to log out?',
  })
    if (result.response === 0) { 
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('User signed out successfully');
        userId = ''
        win.reload();
    } catch (error) {
        console.error('Error signing out:', error.message);
    }
  }
});

ipcMain.handle('reset-password', async (event, { email }) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error('Error sending password reset email:', error.message);
    }
});

  
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

  
ipcMain.handle('fetch-clipboard-data', async () => {
  const substring = ''
  try {
    const data = await clipboardManager.fetch(userId, substring)
  return data
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);

  }
  
});

ipcMain.handle('upload-clipboard-data', async() => {
  // handleClipboardImage()
  await clipboardManager.checkClipboardChange(userId);
})


ipcMain.on('delete-item', async (event, itemId) => {
  await clipboardManager.deleteItem(userId, win, itemId);
});

  
ipcMain.on('delete-broken-item', async (event, itemId) => {
  await clipboardManager.deleteBrokenItem(userId, win, itemId);
});


ipcMain.on('delete-old-items', async (event) => {
  await clipboardManager.deleteOldItems(userId, win);

});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    store.set('authToken', session.access_token);
    store.set('refreshToken', session.refresh_token);
    if (win) {
      win.webContents.send('auth-state-changed', {
        accessToken: session.access_token,
        userId: session.user.id 
      });
      userId = session.user.id
    }
  } else if (event === 'SIGNED_OUT') {
    store.delete('authToken');
    store.delete('refreshToken');
  }
});








app.on('ready', async () => {
  createWindow();
  const ElectronStore = (await import('electron-store')).default;
  store = new ElectronStore();
  await autoLogin();
  setInterval(() => {
    clipboardManager.checkClipboardChange(userId, win);
  }, 1000);


});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});





async function autoLogin() {
    const authToken = store.get('authToken');
    const refreshToken = store.get('refreshToken');
  
    if (authToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({ access_token: authToken, refresh_token: refreshToken });
        // console.log(data.user.id)
  
        if (error) throw error;

        win.webContents.send('auto-login-success', {
          accessToken: authToken,
          userId: data.user.id 
        });
        console.log('User logged in automatically');
        userId = data.user.id
        console.log(userId)

      } catch (error) {
        console.error('Automatic login failed:', error.message);
        store.delete('authToken');
        store.delete('refreshToken');
      }
    } else {
      console.log('No stored tokens found');
    }
}
  

  
  
//  Excluded Features:

  
// async function handleClipboardImage() {
//       const currentClipboardImage = clipboard.readImage();
    
//       // console.log(currentClipboardImage)
      
//         if (!currentClipboardImage.isEmpty()) {
//           const imageBuffer = currentClipboardImage.toPNG();
//           const imageId = uuidv4();
//           const imagePath = path.join(__dirname, `images/${imageId}.png`);
//           const folderPath = path.join(__dirname, 'images');
//           await promisify(fs.writeFile)(imagePath, imageBuffer);
//           console.log('Image saved:', imagePath);
      
//           const base64ImageData = imageBuffer.toString('base64');
//           const currentImageHash = crypto.createHash('sha256').update(base64ImageData).digest('hex');
      
//           if (currentImageHash !== lastImageHash) {
//             lastImageHash = currentImageHash;
      
//             try {
//               const arrayBuffer = decode(base64ImageData);
//               const { data, error } = await supabase
//                 .storage
//                 .from('images')
//                 .upload(`${imageId}.png`, arrayBuffer, {
//                   contentType: 'image/png',
//                   user_id: userId
//                 });
      
//               if (error) throw error;
      
//               await supabase.from('clipboard').insert({
//                 image_url: `${SUPABASE_URL}/storage/v1/object/public/images/${imageId}.png`,
//               });
//               console.log('Image URL added to database:', `${SUPABASE_URL}/storage/v1/object/public/images/${imageId}.png`);
      
            
//               deleteFolderContent(folderPath);
//             } catch (error) {
//               console.error('Error handling clipboard image:', error.message);
//             }
//           } else {
//             console.log('No change detected in clipboard image.');
//             const filePath = path.join(__dirname, `images/${imageId}.png`);
//             // fs.unlink(filePath, err => {
//             //   if (err) {
//             //     console.error(`Error deleting file ${filePath}:`, err.message);
//             //   } else {
//             //     console.log(`Successfully deleted file ${filePath}`);
//             //   }})
//           }
//         }
// }
    
 
// function deleteFolderContent(folderPath) {
//       fs.readdir(folderPath, (err, files) => {
//         if (err) {
//           console.error(`Error reading folder ${folderPath}:`, err.message);
//           return;
//         }
    
//         files.forEach(file => {
//           const filePath = path.join(folderPath, file);
//           fs.unlink(filePath, err => {
  
//             if (err) {
//               console.error(`Error deleting file ${filePath}:`, err.message);
//             } else {
//               console.log(`Successfully deleted file ${filePath}`);
//             }
//           });
//         });
//       });
// }
  
  
