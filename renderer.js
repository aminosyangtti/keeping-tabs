document.getElementById('registration-form').addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
  
    try {
      const response = await window.electron.ipcRenderer.registerUser(email, password);
      console.log('Registration successful:', response);
      alert('Registration successful! You can now log in.');
    } catch (error) {
      console.error('Registration error:', error.message);
    }
  });
  
  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    try {
      const response = await window.electron.ipcRenderer.loginUser(email, password);
      console.log('Logged in:', response);
      localStorage.setItem('accessToken', response.session.access_token);
      fetchClipboardData();
    } catch (error) {
      console.error('Login error:', error.message);
    }
  });
  
  async function fetchClipboardData() {
    try {
      const data = await window.electron.ipcRenderer.fetchClipboardData();
      console.log('Clipboard data:', data);
  
      const clipboardList = document.getElementById('clipboard-list');
      clipboardList.innerHTML = ''; // Clear existing content
  
      data.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';
        itemElement.innerHTML = `
          <p><strong>Content:</strong> ${item.content}</p>
          <p><strong>Image URL:</strong> ${item.image_url || 'None'}</p>
          <p><strong>Created At:</strong> ${new Date(item.created_at).toLocaleString()}</p>
        `;
        clipboardList.appendChild(itemElement);
      });
    } catch (error) {
      console.error('Error fetching clipboard data:', error.message);
    }
  }

  