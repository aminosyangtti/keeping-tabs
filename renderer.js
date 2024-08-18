

document.addEventListener('DOMContentLoaded', async () => {
 

  try {
    

    searchBar.addEventListener('input', async () => {
      
      if (searchBar.value) {
        fetchClipboardData(searchBar.value)
        console.log(searchBar.value)
      } 
 

    });

    let isWindowHidden = false
    resizeWindowButton.addEventListener('click', async () => {
      window.electron.ipcRenderer.resizeWindow()
      if (isWindowHidden) {
        
        resizeWindowButton.style.transform = ""
        clipboardContainer.style.display ='flex'
        title.style.display = 'flex'
        windowControls.style.display = 'flex'
        infoButton.style.display = 'flex'
        isWindowHidden = false


        


      } else {
        resizeWindowButton.style.transform = "matrix(-1, 0, 0, -1, 0, 0)"
        clipboardContainer.style.display ='none'
        title.style.display = 'none'
        windowControls.style.display = 'none'
        infoButton.style.display = 'none'
        infoSection.style.display = 'none'
        

        isWindowHidden = true
      }

    });

    minimizeButton.addEventListener('click', async () => {
      window.electron.ipcRenderer.minimizeWindow()
    });

    closeButton.addEventListener('click', async () => {
      window.electron.ipcRenderer.closeWindow()
    });
    

    let isInfoHidden = true
    checkUpdateButton.addEventListener('click', async () => {
      checkUpdateButton.style.display = 'none'
      statusText.style.display = 'flex'
      await window.electron.checkUpdate()
        window.electron.checkUpdateStatus((updateStatus) => {
          updateStatus = updateStatus ? updateStatus : "status error"
          statusText.innerText = `Status: ${updateStatus}`
        });
    });
    infoButton.addEventListener('click', async () => {

      if (isInfoHidden) {
        const appInfo = await window.electron.getAppInfo();
        version.innerText = `${appInfo}`
        
        document.getElementById('info').style.display = 'flex'
          clipboardContainer.style.display = 'none'
          infoSection.style.display = 'flex'
          isInfoHidden = false
        

      } else {
        document.getElementById('info').style.display = 'none'
        clipboardContainer.style.display = 'flex'
        infoSection.style.display = 'none'
        isInfoHidden = true
      }
      
    });
    let isMoreOptions = false

    moreOptionsButton.addEventListener('click', async () => {
      if (!isMoreOptions) {

        deleteButton.style.display = 'flex'
        signOutButton.style.display = 'flex'
        moreOptionsButton.style.backgroundColor = '#74747431'

        isMoreOptions = true

      } else {
          deleteButton.style.display = 'none'
      signOutButton.style.display = 'none'
      moreOptionsButton.style.backgroundColor = ''

      isMoreOptions = false
      }
      
      
    });
    signOutButton.addEventListener('click', async () => {
      try {
          await window.electron.ipcRenderer.signOut();
          window.electron.ipcRenderer.getUserId(null)

          startUIUpdates(null, null)
      } catch (error) {
          console.error('Error signing out:', error.message);
          alert('Error signing out: ' + error.message);

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
              alert('Error sending password reset email: ' + error.message);
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
      alert('Registration successful! You can now log in.');
      registrationSection.style.display = 'none'
      startUIUpdates(response.session.user.id, response.session.access_token)
      window.electron.ipcRenderer.getUserId(response.session.user.id)




    } catch (error) {
      console.error('Registration error:', error.message);
      alert('Registration error: ' + error.message);
    }
    });
  
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
    try {
      const response = await window.electron.ipcRenderer.loginUser(email, password);
      startUIUpdates(response.session.user.id, response.session.access_token)
      window.electron.ipcRenderer.getUserId(response.session.user.id)
      fetchClipboardData('');

     
    } catch (error) {
      console.error('Login error:', error.message);
      alert('Failed to log in: ' + error.message);
    }
    });

    window.electron.onDataChanged((action) => {

      if (action == 'delete') {
        showDeleteNotification()
      } else {
        showNotification();

      }
      fetchClipboardData('');
      
    });

  
    window.electron.onAutoLoginSuccess(({ accessToken, userId }) => {
     
      startUIUpdates(userId, accessToken)
      window.electron.ipcRenderer.getUserId(userId)
      fetchClipboardData('');
            

    });
  
    window.electron.onAuthStateChanged(({ accessToken, userId }) => {

    });

  } catch (error) {
    console.error('Error during initialization:', error);
    alert( error.message);
    }

});




const registrationSection = document.getElementById('registration-section')
const authContainer = document.getElementById('auth-container')
const loginSection = document.getElementById('login-section')
const resetPasswordSection = document.getElementById('reset-password-section') 
const clipboardContainer = document.getElementById('clipboard-container')
const infoSection = document.getElementById('info-section')


const clipboardList = document.getElementById('clipboard-list') 
const registrationPageButton = document.getElementById('registration-page-button')
const loginPageButton = document.getElementById('login-page-button')
const loginFromResetButton = document.getElementById('login-from-reset-button')

const resetPasswordPageButton = document.getElementById('reset-password-page-button')
const deleteButton = document.getElementById('delete-button')
const moreOptionsButton = document.getElementById('more-options-button')
const infoButton = document.getElementById('info-button')
const resizeWindowButton = document.getElementById('resize-window-button')

const signOutButton = document.getElementById('sign-out-button')
const loginForm = document.getElementById('login-form')
const title = document.getElementById('title')
const icon = document.getElementById('icon')
const version = document.getElementById('version')

const titleBar = document.getElementById('title-bar')
const windowControls = document.getElementById('window-controls')

const minimizeButton = document.getElementById('minimize-button')
const closeButton = document.getElementById('close-button')


const searchBar = document.getElementById('search-bar');
const statusText = document.getElementById('update-status');
const checkUpdateButton = document.getElementById('check-updates-button');





async function fetchClipboardData(substring) {
  console.log('fetching...')
   
  try {
     
    const data = await window.electron.ipcRenderer.fetchClipboardData(substring);
  
    const clipboardList = document.getElementById('clipboard-list');
    clipboardList.innerHTML = ''; 

    data.forEach(item => {
        
        if (item.content) {
          const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';
        let contentHTML = '';
         
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
              window.electron.ipcRenderer.deleteItem(item.id);
            }
          });
  

        } else {
          
        }
        
    });
       
  } catch (error) {
    console.error('Error fetching clipboard data:', error.message);
    alert('Error fetching clipboard data:', error.message)
    }
}

async function startUIUpdates(userId, accessToken) {

  if (userId && accessToken) {
    authContainer.style.display = 'none'
      clipboardContainer.style.display = 'flex'
      title.style.display = 'flex'
      resizeWindowButton.style.display = 'flex'
      icon.style.display = 'flex'
      
  } 
  
}
function copy(content, itemElement) {
  itemElement.addEventListener('click', () => {
    this.disabled = true;
    navigator.clipboard.writeText(content)
      .then(() => {
        console.log('Text copied to clipboard');
     })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text: ' + error.message);

     });
  });
}



function showNotification() {
  const notification = document.getElementById('notification');
 
  notification.style.opacity = 1
  notification.style.backgroundColor = '#f8f8f8'
  notification.style.color = '#191827'

  notification.innerText = 'Copied to clipboard!'

  setTimeout(() => {
    notification.style.opacity = 0
    notification.style.transform = 'translateY(0);'
  

  }, 3000);
}

function showDeleteNotification() {
  const notification = document.getElementById('notification');
  notification.style.opacity = 1
  notification.style.backgroundColor = '#9f4c4c'
  notification.style.color = '#f8f8f8'

  notification.innerText = 'Item deleted.'

  setTimeout(() => {
    notification.style.opacity = 0
    notification.style.transform = 'translateY(0);'
  

  }, 3000); 
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

