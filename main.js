const { app, BrowserWindow, ipcMain, clipboard, screen, dialog, autoUpdater } = require('electron');
const path = require('path');
// const { supabase } = require('./supabase');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const { decode } = require('base64-arraybuffer');
const pipeline = promisify(require('stream').pipeline);
const crypto = require('crypto');
const CryptoJS = require('crypto-js')
const ogs = require('open-graph-scraper');
const log = require('electron-log');
const isDevelopment = process.env.NODE_ENV === 'development';

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let store;
let win;

let userId;
let lastClipboardContent = '';
let lastImageHash = '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let screenWidth;
let screenHeight;

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
    resizable: true,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
  });

  win.loadFile('index.html');
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({mode:'undocked'});
    }
    if (!isDevelopment) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  
    autoUpdater.on('update-available', () => {
      log.info('Update available');
      dialog.showMessageBox({
        type: 'info',
        title: 'Update available',
        message: 'A new update is available.',
      });
    });
  
    autoUpdater.on('update-not-available', () => {
      log.info('Update not available');
    });
  
    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err.message);
      dialog.showMessageBox({
        type: 'error',
        title: 'Update error',
        message: 'Error in auto-updater: ' + err,
      });
    });
  
    autoUpdater.on('update-downloaded', () => {
      log.info('Update downloaded');
      dialog.showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: 'A new update is ready. It will be installed on restart. Restart now?',
        buttons: ['Yes', 'Later']
      }).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
      });
    });
  
}





app.on('ready', async () => {
  createWindow();
  const ElectronStore = (await import('electron-store')).default;
  store = new ElectronStore();
  await autoLogin(); 

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

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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
    type: 'error',
    buttons: ['Yes', 'No'],
    title: 'Log out',
    message: 'Do you want to log out?',
  })
    if (result.response === 0) { 
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('User signed out successfully');
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
  


ipcMain.handle('upload-clipboard-data', async() => {
    // handleClipboardImage()
    const currentClipboardContent = clipboard.readText();
  
    if (currentClipboardContent && currentClipboardContent !== lastClipboardContent) {
      lastClipboardContent = currentClipboardContent;
      if (isPassword(currentClipboardContent)) {
    
        const result = await dialog.showMessageBox({
          type: 'error',
          buttons: ['Yes', 'No'],
          title: 'Possible Password Detected',
          message: 'The copied text appears to be a password. Do you want to save it?',
        })
          if (result.response === 0) { 
            dialog.showMessageBox({
              type: 'info',
              title: 'Saving...',
              message: 'No worries! Your password will be encrypted before storing it.',
            });
            uploadData(currentClipboardContent)
            } else {
  
            } 
  
          } else {
            uploadData(currentClipboardContent)
  
  
          }
        
      }
  
})
  
async function uploadData(currentClipboardContent) {
    const encryptedData = CryptoJS.AES.encrypt(currentClipboardContent, process.env.SECRET_KEY).toString();
          
    try {
      const { data, error } = await supabase
        .from('clipboard')
        .insert({ 
          content: encryptedData,
          user_id: userId
         })
        .select();
  
         lastClipboardTextId = data[0].id;
         deleteMatchingItems(lastClipboardTextId)
  
  
      if (error) throw error;
      console.log('Clipboard content added:', encryptedData);
    } catch (error) {
      console.error('Error adding clipboard content:', error.message);
    }
}
  
ipcMain.handle('fetch-clipboard-data', async () => {
  
   
    try {
      const { data, error } = await supabase
        .from('clipboard')
        .select('*')
        .eq('user_id', userId)
        .not('content', 'is', null)
        .order('created_at', { ascending: false });

  
      if (error) throw error;
      // console.log(data)
  
      const decryptedData = data.map(row => {
        try {
          return {
            id: row.id,
            user_id: row.user_id,
            content: decrypt(row.content)
          };
        } catch (decryptionError) {
          console.error(`Error decrypting row with id ${row.id}:`, decryptionError.message);
          return {
            id: row.id,
            user_id: row.user_id,
            content: null, // or some indication of decryption failure
          };
        }
      });
  
      return decryptedData;
    } catch (error) {
      console.error('Error fetching clipboard data:', error.message);
      throw error;
    }
});
ipcMain.handle('fetch-metadata', async (event, url) => {
  
      const options = { url };
      try {
        const { error, result } = await ogs(options);
        if (error) {
          console.error('Error fetching metadata:', error);
          return null;
        }
        console.log(result)
        return result;
      } catch (error) {
        console.error('Error fetching metadata:', error.message);
        return null;
      }
});

async function handleClipboardImage() {
      const currentClipboardImage = clipboard.readImage();
    
      // console.log(currentClipboardImage)
      
        if (!currentClipboardImage.isEmpty()) {
          const imageBuffer = currentClipboardImage.toPNG();
          const imageId = uuidv4();
          const imagePath = path.join(__dirname, `images/${imageId}.png`);
          const folderPath = path.join(__dirname, 'images');
          await promisify(fs.writeFile)(imagePath, imageBuffer);
          console.log('Image saved:', imagePath);
      
          const base64ImageData = imageBuffer.toString('base64');
          const currentImageHash = crypto.createHash('sha256').update(base64ImageData).digest('hex');
      
          if (currentImageHash !== lastImageHash) {
            lastImageHash = currentImageHash;
      
            try {
              const arrayBuffer = decode(base64ImageData);
              const { data, error } = await supabase
                .storage
                .from('images')
                .upload(`${imageId}.png`, arrayBuffer, {
                  contentType: 'image/png',
                  user_id: userId
                });
      
              if (error) throw error;
      
              await supabase.from('clipboard').insert({
                image_url: `${SUPABASE_URL}/storage/v1/object/public/images/${imageId}.png`,
              });
              console.log('Image URL added to database:', `${SUPABASE_URL}/storage/v1/object/public/images/${imageId}.png`);
      
            
              deleteFolderContent(folderPath);
            } catch (error) {
              console.error('Error handling clipboard image:', error.message);
            }
          } else {
            console.log('No change detected in clipboard image.');
            const filePath = path.join(__dirname, `images/${imageId}.png`);
            // fs.unlink(filePath, err => {
            //   if (err) {
            //     console.error(`Error deleting file ${filePath}:`, err.message);
            //   } else {
            //     console.log(`Successfully deleted file ${filePath}`);
            //   }})
          }
        }
}
    

async function deleteMatchingItems(lastClipboardTextId) {
      const currentClipboardContent = clipboard.readText();
  
    try {
      let { data: items, error } = await supabase
        .from('clipboard')
        .select('*')
        .eq('user_id', userId);
  
      if (error) throw error;
  
      const matchingItems = items
        .filter(item => decrypt(item.content) === currentClipboardContent)
        .filter(item => item.id !== lastClipboardTextId);
  
      const itemIds = matchingItems.map(item => item.id);
  
      if (itemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('clipboard')
          .delete()
          .in('id', itemIds)
          .eq('user_id', userId);
  
        if (deleteError) throw deleteError;
  
        console.log('Deleted matching items:', itemIds);
      } else {
        console.log('No matching items found.');
      }
    } catch (error) {
      console.error('Error deleting matching items:', error.message);
    }
}
  
  
ipcMain.on('delete-item', async (event, itemId) => {
      try {
  
        const result = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Yes', 'No'],
          title: 'Confirm Deletion',
          message: `Do you want to delete this item?`,
        });
  
        if (result.response === 0) { // User clicked 'Yes'
        const { error: deleteError } = await supabase
          .from('clipboard')
          .delete()
          .eq('id', itemId)
          .eq('user_id', userId);
  
        if (deleteError) throw deleteError;
        console.log(`Item ${itemId} deleted from database`);
        }
      } catch (error) {
        console.error('Error deleting item:', error.message);
      }
});
  
ipcMain.on('delete-broken-item', async (event, itemId) => {
      try {
        dialog.showMessageBox({
          type: 'info',
          title: 'Broken Link Deleted',
          message: `A copied broken link was automatically deleted.`,
        });
        const { error: deleteError } = await supabase
          .from('clipboard')
          .delete()
          .eq('id', itemId)
          .eq('user_id', userId);
  
        if (deleteError) throw deleteError;
        console.log(`Item ${itemId} deleted from database`);
        } catch (error) {
        console.error('Error deleting item:', error.message);
      }
});
  
ipcMain.on('delete-old-items', async (event) => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setHours(oneWeekAgo.getHours() - 168);
      const oneMonthAgo = new Date();
      oneMonthAgo.setHours(oneMonthAgo.getHours() - 720);
      const now = new Date()
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0); // Set to start of day (00:00:00)
      
      try {
  
        const result = await dialog.showMessageBox({
          type: 'question',
          buttons: [' From today', ' older than 7 days', 'older than 30 days', 'All', 'Cancel'],
          title: 'Confirm Deletion',
          message: `Delete items...`,
        });

        if (result.response === 1) {
        const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .lt('created_at', oneWeekAgo.toISOString())
          .eq('user_id', userId); 
        if (error) throw error;
        console.log('Old items deleted from database:', 'older than 7 days');
        } 
        
        else if (result.response === 2) {
          const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .lt('created_at', oneMonthAgo.toISOString())
          .eq('user_id', userId);
        if (error) throw error;
        console.log('Old items deleted from database:', 'older than 30 days');
        } 
        
        else if (result.response === 0) {
          const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .gte('created_at', startOfToday.toISOString())
          .lte('created_at', now.toISOString());
        if (error) throw error;
        console.log('Old items deleted from database:', 'from today');
        } 
        
        else if (result.response === 3) {
          const { data, error } = await supabase
          .from('clipboard')
            .delete()
            .eq('user_id', userId);
        if (error) throw error;
        console.log('Old items deleted from database:', 'all');
        } 
        
      } catch (error) {
        console.error('Error deleting old items:', error.message);
      }

});
function deleteFolderContent(folderPath) {
      fs.readdir(folderPath, (err, files) => {
        if (err) {
          console.error(`Error reading folder ${folderPath}:`, err.message);
          return;
        }
    
        files.forEach(file => {
          const filePath = path.join(folderPath, file);
          fs.unlink(filePath, err => {
  
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err.message);
            } else {
              console.log(`Successfully deleted file ${filePath}`);
            }
          });
        });
      });
}
  
  
function isPassword(text) {
      // const lengthCriteria = text.length >= 8;
      // const varietyCriteria = /[A-Z]/.test(text) && /[a-z]/.test(text) && /[0-9]/.test(text) && /[!@#$%^&*()_+]/.test(text);
  
  
      const passwordPatterns = [
        /password/i, 
      
      ];
      return passwordPatterns.some(pattern => pattern.test(text)) 

}

function decrypt(encryptedData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.SECRET_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        return decryptedData;
      } catch (error) {
        console.error('Error decrypting data:', error.message);
        throw new Error('Decryption failed');
      }
} 
  
