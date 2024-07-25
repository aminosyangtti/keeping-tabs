const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Expose methods to the renderer for communication with the main process
    ipcRenderer: {
      fetchClipboardData: () => ipcRenderer.invoke('fetch-clipboard-data'),
      registerUser: (email, password) => ipcRenderer.invoke('register-user', { email, password }),
      loginUser: (email, password) => ipcRenderer.invoke('login-user', { email, password }),
    }
  });
  