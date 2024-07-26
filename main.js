const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
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

let store;

let userId;
let win;
let lastClipboardContent = '';
let lastImageHash = '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  win = new BrowserWindow({
    width: 238,
    height: 1950,
    x: width - 238,
    y: 10,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({mode:'undocked'});
  }
}

app.on('ready', async () => {
  createWindow();
  const ElectronStore = (await import('electron-store')).default;
  store = new ElectronStore();
  await autoLogin(); 

});

  

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('upload-clipboard-data', async() => {
  const currentClipboardContent = clipboard.readText();
  
    if (currentClipboardContent && currentClipboardContent !== lastClipboardContent) {
      lastClipboardContent = currentClipboardContent;
  
      try {
        const { data, error } = await supabase
          .from('clipboard')
          .insert({ 
            content: currentClipboardContent,
            user_id: userId
           });
  
        if (error) throw error;
        console.log('Clipboard content added:', data);
      } catch (error) {
        console.error('Error adding clipboard content:', error.message);
      }
    }

})

ipcMain.handle('fetch-clipboard-data', async () => {
  try {
    const { data, error } = await supabase
      .from('clipboard')
      .select('*')
      .order('created_at', { ascending: false }); 

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);
    throw error;
  }
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
  function deleteFolderContents(folderPath) {
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



  async function autoLogin() {
    const authToken = store.get('authToken');
    const refreshToken = store.get('refreshToken');
  
    if (authToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({ access_token: authToken, refresh_token: refreshToken });
  
        if (error) throw error;
  
        console.log('User logged in automatically');
        win.webContents.send('auto-login-success', {
          accessToken: authToken,
          userId: data.user.id 
        });
        userId = data.user.id
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
  

 async function handleClipboardImage() {
  const currentClipboardImage = clipboard.readImage();
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
  
        
          deleteFolderContents(folderPath);
        } catch (error) {
          console.error('Error handling clipboard image:', error.message);
        }
      } else {
        console.log('No change detected in clipboard image.');
        deleteFolderContents(folderPath);
      }
    }
  }