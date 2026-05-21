// 登录注册逻辑（使用后端 API）

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');

  try {
    const data = await login(username, password);
    showToast('登录成功', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } catch (error) {
    errorEl.textContent = error.message || '用户名或密码错误';
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 3000);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');

  if (password !== password2) {
    passwordError.classList.add('show');
    setTimeout(() => passwordError.classList.remove('show'), 3000);
    return;
  }

  try {
    await register(username, email, password);
    showToast('注册成功，请登录', 'success');
    setTimeout(() => window.location.href = 'login.html', 1500);
  } catch (error) {
    usernameError.textContent = error.message || '用户名已存在';
    usernameError.classList.add('show');
    setTimeout(() => usernameError.classList.remove('show'), 3000);
  }
}