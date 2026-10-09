(function () {
  const CFG = window.CLICKITY_CONFIG;
  const $ = (id) => document.getElementById(id);
  const API = (CFG.orderApiUrl || "").replace(/\/+$/, "");
  const SESSION_KEY = "clickity-owner-session";
  const money = (cents) => CFG.currency + (cents / 100).toFixed(2).replace(/\.00$/, "");
  const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
  let password = "";
  let orders = [];

  function setMessage(target, text) {
    $(target).textContent = text;
  }

  async function request(path, options = {}) {
    if (!API) throw new Error("Orders are not connected yet. Set orderApiUrl in config.js.");
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (password) headers.Authorization = `Bearer ${password}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) signOut();
      throw new Error(result.error || "The order service could not complete this request.");
    }
    return result;
  }

  function signOut() {
    password = "";
    orders = [];
    sessionStorage.removeItem(SESSION_KEY);
    $("loginPanel").hidden = false;
    $("ordersPanel").hidden = true;
    $("signOut").hidden = true;
    $("dashboardPassword").value = "";
  }

  function summarize() {
    const pending = orders.filter((order) => order.status === "pending");
    const due = pending.reduce((sum, order) => sum + order.totalCents, 0);
    $("orderStats").innerHTML = `
      <article class="order-stat"><span>To make</span><strong>${pending.length}</strong><small>orders waiting for pickup</small></article>
      <article class="order-stat"><span>To collect</span><strong>${money(due)}</strong><small>cash from waiting orders</small></article>`;
    const tally = new Map();
    orders.forEach((order) => order.items.forEach((item) => {
      const entry = tally.get(item.id) || { name: item.name, qty: 0 };
      entry.qty += item.qty;
      tally.set(item.id, entry);
    }));
    const popular = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 3);
    $("topPicks").innerHTML = popular.length
      ? `<strong>Best sellers overall</strong>${popular.map((item) => `<span>${esc(item.name)} <b>×${item.qty}</b></span>`).join("")}`
      : `<p class="dashboard-empty">Your best sellers will show up here.</p>`;
  }

  function renderOrders() {
    summarize();
    if (!orders.length) {
      $("ordersList").innerHTML = `<li class="dashboard-empty">No orders yet. New orders will land here.</li>`;
      return;
    }
    $("ordersList").innerHTML = orders.map((order, index) => {
      const date = new Date(order.createdAt);
      const items = order.items.map((item) => `
        <li class="dashboard-item">
          <span class="mini-box" aria-hidden="true"></span>
          <span><strong>${esc(item.name)}</strong><small>${esc(item.color)}</small></span>
          <b>×${item.qty}</b>
        </li>`).join("");
      const collected = order.status === "collected";
      return `
        <li class="dashboard-order ${collected ? "is-collected" : ""}" style="--order-delay:${index * 55}ms">
          <div class="dashboard-order-head">
            <div>
              <span class="order-reference">${esc(order.reference)}</span>
              <time datetime="${esc(order.createdAt)}">${Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
            </div>
            <span class="order-status">${collected ? "Picked up" : "Waiting"}</span>
          </div>
          <div class="customer-details">
            <strong>${esc(order.name)}</strong>
            <span>${esc(order.email)}</span>
            ${order.pickupTime
              ? `<span>Meet ${esc(order.pickupTime === "before-school" ? "before school" : "after school")}</span>`
              : order.homeroom ? `<span>${esc(order.homeroom)}</span>` : `<span>Pickup time not set</span>`}
            <span>${order.pickupLocation ? `At ${esc(order.pickupLocation)}` : "Pickup place not set"}</span>
          </div>
          <ul class="dashboard-items">${items}</ul>
          ${order.notes ? `<p class="customer-notes"><strong>Note:</strong> ${esc(order.notes)}</p>` : ""}
          <div class="dashboard-order-total"><span>${collected ? "Collected" : "Collect at pickup"}</span><strong>${money(order.totalCents)}</strong></div>
          <button class="btn small ${collected ? "alt" : "lime"} order-toggle" data-id="${esc(order.id)}" data-status="${collected ? "pending" : "collected"}">
            ${collected ? "Reopen order" : "Mark picked up & paid"}
          </button>
        </li>`;
    }).join("");
  }

  async function loadOrders() {
    setMessage("ordersMessage", "Loading orders…");
    $("refreshOrders").disabled = true;
    try {
      const result = await request("/api/orders");
      orders = result.orders.slice().sort((a, b) =>
        Number(a.status !== "pending") - Number(b.status !== "pending")
        || new Date(b.createdAt) - new Date(a.createdAt));
      $("loginPanel").hidden = true;
      $("ordersPanel").hidden = false;
      $("signOut").hidden = false;
      renderOrders();
      setMessage("ordersMessage", "");
      $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } catch (error) {
      if ($("ordersPanel").hidden) {
        setMessage("loginMessage", error.message);
        return;
      }
      setMessage("ordersMessage", error.message);
    } finally {
      $("refreshOrders").disabled = false;
    }
  }

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    password = $("dashboardPassword").value;
    await loadOrders();
    if (!$("ordersPanel").hidden && password) sessionStorage.setItem(SESSION_KEY, password);
  });

  $("refreshOrders").addEventListener("click", loadOrders);
  $("signOut").addEventListener("click", signOut);
  $("ordersList").addEventListener("click", async (event) => {
    const button = event.target.closest(".order-toggle");
    if (!button) return;
    button.disabled = true;
    try {
      await request(`/api/orders/${encodeURIComponent(button.dataset.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: button.dataset.status }),
      });
      await loadOrders();
    } catch (error) {
      setMessage("ordersMessage", error.message);
      button.disabled = false;
    }
  });

  password = sessionStorage.getItem(SESSION_KEY) || "";
  if (password) loadOrders();
  window.setInterval(() => {
    if (password && !document.hidden) loadOrders();
  }, 30_000);
})();
