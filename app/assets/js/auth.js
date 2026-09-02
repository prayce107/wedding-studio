document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-msg');
  const infoMsg = document.getElementById('info-msg');
  const submitBtn = document.getElementById('submit-btn');
  const forgotPasswordBtn = document.getElementById('forgot-password');

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      infoMsg.style.display = 'block';
      infoMsg.textContent = 'Silakan hubungi administrator (admin@prayceinvite.com) untuk melakukan reset password akun Anda.';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usernameInput = document.getElementById('username').value.trim();
      const passwordInput = document.getElementById('password').value;
      const rememberMe = document.getElementById('remember-me').checked;

      errorMsg.style.display = 'none';
      infoMsg.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();

        if (!response.ok) {
          showError(data.message || 'Login gagal. Periksa kembali username dan password Anda.');
          return;
        }

        const sessionData = {
          token: data.token,
          user: data.user,
          timestamp: new Date().getTime()
        };

        const sessionStr = JSON.stringify(sessionData);

        if (rememberMe) {
          localStorage.setItem('user_session', sessionStr);
        } else {
          sessionStorage.setItem('user_session', sessionStr);
        }

        window.location.href = '/app/index.html';
      } catch (err) {
        showError(err.message || 'Terjadi kesalahan saat memproses login. Pastikan backend berjalan.');
        console.error(err);
      }
    });
  }

  function showError(msg) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk Ke Dashboard';
    errorMsg.style.display = 'block';
    errorMsg.textContent = msg;
  }
});

// Utility to check if user is logged in (use this in other pages)
window.checkAuth = function() {
  const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
  if (!sessionStr) {
    window.location.href = '/app/login.html';
    return null;
  }
  
  try {
    const sessionData = JSON.parse(sessionStr);
    const hours24 = 24 * 60 * 60 * 1000;
    if (new Date().getTime() - sessionData.timestamp > hours24 * 7) { 
      window.logout();
      return null;
    }
    return sessionData;
  } catch (e) {
    window.logout();
    return null;
  }
};

window.logout = function() {
  localStorage.removeItem('user_session');
  sessionStorage.removeItem('user_session');
  window.location.href = '/app/login.html';
};
