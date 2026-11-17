document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const count = document.getElementById('cartCount');
  const panel = document.getElementById('cartPanel');
  const items = document.getElementById('cartItems');
  const totalLabel = document.getElementById('cartTotal');
  const toggle = document.getElementById('cartToggle');
  const clear = document.getElementById('cartClear');
  const orderLink = document.getElementById('waOrderLink');
  const cart = [];
  const formatCOP = (amount) => '$' + amount.toLocaleString('es-CO');

  if (toggle && panel && count && items && totalLabel && orderLink) {
    const renderCart = () => {
      count.textContent = String(cart.length);
      items.replaceChildren();

      if (!cart.length) {
        const empty = document.createElement('p');
        empty.className = 'cart-empty';
        empty.textContent = 'Aún no has agregado nada.';
        items.append(empty);
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
        remove.addEventListener('click', () => {
          cart.splice(index, 1);
          renderCart();
        });
        info.append(name, price);
        row.append(info, remove);
        items.append(row);
      });

      totalLabel.textContent = formatCOP(total);
      const lines = cart.map((item) => `• ${item.name} (${formatCOP(item.price)})`).join('\n');
      const message = cart.length ? `Hola Menumi, quiero pedir:\n${lines}\n\nTotal: ${formatCOP(total)}` : 'Hola Menumi, quiero hacer un pedido.';
      orderLink.href = `https://wa.me/573133971638?text=${encodeURIComponent(message)}`;
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
