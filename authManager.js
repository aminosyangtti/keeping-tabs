const { dialog } = require('electron');
const { supabase } = require('./supabase.js');

class AuthManager {
  constructor() {
  }



  // Auto-login function
  async autoLogin(store, win) {
    
    const authToken = store.get('authToken');
    const refreshToken = store.get('refreshToken');
    const userId = store.get('userId')
    

    if (authToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({ access_token: authToken, refresh_token: refreshToken });
        if (error) throw error;

        win.webContents.send('auto-login-success', {
          accessToken: authToken,
          userId: userId
        });
        console.log('User logged in automatically');
      } catch (error) {
        console.error('Automatic login failed:', error.message);
        store.delete('authToken');
        store.delete('refreshToken');
        store.delete('userId');
      }
    } else {
      console.log('No stored tokens found');
    }
  }

  // Login function
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console
      return data;
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  // Sign out function
  async signOut(win) {
    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Yes', 'No'],
      title: 'Log out',
      message: 'Do you want to log out?',
    });

    if (result.response === 0) { // Yes
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('User signed out successfully');
        win.reload();
      } catch (error) {
        console.error('Error signing out:', error.message);
      }
    }
  }

  // Register function
  async register(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  // Reset password function
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error.message);
    }
  }

   onAuthStateChange(store, win) {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        store.set('authToken', session.access_token);
        store.set('refreshToken', session.refresh_token);
        store.set('userId', session.user.id);

        if (win) {
          win.webContents.send('auth-state-changed', {
            accessToken: session.access_token,
            userId: session.user.id
          });
        }
      } else if (event === 'SIGNED_OUT') {
        store.delete('authToken');
        store.delete('refreshToken');
        store.delete('userId');
      }
    });
  }
}

module.exports = AuthManager;
