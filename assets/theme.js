/* Zarnoor storefront controller */

(function () {
  'use strict';

  const settings = window.zarnoorSettings || {};
  const money = (cents) => {
    const value = Math.round(Number(cents || 0) / 100);
    return 'PKR ' + value.toLocaleString('en-PK');
  };

  let cartState = { items: [], total_price: 0, item_count: 0 };
  let qvState = null;
  let lastFocused = null;

  document.addEventListener('DOMContentLoaded', () => {
    initHeroCarousel();
    initDrawers();
    initSearch();
    initQuickView();
    initProductForm();
    initWishlist();
    initCart();
    initCollectionControls();
    initGallery();
    syncCart();
  });

  function initHeroCarousel() {
    const carousel = document.querySelector('[data-hero-carousel]');
    if (!carousel) return;
    if (carousel.dataset.heroInitialized === '1') return;
    carousel.dataset.heroInitialized = '1';

    const slides = Array.from(carousel.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-hero-dot]'));
    if (slides.length < 2) return;

    let activeIndex = 0;
    let timer;

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === activeIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, i) => {
        const active = i === activeIndex;
        dot.classList.toggle('is-active', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    function stopTimer() {
      window.clearInterval(timer);
    }

    function startTimer() {
      stopTimer();
      timer = window.setInterval(() => showSlide(activeIndex + 1), 3000);
    }

    dots.forEach((dot) => dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.heroDot));
      startTimer();
    }));
    let hovered = false;
    carousel.addEventListener('mousemove', () => {
      if (!hovered) {
        hovered = true;
        stopTimer();
      }
    });
    carousel.addEventListener('mouseleave', () => {
      if (hovered) {
        hovered = false;
        startTimer();
      }
    });
    carousel.addEventListener('focusin', stopTimer);
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) startTimer();
    });
    startTimer();
  }

  /* ---------------- Drawers ---------------- */

  function setOverlay(id, on) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', on);
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function lockBody() {
    const open = document.querySelector('.mobile-sidebar.active, .search-drawer.active, .cart-drawer.active, .wishlist-drawer.active, .quickview-modal.active');
    document.body.classList.toggle('is-locked', !!open);
  }

  function initDrawers() {
    const menuBtn = document.getElementById('hamburger-btn');
    const tabbarMenu = document.getElementById('tabbar-menu');
    const sidebarClose = document.getElementById('sidebar-close-btn');
    const menuOverlay = document.getElementById('mobile-drawer-overlay');

    if (menuBtn) menuBtn.addEventListener('click', openMobileSidebar);
    if (tabbarMenu) tabbarMenu.addEventListener('click', openMobileSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeMobileSidebar);
    if (menuOverlay) menuOverlay.addEventListener('click', closeMobileSidebar);

    const cartBtn = document.getElementById('cart-toggle-btn');
    const cartClose = document.getElementById('cart-close-btn');
    const cartOverlay = document.getElementById('cart-drawer-overlay');

    if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
    if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

    document.querySelectorAll('[data-open-cart]').forEach((b) => b.addEventListener('click', openCartDrawer));

    const sidebarWishlist = document.getElementById('sidebar-wishlist-btn');
    if (sidebarWishlist) {
      sidebarWishlist.addEventListener('click', () => {
        closeMobileSidebar();
        openWishlistDrawer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
        closeSearchDrawer();
        closeCartDrawer();
        closeWishlistDrawer();
        closeQuickView();
      }
    });
  }

  function openMobileSidebar() {
    lastFocused = document.activeElement;
    setOverlay('mobile-drawer-overlay', true);
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      sidebar.classList.add('active');
      sidebar.setAttribute('aria-hidden', 'false');
      const close = document.getElementById('sidebar-close-btn');
      if (close) setTimeout(() => close.focus(), 60);
    }
    const btn = document.getElementById('hamburger-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    lockBody();
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
      sidebar.setAttribute('aria-hidden', 'true');
    }
    setOverlay('mobile-drawer-overlay', false);
    const btn = document.getElementById('hamburger-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    lockBody();
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  }

  function openCartDrawer() {
    lastFocused = document.activeElement;
    setOverlay('cart-drawer-overlay', true);
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
      const close = document.getElementById('cart-close-btn');
      if (close) setTimeout(() => close.focus(), 60);
    }
    lockBody();
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
    }
    setOverlay('cart-drawer-overlay', false);
    lockBody();
  }

  function openWishlistDrawer() {
    lastFocused = document.activeElement;
    renderWishlist();
    setOverlay('wishlist-overlay', true);
    const drawer = document.getElementById('wishlist-drawer');
    if (drawer) {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
    }
    lockBody();
  }

  function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    if (drawer) {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
    }
    setOverlay('wishlist-overlay', false);
    lockBody();
  }

  /* ---------------- Search ---------------- */

  function initSearch() {
    const searchBtn = document.getElementById('search-toggle-btn');
    const tabbarSearch = document.getElementById('tabbar-search');
    const searchClose = document.getElementById('search-close-btn');
    const overlay = document.getElementById('search-modal-overlay');
    const input = document.getElementById('search-input-field');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchBtn) searchBtn.addEventListener('click', openSearchDrawer);
    if (tabbarSearch) tabbarSearch.addEventListener('click', openSearchDrawer);
    if (searchClose) searchClose.addEventListener('click', closeSearchDrawer);
    if (overlay) overlay.addEventListener('click', closeSearchDrawer);

    if (input) {
      let timer;
      input.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
        clearTimeout(timer);
        timer = setTimeout(() => predictiveSearch(q), 250);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
        }
        clearBtn.style.display = 'none';
        const results = document.getElementById('predictive-results-box');
        const trending = document.getElementById('trending-searches-box');
        if (results) results.style.display = 'none';
        if (trending) trending.style.display = 'block';
      });
    }

    const wishlistBtn = document.getElementById('wishlist-toggle-btn');
    const wishlistClose = document.getElementById('wishlist-close-btn');
    const wishlistOverlay = document.getElementById('wishlist-overlay');
    if (wishlistBtn) wishlistBtn.addEventListener('click', openWishlistDrawer);
    if (wishlistClose) wishlistClose.addEventListener('click', closeWishlistDrawer);
    if (wishlistOverlay) wishlistOverlay.addEventListener('click', closeWishlistDrawer);
  }

  function openSearchDrawer() {
    lastFocused = document.activeElement;
    setOverlay('search-modal-overlay', true);
    const drawer = document.getElementById('search-drawer');
    if (drawer) {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
    }
    const input = document.getElementById('search-input-field');
    if (input) setTimeout(() => input.focus(), 220);
    lockBody();
  }

  function closeSearchDrawer() {
    const drawer = document.getElementById('search-drawer');
    if (drawer) {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
    }
    setOverlay('search-modal-overlay', false);
    lockBody();
  }

  function fillSearch(term) {
    const input = document.getElementById('search-input-field');
    if (!input) return;
    input.value = term;
    input.focus();
    predictiveSearch(term);
  }

  async function predictiveSearch(query) {
    const resultsBox = document.getElementById('predictive-results-box');
    const trendingBox = document.getElementById('trending-searches-box');

    if (!query || query.length < 2) {
      if (resultsBox) resultsBox.style.display = 'none';
      if (trendingBox) trendingBox.style.display = 'block';
      return;
    }

    if (trendingBox) trendingBox.style.display = 'none';
    if (resultsBox) resultsBox.style.display = 'block';

    const list = document.getElementById('predictive-results-list');
    const viewAllWrap = document.getElementById('view-all-results-wrap');
    const viewAllLink = document.getElementById('view-all-search-link');
    if (!list) return;

    list.innerHTML = '<p class="search-result-price">Searching…</p>';

    try {
      const res = await fetch(
        '/search/suggest.json?q=' + encodeURIComponent(query) +
        '&resources[type]=product&resources[limit]=6'
      );
      if (!res.ok) throw new Error('Search unavailable');
      const data = await res.json();
      const products = (data.resources && data.resources.results && data.resources.results.products) || [];
      renderSearchResults(products, query, list, viewAllWrap, viewAllLink);
    } catch (err) {
      list.innerHTML = '<p class="search-result-price">Search is unavailable right now.</p>';
      if (viewAllWrap) viewAllWrap.style.display = 'none';
    }
  }

  function renderSearchResults(products, query, list, viewAllWrap, viewAllLink) {
    if (!products.length) {
      list.innerHTML = '<p class="search-result-price">No pieces match “' + escapeHtml(query) + '”. Try a fabric name.</p>';
      if (viewAllWrap) viewAllWrap.style.display = 'none';
      return;
    }

    list.innerHTML = products.slice(0, 6).map((p) => {
      let image = p.featured_image && p.featured_image.url ? p.featured_image.url : (p.image || '');
      if (image.indexOf('//') === 0) image = 'https:' + image;
      const price = p.price || money(p.price_min || 0);
      return (
        '<a href="' + p.url + '" class="search-result-card" onclick="closeSearchDrawer()">' +
          (image ? '<img src="' + image + '" alt="" loading="lazy">' : '') +
          '<h6 class="search-result-title">' + escapeHtml(p.title) + '</h6>' +
          '<span class="search-result-price">' + escapeHtml(price) + '</span>' +
        '</a>'
      );
    }).join('');

    if (viewAllWrap && viewAllLink) {
      viewAllLink.href = '/search?type=product&q=' + encodeURIComponent(query);
      viewAllWrap.style.display = 'block';
    }
  }

  /* ---------------- Quick view ---------------- */

  function initQuickView() {
    const overlay = document.getElementById('quickview-overlay');
    const closeBtn = document.getElementById('quickview-close-btn');
    if (overlay) overlay.addEventListener('click', closeQuickView);
    if (closeBtn) closeBtn.addEventListener('click', closeQuickView);

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-quick-add]');
      if (!trigger) return;
      e.preventDefault();
      const variants = safeJson(trigger.dataset.variants);
      openQuickView({
        title: trigger.dataset.title,
        url: trigger.dataset.url,
        price: trigger.dataset.price,
        compare: trigger.dataset.compare,
        image: trigger.dataset.image,
        description: trigger.dataset.description,
        optionName: trigger.dataset.optionName || 'Size',
        optionCount: Number(trigger.dataset.optionCount || 1),
        variants: variants
      });
    });
  }

  function openQuickView(data) {
    qvState = { ...data, variant: null };
    lastFocused = document.activeElement;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    const img = document.getElementById('qv-image');
    if (img) {
      img.src = data.image || '';
      img.alt = data.title || '';
    }

    set('qv-title', data.title || '');
    set('qv-code', '');
    set('qv-description', data.description || '');
    set('qv-option-label', data.optionName === 'Size' ? 'Select size' : 'Select ' + String(data.optionName || '').toLowerCase());

    const priceEl = document.getElementById('qv-price');
    if (priceEl) priceEl.textContent = data.price ? 'PKR ' + data.price : '';

    const compareEl = document.getElementById('qv-compare-price');
    if (compareEl) {
      if (data.compare) {
        compareEl.textContent = 'PKR ' + data.compare;
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }

    const viewLink = document.getElementById('qv-view-link');
    if (viewLink) viewLink.href = data.url || '#';

    const guide = document.getElementById('qv-size-guide-link');
    if (guide) guide.href = (data.url || '#') + '#size-guide';

    buildQuickViewOptions(data);

    const addBtn = document.getElementById('qv-add-btn');
    if (addBtn) {
      addBtn.textContent = 'Add to bag';
      addBtn.onclick = () => {
        if (!qvState || !qvState.variant) return;
        addToCart(qvState.variant.id, 1, addBtn);
      };
      if (Number(data.optionCount || 1) > 1) {
        addBtn.textContent = 'Choose options';
        addBtn.onclick = () => { window.location.href = data.url || '#'; };
      }
    }

    overlaySet('quickview-overlay', true);
    const modal = document.getElementById('quickview-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    const close = document.getElementById('quickview-close-btn');
    if (close) setTimeout(() => close.focus(), 60);
    lockBody();
  }

  function buildQuickViewOptions(data) {
    const wrap = document.getElementById('qv-options-wrap');
    const pills = document.getElementById('qv-size-pills');
    const variants = Array.isArray(data.variants) ? data.variants : [];
    if (wrap) wrap.style.display = '';
    if (!pills) return;

    const meaningful = variants.filter((v) => v.title && v.title !== 'Default Title');
    if (Number(data.optionCount || 1) > 1 || !variants.length || meaningful.length <= 1) {
      if (wrap) wrap.style.display = 'none';
      const only = variants.find((v) => v.available) || variants[0];
      if (only) selectQuickViewVariant(only);
      return;
    }

    const seen = [];
    variants.forEach((v) => {
      const label = (v.options && v.options[0]) || v.option1 || v.title;
      if (label && seen.indexOf(label) === -1) seen.push(label);
    });

    pills.innerHTML = seen.map((label) => {
      const available = variants.some((v) => ((v.options && v.options[0]) || v.option1) === label && v.available);
      return '<button type="button" class="size-pill" data-size="' + escapeAttr(label) + '"' +
        (available ? '' : ' disabled') + '>' + escapeHtml(label) + '</button>';
    }).join('');

    pills.querySelectorAll('.size-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.querySelectorAll('.size-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const label = pill.dataset.size;
        const variant = variants.find((v) => ((v.options && v.options[0]) || v.option1) === label && v.available)
          || variants.find((v) => ((v.options && v.options[0]) || v.option1) === label);
        if (variant) selectQuickViewVariant(variant);
      });
    });

    const firstAvailable = variants.find((v) => v.available) || variants[0];
    if (firstAvailable) {
      const label = (firstAvailable.options && firstAvailable.options[0]) || firstAvailable.option1;
      const pill = pills.querySelector('[data-size="' + cssEscape(label) + '"]');
      if (pill) pill.classList.add('active');
      selectQuickViewVariant(firstAvailable);
    }
  }

  function selectQuickViewVariant(variant) {
    qvState.variant = variant;
    const priceEl = document.getElementById('qv-price');
    if (priceEl) priceEl.textContent = money(variant.price);

    const compareEl = document.getElementById('qv-compare-price');
    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = money(variant.compare_at_price);
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }

    const addBtn = document.getElementById('qv-add-btn');
    if (addBtn) {
      addBtn.disabled = !variant.available;
      addBtn.textContent = variant.available ? 'Add to bag' : 'Sold out';
    }
  }

  function closeQuickView() {
    const modal = document.getElementById('quickview-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    overlaySet('quickview-overlay', false);
    lockBody();
  }

  /* ---------------- Cart ---------------- */

  function initCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const qtyBtn = e.target.closest('[data-cart-qty]');
      if (qtyBtn) {
        const line = Number(qtyBtn.dataset.line);
        let quantity = Number(qtyBtn.dataset.quantity);
        const item = cartState.items[line - 1];
        if (item && item.inventory_management && item.inventory_quantity !== undefined && item.inventory_quantity !== null) {
          if (quantity > item.inventory_quantity) {
            quantity = item.inventory_quantity;
            showToast('Only ' + item.inventory_quantity + ' in stock');
          }
        }
        if (quantity < 0) quantity = 0;
        changeLine(line, quantity);
        return;
      }
      const removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) {
        changeLine(Number(removeBtn.dataset.cartRemove), 0);
      }
    });
  }

  async function addToCart(variantId, quantity, btn) {
    if (!variantId) return;
    const label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding…';
    }

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: quantity || 1 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.description || 'This piece could not be added.');
      }
      await syncCart();
      closeQuickView();
      openCartDrawer();
      showToast('Added to bag');
    } catch (error) {
      showToast(error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  }

  async function changeLine(line, quantity) {
    const item = cartState.items[line - 1];
    if (item && item.inventory_management && item.inventory_quantity !== undefined && item.inventory_quantity !== null) {
      if (quantity > item.inventory_quantity) {
        quantity = item.inventory_quantity;
        showToast('Only ' + item.inventory_quantity + ' in stock');
      }
    }
    if (quantity < 0) quantity = 0;
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity })
      });
      if (!res.ok) throw new Error('Could not update bag');
      await syncCart();
    } catch (error) {
      showToast(error.message);
    }
  }

  async function syncCart() {
    try {
      const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      cartState = await res.json();
      renderCartUI(cartState);
    } catch (error) {
      /* keep the server-rendered cart */
    }
  }

  function renderCartUI(cart) {
    document.querySelectorAll('#header-cart-count, .cart-badge').forEach((el) => {
      el.textContent = cart.item_count || 0;
      el.dataset.count = cart.item_count || 0;
    });

    const drawerCount = document.getElementById('cart-drawer-count');
    if (drawerCount) drawerCount.textContent = cart.item_count || 0;

    const subtotal = document.getElementById('cart-subtotal-price');
    if (subtotal) subtotal.textContent = money(cart.total_price);

    updateShipping(cart);

    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (!cart.items || !cart.items.length) {
      container.innerHTML =
        '<div class="cart-empty">' +
          '<p class="cart-empty-title">Your bag is empty</p>' +
          '<p>Add a piece to begin.</p>' +
          '<a href="/collections/all" class="btn btn--outline" onclick="closeCartDrawer()">Shop all</a>' +
        '</div>';
      return;
    }

    container.innerHTML = cart.items.map((item, index) => {
      const image = item.image ? item.image.replace(/(\.[a-z]{3,4})(\?.*)?$/i, '_200x$1') : '';
      const variant = item.variant_title && item.variant_title !== 'Default Title'
        ? '<span class="cart-item-meta">' + escapeHtml(item.variant_title) + '</span>'
        : '';
      const sku = item.sku ? '<span class="cart-item-meta">Code: ' + escapeHtml(item.sku) + '</span>' : '';
      const atStock = item.inventory_management && item.inventory_quantity !== undefined && item.inventory_quantity !== null && item.quantity >= item.inventory_quantity;
      return (
        '<div class="cart-item" data-line="' + (index + 1) + '">' +
          '<a href="' + item.url + '">' +
            (image ? '<img src="' + image + '" alt="" width="74" height="100" loading="lazy">' : '') +
          '</a>' +
          '<div class="cart-item-info">' +
            '<h5 class="cart-item-title">' + escapeHtml(item.product_title) + '</h5>' +
            variant + sku +
            '<span class="cart-item-price">' + money(item.final_line_price) + '</span>' +
            '<button type="button" class="cart-item-remove" data-cart-remove="' + (index + 1) + '">Remove</button>' +
          '</div>' +
          '<div class="cart-item-qty">' +
            '<button type="button" class="qty-btn" data-cart-qty data-line="' + (index + 1) + '" data-quantity="' + (item.quantity - 1) + '" aria-label="Decrease quantity">−</button>' +
            '<span class="qty-num">' + item.quantity + '</span>' +
            '<button type="button" class="qty-btn" data-cart-qty data-line="' + (index + 1) + '" data-quantity="' + (item.quantity + 1) + '" aria-label="Increase quantity"' + (atStock ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function updateShipping(cart) {
    const threshold = Number(settings.freeShipping || 0);
    const bar = document.getElementById('shipping-progress-bar');
    const text = document.getElementById('shipping-progress-text');
    if (!bar || !text) return;

    const total = Math.round((cart.total_price || 0) / 100);
    let percent = 100;

    if (threshold > 0) {
      percent = Math.min(100, Math.round((total / threshold) * 100));
      text.textContent = total >= threshold
        ? 'Free delivery unlocked'
        : money(threshold * 100 - cart.total_price) + ' away from free delivery';
    } else {
      text.textContent = '';
    }

    bar.style.width = percent + '%';
  }

  function checkoutViaWhatsApp() {
    const items = cartState.items || [];
    if (!items.length) {
      showToast('Your bag is empty');
      return;
    }
    const lines = items.map((item) => '• ' + item.quantity + 'x ' + item.product_title + ' (' + money(item.final_line_price) + ')').join('\n');
    const message = 'Hello Zarnoor, I would like to order:\n\n' + lines + '\n\nTotal: ' + money(cartState.total_price) + '\nPayment: Cash on delivery';
    window.open('https://wa.me/' + (settings.whatsapp || '923008291920') + '?text=' + encodeURIComponent(message), '_blank');
  }

  /* ---------------- Product page ---------------- */

  function initProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    const jsonEl = document.getElementById('product-variants-json');
    const variants = jsonEl ? safeJson(jsonEl.textContent) : [];
    const invEl = document.getElementById('product-inventory-json');
    let inventoryMap = invEl ? (safeJson(invEl.textContent) || {}) : {};
    const hidden = document.getElementById('selected-variant-id');
    const priceEl = document.getElementById('product-price');
    const compareEl = document.getElementById('product-compare');
    const stockEl = document.getElementById('stock-note');
    const addBtn = document.getElementById('product-add-btn');
    const skuEl = document.querySelector('.product-sku');

    let selected = variants.find((v) => String(v.id) === String(hidden.value)) || variants[0];
    let stockCap = null;

    // inventory_management/quantity are not always present in the rendered variant
    // JSON, so fetch them from Shopify's AJAX product endpoint as a fallback.
    (function fetchInventory() {
      const match = window.location.pathname.match(/\/products\/([^\/\?]+)/);
      const handle = match ? match[1] : null;
      if (!handle) return;
      fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !Array.isArray(data.variants)) return;
          data.variants.forEach((v) => {
            inventoryMap[String(v.id)] = {
              qty: Number(v.inventory_quantity),
              tracked: !!v.inventory_management
            };
          });
          if (selected) update(selected);
        })
        .catch(() => { /* keep Liquid-provided map */ });
    })();

    function stockOf(variant) {
      if (!variant) return null;
      const info = inventoryMap[String(variant.id)];
      if (!info || !info.tracked) return null;
      const q = Number(info.qty);
      return Number.isFinite(q) && q >= 0 ? q : null;
    }

    const update = (variant) => {
      if (!variant) return;
      selected = variant;
      if (hidden) hidden.value = variant.id;
      if (priceEl) priceEl.textContent = money(variant.price);
      if (compareEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          compareEl.textContent = money(variant.compare_at_price);
          compareEl.style.display = '';
        } else {
          compareEl.style.display = 'none';
        }
      }
      stockCap = stockOf(variant);
      const inStock = variant.available && (stockCap === null || stockCap > 0);
      if (stockEl) stockEl.textContent = variant.available
        ? (stockCap !== null ? 'In stock (' + stockCap + ')' : 'In stock')
        : 'Sold out';
      if (addBtn) {
        addBtn.disabled = !inStock;
        addBtn.textContent = inStock ? 'Add to bag' : 'Sold out';
      }
      if (skuEl && variant.sku) skuEl.textContent = 'Code: ' + variant.sku;

      if (qty) {
        if (stockCap !== null && stockCap > 0) {
          qty.setAttribute('max', String(stockCap));
        } else {
          qty.removeAttribute('max');
        }
        const current = Number(qty.value) || 1;
        if (stockCap !== null && current > stockCap) qty.value = Math.max(1, stockCap);
        if (plus) plus.disabled = stockCap !== null && Number(qty.value) >= stockCap;
      }

      document.querySelectorAll('.option-value').forEach((btn) => {
        const position = Number(btn.dataset.optionPosition) - 1;
        const value = variant.options ? variant.options[position] : variant['option' + (position + 1)];
        btn.classList.toggle('is-selected', value === btn.dataset.optionValue);
      });
    };

    document.querySelectorAll('.option-value').forEach((btn) => {
      btn.addEventListener('click', () => {
        const position = Number(btn.dataset.optionPosition) - 1;
        const current = selected.options ? selected.options.slice() : [selected.option1, selected.option2, selected.option3];
        current[position] = btn.dataset.optionValue;
        const match = variants.find((v) => {
          const opts = v.options || [v.option1, v.option2, v.option3];
          return current.every((val, i) => !val || opts[i] === val);
        }) || variants.find((v) => {
          const opts = v.options || [v.option1, v.option2, v.option3];
          return opts[position] === btn.dataset.optionValue && v.available;
        }) || variants.find((v) => {
          const opts = v.options || [v.option1, v.option2, v.option3];
          return opts[position] === btn.dataset.optionValue;
        });
        if (match) update(match);
      });
    });

    const qty = document.getElementById('product-qty');
    const minus = document.querySelector('[data-qty-minus]');
    const plus = document.querySelector('[data-qty-plus]');
    function clampQty() {
      if (!qty) return;
      let v = Number(qty.value);
      if (!Number.isFinite(v) || v < 1) v = 1;
      if (stockCap !== null && v > stockCap) v = Math.max(1, stockCap);
      qty.value = v;
      if (plus) plus.disabled = stockCap !== null && v >= stockCap;
    }
    if (minus) minus.addEventListener('click', () => { if (qty) { qty.value = Math.max(1, Number(qty.value) - 1); clampQty(); } });
    if (plus) plus.addEventListener('click', () => { if (qty) { qty.value = Number(qty.value) + 1; clampQty(); } });
    if (qty) qty.addEventListener('input', clampQty);
    if (qty) qty.addEventListener('change', clampQty);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selected || !selected.available) return;
      clampQty();
      let requested = Number(qty ? qty.value : 1);
      if (!Number.isFinite(requested) || requested < 1) requested = 1;

      // fetch a fresh cart so the stock check reflects the latest bag
      let items = cartState.items || [];
      try {
        const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const fresh = await res.json();
          cartState = fresh;
          items = fresh.items || [];
          renderCartUI(cartState);
        }
      } catch (err) { /* fall back to cached cartState */ }

      const existing = items.find((i) => String(i.variant_id) === String(selected.id));
      const existingQty = existing ? Number(existing.quantity) || 0 : 0;
      if (stockCap !== null) {
        const room = Math.max(0, stockCap - existingQty);
        if (room <= 0) {
          showToast('You already have all ' + stockCap + ' in your bag');
          return;
        }
        if (requested > room) {
          requested = room;
          showToast('Only ' + room + ' more can be added (' + stockCap + ' in stock)');
        }
      }
      if (stockCap !== null && requested > stockCap) requested = Math.max(1, stockCap);
      addToCart(selected.id, Math.max(1, requested), addBtn);
    });
  }

  function initGallery() {
    const main = document.getElementById('gallery-main-image');
    const thumbs = document.querySelectorAll('[data-gallery-thumb]');
    if (main && thumbs.length) {
      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          thumbs.forEach((t) => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
          main.src = thumb.dataset.src;
          if (thumb.dataset.srcset) main.srcset = thumb.dataset.srcset;
        });
      });
    }

    const sizeGuide = document.getElementById('size-guide');
    if (sizeGuide) {
      if (location.hash === '#size-guide') sizeGuide.open = true;
      document.querySelectorAll('[data-open-size-guide]').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          sizeGuide.open = true;
          sizeGuide.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
  }

  /* ---------------- Wishlist ---------------- */

  function wishlistRead() {
    try {
      return JSON.parse(localStorage.getItem('zarnoor:wishlist') || '[]');
    } catch (e) {
      return [];
    }
  }

  function wishlistWrite(items) {
    localStorage.setItem('zarnoor:wishlist', JSON.stringify(items));
  }

  function initWishlist() {
    document.querySelectorAll('[data-wishlist]').forEach((btn) => {
      if (wishlistRead().some((i) => i.handle === btn.dataset.handle)) btn.classList.add('is-saved');
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wishlist]');
      if (!btn) return;
      e.preventDefault();
      const items = wishlistRead();
      const index = items.findIndex((i) => i.handle === btn.dataset.handle);
      if (index > -1) {
        items.splice(index, 1);
        btn.classList.remove('is-saved');
        showToast('Removed from saved pieces');
      } else {
        items.unshift({
          handle: btn.dataset.handle,
          title: btn.dataset.title,
          url: btn.dataset.url,
          price: btn.dataset.price,
          image: btn.dataset.image
        });
        btn.classList.add('is-saved');
        showToast('Saved');
      }
      wishlistWrite(items);
      renderWishlist();
    });
  }

  function renderWishlist() {
    const body = document.getElementById('wishlist-body');
    if (!body) return;
    const items = wishlistRead();

    if (!items.length) {
      body.innerHTML = '<p class="wishlist-empty">Pieces you save will appear here.</p>';
      return;
    }

    body.innerHTML = items.map((item) => (
      '<div class="wishlist-item">' +
        '<a href="' + item.url + '">' + (item.image ? '<img src="' + item.image + '" alt="" loading="lazy">' : '') + '</a>' +
        '<div><h4><a href="' + item.url + '">' + escapeHtml(item.title) + '</a></h4>' +
          '<div class="card-price"><span>PKR ' + escapeHtml(item.price || '') + '</span></div>' +
        '</div>' +
        '<button type="button" class="wishlist-remove" data-wishlist-remove="' + escapeAttr(item.handle) + '" aria-label="Remove">×</button>' +
      '</div>'
    )).join('');

    body.querySelectorAll('[data-wishlist-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const items2 = wishlistRead().filter((i) => i.handle !== btn.dataset.wishlistRemove);
        wishlistWrite(items2);
        renderWishlist();
        const cardBtn = document.querySelector('[data-wishlist][data-handle="' + cssEscape(btn.dataset.wishlistRemove) + '"]');
        if (cardBtn) cardBtn.classList.remove('is-saved');
      });
    });
  }

  /* ---------------- Collection controls ---------------- */

  function initCollectionControls() {
    const toggle = document.getElementById('filter-toggle');
    const filters = document.getElementById('collection-filters');
    if (toggle && filters) {
      toggle.addEventListener('click', () => {
        const open = filters.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Hide filters' : 'Filter';
      });
    }

    const sort = document.getElementById('sort-select');
    const form = document.getElementById('sort-form');
    if (sort && form) {
      sort.addEventListener('change', () => form.submit());
    }

    if (filters) {
      filters.addEventListener('submit', () => {
        filters.querySelectorAll('[data-price-input]').forEach((input) => {
          if (input.value !== '') input.value = String(Math.round(Number(input.value) * 100));
        });
      });
    }
  }

  /* ---------------- Helpers ---------------- */

  function overlaySet(id, on) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', on);
  }

  function showToast(message) {
    let toast = document.getElementById('zarnoor-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zarnoor-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function safeJson(value) {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function cssEscape(value) {
    return String(value).replace(/"/g, '\\"');
  }

  /* Global handlers used by inline attributes in Liquid */
  window.openMobileSidebar = openMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.openSearchDrawer = openSearchDrawer;
  window.closeSearchDrawer = closeSearchDrawer;
  window.openWishlistDrawer = openWishlistDrawer;
  window.closeWishlistDrawer = closeWishlistDrawer;
  window.fillSearch = fillSearch;
  window.closeQuickView = closeQuickView;
  window.checkoutViaWhatsApp = checkoutViaWhatsApp;
  window.changeShopifyLineQty = changeLine;
  window.shopifyQuickAdd = (id, btn) => addToCart(id, 1, btn);
})();
