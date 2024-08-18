const { clipboard, dialog } = require('electron');
const { supabase } = require('./supabase.js');

class ClipboardManager {
  constructor() {
    this.lastClipboardContent = '';
    this.lastClipboardTextId = null;
  }

  // Method to upload data
  async uploadData(userId, win, currentClipboardContent) {
    try {
      const { data, error } = await supabase
        .from('clipboard')
        .insert({
          content: currentClipboardContent,
          user_id: userId,
        })
        .select();

      if (error) throw error;

      this.lastClipboardTextId = data[0].id;
      await this.deleteMatchingItems(userId, win, this.lastClipboardTextId);
      if (this.lastClipboardContent) {
        await this.updateData('upload', win)

      }

      console.log('Clipboard content added:', currentClipboardContent);
    } catch (error) {
      console.error('Error adding clipboard content:', error.message);
      dialog.showMessageBox({
        type: 'error',
        title: 'Error Adding to Clipboard:',
        message: error.message
      });
    }
  }

  // Method to check for clipboard changes
  async checkClipboardChange(userId, win) {
    const currentClipboardContent = clipboard.readText();

    if (currentClipboardContent && currentClipboardContent !== this.lastClipboardContent && userId) {
      

      if (this.isPassword(currentClipboardContent)) {
        const result = await dialog.showMessageBox({
          type: 'info',
          buttons: ['Yes', 'No'],
          title: 'Possible Password Detected',
          message: 'The copied text appears to be a password. Do you want to save it?',
        });

        if (result.response === 0) {
          dialog.showMessageBox({
            type: 'info',
            title: 'Saving...',
            message: 'No worries! Your password will be encrypted before storing it.',
          });
          await this.uploadData(userId, win, currentClipboardContent);
        }
      } else {
        await this.uploadData(userId, win, currentClipboardContent);
      }
      this.lastClipboardContent = currentClipboardContent;
    }
  }

  // Method for deleting matching items
  async deleteMatchingItems(userId, win, lastClipboardTextId) {
    const currentClipboardContent = clipboard.readText();

    try {
      let { data: items, error } = await supabase
        .rpc('get_clipboard', {
          p_user_id: userId,
          p_search_term: ''
        });

      if (error) throw error;

      const matchingItems = items
        .filter(item => item.content === currentClipboardContent)
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
        if (this.lastClipboardContent) {
          await this.updateData('upload', win)
  
        }
      } else {
        console.log('No matching items found.');
      }
    } catch (error) {
      console.error('Error deleting matching items:', error.message);
    }
  }

  // Method to fetch clipboard data
  async fetch(userId, substring) {

    try {

      const { data, error } = await supabase
        .rpc('get_clipboard', {
          p_user_id: userId,
          p_search_term: substring
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching clipboard data:', error.message);
      throw error;
    }
  }





  // Delete Section

  async deleteItem(userId, win, itemId) {
    try {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm Deletion',
        message: 'Do you want to delete this item?',
      });

      if (result.response === 0) { // Yes
        const { error: deleteError } = await supabase
          .from('clipboard')
          .delete()
          .eq('id', itemId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        console.log(`Item ${itemId} deleted from database`);
        await this.updateData('delete', win);
      }
    } catch (error) {
      console.error('Error deleting item:', error.message);
    }
  }

  async deleteBrokenItem(userId, win, itemId) {
    try {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Broken Link Deleted',
        message: 'A copied broken link was automatically deleted.',
      });

      const { error: deleteError } = await supabase
        .from('clipboard')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      console.log(`Item ${itemId} deleted from database`);
      await this.updateData('delete', win);
    } catch (error) {
      console.error('Error deleting broken item:', error.message);
    }
  }

  async deleteOldItems(userId, win) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setHours(oneWeekAgo.getHours() - 168);
    const oneMonthAgo = new Date();
    oneMonthAgo.setHours(oneMonthAgo.getHours() - 720);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0); // Set to start of day (00:00:00)

    try {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['From today', 'Older than 7 days', 'Older than 30 days', 'All', 'Cancel'],
        title: 'Confirm Deletion',
        message: 'Delete items...',
      });

      if (result.response === 1) {
        const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .lt('created_at', oneWeekAgo.toISOString())
          .eq('user_id', userId);

        if (error) throw error;
        console.log('Old items deleted from database:', 'older than 7 days');
      } else if (result.response === 2) {
        const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .lt('created_at', oneMonthAgo.toISOString())
          .eq('user_id', userId);

        if (error) throw error;
        console.log('Old items deleted from database:', 'older than 30 days');
      } else if (result.response === 0) {
        const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .gte('created_at', startOfToday.toISOString())
          .lte('created_at', now.toISOString());

        if (error) throw error;
        console.log('Old items deleted from database:', 'from today');
      } else if (result.response === 3) {
        const { data, error } = await supabase
          .from('clipboard')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
        console.log('Old items deleted from database:', 'all');
      }
      if (result.response !== 4) {
        await this.updateData('delete', win);
      }

    } catch (error) {
      console.error('Error deleting old items:', error.message);
    }
  }


  // Method to check if content is a password
  isPassword(text) {
    const passwordPatterns = [/password/i]; 
    return passwordPatterns.some(pattern => pattern.test(text));
  }

  updateData(action, win) {
    win.webContents.send('update-data', action);
  }

}


  

module.exports = ClipboardManager;
