const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
// const { supabase } = require('./supabase');

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();


let lastClipboardContent = '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
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

app.whenReady().then(() => {
  createWindow();


  setInterval(async () => {
    const currentClipboardContent = clipboard.readText();

    if (currentClipboardContent !== lastClipboardContent) {
      lastClipboardContent = currentClipboardContent;

      try {
        // Add new clipboard content to Supabase
        const { data, error } = await supabase
          .from('clipboard')
          .insert({ content: currentClipboardContent });

        if (error) throw error;
        console.log('Clipboard content added:', data);
      } catch (error) {
        console.error('Error adding clipboard content:', error.message);
      }
    }
  }, 1000);

  
  

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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
