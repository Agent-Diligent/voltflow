// VoltFlow Cart — localStorage-based cart state
// Included on every page that needs cart functionality.

const CART_KEY = 'voltflow_cart';

const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart.updateBadge();
  },

  add(product, qty = 1) {
    const items = Cart.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        displayPrice: product.displayPrice,
        image: product.image,
        qty,
      });
    }
    Cart.save(items);
  },

  remove(id) {
    Cart.save(Cart.get().filter(i => i.id !== id));
  },

  updateQty(id, qty) {
    const items = Cart.get();
    const item = items.find(i => i.id === id);
    if (item) item.qty = qty;
    Cart.save(items.filter(i => i.qty > 0));
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    Cart.updateBadge();
  },

  count() {
    return Cart.get().reduce((sum, i) => sum + i.qty, 0);
  },

  total() {
    return Cart.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  // Format cents as "$1,234"
  formatPrice(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(badge => {
      const count = Cart.count();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  init() {
    Cart.updateBadge();
  },
};

document.addEventListener('DOMContentLoaded', () => Cart.init());
