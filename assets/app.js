(function () {
  const CFG = window.CLICKITY_CONFIG;
  const PRODUCTS = window.CLICKITY_PRODUCTS;
  const Art = window.ClickityArt;
  const CART_KEY = "clickity-cart";
  const RELEASE_KEY = "clickity-last-seen-commit";
  const $ = (id) => document.getElementById(id);

  const money = (n) => CFG.currency + n.toFixed(2).replace(/\.00$/, "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  function picture(p, color) {
    return p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">` : Art.svg(p.shape, color);
  }

  function checkForReleaseNotes() {
    const dialog = $("releaseDialog");
    if (!dialog) return;

    const rememberDismissal = () => {
      if (!dialog.dataset.commitSha) return;
      try {
        localStorage.setItem(RELEASE_KEY, dialog.dataset.commitSha);
      } catch (error) {
        console.warn("Could not save the last-seen update.", error);
      }
    };
    dialog.addEventListener("cancel", rememberDismissal);
    $("dismissRelease").addEventListener("click", () => {
      rememberDismissal();
      dialog.close();
    });

    fetch("https://api.github.com/repos/clickityshop/clickity/commits/main", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
        return response.json();
      })
      .then((commit) => {
        if (typeof commit.sha !== "string" || !/^[a-f0-9]{40}$/i.test(commit.sha)) {
          throw new Error("GitHub returned an invalid commit ID.");
        }

        let lastSeenCommit = "";
        try {
          lastSeenCommit = localStorage.getItem(RELEASE_KEY) || "";
        } catch (error) {
          console.warn("Could not read the last-seen update.", error);
        }
        if (lastSeenCommit === commit.sha) return;

        const message = commit.commit?.message;
        if (typeof message !== "string" || !message.trim()) {
          throw new Error("The latest commit has no description.");
        }

        const title = message.trim().split("\n", 1)[0];
        const body = message.trim().slice(title.length).trim();
        $("releaseCommitTitle").textContent = title;
        $("releaseCommitMessage").textContent = body;

        const files = Array.isArray(commit.files) ? commit.files : [];
        const added = files.reduce((sum, file) => sum + (Number(file.additions) || 0), 0);
        const removed = files.reduce((sum, file) => sum + (Number(file.deletions) || 0), 0);
        $("releaseFilesSummary").textContent = files.length
          ? `${files.length} file${files.length === 1 ? "" : "s"} changed · +${added} / −${removed} lines`
          : "See the commit for its changed files.";

        const list = $("releaseFiles");
        files.slice(0, 8).forEach((file) => {
          const item = document.createElement("li");
          item.textContent = file.filename;
          list.append(item);
        });
        if (files.length > 8) {
          const item = document.createElement("li");
          item.textContent = `and ${files.length - 8} more`;
          list.append(item);
        }

        dialog.dataset.commitSha = commit.sha;
        $("releaseCommitLink").href = `https://github.com/clickityshop/clickity/commit/${commit.sha}`;
        dialog.showModal();
      })
      .catch((error) => {
        console.warn("Could not load the latest site update.", error);
      });
  }

  // ---------- Cart state (survives page reloads) ----------
  // Each line: { id, color, qty }
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter((l) => byId(l.id));
  let pendingSubmissionId = crypto.randomUUID();

  function save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    pendingSubmissionId = crypto.randomUUID();
    renderCount();
  }

  function add(id, color, qty) {
    const line = cart.find((l) => l.id === id && l.color === color);
    if (line) line.qty = Math.min(CFG.maxPerItem, line.qty + qty);
    else cart.push({ id, color, qty });
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
    $("grid").innerHTML = PRODUCTS.map((p) => {
      const color = p.colors[Math.floor(Math.random() * p.colors.length)];
      return `
      <article class="card" data-id="${esc(p.id)}">
        <div class="pic">${picture(p, color)}</div>
        <div class="body">
          <h3>${esc(p.name)} <span class="price">${money(p.price)}</span></h3>
          <p>${esc(p.blurb)}</p>
          <div class="fields">
            <label>Color
              <select class="color">${p.colors.map((c) => `<option${c === color ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
            </label>
            <label>Qty
              <input class="qty-in" type="number" min="1" max="${CFG.maxPerItem}" value="1" inputmode="numeric">
            </label>
          </div>
          ${p.soldOut ? `<span class="soldout">Sold out — check back soon</span>` : `<button class="btn blue add">Add to cart</button>`}
        </div>
      </article>`;
    }).join("");
  }

  $("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const p = byId(card.dataset.id);
    const btn = e.target.closest(".add");
    if (!btn) return;
    const qtyIn = card.querySelector(".qty-in");
    const qty = Math.max(1, Math.min(CFG.maxPerItem, parseInt(qtyIn.value, 10) || 1));
    add(p.id, card.querySelector(".color").value, qty);
    qtyIn.value = 1;
    btn.textContent = qty > 1 ? `Added ${qty}!` : "Added!";
    setTimeout(() => (btn.textContent = "Add to cart"), 900);
  });

  $("grid").addEventListener("change", (e) => {
    if (!e.target.matches(".color")) return;
    const card = e.target.closest(".card");
    const p = byId(card.dataset.id);
    if (!p.photo) card.querySelector(".pic").innerHTML = picture(p, e.target.value);
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
      body.innerHTML = `<div class="empty"><p>Your cart is empty.</p><button class="btn blue" id="keepShopping">Browse fidgets</button></div>`;
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
    body.innerHTML = `
      <p><strong>${itemCount()} item${itemCount() === 1 ? "" : "s"}</strong> · ${money(total())} <button class="btn small alt" id="backToCart" style="margin-left:8px">Edit cart</button></p>
      <form class="order" id="orderForm">
        <label>Your name <input name="name" required autocomplete="name"></label>
        <label>Email <input name="email" type="email" required autocomplete="email"></label>
        <label>When should we meet?
          <select name="pickupTime" required>
            <option value="" selected disabled>Choose a time</option>
            <option value="before-school">Before school</option>
            <option value="after-school">After school</option>
          </select>
        </label>
        <label>Where should we meet?
          <input name="pickupLocation" required maxlength="120" placeholder="e.g. by the front office">
        </label>
        <label>Notes <span class="hint">Optional</span>
          <textarea name="notes" rows="2" placeholder="Anything we should know?"></textarea></label>
        <label class="terms-accept">
          <input name="acceptedTerms" type="checkbox" required>
          I agree to the <a href="terms.html" target="_blank" rel="noopener">site and order terms</a>.
        </label>
        <input class="hp" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="note">${esc(CFG.orderApiUrl
          ? `${CFG.pickupNote} Your name, email, pickup time and place, and any note are shared with Clickity to prepare your order.`
          : "Online orders are not connected yet. Please check back soon.")}</p>
        <p class="error" id="formError" role="alert"></p>
        <button class="btn" type="submit" id="submitOrder" style="justify-content:center" ${CFG.orderApiUrl ? "" : "disabled"}>Place order (${money(total())})</button>
      </form>`;
    $("backToCart").onclick = () => { view = "cart"; renderCart(); };
    $("orderForm").addEventListener("submit", submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const form = e.target;
    const err = $("formError");
    if (!form.checkValidity()) {
      err.textContent = "Please fill in your name, a valid email, and your pickup time and place.";
      form.reportValidity();
      return;
    }
    if (form._honey.value) return; // bot

    const fd = new FormData(form);
    const orderTotal = total();

    const btn = $("submitOrder");
    btn.disabled = true;
    btn.textContent = "Placing order…";
    err.textContent = "";

    try {
      if (!CFG.orderApiUrl) throw new Error("Orders are not connected yet. Please contact Clickity before submitting.");
      const response = await fetch(`${CFG.orderApiUrl.replace(/\/+$/, "")}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: pendingSubmissionId,
          name: fd.get("name"),
          email: fd.get("email"),
          pickupTime: fd.get("pickupTime"),
          pickupLocation: fd.get("pickupLocation"),
          acceptedTerms: fd.get("acceptedTerms") === "on",
          notes: fd.get("notes") || "",
          expectedTotalCents: Math.round(orderTotal * 100),
          items: cart.map(({ id, color, qty }) => ({ id, color, qty })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your order could not be placed. Please try again.");
      cart = [];
      save();
      $("drawerTitle").textContent = "Order received";
      $("drawerBody").innerHTML = `
        <div class="done">
          <div class="big" aria-hidden="true">📦</div>
          <h3>Thanks, ${esc(fd.get("name"))}!</h3>
          <p>Order <strong><code>${esc(result.order.reference)}</code></strong> is ready for Clickity. Bring <strong>${money(result.order.totalCents / 100)}</strong> in cash at pickup.</p>
          <button class="btn blue" id="doneBtn">Back to the shop</button>
        </div>`;
      $("doneBtn").onclick = closeCart;
    } catch (ex) {
      err.textContent = ex.message || "Your order could not be placed. Please try again.";
      btn.disabled = false;
      btn.textContent = `Place order (${money(orderTotal)})`;
    }
  }

  // ---------- Init ----------
  $("heroArt").innerHTML = PRODUCTS.slice(0, 3).map((p) => `<div class="tile">${picture(p, p.colors[0])}</div>`).join("");
  $("year").textContent = new Date().getFullYear();
  const contactEmail = CFG.contactEmail || "hello@example.com";
  const contactLink = $("contactEmail");
  if (contactLink) {
    contactLink.href = `mailto:${contactEmail}`;
    contactLink.textContent = contactEmail;
  }
  renderGrid();
  renderCount();
  checkForReleaseNotes();
})();
