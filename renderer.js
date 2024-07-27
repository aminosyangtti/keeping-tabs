





document.addEventListener('DOMContentLoaded', async () => {

  const registrationSection = document.getElementById('registration-section')
  const authContainer = document.getElementById('auth-container')
  const loginSection = document.getElementById('login-section') 

  const clipboardContainer = document.getElementById('clipboard-container')
  const clipboardList = document.getElementById('clipboard-list') 
  try {



document.getElementById('register-button').addEventListener('click', () => {
  registrationSection.style.display = 'block'
  document.getElementById('register-button').style.display = 'none'
  loginSection.style.display = 'none'
});


registrationSection.addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
  
    try {
      const response = await window.electron.ipcRenderer.registerUser(email, password);
      console.log('Registration successful:', response);
      alert('Registration successful! You can now log in.');
      registrationSection.style.display = 'none'

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
      window.localStorage.setItem('userId', response.session.user.id);
      
      authContainer.style.display = 'none'
      clipboardContainer.style.display = 'flex'
      setInterval(async () => {
        fetchClipboardData();
        window.electron.ipcRenderer.uploadClipboardData();
      },2000)
     
    } catch (error) {
      console.error('Login error:', error.message);
    }
  });


  window.electron.onAutoLoginSuccess(({ accessToken, userId }) => {
    console.log('Auto-login successful. Access token:', userId);
    window.localStorage.setItem('userId', userId);
    window.localStorage.setItem('accessToken', accessToken);
    authContainer.style.display = 'none'
    clipboardContainer.style.display = 'flex'

    setInterval(async () => {
      fetchClipboardData();
      window.electron.ipcRenderer.uploadClipboardData();
    },2000)
  });
  
  window.electron.onAuthStateChanged(({ accessToken, userId }) => {
    console.log('Auth state changed. New access token:', userId);
    window.localStorage.setItem('userId', userId);
    window.localStorage.setItem('accessToken', accessToken);

    setInterval(async () => {
      fetchClipboardData();
      window.electron.ipcRenderer.uploadClipboardData();
    },2000)
  });
} catch (error) {
  console.error('Error during initialization:', error);
}

});




  const userId = window.localStorage.getItem('userId');
  const accessToken = window.localStorage.getItem('accessToken');



  async function fetchClipboardData() {
    console.log('fetching...')
   
    try {
      const data = await window.electron.ipcRenderer.fetchClipboardData();
  
      const clipboardList = document.getElementById('clipboard-list');
      clipboardList.innerHTML = ''; 

      data.forEach(item => {
        // console.log(item.content)
        // console.log(userId)
        // console.log(accessToken)
        // console.log(item.user_id)
        if (userId == item.user_id) {
          console.log('matching...')
          const itemElement = document.createElement('div');
          itemElement.className = 'clipboard-item';
          let contentHTML = '';
        if (item.image_url) {
          contentHTML = `
            <img src="${item.image_url}" alt="Clipboard Image" style="max-width: 300px;"/>
            <p><strong>Image URL:</strong> ${item.image_url}</p>
          `;
        } else {
          contentHTML = `<div>${item.content}</div>`;
        }
  
        // Build the HTML structure for the item
        itemElement.innerHTML = `
          <div class="clipboard-content">
            ${contentHTML}
          </div>
        `;
  
        clipboardList.appendChild(itemElement);
      }
    });
       
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);
  }
}
