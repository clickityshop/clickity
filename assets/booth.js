// In-person sales screen. Works offline once loaded; the log lives in this browser.
(function () {
  const CFG = window.CLICKITY_CONFIG;
  const PRODUCTS = window.CLICKITY_PRODUCTS;
  const Art = window.ClickityArt;
  const LOG_KEY = "clickity-booth-log";
  const $ = (id) => document.getElementById(id);
  const money = (n) => CFG.currency + n.toFixed(2).replace(/\.00$/, "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  let sale = []; // { id, color, qty }
  let cashGiven = 0;
  let log = [];
  try { log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { log = []; }
  const saveLog = () => { try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {} };

  const saleTotal = () => sale.reduce((n, l) => n + l.qty * byId(l.id).price, 0);
  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

  // Product tiles
  $("tiles").innerHTML = PRODUCTS.map((p) => `
    <button class="tap" data-id="${esc(p.id)}">
      ${p.photo ? `<img src="${esc(p.photo)}" alt="">` : Art.svg(p.shape, p.colors[0])}
      <strong>${esc(p.name)}</strong><span>${money(p.price)}</span>
    </button>`).join("");

  let lastTapped = PRODUCTS[0];
  function fillColors(p) {
    $("colorPick").innerHTML = p.colors.map((c) => `<option>${esc(c)}</option>`).join("");
  }
  fillColors(lastTapped);

  $("tiles").addEventListener("click", (e) => {
    const t = e.target.closest(".tap");
    if (!t) return;
    const p = byId(t.dataset.id);
    if (p !== lastTapped) { lastTapped = p; fillColors(p); }
    const color = $("colorPick").value;
    const line = sale.find((l) => l.id === p.id && l.color === color);
    if (line) line.qty++; else sale.push({ id: p.id, color, qty: 1 });
    render();
  });

  $("colorPick").addEventListener("change", () => {
    // Re-color the most recent line if it's the same product
    const last = sale[sale.length - 1];
    if (last && last.id === lastTapped.id && last.qty === 1) { last.color = $("colorPick").value; render(); }
  });

  function render() {
    const counts = {};
    sale.forEach((l) => (counts[l.id] = (counts[l.id] || 0) + l.qty));
    document.querySelectorAll(".tap").forEach((t) => {
      t.querySelector(".n")?.remove();
      if (counts[t.dataset.id]) t.insertAdjacentHTML("beforeend", `<span class="n">${counts[t.dataset.id]}</span>`);
    });
    $("saleLines").innerHTML = sale.length
      ? sale.map((l, i) => `<div><span>${l.qty} × ${esc(byId(l.id).name)} <small class="color-name">${esc(l.color)}</small></span><span>${money(l.qty * byId(l.id).price)} <button data-i="${i}" aria-label="Remove one">−</button></span></div>`).join("")
      : `<p class="color-name">Tap items to add them.</p>`;
    const total = saleTotal();
    $("saleTotal").textContent = money(total);

    const bills = [...new Set([total, 5, 10, 20].filter((b) => b >= total && b > 0))].sort((a, b) => a - b);
    $("cashBtns").innerHTML = bills.map((b) => `<button class="btn small ${b === cashGiven ? "" : "alt"}" data-cash="${b}">${b === total ? "Exact" : money(b)}</button>`).join("");
    $("change").textContent = cashGiven && total ? `Change: ${money(cashGiven - total)}` : "";
    $("complete").disabled = !sale.length;
    renderLog();
  }

  $("saleLines").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    const l = sale[+b.dataset.i];
    if (--l.qty <= 0) sale.splice(+b.dataset.i, 1);
    render();
  });
  $("cashBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cash]");
    if (b) { cashGiven = +b.dataset.cash; render(); }
  });
  $("clearSale").onclick = () => { sale = []; cashGiven = 0; render(); };

  $("complete").onclick = () => {
    if (!sale.length) return;
    log.push({
      at: new Date().toISOString(),
      items: sale.map((l) => ({ ...l, name: byId(l.id).name, price: byId(l.id).price })),
      total: saleTotal(),
    });
    saveLog();
    sale = []; cashGiven = 0;
    render();
  };

  // Log
  function renderLog() {
    const today = log.filter((s) => isToday(s.at));
    const items = today.reduce((n, s) => n + s.items.reduce((m, i) => m + i.qty, 0), 0);
    $("stats").innerHTML = `<span>Today: ${money(today.reduce((n, s) => n + s.total, 0))}</span><span>${items} sold</span>`;
    $("logRows").innerHTML = log.slice().reverse().map((s) => `
      <tr><td>${new Date(s.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
      <td>${s.items.map((i) => `${i.qty}× ${esc(i.name)} (${esc(i.color)})`).join(", ")}</td>
      <td>${money(s.total)}</td></tr>`).join("") || `<tr><td colspan="3" class="color-name">No sales yet.</td></tr>`;
  }

  $("exportCsv").onclick = () => {
    const rows = [["timestamp", "product", "color", "qty", "unit_price", "line_total", "sale_total"]];
    log.forEach((s) => s.items.forEach((i) => rows.push([s.at, i.name, i.color, i.qty, i.price, i.qty * i.price, s.total])));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `clickity-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  $("emailDay").onclick = async () => {
    const today = log.filter((s) => isToday(s.at));
    if (!today.length) { $("logMsg").textContent = "No sales today yet."; return; }
    const tally = {};
    today.forEach((s) => s.items.forEach((i) => {
      const k = `${i.name} (${i.color})`;
      tally[k] = (tally[k] || 0) + i.qty;
    }));
    const total = today.reduce((n, s) => n + s.total, 0);
    $("logMsg").textContent = "Sending…";
    try {
      if (!CFG.orderEmail || CFG.orderEmail === "YOUR_EMAIL_HERE") throw new Error("Set orderEmail in config.js first.");
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CFG.orderEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Clickity booth summary ${new Date().toLocaleDateString()} — ${money(total)}`,
          _template: "table",
          Date: new Date().toLocaleDateString(),
          Sales: today.length,
          "Cash collected": money(total),
          "Items sold": Object.entries(tally).map(([k, n]) => `${n} × ${k}`).join("\n"),
        }),
      });
      if (!res.ok) throw new Error("Send failed.");
      $("logMsg").textContent = "Summary emailed.";
    } catch (ex) {
      $("logMsg").textContent = ex.message + " (Are you online? Download the CSV instead.)";
    }
  };

  $("undoLast").onclick = () => { if (log.length) { log.pop(); saveLog(); renderLog(); } };
  $("resetLog").onclick = () => {
    if ($("resetLog").dataset.armed) { log = []; saveLog(); renderLog(); delete $("resetLog").dataset.armed; $("resetLog").textContent = "Clear log"; }
    else { $("resetLog").dataset.armed = "1"; $("resetLog").textContent = "Tap again to erase all"; }
  };

  render();
})();
