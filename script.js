document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const count = document.getElementById('cartCount');
  const panel = document.getElementById('cartPanel');
  const itemsElement = document.getElementById('cartItems');
  const totalLabel = document.getElementById('cartTotal');
  const toggle = document.getElementById('cartToggle');
  const clear = document.getElementById('cartClear');
  const checkout = document.getElementById('checkoutButton');
  const checkoutMessage = document.getElementById('checkoutMessage');
  const cart = [];
  const formatCOP = (amount) => '$' + amount.toLocaleString('es-CO');

  if (toggle && panel && count && itemsElement && totalLabel && checkout) {
    try {
      const restored = JSON.parse(sessionStorage.getItem('menumi.pendingCart') || '[]');
      if (Array.isArray(restored)) restored.filter((item) => typeof item.name === 'string' && Number.isFinite(item.price)).forEach((item) => cart.push(item));
      sessionStorage.removeItem('menumi.pendingCart');
    } catch { sessionStorage.removeItem('menumi.pendingCart'); }

    const renderCart = () => {
      count.textContent = String(cart.length);
      itemsElement.replaceChildren();
      if (!cart.length) {
        const empty = document.createElement('p');
        empty.className = 'cart-empty';
        empty.textContent = 'Aún no has agregado nada.';
        itemsElement.append(empty);
      }

      let total = 0;
      cart.forEach((item, index) => {
        total += item.price;
        const row = document.createElement('div');
        row.className = 'cart-row';
        const info = document.createElement('div');
        info.className = 'cart-row-info';
        const name = document.createElement('span');
        name.className = 'cart-row-name';
        name.textContent = item.name;
        const price = document.createElement('span');
        price.className = 'cart-row-price';
        price.textContent = formatCOP(item.price);
        const remove = document.createElement('button');
        remove.className = 'cart-row-remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', `Quitar ${item.name}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => { cart.splice(index, 1); renderCart(); });
        info.append(name, price);
        row.append(info, remove);
        itemsElement.append(row);
      });
      totalLabel.textContent = formatCOP(total);
    };

    document.querySelectorAll('.dish-add').forEach((button) => {
      button.addEventListener('click', () => {
        cart.push({ name: button.dataset.item, price: Number(button.dataset.price) });
        renderCart();
        const previous = button.textContent;
        button.textContent = 'Agregado ✓';
        window.setTimeout(() => { button.textContent = previous; }, 1100);
      });
    });

    toggle.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    clear?.addEventListener('click', () => { cart.length = 0; renderCart(); });
    checkout.addEventListener('click', async () => {
      checkoutMessage.textContent = '';
      if (!cart.length) { checkoutMessage.textContent = 'Agrega al menos un producto.'; return; }
      const phone = document.getElementById('deliveryPhone').value.trim();
      const address = document.getElementById('deliveryAddress').value.trim();
      const note = document.getElementById('orderNote').value.trim();
      if (!phone || !address) { checkoutMessage.textContent = 'Completa tu teléfono y dirección de entrega.'; return; }

      checkout.disabled = true;
      checkout.textContent = 'Guardando pedido…';
      try {
        const sessionResponse = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (sessionResponse.status === 401) {
          sessionStorage.setItem('menumi.pendingCart', JSON.stringify(cart));
          window.location.assign('/admin.html?next=/menu.html');
          return;
        }
        if (!sessionResponse.ok) throw new Error('No se pudo verificar tu cuenta. Intenta de nuevo.');
        const response = await fetch('/api/orders', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart, phone, address, note }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          sessionStorage.setItem('menumi.pendingCart', JSON.stringify(cart));
          window.location.assign('/admin.html?next=/menu.html');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'No se pudo guardar el pedido.');
        const order = result.order;
        const lines = order.items.map((item) => `• ${item.name} (${formatCOP(item.price)})`).join('\n');
        const message = `Hola Menumi, acabo de registrar el pedido #${order.id.slice(0, 8)}:\n${lines}\n\nTotal: ${formatCOP(order.total_cop)}\nDirección: ${order.delivery_address}\nTeléfono: ${order.phone}${order.note ? `\nNota: ${order.note}` : ''}`;
        cart.length = 0;
        sessionStorage.removeItem('menumi.pendingCart');
        renderCart();
        window.location.assign(`https://wa.me/573133971638?text=${encodeURIComponent(message)}`);
      } catch (error) {
        checkoutMessage.textContent = error.message.includes('Failed to fetch') ? 'No hay conexión. Intenta de nuevo.' : error.message;
      } finally {
        checkout.disabled = false;
        checkout.textContent = 'Guardar pedido y abrir WhatsApp';
      }
    });
    renderCart();
  }

  const animatedItems = document.querySelectorAll('.reveal, .dish');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(entry.target.classList.contains('dish') ? 'in-view' : 'is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    animatedItems.forEach((element) => observer.observe(element));
  } else {
    animatedItems.forEach((element) => element.classList.add(element.classList.contains('dish') ? 'in-view' : 'is-visible'));
  }
});
