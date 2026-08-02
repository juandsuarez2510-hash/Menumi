document.addEventListener('DOMContentLoaded', () => {
    const cart = [];

    const cartCountEl = document.getElementById('cartCount');
    const cartPanel = document.getElementById('cartPanel');
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartToggle = document.getElementById('cartToggle');
    const waLink = document.getElementById('waOrderLink');

    // Si esta página no tiene carrito (ej. Inicio o Nosotros), no hace nada más.
    if (!cartToggle) return;

    function formatCOP(n) {
        return '$' + n.toLocaleString('es-CO');
    }

    function renderCart() {
        cartCountEl.textContent = cart.length;
        cartItemsEl.innerHTML = '';

        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<p class="cart-empty">Aún no has agregado nada.</p>';
        }

        let total = 0;
        cart.forEach((item) => {
            total += item.price;
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.innerHTML = `<span>${item.name}</span><span>${formatCOP(item.price)}</span>`;
            cartItemsEl.appendChild(row);
        });

        cartTotalEl.textContent = formatCOP(total);

        const lines = cart.map((i) => `- ${i.name} (${formatCOP(i.price)})`).join('%0A');
        const message = cart.length
            ? `Hola Menumi, quiero pedir:%0A${lines}%0A%0ATotal: ${formatCOP(total)}`
            : 'Hola Menumi, quiero hacer un pedido.';
        waLink.href = `https://wa.me/573133971638?text=${message}`;
    }

    document.querySelectorAll('.dish-add').forEach((btn) => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.item;
            const price = parseInt(btn.dataset.price, 10);
            cart.push({ name, price });
            renderCart();

            const originalText = btn.textContent;
            btn.textContent = 'Agregado ✓';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 900);
        });
    });

    cartToggle.addEventListener('click', () => {
        cartPanel.classList.toggle('open');
    });

    renderCart();
});