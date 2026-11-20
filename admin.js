document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const adminView = document.getElementById('dashboardView');
  const customerView = document.getElementById('customerDashboard');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  const apiError = document.getElementById('adminApiError');
  const usersTable = document.getElementById('usersTable');
  const ordersTable = document.getElementById('ordersTable');
  const formatCOP = (amount) => '$' + Number(amount || 0).toLocaleString('es-CO');
  const formatDate = (value) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  const cell = (text) => {
    const element = document.createElement('td');
    element.textContent = text || '—';
    return element;
  };

  const showAdmin = (user) => {
    loginView.hidden = true;
    customerView.hidden = true;
    adminView.hidden = false;
    const name = user.fullName || user.username;
    document.getElementById('adminGreeting').textContent = name.split(' ')[0];
    document.getElementById('adminUserLabel').textContent = name;
    document.getElementById('adminAvatar').textContent = name.charAt(0).toUpperCase();
    loadAdminData();
  };

  const showCustomer = (user) => {
    loginView.hidden = true;
    adminView.hidden = true;
    customerView.hidden = false;
    const name = user.fullName || user.username;
    document.getElementById('customerGreeting').textContent = name.split(' ')[0];
    document.getElementById('customerAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('customerEmail').textContent = user.email;
    fillTasteForm(user);
    loadCustomerOrders();
  };

  const fillTasteForm = (user) => {
    const form = document.getElementById('tasteForm');
    for (const input of form.querySelectorAll('input[type="checkbox"]')) {
      const values = input.name === 'favoriteCuisines' ? user.favoriteCuisines : user.dietaryPreferences;
      input.checked = Array.isArray(values) && values.includes(input.value);
    }
    form.elements.spiceLevel.value = String(user.spiceLevel ?? 2);
    form.elements.profileNotes.value = user.profileNotes || '';
  };

  async function loadAdminData() {
    apiError.textContent = '';
    try {
      const response = await fetch('/api/admin/overview', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('No fue posible consultar los datos del panel.');
      const { users, orders } = await response.json();
      document.getElementById('userCount').textContent = String(users.length).padStart(2, '0');
      document.getElementById('orderCount').textContent = String(orders.length).padStart(2, '0');
      usersTable.replaceChildren();
      ordersTable.replaceChildren();

      const emptyRow = (table, columns, message) => {
        const row = document.createElement('tr');
        const empty = document.createElement('td');
        empty.colSpan = columns;
        empty.className = 'table-empty';
        empty.textContent = message;
        row.append(empty);
        table.append(row);
      };
      if (!users.length) emptyRow(usersTable, 6, 'Aún no hay cuentas de clientes. Aparecerán cuando alguien se registre.');
      if (!orders.length) emptyRow(ordersTable, 6, 'Aún no hay pedidos registrados. Se mostrarán cuando un cliente ordene desde el menú.');

      for (const user of users) {
        const row = document.createElement('tr');
        const person = cell(user.fullName);
        const role = document.createElement('small');
        role.className = 'table-subtext';
        role.textContent = user.role === 'admin' ? 'Equipo Menumi' : `${user.orderCount} ${user.orderCount === 1 ? 'pedido' : 'pedidos'}`;
        person.append(document.createElement('br'), role);
        row.append(person, cell(user.email), cell(user.favoriteCuisines.join(', ')), cell([...user.dietaryPreferences, user.profileNotes].filter(Boolean).join(' · ')), cell(['Nada', 'Suave', 'Medio', 'Alto'][user.spiceLevel] || 'Medio'), cell(String(user.orderCount)));
        usersTable.append(row);
      }

      for (const order of orders) {
        const row = document.createElement('tr');
        const products = order.items.map((item) => `${item.name} · ${formatCOP(item.price)}`).join(' / ');
        const delivery = `${order.address} · ${order.phone}${order.note ? ` · ${order.note}` : ''}`;
        row.append(cell(`#${order.id.slice(0, 8)} · ${formatDate(order.createdAt)}`), cell(`${order.user.fullName} · ${order.user.email}`), cell(products), cell(delivery), cell(formatCOP(order.totalCop)), cell(order.status));
        ordersTable.append(row);
      }
    } catch (error) {
      apiError.textContent = error.message || 'No fue posible cargar el panel.';
    }
  }

  async function loadCustomerOrders() {
    const container = document.getElementById('customerOrders');
    container.replaceChildren();
    try {
      const response = await fetch('/api/orders', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('No fue posible cargar tus pedidos.');
      const { orders } = await response.json();
      if (!orders.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-orders';
        empty.textContent = 'Aún no tienes pedidos guardados.';
        container.append(empty);
        return;
      }
      for (const order of orders) {
        const card = document.createElement('article');
        card.className = 'customer-order';
        const heading = document.createElement('strong');
        heading.textContent = `Pedido #${order.id.slice(0, 8)} · ${formatDate(order.created_at)}`;
        const detail = document.createElement('p');
        detail.textContent = `${order.items.map((item) => item.name).join(', ')} · ${formatCOP(order.total_cop)} · ${order.status}`;
        card.append(heading, detail);
        container.append(card);
      }
    } catch (error) {
      const message = document.createElement('p');
      message.className = 'login-error';
      message.textContent = error.message;
      container.append(message);
    }
  }

  const finishLogin = (user) => {
    if (user.role === 'admin') {
      showAdmin(user);
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.assign(next);
      return;
    }
    showCustomer(user);
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Verificando…';
    const formData = new FormData(loginForm);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión.');
      loginForm.reset();
      finishLogin(data.user);
    } catch (error) {
      loginError.textContent = error.message.includes('Failed to fetch') ? 'El servicio de cuenta no está disponible.' : error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Iniciar sesión ↗';
    }
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    signupError.textContent = '';
    const button = signupForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Creando cuenta…';
    const formData = new FormData(signupForm);
    const payload = {
      fullName: formData.get('fullName'), email: formData.get('email'), password: formData.get('password'),
      favoriteCuisines: formData.getAll('favoriteCuisines'), dietaryPreferences: formData.getAll('dietaryPreferences'),
      spiceLevel: Number(formData.get('spiceLevel')), profileNotes: formData.get('profileNotes'),
    };
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No fue posible crear la cuenta.');
      signupForm.reset();
      finishLogin(data.user);
    } catch (error) {
      signupError.textContent = error.message.includes('Failed to fetch') ? 'El servicio de cuenta no está disponible.' : error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Crear cuenta ↗';
    }
  });

  document.getElementById('showSignup').addEventListener('click', () => {
    loginForm.hidden = true;
    signupForm.hidden = false;
  });
  document.getElementById('showLogin').addEventListener('click', () => {
    signupForm.hidden = true;
    loginForm.hidden = false;
  });

  document.getElementById('tasteForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById('tasteMessage');
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = '';
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteCuisines: data.getAll('favoriteCuisines'), dietaryPreferences: data.getAll('dietaryPreferences'), spiceLevel: Number(data.get('spiceLevel')), profileNotes: data.get('profileNotes') }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No fue posible guardar tus gustos.');
      fillTasteForm(result.user);
      message.textContent = 'Preferencias guardadas.';
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    window.location.replace('admin.html');
  };
  document.getElementById('logoutButton').addEventListener('click', logout);
  document.getElementById('customerLogout').addEventListener('click', logout);

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => { if (data?.user) finishLogin(data.user); })
    .catch(() => {});
});
