(() => {
  const toast = document.querySelector('#toast');
  const cartCount = document.querySelector('#cartCount');
  const wishlistCount = document.querySelector('#wishlistCount');
  const wishlistDrawer = document.querySelector('#wishlistDrawer');
  const drawerBackdrop = document.querySelector('.drawer-backdrop');
  const wishlistItems = document.querySelector('#wishlistItems');
  const storageKey = 'dipak-store-wishlist';
  let toastTimer;

  if (cartCount && window.shopInitialCartCount !== undefined) {
    cartCount.textContent = window.shopInitialCartCount;
  }

  function notify(message, icon = '#i-check') {
    if (!toast) return;
    toast.innerHTML = `<svg><use href="${icon}"></use></svg><span>${message}</span>`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.innerHTML = ''; }, 2400);
  }

  function readWishlist() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeWishlist(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
    renderWishlist();
  }

  function productData(button) {
    const host = button.closest('[data-product-id]');
    if (!host) return null;
    return {
      id: String(host.dataset.productId || ''),
      name: host.dataset.name || 'Saved product',
      category: host.dataset.category || 'Dipak Store',
      url: host.dataset.url || '#',
      image: host.dataset.image || '',
      price: host.dataset.price || ''
    };
  }

  function escapeHtml(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
  }

  function renderWishlist() {
    const items = readWishlist();
    if (wishlistCount) wishlistCount.textContent = items.length;
    document.querySelectorAll('.wish').forEach((button) => {
      const product = productData(button);
      button.classList.toggle('active', Boolean(product && items.some((item) => item.id === product.id)));
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    if (!wishlistItems) return;
    if (!items.length) {
      wishlistItems.innerHTML = '<div class="drawer-empty"><svg><use href="#i-heart"></use></svg><strong>Nothing saved yet</strong><p>Tap the heart on a product to keep it here.</p></div>';
      return;
    }
    wishlistItems.innerHTML = items.map((item) => `
      <article class="wishlist-item">
        <a href="${escapeHtml(item.url)}"><img src="${escapeHtml(item.image)}" alt=""></a>
        <span><a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.name)}</strong></a><small>${escapeHtml(item.price)}</small></span>
        <button type="button" data-remove-wish="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}"><svg><use href="#i-close"></use></svg></button>
      </article>`).join('');
  }

  function setDrawer(open) {
    wishlistDrawer?.classList.toggle('open', open);
    wishlistDrawer?.setAttribute('aria-hidden', String(!open));
    drawerBackdrop?.classList.toggle('open', open);
    document.body.classList.toggle('drawer-open', open);
  }

  document.querySelectorAll('[data-open-drawer]').forEach((button) => button.addEventListener('click', () => setDrawer(true)));
  document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawer(false);
  });

  document.addEventListener('click', (event) => {
    const wishButton = event.target.closest('.wish');
    if (wishButton) {
      const product = productData(wishButton);
      if (!product || !product.id) return;
      const items = readWishlist();
      const index = items.findIndex((item) => item.id === product.id);
      if (index >= 0) {
        items.splice(index, 1);
        notify(`${product.name} removed from wishlist`, '#i-heart');
      } else {
        items.unshift(product);
        notify(`${product.name} saved to wishlist`, '#i-heart');
      }
      writeWishlist(items);
      return;
    }
    const removeButton = event.target.closest('[data-remove-wish]');
    if (removeButton) {
      writeWishlist(readWishlist().filter((item) => item.id !== removeButton.dataset.removeWish));
      notify('Item removed from wishlist', '#i-heart');
    }
  });

  const searchToggle = document.querySelector('#searchToggle');
  const searchPanel = document.querySelector('#searchPanel');
  const searchInput = document.querySelector('#searchInput');
  function setSearch(open) {
    searchPanel?.classList.toggle('open', open);
    searchToggle?.setAttribute('aria-expanded', String(open));
    if (open) window.setTimeout(() => searchInput?.focus(), 120);
  }
  searchToggle?.addEventListener('click', () => setSearch(!searchPanel?.classList.contains('open')));
  document.querySelector('#searchClose')?.addEventListener('click', () => setSearch(false));

  const mobileButton = document.querySelector('#mobileMenuButton');
  const mainNav = document.querySelector('#mainNav');
  const menuUse = document.querySelector('#menuUse');
  function setMenu(open) {
    mainNav?.classList.toggle('open', open);
    mobileButton?.setAttribute('aria-expanded', String(open));
    menuUse?.setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  mobileButton?.addEventListener('click', () => setMenu(!mainNav?.classList.contains('open')));
  mainNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  document.querySelectorAll('.quick-add').forEach((button) => {
    button.closest('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (button.disabled) return;
      const form = event.currentTarget;
      const card = form.closest('.product-card');
      button.disabled = true;
      button.textContent = 'Adding...';
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error('Unable to add item');
        const current = Number(cartCount?.textContent || 0);
        if (cartCount) cartCount.textContent = current + 1;
        notify(`${card?.dataset.name || 'Product'} added to cart`, '#i-cart');
      } catch (_) {
        notify('Could not add the item. Please try again.', '#i-shield');
      } finally {
        button.disabled = false;
        button.innerHTML = '<svg><use href="#i-cart"></use></svg>Quick add';
      }
    });
  });

  document.querySelector('#promoButton')?.addEventListener('click', (event) => {
    const code = event.currentTarget.dataset.code || 'WELCOME20';
    navigator.clipboard?.writeText(code).catch(() => {});
    notify(`Coupon ${code} copied`);
  });

  document.querySelector('#newsletterForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    notify('You are on the Dipak Store list', '#i-mail');
  });

  document.querySelectorAll('.socials button').forEach((button) => button.addEventListener('click', () => {
    notify('Social profile link is ready for store setup', '#i-user');
  }));
  document.querySelector('.header-actions button[aria-label="Account"]')?.addEventListener('click', () => {
    notify('Customer accounts are coming soon', '#i-user');
  });

  document.querySelectorAll('[data-cart-step]').forEach((button) => button.addEventListener('click', () => {
    const form = button.closest('.cart-quantity');
    const input = form?.querySelector('input[name="quantity"]');
    if (!input) return;
    const next = Math.max(Number(input.min) || 1, Math.min(Number(input.max) || 99, Number(input.value) + Number(button.dataset.cartStep)));
    input.value = next;
    form.classList.add('dirty');
  }));
  document.querySelectorAll('.cart-quantity input').forEach((input) => input.addEventListener('change', () => input.closest('.cart-quantity')?.classList.add('dirty')));

  const paymentDetail = document.querySelector('#paymentDetail');
  const paymentTitle = document.querySelector('#paymentDetailTitle');
  const paymentCopy = document.querySelector('#paymentDetailCopy');
  const bankDetails = document.querySelector('#bankDetails');
  function updatePaymentDetail() {
    const method = document.querySelector('input[name="payment_method"]:checked')?.value;
    const online = method === 'manual_qr' || method === 'bank_transfer';
    paymentDetail?.classList.toggle('visible', online);
    bankDetails?.toggleAttribute('hidden', method !== 'bank_transfer');
    if (paymentTitle) paymentTitle.textContent = method === 'bank_transfer' ? 'Bank transfer details' : 'Manual QR instructions';
    if (paymentCopy) paymentCopy.textContent = method === 'bank_transfer'
      ? 'Transfer the exact order total and enter your transaction reference below.'
      : 'Complete payment from your mobile wallet and enter the transaction reference below.';
  }
  document.querySelectorAll('input[name="payment_method"]').forEach((input) => input.addEventListener('change', updatePaymentDetail));
  updatePaymentDetail();

  document.querySelectorAll('.gallery-thumbs button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.gallery-thumbs button').forEach((item) => item.classList.toggle('active', item === button));
    const source = button.querySelector('img')?.src;
    const mainImage = document.querySelector('#mainProductImage');
    if (source && mainImage) mainImage.src = source;
  }));

  renderWishlist();
})();
