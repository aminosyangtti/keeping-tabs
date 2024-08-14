const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    fetchClipboardData: () => ipcRenderer.invoke('fetch-clipboard-data'),
    registerUser: (email, password) => ipcRenderer.invoke('register-user', { email, password }),
    loginUser: (email, password) => ipcRenderer.invoke('login-user', { email, password }),
    uploadClipboardData: () => ipcRenderer.invoke('upload-clipboard-data'),
    deleteItem: (itemId) => ipcRenderer.send('delete-item', itemId),
    deleteBrokenItem: (itemId) => ipcRenderer.send('delete-broken-item', itemId),
    deleteOldItems: () => ipcRenderer.send('delete-old-items'),
    signOut: () => ipcRenderer.invoke('sign-out'),
    resetPassword: (email) => ipcRenderer.invoke('reset-password', { email }),
    resizeWindow: () => ipcRenderer.send('resize-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
  },
  onAutoLoginSuccess: (callback) => ipcRenderer.on('auto-login-success', (event, data) => callback(data)),
  onAuthStateChanged: (callback) => ipcRenderer.on('auth-state-changed', (event, data) => callback(data)),
  onDataChanged: (callback) => ipcRenderer.on('update-data', (event, action) => callback(action)),

});
