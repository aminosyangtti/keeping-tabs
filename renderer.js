



document.addEventListener('DOMContentLoaded', async () => {
 

  try {
    let isMoreOptions = false

    moreOptionsButton.addEventListener('click', async () => {
      if (!isMoreOptions) {

        deleteButton.style.display = 'flex'
        signOutButton.style.display = 'flex'
        infoButton.style.display = 'flex'
        moreOptionsButton.style.backgroundColor = '#74747431'

        isMoreOptions = true

      } else {
          deleteButton.style.display = 'none'
      signOutButton.style.display = 'none'
      infoButton.style.display = 'none'
      moreOptionsButton.style.backgroundColor = ''

      isMoreOptions = false
      }
      
      
    });
    signOutButton.addEventListener('click', async () => {
      try {
          await window.electron.ipcRenderer.signOut();
          window.localStorage.removeItem('userId');
          window.localStorage.removeItem('accessToken');
          startDataUpdates(null, null)
      } catch (error) {
          console.error('Error signing out:', error.message);
      }
    });

    deleteButton.addEventListener('click', () => {
      window.electron.ipcRenderer.deleteOldItems()
    });

    resetPasswordPageButton.addEventListener('click', () => {
      resetPasswordSection.style.display = 'block'
      registrationSection.style.display = 'none'
      loginSection.style.display = 'none'
    });

    loginFromResetButton.addEventListener('click', () => {
      loginSection.style.display = 'block'
      registrationSection.style.display = 'none'
      resetPasswordSection.style.display = 'none'
    });

    loginPageButton.addEventListener('click', () => {
      loginSection.style.display = 'block'
      registrationSection.style.display = 'none'
      resetPasswordSection.style.display = 'none'
    });

    registrationPageButton.addEventListener('click', () => {
    registrationSection.style.display = 'block'
    loginSection.style.display = 'none'
    resetPasswordSection.style.display = 'none'

    });

    document.getElementById('reset-password-section').addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('reset-email').value;
      if (email) {
          try {
              await window.electron.ipcRenderer.resetPassword(email);
              alert('Password reset email sent. Please check your inbox.');
              loginSection.style.display = 'block'
              registrationSection.style.display = 'none'
              resetPasswordSection.style.display = 'none'
              document.getElementById('reset-email').value = ''
              
          } catch (error) {
              console.error('Error sending password reset email:', error.message);
          }
      } else {
          alert('Please enter your email.');
      }
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
  
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
    try {
      const response = await window.electron.ipcRenderer.loginUser(email, password);
      console.log('Logged in:', response);
      localStorage.setItem('accessToken', response.session.access_token);
      window.localStorage.setItem('userId', response.session.user.id);
      
      startDataUpdates(response.session.user.id, response.session.access_token)

     
    } catch (error) {
      console.error('Login error:', error.message);
    }
    });

    
  


    window.electron.onAutoLoginSuccess(({ accessToken, userId }) => {
      console.log('Auto-login successful. Access token:', userId);
      window.localStorage.setItem('userId', userId);
      window.localStorage.setItem('accessToken', accessToken);
      
      startDataUpdates(userId, accessToken)
      

    });
  
    window.electron.onAuthStateChanged(({ accessToken, userId }) => {
      console.log('Auth state changed. New access token:', userId);
      window.localStorage.setItem('userId', userId);
      window.localStorage.setItem('accessToken', accessToken);
      // startDataUpdates()
      // title.style.display = 'flex'

    });

  } catch (error) {
    console.error('Error during initialization:', error);
    }

});




// const userId = window.localStorage.getItem('userId');
// console.log(userId)
// const accessToken = window.localStorage.getItem('accessToken');
// console.log(accessToken)
const registrationSection = document.getElementById('registration-section')
const authContainer = document.getElementById('auth-container')
const loginSection = document.getElementById('login-section')
const resetPasswordSection = document.getElementById('reset-password-section') 


const clipboardContainer = document.getElementById('clipboard-container')
const clipboardList = document.getElementById('clipboard-list') 
const registrationPageButton = document.getElementById('registration-page-button')
const loginPageButton = document.getElementById('login-page-button')
const loginFromResetButton = document.getElementById('login-from-reset-button')

const resetPasswordPageButton = document.getElementById('reset-password-page-button')
const deleteButton = document.getElementById('delete-button')
const moreOptionsButton = document.getElementById('more-options-button')
const infoButton = document.getElementById('info-button')
const signOutButton = document.getElementById('sign-out-button')
const loginForm = document.getElementById('login-form')
const title = document.getElementById('title')


async function fetchClipboardData() {
  console.log('fetching...')
   
  try {
     
    const data = await window.electron.ipcRenderer.fetchClipboardData();
  
    const clipboardList = document.getElementById('clipboard-list');
    clipboardList.innerHTML = ''; 

    data.forEach(item => {
        
        if (item.content) {
          const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';
        let contentHTML = '';
          if (isValidURL(item.content)) {
            displayPreview(item.content, item.id, itemElement)
            copy(item.content, itemElement)
  
          } 
          if(isHexCode(item.content)) {
              contentHTML = `<div style="margin: 0; padding: 0; display:flex; justify-content: center; align-items: center; height: 100%; width: 100%; background-color: ${item.content};">${item.content}</div>`;
              copy(item.content, itemElement)
  
          } else {
            contentHTML = `<div style="padding: 10px">${item.content}</div>`;
            copy(item.content, itemElement)
          }
          
    
          itemElement.innerHTML = `
            <div class="clipboard-content">
              ${contentHTML} 
            </div>
            `;
  
    
          clipboardList.appendChild(itemElement);
  
          itemElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            
            if (item.id) {
              console.log(item.id)
              window.electron.ipcRenderer.deleteItem(item.id);
            }
          });
  

        } else {
          
        }
        
    });
       
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);
    }
}

async function startDataUpdates(userId, accessToken) {

  let intervalId;
  if (userId && accessToken) {
    authContainer.style.display = 'none'
      clipboardContainer.style.display = 'flex'
      title.style.display = 'flex'
    intervalId = setInterval(async () => {
      fetchClipboardData();
      window.electron.ipcRenderer.uploadClipboardData();
    },1000)

  } else {
    clearInterval(intervalId)
  }
  
}
function copy(content, itemElement) {
  itemElement.addEventListener('click', () => {
    this.disabled = true;
    navigator.clipboard.writeText(content)
      .then(() => {
        console.log('Text copied to clipboard');
        showNotification();
     })
      .catch(err => {
        console.error('Failed to copy text: ', err);
     });
  });
}

async function displayPreview(url, itemId, itemElement) {

  try {
  let metadata = await window.electron.ipcRenderer.fetchMetadata(url);

  if (metadata) {
  const title = metadata.ogTitle || metadata.title || 'No Title';
  // const description = metadata.ogDescription || metadata.description || 'No Description';
  const imageUrl = metadata.ogImage[0].url|| 'default_image.png'; 

  itemElement.innerHTML = `
   <div class="clipboard-content" style="padding: 10px">
      <img src="${imageUrl}" alt="Preview Image" />
      <p>${title}</p>
      <a href="${url}" target="_blank">Open Link</a>
    </div>
  `;
  } else {
    window.electron.ipcRenderer.deleteBrokenItem(itemId);

    // `
    // <div class="clipboard-content" style="padding: 10px">
    //    <img src="${url}" alt="Clipboard Image" style="max-width: 300px;"/>
    //     <p><strong>Image URL:</strong> ${url}</p>
        
    // `;
    }
  } catch (error) {
    console.error(error)
    } 
}



function showNotification() {
  const notification = document.getElementById('notification');
  // const notificationSound = document.getElementById('notificationSound');
  // notification.style.display = 'block'
  notification.style.opacity = 1
  // notificationSound.play();
  notification.style.backgroundColor = '#f8f8f8'
  notification.style.color = '#191827'

  notification.innerText = 'Copied to clipboard!'

  setTimeout(() => {
    // notification.style.display = 'none'
    notification.style.opacity = 0
    notification.style.transform = 'translateY(0);'
  

  }, 3000); // Show the notification for 2 seconds
}

function showDeleteNotification() {
  const notification = document.getElementById('notification');
  // const notificationSound = document.getElementById('notificationSound');
  notification.style.opacity = 1
  notification.style.backgroundColor = '#9f4c4c'
  notification.style.color = '#f8f8f8'

  notification.innerText = 'Item deleted.'
  // notificationSound.play();

  setTimeout(() => {
    notification.style.opacity = 0
    notification.style.transform = 'translateY(0);'
  

  }, 3000); // Show the notification for 2 seconds
}


function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

function isHexCode(str) {
  const hexRegex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;
  const hexRegex2 = /^#([0-9A-F]{3}|[0-9A-F]{8})$/i;
  result = hexRegex.test(str) || hexRegex2.test(str) ? true : false

  return result;
}

function isValidURL(str) {
  const urlRegex = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;
  return urlRegex.test(str);
}



 