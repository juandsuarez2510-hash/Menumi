document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const apiError = document.getElementById('adminApiError');
  const usersTable = document.getElementById('usersTable');
  const loginButton = loginForm.querySelector('button[type="submit"]');

  const showDashboard = (user) => {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.getElementById('adminGreeting').textContent = user.username.split(' ')[0];
    document.getElementById('adminUserLabel').textContent = user.username;
    document.getElementById('adminAvatar').textContent = user.username.charAt(0).toUpperCase();
    loadUsers();
  };

  const makeCell = (text, className) => {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  };

  async function loadUsers() {
    apiError.textContent = '';
    try {
      const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
      if (response.status === 401) {
        dashboardView.hidden = true;
        loginView.hidden = false;
        return;
      }
      if (!response.ok) throw new Error('No fue posible consultar las cuentas.');
      const { users } = await response.json();
      usersTable.replaceChildren();
      document.getElementById('userCount').textContent = String(users.length).padStart(2, '0');

      for (const user of users) {
        const row = document.createElement('tr');
        const account = document.createElement('td');
        const accountLabel = document.createElement('span');
        accountLabel.className = 'account-name';
        const avatar = document.createElement('span');
        avatar.className = 'account-avatar';
        avatar.textContent = user.username.charAt(0).toUpperCase();
        const name = document.createElement('span');
        name.textContent = user.username;
        accountLabel.append(avatar, name);
        account.append(accountLabel);

        const role = document.createElement('td');
        const rolePill = document.createElement('span');
        rolePill.className = 'role-pill';
        rolePill.textContent = user.role === 'admin' ? 'ADMINISTRADOR' : user.role.toUpperCase();
        role.append(rolePill);

        const status = document.createElement('td');
        const statusPill = document.createElement('span');
        statusPill.className = user.active ? 'status-pill' : 'status-pill status-inactive';
        statusPill.textContent = user.active ? 'ACTIVO' : 'INACTIVO';
        status.append(statusPill);

        const hiddenPassword = makeCell('••••••••••', 'password-masked');
        row.append(account, role, status, hiddenPassword);
        usersTable.append(row);
      }
    } catch (error) {
      apiError.textContent = 'El panel no pudo conectarse. Intenta de nuevo en unos minutos.';
      console.error(error);
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    loginButton.disabled = true;
    loginButton.firstChild.textContent = 'Verificando… ';
    const formData = new FormData(loginForm);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && [404, 405].includes(response.status)) {
        throw new Error('El servicio de administración no está disponible. Intenta de nuevo en unos minutos.');
      }
      if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión.');
      loginForm.reset();
      showDashboard(data.user);
    } catch (error) {
      loginError.textContent = error.message.includes('Failed to fetch')
        ? 'El servicio de administración aún no está disponible. Revisa el despliegue en Netlify.'
        : error.message;
    } finally {
      loginButton.disabled = false;
      loginButton.firstChild.textContent = 'Entrar al panel ';
    }
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      dashboardView.hidden = true;
      loginView.hidden = false;
      loginForm.reset();
    }
  });

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => { if (data?.user) showDashboard(data.user); })
    .catch(() => {});
});
