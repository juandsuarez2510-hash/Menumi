document.addEventListener('DOMContentLoaded', () => {
    let cart = [];

    const cartCountEl = document.getElementById('cartCount');
    const cartPanel = document.getElementById('cartPanel');
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartToggle = document.getElementById('cartToggle');
    const cartClearBtn = document.getElementById('cartClear');
    const waLink = document.getElementById('waOrderLink');

    // Si esta página no tiene carrito (ej. Inicio o Nosotros), no hace nada más.
    if (cartToggle) {
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
            cart.forEach((item, index) => {
                total += item.price;
                const row = document.createElement('div');
                row.className = 'cart-row';
                row.innerHTML = `
                    <div class="cart-row-info">
                        <span class="cart-row-name">${item.name}</span>
                        <span class="cart-row-price">${formatCOP(item.price)}</span>
                    </div>
                    <button class="cart-row-remove" data-index="${index}" aria-label="Quitar ${item.name}">×</button>
                `;
                cartItemsEl.appendChild(row);
            });

            cartTotalEl.textContent = formatCOP(total);

            const lines = cart.map((i) => `- ${i.name} (${formatCOP(i.price)})`).join('%0A');
            const message = cart.length
                ? `Hola Menumi, quiero pedir:%0A${lines}%0A%0ATotal: ${formatCOP(total)}`
                : 'Hola Menumi, quiero hacer un pedido.';
            waLink.href = `https://wa.me/573133971638?text=${message}`;

            // Botones de quitar producto individual
            cartItemsEl.querySelectorAll('.cart-row-remove').forEach((removeBtn) => {
                removeBtn.addEventListener('click', () => {
                    const idx = parseInt(removeBtn.dataset.index, 10);
                    cart.splice(idx, 1);
                    renderCart();
                });
            });
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

        if (cartClearBtn) {
            cartClearBtn.addEventListener('click', () => {
                cart = [];
                renderCart();
            });
        }

        renderCart();
    }

    // Animación de aparición de las tarjetas del menú, cada vez que entran o salen de la vista
    const dishes = document.querySelectorAll('.dish');
    if (dishes.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle('in-view', entry.isIntersecting);
            });
        }, { threshold: 0.15 });

        dishes.forEach((dish) => observer.observe(dish));
    }

    // Fotos interactivas (Inicio y Contacto): en celular (sin hover), un toque las abre y otro afuera las cierra
    const interactivePhotos = document.querySelectorAll('.signature-photo, .contact-photo');
    if (interactivePhotos.length) {
        interactivePhotos.forEach((photo) => {
            photo.addEventListener('click', (e) => {
                if (e.target.closest('.sig-btn')) return;
                photo.classList.toggle('is-open');
            });
        });

        document.addEventListener('click', (e) => {
            interactivePhotos.forEach((photo) => {
                if (!photo.contains(e.target)) {
                    photo.classList.remove('is-open');
                }
            });
        });
    }
});