// Supabase is loaded globally from the CDN in index.html.
const createClient = window.supabase?.createClient;

/*
  KAONGO CONFIGURATION
  1. Open your Supabase project.
  2. Copy the Project URL and Publishable key.
  3. Paste them below. Never put a secret/service_role key in this browser file.
*/
const SUPABASE_URL = "https://csfmxisafbeecxemoqbd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cZHXz2DJSjgwDOmVLHSCGA_JjVTup6G";

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

let supabaseClient = null;
if (isConfigured && typeof createClient === "function") {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    console.error("Could not initialize Supabase:", error);
  }
} else if (isConfigured) {
  console.error("Supabase library did not load. Check internet access or the CDN script in index.html.");
}

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const DEMO_PRODUCTS = [
  { id: null, name: "Chicken Rice", category: "Meals", price: 65, stall_name: "Campus Canteen", description: "Crispy fried chicken, warm rice, and a comforting sauce. A campus classic for a filling break.", emoji: "🍗", image_url: "assets/chicken-rice.webp", total_sold: 0, is_available: true },
  { id: null, name: "Beef Tapa Rice", category: "Meals", price: 85, stall_name: "Campus Canteen", description: "Savory beef tapa with garlic rice and a sunny-side egg. Ready to power your next class.", emoji: "🍳", image_url: "assets/beef-tapa-rice.webp", total_sold: 0, is_available: true },
  { id: null, name: "Chicken Adobo Rice", category: "Meals", price: 75, stall_name: "Homeplate Stall", description: "Tender chicken adobo served with steamed rice and a rich, savory sauce.", emoji: "🍲", image_url: "assets/chicken-adobo-rice.webp", total_sold: 0, is_available: true },
  { id: null, name: "Tuna Sandwich", category: "Snacks", price: 45, stall_name: "Snack Corner", description: "Toasted bread with creamy tuna filling and crisp greens. Easy to enjoy between classes.", emoji: "🥪", image_url: "assets/tuna-sandwich.webp", total_sold: 0, is_available: true },
  { id: null, name: "Pork Siomai (6 pcs)", category: "Snacks", price: 40, stall_name: "Snack Corner", description: "Six steamed siomai pieces served with a chili-soy dipping sauce.", emoji: "🥟", image_url: "assets/siomai.webp", total_sold: 0, is_available: true },
  { id: null, name: "Classic Fries", category: "Snacks", price: 35, stall_name: "Snack Corner", description: "Golden, crispy fries with ketchup. A simple snack for a quick recharge.", emoji: "🍟", image_url: "assets/fries.webp", total_sold: 0, is_available: true },
  { id: null, name: "Iced Lemon Tea", category: "Drinks", price: 30, stall_name: "Campus Drinks", description: "Refreshing iced tea with a bright lemon twist to cool down your day.", emoji: "🍋", image_url: "assets/iced-lemon-tea.webp", total_sold: 0, is_available: true },
  { id: null, name: "Iced Coffee", category: "Drinks", price: 45, stall_name: "Campus Drinks", description: "Chilled, smooth coffee for an afternoon study session.", emoji: "☕", image_url: "assets/iced-coffee.webp", total_sold: 0, is_available: true },
  { id: null, name: "Mango Shake", category: "Drinks", price: 55, stall_name: "Campus Drinks", description: "A cool, creamy mango shake made for sunny campus afternoons.", emoji: "🥭", image_url: "assets/mango-shake.webp", total_sold: 0, is_available: true }
];

const state = {
  view: "loading",
  authMode: "login",
  session: null,
  profile: null,
  products: DEMO_PRODUCTS,
  databaseReady: false,
  category: "All",
  search: "",
  selectedProductId: null,
  quantity: 1,
  cart: [],
  paymentMethod: "cash",
  orders: [],
  selectedOrder: null,
  lastOrder: null,
  authMessage: "",
  authMessageType: "error"
};

const money = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`;
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));
const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function brandMark() {
  return `<div class="brand-symbol" aria-hidden="true"><img src="assets/kaongo-logo.png" alt=""></div>`;
}

function getProduct(id) {
  return state.products.find((product) => String(product.id) === String(id)) || null;
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
}

function dateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultPickupTime() {
  const date = new Date(Date.now() + 20 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return dateTimeLocalValue(date);
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  }).format(date);
}

function friendlyStatus(status = "pending") {
  const labels = {
    pending: "Pending",
    preparing: "Preparing",
    ready: "Ready for pickup",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return labels[status] || status;
}

function orderCode(id) {
  return `KG-${String(id || "ORDER").replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function bottomNav(active) {
  const tabs = [
    ["home", "Home"], ["menu", "Menu"], ["orders", "Orders"], ["profile", "Profile"]
  ];
  return `<nav class="bottom-nav" aria-label="Main navigation">
    ${tabs.map(([view, label]) => `<button type="button" data-action="nav" data-view="${view}" class="${active === view ? "active" : ""}" ${active === view ? 'aria-current="page"' : ""}>${label}</button>`).join("")}
  </nav>`;
}

function cartButton() {
  return `<button type="button" class="cart-button" data-action="open-cart">Cart <strong>(${cartCount()})</strong></button>`;
}

function loadingScreen() {
  return `<section class="loading-screen" aria-label="Loading KaonGO">
    ${brandMark()}
    <h1>KaonGO</h1>
    <p class="tagline">Good food. Less waiting.</p>
    <div class="loading-track"><span></span></div>
    <p class="loading-copy">Finding your next bite…</p>
    <p class="campus-caption">FRESH FROM YOUR CAMPUS</p>
  </section>`;
}

function welcomeScreen() {
  return `<section class="screen auth-screen">
    <div class="auth-top">
      ${brandMark()}
      <h1 class="brand-wordmark">KaonGO</h1>
      <p class="eyebrow">Fresh from your campus</p>
    </div>
    <div class="auth-card">
      <h2>Good food. Less waiting.</h2>
      <p class="auth-subtitle">Order ahead, skip the long line, and pick up your food on campus.</p>
      <button type="button" class="primary-button" data-action="get-started">Get Started <span aria-hidden="true">→</span></button>
      <p class="auth-switch">Already have an account? <button type="button" data-action="show-login">Log in</button></p>
      ${!supabaseClient ? `<p class="auth-note">Supabase is not connected. Check the Project URL and Publishable key in <strong>app.js</strong>, check your internet connection, and run <strong>supabase-schema.sql</strong> in Supabase.</p>` : ""}
    </div>
  </section>`;
}

function authScreen(mode = "login") {
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isUpdate = mode === "update-password";
  const title = isSignup ? "Create your account" : isForgot ? "Reset your password" : isUpdate ? "Choose a new password" : "Welcome back";
  const subtitle = isSignup
    ? "Join KaonGO and order your campus favorites."
    : isForgot
      ? "Enter your email and we’ll send you a password reset link."
      : isUpdate
        ? "Set a new password for your KaonGO account."
        : "Log in to order ahead and track your campus pickup.";

  return `<section class="screen auth-screen">
    <div class="auth-top">
      ${brandMark()}
      <h1 class="brand-wordmark">KaonGO</h1>
      <p class="eyebrow">Good food. Less waiting.</p>
    </div>
    <div class="auth-card">
      <h2>${title}</h2>
      <p class="auth-subtitle">${subtitle}</p>
      <form data-form="${mode}" novalidate>
        ${isSignup ? `<div class="field"><label for="signup-name">Full name</label><input id="signup-name" name="full_name" type="text" placeholder="Your full name" autocomplete="name" minlength="2" required></div>` : ""}
        ${!isUpdate ? `<div class="field"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required></div>` : ""}
        ${!isForgot ? `<div class="field"><label for="auth-password">${isUpdate ? "New password" : "Password"}</label><input id="auth-password" name="password" type="password" placeholder="At least 8 characters" autocomplete="${isSignup || isUpdate ? "new-password" : "current-password"}" minlength="8" required></div>` : ""}
        ${isSignup || isUpdate ? `<div class="field"><label for="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" name="confirm_password" type="password" placeholder="Enter your password again" autocomplete="new-password" minlength="8" required></div>` : ""}
        ${!isSignup && !isForgot && !isUpdate ? `<div class="form-tools"><button class="text-button" type="button" data-action="forgot-password">Forgot password?</button></div>` : ""}
        <p class="form-message ${state.authMessageType === "success" ? "success" : ""}" role="alert">${escapeHtml(state.authMessage)}</p>
        <button class="primary-button" type="submit">${isSignup ? "Create Account" : isForgot ? "Send Reset Link" : isUpdate ? "Update Password" : "Log In"}</button>
      </form>
      ${isUpdate ? "" : `<p class="auth-switch">${isSignup ? "Already registered?" : isForgot ? "Remember your password?" : "New to KaonGO?"}
        <button type="button" data-action="${isSignup || isForgot ? "show-login" : "show-signup"}">${isSignup || isForgot ? "Log in" : "Create an account"}</button>
      </p>`}
      <p class="auth-switch"><button type="button" data-action="back-welcome">← Back to welcome</button></p>
    </div>
  </section>`;
}

function productImage(product) {
  const knownImage = {
    "Chicken Rice": "assets/chicken-rice.webp",
    "Beef Tapa Rice": "assets/beef-tapa-rice.webp",
    "Chicken Adobo Rice": "assets/chicken-adobo-rice.webp",
    "Tuna Sandwich": "assets/tuna-sandwich.webp",
    "Pork Siomai (6 pcs)": "assets/siomai.webp",
    "Classic Fries": "assets/fries.webp",
    "Iced Lemon Tea": "assets/iced-lemon-tea.webp",
    "Iced Coffee": "assets/iced-coffee.webp",
    "Mango Shake": "assets/mango-shake.webp"
  };
  return product.image_url || knownImage[product.name] || "assets/chicken-rice.webp";
}

function renderProductCard(product) {
  const id = product.id ?? product.name;
  return `<button type="button" class="product-card" data-action="open-product" data-id="${escapeHtml(id)}">
    <span class="product-photo-wrap"><img class="product-photo" src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/chicken-rice.webp'"></span>
    <span class="product-info">
      <strong>${escapeHtml(product.name)}</strong>
      <small>${escapeHtml(product.stall_name || "Campus stall")}</small>
      <span class="product-price">${money(product.price)}</span>
    </span>
    <span class="product-arrow" aria-hidden="true">›</span>
  </button>`;
}

function firstName() {
  const fullName = state.profile?.full_name || state.session?.user?.user_metadata?.full_name || "there";
  return String(fullName).trim().split(/\s+/)[0] || "there";
}

function renderHome() {
  const products = [...state.products].filter((product) => product.is_available !== false);
  const hasSales = products.some((product) => Number(product.total_sold || 0) > 0);
  const sorted = products.sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0));
  const starterOrder = ["Chicken Rice", "Beef Tapa Rice", "Iced Lemon Tea"];
  const picks = hasSales
    ? sorted.slice(0, 4)
    : starterOrder.map((name) => products.find((product) => product.name === name)).filter(Boolean);
  const categories = [
    ["Meals", "🍱", "Rice meals"],
    ["Snacks", "🥪", "Quick bites"],
    ["Drinks", "🥤", "Cool drinks"]
  ];

  return `<section class="screen home-screen">
    <div class="screen-content">
      <header class="topbar home-topbar">
        <div class="home-brand-lockup"><div class="mini-brand-mark"><img src="assets/kaongo-logo.png" alt=""></div><div><div class="topbar-brand">KaonGO</div><small>Campus food, made easy</small></div></div>
        ${cartButton()}
      </header>

      <section class="home-greeting">
        <p class="eyebrow">YOUR CAMPUS FOOD COMPANION</p>
        <h1>Hey, ${escapeHtml(firstName())} <span aria-hidden="true">👋</span></h1>
        <p>Ready for a little break? Good food is just a few taps away.</p>
      </section>

      <section class="home-hero">
        <div class="home-hero-copy">
          <span class="hero-kicker">A LITTLE REFUEL GOES A LONG WAY</span>
          <h2>Fuel your focus. Make every break count.</h2>
          <p>Take a breath, grab your favorite bite, and get back to doing great things.</p>
          <button type="button" class="hero-button" data-action="nav" data-view="menu">Explore the menu <span>→</span></button>
        </div>
        <div class="hero-food-stamp" aria-hidden="true"><span>GOOD</span><strong>FOOD</strong><span>GOOD MOOD</span><b>✦</b></div>
      </section>

      <section class="home-categories">
        <div class="section-row"><div><h2>What are you craving?</h2><p>Pick a category and find your break-time favorite.</p></div></div>
        <div class="quick-categories">
          ${categories.map(([category, icon, label]) => `<button type="button" class="quick-category" data-action="home-category" data-category="${category}"><span class="quick-category-icon">${icon}</span><strong>${category}</strong><small>${label}</small></button>`).join("")}
        </div>
      </section>

      <section class="home-favorites">
        <div class="section-row favorites-heading">
          <div><h2>${hasSales ? "Most ordered by students" : "Student picks to try first"}</h2><p>${hasSales ? "Ranked by the number of items ordered on KaonGO." : "A few campus favorites to get your first order started."}</p></div>
          <button type="button" class="text-button" data-action="nav" data-view="menu">See all →</button>
        </div>
        <div class="home-food-scroller">
          ${picks.map((product, index) => `<button type="button" class="home-food-card" data-action="open-product" data-id="${escapeHtml(product.id ?? product.name)}">
            <span class="home-food-photo-wrap"><img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/chicken-rice.webp'"><span class="home-food-badge">${hasSales ? `${Number(product.total_sold || 0)} ordered` : (index === 0 ? "Campus pick" : "Try this")}</span></span>
            <span class="home-food-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.stall_name || "Campus stall")}</small><b>${money(product.price)}</b></span>
          </button>`).join("")}
        </div>
      </section>

      <section class="student-note">
        <span class="student-note-icon" aria-hidden="true">✦</span>
        <div><p class="student-note-label">A REMINDER FOR YOU</p><h2>You're doing better than you think.</h2><p>One task at a time. One class at a time. Don't forget to pause, eat well, and give yourself credit for showing up.</p></div>
      </section>

      <section class="home-menu-cta">
        <div><strong>Hungry for something else?</strong><p>Discover more meals, snacks, and drinks.</p></div>
        <button type="button" class="outline-button" data-action="nav" data-view="menu">Browse menu</button>
      </section>
    </div>
    ${bottomNav("home")}
  </section>`;
}

function renderMenuList() {
  const query = state.search.trim().toLowerCase();
  const products = state.products.filter((product) =>
    (state.category === "All" || product.category === state.category) &&
    `${product.name} ${product.stall_name || ""} ${product.description || ""}`.toLowerCase().includes(query)
  );
  if (!products.length) {
    return `<div class="empty-state"><strong>No items found</strong>Try a different search or category.</div>`;
  }
  return `<div class="product-list">${products.map(renderProductCard).join("")}</div>`;
}

function renderMenu() {
  const categories = ["All", "Meals", "Snacks", "Drinks"];
  return `<section class="screen">
    <div class="screen-content">
      <header class="topbar"><div class="topbar-brand">KaonGO</div>${cartButton()}</header>
      <h1 class="screen-heading">Explore the menu</h1>
      <p class="screen-description">Good food for busy days, little breaks, and big ideas.</p>
      <div class="search-box"><input id="menu-search" type="search" data-search placeholder="Search food or campus stalls" value="${escapeHtml(state.search)}" aria-label="Search food or campus stalls"></div>
      <div class="category-tabs category-tabs-four" role="group" aria-label="Food category">
        ${categories.map((category) => `<button type="button" class="category-tab ${state.category === category ? "active" : ""}" data-action="category" data-category="${category}">${category}</button>`).join("")}
      </div>
      <div class="menu-results-heading"><strong>${state.category === "All" ? "All campus favorites" : state.category}</strong><span>${state.products.filter((product) => (state.category === "All" || product.category === state.category) && product.is_available !== false).length} items</span></div>
      <div id="menu-products">${renderMenuList()}</div>
    </div>
    ${bottomNav("menu")}
  </section>`;
}

function renderProduct() {
  const product = state.products.find((item) => String(item.id ?? item.name) === String(state.selectedProductId));
  if (!product) return renderMenu();
  return `<section class="screen">
    <div class="screen-content">
      <header class="topbar"><button type="button" class="ghost-button" data-action="nav" data-view="menu">‹ Menu</button><div class="topbar-brand">KaonGO</div>${cartButton()}</header>
      <div class="product-detail-art"><img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='assets/chicken-rice.webp'"></div>
      <h1 class="product-detail-title">${escapeHtml(product.name)}</h1>
      <p class="product-detail-stall">${escapeHtml(product.stall_name || "Campus stall")}</p>
      <p class="product-detail-price">${money(product.price)}</p>
      <span class="availability">Available · 10–15 min</span>
      <p class="product-description">${escapeHtml(product.description || "Freshly prepared for campus pickup.")}</p>
      <div class="quantity-row">
        <strong>Quantity</strong>
        <div class="quantity-control">
          <button type="button" data-action="quantity-down" aria-label="Decrease quantity">−</button>
          <output>${state.quantity}</output>
          <button type="button" data-action="quantity-up" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="primary-button" data-action="add-to-cart">Add to Cart · ${money(product.price * state.quantity)}</button>
    </div>
    ${bottomNav("menu")}
  </section>`;
}

function renderCheckout() {
  if (!state.cart.length) {
    return `<section class="screen"><div class="screen-content"><header class="topbar"><button type="button" class="ghost-button" data-action="nav" data-view="menu">‹ Menu</button><div class="topbar-brand">KaonGO</div></header><div class="empty-state" style="margin-top:55px"><strong>Your cart is empty</strong>Add a meal or drink before checking out.<button type="button" class="primary-button" style="margin-top:18px" data-action="nav" data-view="menu">Browse Menu</button></div></div>${bottomNav("menu")}</section>`;
  }
  const itemsHtml = state.cart.map((item) => `<div class="checkout-item">
    <span class="checkout-photo-wrap"><img class="checkout-photo" src="${escapeHtml(productImage(item))}" alt="${escapeHtml(item.name)}"></span>
    <span class="checkout-item-copy"><strong>${escapeHtml(item.name)} × ${item.quantity}</strong><small>${escapeHtml(item.stall_name || "Campus stall")}</small></span>
    <span class="checkout-item-price">${money(item.price * item.quantity)}</span>
  </div>`).join("");
  return `<section class="screen">
    <div class="screen-content">
      <div class="checkout-header"><button type="button" data-action="back-to-cart">‹ Back</button><h1>Checkout</h1><span></span></div>
      <h2 class="checkout-section-title">Order Summary</h2>
      <div class="checkout-items">${itemsHtml}</div>
      <form data-form="checkout">
        <h2 class="checkout-section-title">Pickup Details</h2>
        <div class="field"><label for="pickup-location">Pickup location</label><input id="pickup-location" name="pickup_location" type="text" value="Campus Canteen" required maxlength="100"></div>
        <div class="field"><label for="pickup-time">Pickup time</label><input id="pickup-time" name="pickup_time" type="datetime-local" value="${defaultPickupTime()}" required></div>
        <div class="field"><label for="order-notes">Order notes (optional)</label><textarea id="order-notes" name="order_notes" placeholder="Add a note for the stall" maxlength="500"></textarea></div>
        <h2 class="checkout-section-title">Payment Method</h2>
        <div class="payment-options">
          <label class="payment-option"><input type="radio" name="payment_method" value="cash" ${state.paymentMethod === "cash" ? "checked" : ""}> Cash on Pickup</label>
          <label class="payment-option"><input type="radio" name="payment_method" value="ewallet" ${state.paymentMethod === "ewallet" ? "checked" : ""}> E-wallet</label>
        </div>
        <p class="payment-hint">E-wallet is recorded as the selected payment method. Online GCash/Maya processing is not connected in this starter.</p>
        <div class="total-row"><span>Total</span><strong>${money(cartTotal())}</strong></div>
        <p class="form-message" role="alert"></p>
        <button type="submit" class="primary-button">Place Order</button>
      </form>
    </div>
  </section>`;
}

function renderOrders() {
  const ordersHtml = state.orders.map((order) => {
    const items = order.order_items || [];
    const itemText = items.length
      ? items.map((item) => `${escapeHtml(item.product_name)} × ${item.quantity}`).join(", ")
      : "Order details";
    return `<article class="order-card">
      <div class="order-card-top"><div><p class="order-code">#${orderCode(order.id)}</p><p class="order-date">${formatDate(order.created_at)}</p></div><span class="status-pill ${escapeHtml(order.status)}">${friendlyStatus(order.status)}</span></div>
      <p class="order-card-summary">${itemText}<br>Pickup: ${escapeHtml(order.pickup_location || "Campus Canteen")} · ${money(order.total_amount)}</p>
      <div class="order-card-actions"><button type="button" class="outline-button" data-action="view-order" data-id="${escapeHtml(order.id)}">View Order</button><button type="button" class="secondary-button" data-action="order-again" data-id="${escapeHtml(order.id)}">Order Again</button></div>
    </article>`;
  }).join("");
  return `<section class="screen">
    <div class="screen-content">
      <h1 class="screen-heading">Orders</h1>
      <p class="screen-description">Your latest campus pickup.</p>
      ${ordersHtml || `<div class="empty-state" style="margin-top:28px"><strong>No orders yet</strong>Your orders will appear here after you place your first order.<button type="button" class="primary-button" style="margin-top:18px" data-action="nav" data-view="menu">Explore Menu</button></div>`}
    </div>
    ${bottomNav("orders")}
  </section>`;
}

function renderOrderDetail() {
  const order = state.selectedOrder;
  if (!order) return renderOrders();
  const items = order.order_items || [];
  return `<section class="screen">
    <div class="screen-content">
      <header class="topbar"><button type="button" class="ghost-button" data-action="nav" data-view="orders">‹ Orders</button><div class="topbar-brand">KaonGO</div><span></span></header>
      <h1 class="screen-heading">Order details</h1>
      <p class="screen-description">${orderCode(order.id)}</p>
      <div class="detail-panel">
        <div class="detail-line"><span>Status</span><strong>${friendlyStatus(order.status)}</strong></div>
        <div class="detail-line"><span>Placed</span><strong>${formatDate(order.created_at)}</strong></div>
        <div class="detail-line"><span>Pickup location</span><strong>${escapeHtml(order.pickup_location || "Campus Canteen")}</strong></div>
        <div class="detail-line"><span>Pickup time</span><strong>${formatDate(order.pickup_time)}</strong></div>
        <div class="detail-line"><span>Payment</span><strong>${order.payment_method === "ewallet" ? "E-wallet" : "Cash on Pickup"}</strong></div>
        <div class="detail-line"><span>Total</span><strong>${money(order.total_amount)}</strong></div>
      </div>
      <h2 class="checkout-section-title">Items</h2>
      <div class="detail-panel order-items-list">
        ${items.map((item) => `<div class="detail-line"><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><strong>${money(item.unit_price * item.quantity)}</strong></div>`).join("") || `<p class="screen-description">No item details returned.</p>`}
      </div>
      <button type="button" class="primary-button" style="margin-top:22px" data-action="nav" data-view="orders">Back to Orders</button>
    </div>
    ${bottomNav("orders")}
  </section>`;
}

function renderProfile() {
  const user = state.session?.user;
  const fullName = state.profile?.full_name || user?.user_metadata?.full_name || "KaonGO User";
  const userType = state.profile?.user_type || "College Student";
  const city = state.profile?.city || "Iligan City";
  return `<section class="screen">
    <div class="screen-content">
      <h1 class="screen-heading">Profile</h1>
      <div class="profile-panel" style="margin-top:28px">
        <h2 class="profile-name">${escapeHtml(fullName)}</h2>
        <p class="profile-meta">${escapeHtml(userType)} · ${escapeHtml(city)}</p>
        <p class="profile-meta">${escapeHtml(user?.email || "")}</p>
      </div>
      <div class="profile-actions">
        <button type="button" class="outline-button" data-action="edit-profile">Edit Profile</button>
        <button type="button" class="outline-button" data-action="help">Help &amp; Support</button>
        <button type="button" class="outline-button danger-button" data-action="logout">Log Out</button>
      </div>
    </div>
    ${bottomNav("profile")}
  </section>`;
}

function renderEditProfile() {
  const profile = state.profile || {};
  return `<section class="screen">
    <div class="screen-content">
      <header class="topbar"><button type="button" class="ghost-button" data-action="nav" data-view="profile">‹ Profile</button><div class="topbar-brand">KaonGO</div><span></span></header>
      <h1 class="screen-heading">Edit Profile</h1>
      <p class="screen-description">Update the details on your account.</p>
      <form data-form="profile" style="margin-top:28px">
        <div class="field"><label for="profile-name">Full name</label><input id="profile-name" name="full_name" type="text" value="${escapeHtml(profile.full_name || "")}" required minlength="2" maxlength="100"></div>
        <div class="field"><label for="profile-phone">Phone number</label><input id="profile-phone" name="phone" type="tel" value="${escapeHtml(profile.phone || "")}" placeholder="09xx xxx xxxx" maxlength="30"></div>
        <div class="field"><label for="profile-role">I am a</label><select id="profile-role" name="user_type"><option ${profile.user_type === "College Student" || !profile.user_type ? "selected" : ""}>College Student</option><option ${profile.user_type === "Faculty" ? "selected" : ""}>Faculty</option><option ${profile.user_type === "Staff" ? "selected" : ""}>Staff</option></select></div>
        <div class="field"><label for="profile-city">City</label><input id="profile-city" name="city" type="text" value="${escapeHtml(profile.city || "Iligan City")}" maxlength="80"></div>
        <p class="form-message" role="alert"></p>
        <button type="submit" class="primary-button">Save Changes</button>
      </form>
    </div>
  </section>`;
}

function renderConfirmation() {
  const order = state.lastOrder;
  if (!order) return renderHome();
  return `<section class="screen confirmation-screen">
    <div class="screen-content">
      <div class="confirmation-check" aria-hidden="true">✓</div>
      <h1>Order placed!</h1>
      <p>Your meal is being prepared.</p>
      <div class="confirmation-summary">
        <div class="detail-line"><span>Order</span><strong>${orderCode(order.id)}</strong></div>
        <div class="detail-line"><span>Items</span><strong>${escapeHtml(order.itemSummary)}</strong></div>
        <div class="detail-line"><span>Pickup</span><strong>${escapeHtml(order.pickupLocation)}</strong></div>
        <div class="detail-line"><span>Payment</span><strong>${order.paymentMethod === "ewallet" ? "E-wallet selected" : "Pay cash at pickup"}</strong></div>
        <div class="detail-line"><span>Total</span><strong>${money(order.total)}</strong></div>
      </div>
      <p>Estimated time: 10–15 minutes</p>
      <button type="button" class="primary-button" style="margin-top:35px" data-action="nav" data-view="menu">Back to Menu</button>
      <button type="button" class="text-button" style="margin-top:12px" data-action="nav" data-view="orders">View My Orders</button>
    </div>
  </section>`;
}

function render() {
  switch (state.view) {
    case "loading": app.innerHTML = loadingScreen(); break;
    case "welcome": app.innerHTML = welcomeScreen(); break;
    case "auth": app.innerHTML = authScreen(state.authMode); break;
    case "home": app.innerHTML = renderHome(); break;
    case "menu": app.innerHTML = renderMenu(); break;
    case "product": app.innerHTML = renderProduct(); break;
    case "checkout": app.innerHTML = renderCheckout(); break;
    case "orders": app.innerHTML = renderOrders(); break;
    case "order-detail": app.innerHTML = renderOrderDetail(); break;
    case "profile": app.innerHTML = renderProfile(); break;
    case "edit-profile": app.innerHTML = renderEditProfile(); break;
    case "confirmation": app.innerHTML = renderConfirmation(); break;
    default: state.view = "welcome"; app.innerHTML = welcomeScreen();
  }
}

function setAuthMessage(message, type = "error") {
  state.authMessage = message;
  state.authMessageType = type;
  const node = app.querySelector(".form-message");
  if (node) {
    node.textContent = message;
    node.classList.toggle("success", type === "success");
  }
}

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error(!isConfigured
      ? "Supabase is not configured. Check the Project URL and Publishable key at the top of app.js."
      : "The Supabase library did not load. Check your internet connection, then refresh the page.");
  }
}

async function loadProfile() {
  if (!supabaseClient || !state.session?.user) return;
  const user = state.session.user;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, phone, user_type, city")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.warn("Could not load profile:", error.message);
    state.profile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || "",
      phone: "",
      user_type: "College Student",
      city: "Iligan City"
    };
    return;
  }
  state.profile = data || {
    id: user.id,
    full_name: user.user_metadata?.full_name || "",
    phone: "",
    user_type: "College Student",
    city: "Iligan City"
  };
}

async function loadProducts() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, category, price, stall_name, description, emoji, image_url, total_sold, is_available")
    .eq("is_available", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    state.databaseReady = false;
    console.warn("Could not load products:", error.message);
    state.products = DEMO_PRODUCTS;
    return;
  }
  state.products = data?.length ? data : DEMO_PRODUCTS;
  state.databaseReady = Boolean(data?.length);
}

async function loadOrders() {
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("orders")
    .select("id, status, total_amount, pickup_location, pickup_time, payment_method, payment_status, created_at, order_items(id, product_id, product_name, quantity, unit_price)")
    .eq("user_id", state.session.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.orders = data || [];
}

async function loadUserData() {
  await Promise.all([loadProfile(), loadProducts()]);
}

function requireSignedIn() {
  if (!state.session?.user) {
    state.view = "auth";
    state.authMode = "login";
    state.authMessage = "Please log in to continue.";
    render();
    return false;
  }
  return true;
}

async function handleSignup(form) {
  requireSupabase();
  const formData = new FormData(form);
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");
  if (fullName.length < 2) throw new Error("Please enter your full name.");
  if (password.length < 8) throw new Error("Your password must be at least 8 characters long.");
  if (password !== confirmPassword) throw new Error("Your passwords do not match.");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;

  if (data.session) {
    state.session = data.session;
    await loadUserData();
    state.view = "home";
    state.authMessage = "";
    render();
    showToast("Welcome to KaonGO!");
  } else {
    state.authMode = "login";
    state.authMessage = "Your account was created. Check your email for the confirmation link, then log in.";
    state.authMessageType = "success";
    state.view = "auth";
    render();
    setAuthMessage(state.authMessage, "success");
  }
}

async function handleLogin(form) {
  requireSupabase();
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  state.session = data.session;
  await loadUserData();
  state.view = "home";
  state.authMessage = "";
  render();
  showToast("You are logged in.");
}

async function handleForgotPassword(form) {
  requireSupabase();
  const email = String(new FormData(form).get("email") || "").trim();
  if (!email) throw new Error("Enter your email address first.");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) throw error;
  setAuthMessage("Password reset link sent. Check your email.", "success");
}

async function handleUpdatePassword(form) {
  requireSupabase();
  const values = new FormData(form);
  const password = String(values.get("password") || "");
  const confirmation = String(values.get("confirm_password") || "");
  if (password.length < 8) throw new Error("Your new password must be at least 8 characters long.");
  if (password !== confirmation) throw new Error("Your passwords do not match.");
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) throw error;
  state.authMessage = "";
  state.authMode = "login";
  state.view = "auth";
  render();
  setAuthMessage("Your password has been updated. You can now log in.", "success");
}

async function handleProfileSave(form) {
  requireSupabase();
  if (!requireSignedIn()) return;
  const data = new FormData(form);
  const profileUpdate = {
    full_name: String(data.get("full_name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    user_type: String(data.get("user_type") || "College Student"),
    city: String(data.get("city") || "").trim()
  };
  if (profileUpdate.full_name.length < 2) throw new Error("Please enter your full name.");
  const { error } = await supabaseClient.from("profiles").update(profileUpdate).eq("id", state.session.user.id);
  if (error) throw error;
  state.profile = { ...state.profile, ...profileUpdate };
  state.view = "profile";
  render();
  showToast("Profile updated.");
}

async function handleCheckout(form) {
  requireSupabase();
  if (!requireSignedIn()) return;
  if (!state.cart.length) throw new Error("Your cart is empty.");
  const formData = new FormData(form);
  const pickupLocation = String(formData.get("pickup_location") || "Campus Canteen").trim();
  const pickupTimeInput = String(formData.get("pickup_time") || "");
  const notes = String(formData.get("order_notes") || "").trim();
  const paymentMethod = String(formData.get("payment_method") || "cash");
  const pickupDate = new Date(pickupTimeInput);
  if (!pickupLocation) throw new Error("Enter a pickup location.");
  if (!pickupTimeInput || Number.isNaN(pickupDate.getTime()) || pickupDate.getTime() < Date.now()) {
    throw new Error("Choose a valid pickup time in the future.");
  }
  if (state.cart.some((item) => !item.id)) {
    throw new Error("The sample menu is being shown because the products table is not connected. Run supabase-schema.sql and make sure your products are loaded before placing an order.");
  }

  const cartSnapshot = [...state.cart];
  const total = cartTotal();
  const itemSummary = cartSnapshot.map((item) => `${item.name} × ${item.quantity}`).join(", ");
  const { data: orderId, error } = await supabaseClient.rpc("place_order", {
    p_items: cartSnapshot.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    p_pickup_location: pickupLocation,
    p_pickup_time: pickupDate.toISOString(),
    p_order_notes: notes || null,
    p_payment_method: paymentMethod
  });
  if (error) throw error;

  state.lastOrder = {
    id: orderId,
    total,
    itemSummary,
    pickupLocation,
    paymentMethod
  };
  state.cart = [];
  state.paymentMethod = "cash";
  state.view = "confirmation";
  render();
  showToast("Your order has been saved.");
}

async function handleLogout() {
  requireSupabase();
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  state.session = null;
  state.profile = null;
  state.cart = [];
  state.orders = [];
  state.view = "welcome";
  render();
  showToast("You have logged out.");
}

function openProduct(id) {
  const product = state.products.find((item) => String(item.id ?? item.name) === String(id));
  if (!product) return;
  state.selectedProductId = product.id ?? product.name;
  state.quantity = 1;
  state.view = "product";
  render();
}

function addToCart() {
  const product = state.products.find((item) => String(item.id ?? item.name) === String(state.selectedProductId));
  if (!product) return;
  const cartItem = state.cart.find((item) => String(item.id ?? item.name) === String(product.id ?? product.name));
  if (cartItem) cartItem.quantity += state.quantity;
  else state.cart.push({ ...product, quantity: state.quantity });
  state.view = "menu";
  state.category = product.category || "Meals";
  state.search = "";
  render();
  showToast(`${product.name} added to your cart.`);
}

async function goToView(view) {
  if (["home", "menu", "orders", "profile"].includes(view) && !requireSignedIn()) return;
  state.view = view;
  if (view === "orders") {
    render();
    try {
      await loadOrders();
      render();
    } catch (error) {
      state.orders = [];
      render();
      showToast(error.message || "Could not load your orders.");
    }
  } else if (view === "profile") {
    await loadProfile();
    render();
  } else {
    render();
  }
}

async function viewOrder(id) {
  const order = state.orders.find((item) => String(item.id) === String(id));
  if (!order) return;
  state.selectedOrder = order;
  state.view = "order-detail";
  render();
}

async function orderAgain(id) {
  const order = state.orders.find((item) => String(item.id) === String(id));
  if (!order) return;
  const sourceItems = order.order_items || [];
  let added = 0;
  for (const source of sourceItems) {
    const product = state.products.find((item) => String(item.id) === String(source.product_id));
    if (!product) continue;
    const existing = state.cart.find((item) => String(item.id) === String(product.id));
    if (existing) existing.quantity += source.quantity;
    else state.cart.push({ ...product, quantity: source.quantity });
    added += 1;
  }
  if (!added) {
    showToast("The original menu items are no longer available.");
    return;
  }
  state.view = "checkout";
  render();
  showToast("Items added to your cart.");
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  try {
    switch (action) {
      case "get-started": state.authMode = "signup"; state.authMessage = ""; state.view = "auth"; render(); break;
      case "show-login": state.authMode = "login"; state.authMessage = ""; state.authMessageType = "error"; state.view = "auth"; render(); break;
      case "show-signup": state.authMode = "signup"; state.authMessage = ""; state.authMessageType = "error"; state.view = "auth"; render(); break;
      case "forgot-password": state.authMode = "forgot"; state.authMessage = ""; state.view = "auth"; render(); break;
      case "back-welcome": state.view = "welcome"; state.authMessage = ""; render(); break;
      case "nav": await goToView(button.dataset.view); break;
      case "open-product": openProduct(button.dataset.id); break;
      case "category": state.category = button.dataset.category; render(); break;
      case "home-category": state.category = button.dataset.category; state.search = ""; state.view = "menu"; render(); break;
      case "quantity-down": state.quantity = Math.max(1, state.quantity - 1); render(); break;
      case "quantity-up": state.quantity = Math.min(20, state.quantity + 1); render(); break;
      case "add-to-cart": addToCart(); break;
      case "open-cart":
        if (!state.cart.length) showToast("Your cart is empty.");
        else { state.view = "checkout"; render(); }
        break;
      case "back-to-cart": state.view = "menu"; render(); break;
      case "view-order": await viewOrder(button.dataset.id); break;
      case "order-again": await orderAgain(button.dataset.id); break;
      case "edit-profile": state.view = "edit-profile"; render(); break;
      case "help": showToast("For help with an order, contact your campus canteen administrator."); break;
      case "logout": await handleLogout(); break;
      default: break;
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Something went wrong.");
  }
});

app.addEventListener("input", (event) => {
  if (!event.target.matches("[data-search]")) return;
  state.search = event.target.value;
  const list = app.querySelector("#menu-products");
  if (list) list.innerHTML = renderMenuList();
});

app.addEventListener("change", (event) => {
  if (event.target.name === "payment_method") {
    state.paymentMethod = event.target.value;
  }
});

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent || "Submit";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Please wait…";
  }
  const messageNode = form.querySelector(".form-message");
  if (messageNode) messageNode.textContent = "";

  try {
    switch (form.dataset.form) {
      case "signup": await handleSignup(form); break;
      case "login": await handleLogin(form); break;
      case "forgot": await handleForgotPassword(form); break;
      case "update-password": await handleUpdatePassword(form); break;
      case "profile": await handleProfileSave(form); break;
      case "checkout": await handleCheckout(form); break;
      default: break;
    }
  } catch (error) {
    console.error(error);
    if (form.dataset.form === "signup" || form.dataset.form === "login" || form.dataset.form === "forgot") {
      setAuthMessage(error.message || "Please try again.");
    } else if (messageNode) {
      messageNode.textContent = error.message || "Please try again.";
    } else {
      showToast(error.message || "Please try again.");
    }
  } finally {
    if (submitButton && submitButton.isConnected) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    state.session = session;
    if (event === "SIGNED_OUT") {
      state.profile = null;
      state.cart = [];
      state.orders = [];
      state.view = "welcome";
      render();
    }
    if (event === "PASSWORD_RECOVERY") {
      state.authMode = "update-password";
      state.authMessage = "Choose a new password for your account.";
      state.authMessageType = "success";
      state.view = "auth";
      window.setTimeout(() => { render(); setAuthMessage(state.authMessage, "success"); }, 0);
    }
    // Do not run database calls inside this callback; let Supabase finish its auth event first.
    if (event === "SIGNED_IN" && state.view === "welcome") {
      window.setTimeout(async () => {
        if (!state.session) return;
        await loadUserData();
        state.view = "home";
        render();
      }, 0);
    }
  });
}

async function boot() {
  render();
  await wait(950);
  if (!supabaseClient) {
    state.view = "welcome";
    render();
    return;
  }
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    if (state.session) {
      await loadUserData();
      state.view = "home";
    } else {
      state.view = "welcome";
    }
  } catch (error) {
    console.error("Session check failed:", error);
    state.view = "welcome";
    showToast("Could not check your session. Please log in again.");
  }
  render();
}

boot();
