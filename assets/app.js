(function () {
  const CFG = window.CLICKITY_CONFIG;
  const PRODUCTS = window.CLICKITY_PRODUCTS;
  const Art = window.ClickityArt;
  const CART_KEY = "clickity-cart";
  const $ = (id) => document.getElementById(id);

  const money = (n) => CFG.currency + n.toFixed(2).replace(/\.00$/, "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  function picture(p, color) {
    return p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">` : Art.svg(p.shape, color);
  }

  // ---------- Cart state (survives page reloads) ----------
  // Each line: { id, color, qty }
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter((l) => byId(l.id));

  function save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderCount();
  }

  function add(id, color) {
    const line = cart.find((l) => l.id === id && l.color === color);
    if (line) line.qty = Math.min(CFG.maxPerItem, line.qty + 1);
    else cart.push({ id, color, qty: 1 });
    save();
    const badge = $("cartCount");
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }

  function setQty(i, qty) {
    if (qty <= 0) cart.splice(i, 1);
    else cart[i].qty = Math.min(CFG.maxPerItem, qty);
    save();
    renderCart();
  }

  const itemCount = () => cart.reduce((n, l) => n + l.qty, 0);
  const total = () => cart.reduce((n, l) => n + l.qty * byId(l.id).price, 0);

  function renderCount() {
    $("cartCount").textContent = itemCount();
  }

  // ---------- Product grid ----------
  function renderGrid() {
    $("grid").innerHTML = PRODUCTS.map((p) => `
      <article class="card" data-id="${esc(p.id)}">
        <div class="pic">${picture(p, p.colors[0])}</div>
        <div class="body">
          <h3>${esc(p.name)} <span class="price">${money(p.price)}</span></h3>
          <p>${esc(p.blurb)}</p>
          ${p.colors.length > 1 ? `
            <div class="swatches" role="group" aria-label="Color">
              ${p.colors.map((c, i) => `<button class="swatch" style="background:${Art.colorFor(c)}" data-color="${esc(c)}" aria-pressed="${i === 0}" title="${esc(c)}" aria-label="${esc(c)}"></button>`).join("")}
            </div>` : ""}
          <span class="color-name">${esc(p.colors[0])}</span>
          ${p.soldOut ? `<span class="soldout">Sold out — check back soon</span>` : `<button class="btn lime add">Add to cart</button>`}
        </div>
      </article>`).join("");
  }

  $("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const p = byId(card.dataset.id);
    const sw = e.target.closest(".swatch");
    if (sw) {
      card.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", b === sw));
      card.querySelector(".color-name").textContent = sw.dataset.color;
      if (!p.photo) card.querySelector(".pic").innerHTML = picture(p, sw.dataset.color);
      return;
    }
    if (e.target.closest(".add")) {
      add(p.id, card.querySelector(".color-name").textContent);
      const btn = e.target.closest(".add");
      btn.textContent = "Added!";
      setTimeout(() => (btn.textContent = "Add to cart"), 900);
    }
  });

  // ---------- Drawer: cart → checkout → done ----------
  let view = "cart";

  function openCart() {
    view = "cart";
    renderCart();
    document.body.classList.add("cart-open");
    $("drawer").setAttribute("aria-hidden", "false");
    $("closeCart").focus();
  }
  function closeCart() {
    document.body.classList.remove("cart-open");
    $("drawer").setAttribute("aria-hidden", "true");
  }
  $("openCart").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("scrim").addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());

  function renderCart() {
    $("drawerTitle").textContent = view === "checkout" ? "Send your order" : "Your cart";
    const body = $("drawerBody");
    if (!cart.length) {
      body.innerHTML = `<div class="empty"><p>Your cart is empty.</p><button class="btn lime" id="keepShopping">Browse fidgets</button></div>`;
      $("keepShopping").onclick = closeCart;
      return;
    }
    const lines = cart.map((l, i) => {
      const p = byId(l.id);
      return `
        <div class="line-item">
          <div class="thumb">${picture(p, l.color)}</div>
          <div><strong>${esc(p.name)}</strong><small>${esc(l.color)} · ${money(p.price)} each</small></div>
          <div class="qty">
            <button data-i="${i}" data-d="-1" aria-label="Fewer">−</button>
            <span>${l.qty}</span>
            <button data-i="${i}" data-d="1" aria-label="More">+</button>
          </div>
        </div>`;
    }).join("");

    if (view === "cart") {
      body.innerHTML = `${lines}
        <div class="total-row"><span>Total</span><span>${money(total())}</span></div>
        <p class="note">${esc(CFG.pickupNote)}</p><br>
        <button class="btn" id="toCheckout" style="width:100%;justify-content:center">Checkout →</button>`;
      body.querySelectorAll(".qty button").forEach((b) =>
        (b.onclick = () => setQty(+b.dataset.i, cart[+b.dataset.i].qty + +b.dataset.d)));
      $("toCheckout").onclick = () => { view = "checkout"; renderCart(); };
    } else {
      renderCheckout(body);
    }
  }

  function renderCheckout(body) {
    const schoolField = CFG.schools.length
      ? `<select name="school" required><option value="">Choose…</option>${CFG.schools.map((s) => `<option>${esc(s)}</option>`).join("")}</select>`
      : `<input name="school" required autocomplete="organization">`;
    body.innerHTML = `
      <p><strong>${itemCount()} item${itemCount() === 1 ? "" : "s"}</strong> · ${money(total())} <button class="btn small alt" id="backToCart" style="margin-left:8px">Edit cart</button></p>
      <form class="order" id="orderForm" novalidate>
        <label>Your name <input name="name" required autocomplete="name"></label>
        <label>School ${schoolField}</label>
        <label>Grade &amp; homeroom / teacher <span class="hint">So we know where to bring it</span>
          <input name="homeroom" required placeholder="e.g. 7th — Ms. Rivera"></label>
        <label>Email to confirm your order <span class="hint">Yours or a parent's</span>
          <input name="email" type="email" required autocomplete="email"></label>
        <label>Notes <span class="hint">Optional</span>
          <textarea name="notes" rows="2" placeholder="Anything we should know?"></textarea></label>
        <input class="hp" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="note">${esc(CFG.pickupNote)}</p>
        <p class="error" id="formError" role="alert"></p>
        <button class="btn" type="submit" id="submitOrder" style="justify-content:center">Send order (${money(total())})</button>
      </form>`;
    $("backToCart").onclick = () => { view = "cart"; renderCart(); };
    $("orderForm").addEventListener("submit", submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const form = e.target;
    const err = $("formError");
    if (!form.checkValidity()) {
      err.textContent = "Please fill in every required field (and check your email address).";
      form.reportValidity();
      return;
    }
    if (form._honey.value) return; // bot

    const orderId = "CK-" + Date.now().toString(36).toUpperCase().slice(-6);
    const summary = cart.map((l) => {
      const p = byId(l.id);
      return `${l.qty} × ${p.name} (${l.color}) @ ${money(p.price)} = ${money(l.qty * p.price)}`;
    }).join("\n");
    const fd = new FormData(form);

    const payload = {
      _subject: `Clickity order ${orderId} — ${fd.get("name")} (${money(total())})`,
      _template: "table",
      _replyto: fd.get("email"),
      "Order #": orderId,
      Name: fd.get("name"),
      School: fd.get("school"),
      "Grade / homeroom": fd.get("homeroom"),
      Email: fd.get("email"),
      Items: summary,
      "Item count": itemCount(),
      "Total due at pickup": money(total()),
      Notes: fd.get("notes") || "—",
    };

    const btn = $("submitOrder");
    btn.disabled = true;
    btn.textContent = "Sending…";
    err.textContent = "";

    try {
      if (!CFG.orderEmail || CFG.orderEmail === "YOUR_EMAIL_HERE") throw new Error("Order email isn't set up yet (config.js).");
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CFG.orderEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false || data.success === "false") throw new Error(data.message || "The order didn't go through.");
      const totalText = money(total());
      cart = [];
      save();
      $("drawerTitle").textContent = "Order sent!";
      $("drawerBody").innerHTML = `
        <div class="done">
          <div class="big">🎉</div>
          <h3>Thanks, ${esc(fd.get("name"))}!</h3>
          <p>Your order number is <code>${orderId}</code></p>
          <p>Bring <strong>${totalText}</strong> in cash when you pick it up. We'll reach out to <strong>${esc(fd.get("email"))}</strong> when it's ready.</p>
          <button class="btn lime" id="doneBtn">Back to the shop</button>
        </div>`;
      $("doneBtn").onclick = closeCart;
    } catch (ex) {
      err.textContent = ex.message + " Please try again, or tell us in person.";
      btn.disabled = false;
      btn.textContent = `Send order (${money(total())})`;
    }
  }

  // ---------- Init ----------
  $("heroArt").innerHTML = PRODUCTS.slice(0, 3).map((p) => `<div class="tile">${picture(p, p.colors[0])}</div>`).join("");
  $("year").textContent = new Date().getFullYear();
  renderGrid();
  renderCount();
})();
