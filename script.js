/* =====================================================
   CONFIG — edit everything you need right here
   ===================================================== */
const CONFIG = {
  // Top banner (Skillzhub)
  skillzhub: {
    name: "Skillzhub",
    tagline: "Advanced eBay Product Hunting & Selling",
    whatsapp: "923007658405",        // number with country code, no + or spaces
    contact: "+92 300 7658405",      // text shown on the contact button
    website: "https://www.skool.com/skillzhub-5151" // your website
  },
  // Bottom branding (personal)
  author: {
    name: "Tayyab",
    whatsapp: "923291049546",
    facebook: "https://www.facebook.com/tayyabsaeedebay/",
    instagram: "https://www.instagram.com/m.tayyabsaeed0/"
  },
  // Fee defaults per marketplace (all editable; users can also change them in the "Fee settings" panel)
  markets: {
    US: { label: "🇺🇸 USA",       currency: "USD", locale: "en-US", feePct: 14.5, fixed: 0.40, taxPct: 0,  taxName: "Tax" },
    UK: { label: "🇬🇧 UK",        currency: "GBP", locale: "en-GB", feePct: 14.5, fixed: 0.40, taxPct: 20, taxName: "VAT" },
    AU: { label: "🇦🇺 Australia", currency: "AUD", locale: "en-AU", feePct: 14.5, fixed: 0.40, taxPct: 10, taxName: "GST" }
  },
  defaultMarket: "US",
  adPresets: [0, 2, 5, 8, 10, 15],
  taxOnAds: false, // set true if tax/VAT/GST should also be charged on the ad fee
  // Verdict thresholds. BUY needs ALL three; otherwise CONSIDER needs ALL three; otherwise AVOID.
  thresholds: {
    buy:      { profit: 5, margin: 15, roi: 30 }, // profit in currency units, margin & ROI in %
    consider: { profit: 2, margin: 8,  roi: 15 }
  }
};

/* =====================================================
   Helpers
   ===================================================== */
const $ = id => document.getElementById(id);
const STORE_KEY = "skillzhub_ebay_products_v1";
const THEME_KEY = "skillzhub_ebay_theme";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const ok = n => typeof n === "number" && Number.isFinite(n);

function money(n, m) {
  if (!ok(n)) return "—";
  const c = CONFIG.markets[m];
  try { return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency }).format(n); }
  catch (e) { return n.toFixed(2); }
}
const pct = n => ok(n) ? n.toFixed(1) + "%" : "N/A";
const symbol = m => (money(0, m).replace(/[\d.,\s]/g, "") || "$");

let feeState = {};   // editable fee settings per marketplace
let toastTimer;

function toast(t) {
  const el = $("toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* =====================================================
   Calculation
   ===================================================== */
function calculate(i, f) {
  const price = i.price, t = f.taxPct / 100;
  const pctFee = price * f.feePct / 100;
  const fixed = f.fixed;
  const adFee = price * i.ad / 100;
  const tax = (pctFee + fixed + (CONFIG.taxOnAds ? adFee : 0)) * t;
  const fees = pctFee + tax + fixed + adFee;
  const base = i.cost + i.ship + i.other;
  const expenses = base + fees;
  const profit = price - expenses;
  const margin = price > 0 ? profit / price * 100 : null;
  const roi = i.cost > 0 ? profit / i.cost * 100 : null;

  // Break-even: price where profit = 0
  const k = 1 - (f.feePct / 100) * (1 + t) - (i.ad / 100) * (1 + (CONFIG.taxOnAds ? t : 0));
  const breakEven = k > 0 ? (base + fixed * (1 + t)) / k : null;

  // Maximum buying price that still leaves the BUY-level profit
  const maxBuy = price > 0 ? Math.max(0, price - i.ship - i.other - fees - CONFIG.thresholds.buy.profit) : null;

  return { pctFee, fixed, adFee, tax, fees, base, expenses, profit, margin, roi, breakEven, maxBuy };
}

function verdictOf(r, i) {
  if (!(i.price > 0)) return null;
  const meets = th => r.profit >= th.profit && r.margin >= th.margin && (r.roi === null ? r.profit > 0 : r.roi >= th.roi);
  if (meets(CONFIG.thresholds.buy)) return "buy";
  if (meets(CONFIG.thresholds.consider)) return "consider";
  return "avoid";
}
const V = {
  buy:      { icon: "🟢", label: "BUY",      sub: "Strong profit, margin and ROI." },
  consider: { icon: "🟡", label: "CONSIDER", sub: "Workable, but returns are thin. Try lowering cost or ads." },
  avoid:    { icon: "🔴", label: "AVOID",    sub: "Too little profit after fees and costs." }
};

/* =====================================================
   Read + validate inputs
   ===================================================== */
function readInputs() {
  const m = $("market").value;
  const i = { name: $("name").value.trim(), url: $("url").value.trim(), notes: $("notes").value.trim(), market: m,
    price: num($("price").value), cost: num($("cost").value), ship: num($("ship").value), other: num($("other").value), ad: num($("ad").value) };
  const f = feeState[m];
  const errs = [];
  const flag = (id, bad, text) => { $(id).classList.toggle("bad", bad); if (bad) errs.push(text); };
  ["price", "cost", "ship", "other"].forEach(id => flag(id, num($(id).value) < 0, id + " can't be negative"));
  flag("ad", i.ad < 0 || i.ad > 100, "Ad rate must be 0–100%");
  flag("feePct", f.feePct < 0 || f.feePct >= 100, "eBay fee must be 0–99%");
  flag("fixed", f.fixed < 0, "Fixed fee can't be negative");
  flag("taxPct", f.taxPct < 0 || f.taxPct > 100, "Tax must be 0–100%");
  i.price = Math.max(0, i.price); i.cost = Math.max(0, i.cost); i.ship = Math.max(0, i.ship); i.other = Math.max(0, i.other);
  i.ad = Math.min(100, Math.max(0, i.ad));
  return { i, f: { ...f, feePct: Math.min(99, Math.max(0, f.feePct)), fixed: Math.max(0, f.fixed), taxPct: Math.min(100, Math.max(0, f.taxPct)) }, errs };
}

/* =====================================================
   Render results
   ===================================================== */
const COLORS = { cost: "#6c8cff", ship: "#8f7bd8", other: "#b0b8b4", fees: "#e8a317", profit: "#12a678", loss: "#c0392b" };

function update() {
  const m = $("market").value, c = CONFIG.markets[m];
  document.querySelectorAll(".money .cur").forEach(el => { if (el.textContent !== "%") el.textContent = symbol(m); });
  $("taxName").textContent = c.taxName;
  $("feeLabel").textContent = `· ${feeState[m].feePct}% + ${money(feeState[m].fixed, m)} + ${c.taxName} ${feeState[m].taxPct}%`;

  const { i, f, errs } = readInputs();
  $("msg").textContent = errs.length ? "⚠ " + errs[0] : "";
  syncChips();

  const r = calculate(i, f);
  const v = verdictOf(r, i);
  const has = i.price > 0;

  $("verdict").className = "card verdict " + (v || "");
  $("vBadge").textContent = v ? V[v].icon : "—";
  $("vTitle").textContent = v ? V[v].label : "Enter a selling price";
  $("vSub").textContent = v ? V[v].sub : "Results update as you type.";

  const setK = (id, text, val) => { const e = $(id); e.textContent = has ? text : "—"; e.className = has && ok(val) ? (val >= 0 ? "pos" : "neg") : ""; };
  setK("kProfit", money(r.profit, m), r.profit);
  setK("kMargin", pct(r.margin), r.margin);
  setK("kRoi", pct(r.roi), r.roi);

  const row = (l, val, cls = "") => `<tr class="${cls}"><td>${l}</td><td>${money(val, m)}</td></tr>`;
  $("breakdown").innerHTML =
    row("Selling price", i.price, "sum") +
    row(`eBay fee (${f.feePct}%)`, r.pctFee, "sub") +
    row(`${c.taxName} on fees (${f.taxPct}%)`, r.tax, "sub") +
    row("Fixed fee", r.fixed, "sub") +
    row(`Ad fee (${i.ad}%)`, r.adFee, "sub") +
    row("Total eBay fees", r.fees, "sum") +
    row("Product cost", i.cost) + row("Shipping cost", i.ship) + row("Other cost", i.other) +
    row("Total expenses", r.expenses, "sum") +
    row("Net profit", r.profit, "sum") +
    row("Break-even selling price", r.breakEven) +
    row("Max buying price", r.maxBuy);

  // Stacked bar
  const total = Math.max(i.price, r.expenses);
  const seg = [["Cost", i.cost, COLORS.cost], ["Shipping", i.ship, COLORS.ship], ["Other", i.other, COLORS.other], ["eBay fees", r.fees, COLORS.fees], [r.profit >= 0 ? "Profit" : "Loss", Math.abs(r.profit), r.profit >= 0 ? COLORS.profit : COLORS.loss]];
  $("bar").innerHTML = has && total > 0 ? seg.map(s => `<i title="${s[0]}" style="width:${(s[1] / (r.profit < 0 ? r.expenses : total) * 100).toFixed(2)}%;background:${s[2]}"></i>`).join("") : "";
  $("legend").innerHTML = has ? seg.map(s => `<span style="--c:${s[2]}">${s[0]} ${money(s[1], m)}</span>`).join("") : "";

  $("insights").innerHTML = insights(i, r, m, has).map(t => `<li>${t}</li>`).join("");
}

function insights(i, r, m, has) {
  if (!has) return ["Add a selling price and product cost to see your analysis."];
  const out = [];
  const feeShare = r.fees / i.price * 100;
  out.push(`eBay fees and ads take <b>${feeShare.toFixed(1)}%</b> of the selling price (${money(r.fees, m)}).`);
  if (ok(r.breakEven)) {
    const cushion = (i.price - r.breakEven) / i.price * 100;
    out.push(cushion >= 0 ? `You can drop the price by <b>${cushion.toFixed(1)}%</b> (to ${money(r.breakEven, m)}) before you lose money.` : `You need to sell for at least <b>${money(r.breakEven, m)}</b> to break even.`);
  } else out.push("Fees and ads are too high to break even at any price.");
  if (i.cost > 0 && ok(r.maxBuy)) out.push(i.cost > r.maxBuy ? `Your cost is above the <b>${money(r.maxBuy, m)}</b> max buying price for a BUY verdict.` : `Cost is within the <b>${money(r.maxBuy, m)}</b> max buying price for a BUY verdict.`);
  if (i.cost <= 0) out.push("Add a product cost to calculate ROI.");
  if (i.ad > 0 && r.profit > 0 && r.adFee > r.profit) out.push("⚠ Ad spend is larger than your profit. Consider a lower ad rate.");
  if (r.profit < 0) out.push(`⚠ You lose <b>${money(-r.profit, m)}</b> per sale at these numbers.`);
  if (ok(r.margin) && r.margin >= CONFIG.thresholds.buy.margin && r.profit > 0) out.push("Healthy margin. Check sold listings to confirm demand.");
  return out;
}

/* =====================================================
   Saved products
   ===================================================== */
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } };
const store = list => { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch (e) { toast("Could not save (storage blocked)"); return false; } };
const analyse = p => { const r = calculate(p, p.fees); return { r, v: verdictOf(r, p) }; };

function saveProduct() {
  const { i, f, errs } = readInputs();
  if (errs.length) return toast("Fix the highlighted inputs first");
  if (!(i.price > 0)) return toast("Enter a selling price first");
  const list = load();
  list.unshift({ ...i, name: i.name || "Untitled product", fees: f, id: Date.now().toString(36), date: new Date().toISOString() });
  if (store(list)) { renderSaved(); toast("Product saved"); }
}

function renderSaved() {
  const list = load();
  $("count").textContent = list.length ? `(${list.length})` : "";
  if (!list.length) { $("saved").innerHTML = `<div class="empty">No saved products yet. Run a calculation and press “Save product”.</div>`; return; }
  const checked = new Set([...document.querySelectorAll(".sel:checked")].map(e => e.value));
  $("saved").innerHTML = `<div class="table-scroll"><table class="tbl"><tr><th></th><th>Product</th><th>Price</th><th>Cost</th><th>Profit</th><th>Margin</th><th>ROI</th><th>Verdict</th><th></th></tr>` +
    list.map(p => {
      const { r, v } = analyse(p);
      return `<tr><td><input type="checkbox" class="sel" value="${p.id}" ${checked.has(p.id) ? "checked" : ""} aria-label="Select to compare"></td>
        <td>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}<div class="muted">${CONFIG.markets[p.market].label}</div></td>
        <td>${money(p.price, p.market)}</td><td>${money(p.cost, p.market)}</td>
        <td class="${r.profit >= 0 ? "pos" : "neg"}">${money(r.profit, p.market)}</td><td>${pct(r.margin)}</td><td>${pct(r.roi)}</td>
        <td><span class="pill ${v}">${V[v].icon} ${V[v].label}</span></td>
        <td><button class="btn sm" data-act="load" data-id="${p.id}">Open</button> <button class="btn sm danger" data-act="del" data-id="${p.id}">✕</button></td></tr>`;
    }).join("") + `</table></div>`;
}

function loadProduct(id) {
  const p = load().find(x => x.id === id); if (!p) return;
  $("market").value = p.market; feeState[p.market] = { ...p.fees };
  ["name", "url", "notes", "price", "cost", "ship", "other", "ad"].forEach(k => $(k).value = p[k] || (k === "ad" ? 0 : ""));
  fillFees(); update(); window.scrollTo({ top: 0, behavior: "smooth" }); toast("Loaded “" + p.name + "”");
}

function compare() {
  const ids = [...document.querySelectorAll(".sel:checked")].map(e => e.value);
  const list = load().filter(p => ids.includes(p.id));
  if (list.length < 2) { $("compare").innerHTML = ""; return toast("Tick at least 2 saved products"); }
  const rows = list.map(p => ({ p, ...analyse(p) }));
  const best = Math.max(...rows.map(x => x.r.margin ?? -Infinity));
  const line = (label, fn) => `<tr><td>${label}</td>${rows.map(x => `<td class="${x.r.margin === best && label === "Margin" ? "best" : ""}">${fn(x)}</td>`).join("")}</tr>`;
  $("compare").innerHTML = `<h2>Comparison</h2><div class="table-scroll"><table class="tbl"><tr><th></th>${rows.map(x => `<th>${esc(x.p.name)}</th>`).join("")}</tr>` +
    line("Marketplace", x => CONFIG.markets[x.p.market].label) +
    line("Selling price", x => money(x.p.price, x.p.market)) + line("Product cost", x => money(x.p.cost, x.p.market)) +
    line("Total fees", x => money(x.r.fees, x.p.market)) + line("Net profit", x => money(x.r.profit, x.p.market)) +
    line("Margin", x => pct(x.r.margin)) + line("ROI", x => pct(x.r.roi)) +
    line("Break-even price", x => money(x.r.breakEven, x.p.market)) + line("Max buying price", x => money(x.r.maxBuy, x.p.market)) +
    line("Verdict", x => `<span class="pill ${x.v}">${V[x.v].icon} ${V[x.v].label}</span>`) + `</table></div>`;
  $("compare").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function exportCSV() {
  const list = load(); if (!list.length) return toast("Nothing to export yet");
  const head = ["Name", "URL", "Marketplace", "Currency", "Selling price", "Product cost", "Shipping", "Other cost", "Ad rate %", "Total eBay fees", "Total expenses", "Net profit", "Margin %", "ROI %", "Break-even price", "Max buying price", "Verdict", "Notes", "Saved on"];
  const n2 = v => ok(v) ? v.toFixed(2) : "";
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = list.map(p => { const { r, v } = analyse(p);
    return [p.name, p.url, p.market, CONFIG.markets[p.market].currency, n2(p.price), n2(p.cost), n2(p.ship), n2(p.other), p.ad, n2(r.fees), n2(r.expenses), n2(r.profit), n2(r.margin), n2(r.roi), n2(r.breakEven), n2(r.maxBuy), V[v].label, p.notes, p.date.slice(0, 10)].map(q).join(","); });
  const blob = new Blob(["\ufeff" + [head.map(q).join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "ebay-products.csv" });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("CSV exported");
}

/* =====================================================
   UI wiring
   ===================================================== */
function fillFees() {
  const f = feeState[$("market").value];
  $("feePct").value = f.feePct; $("fixed").value = f.fixed; $("taxPct").value = f.taxPct;
}
function syncChips() {
  const raw = $("ad").value, v = raw === "" ? 0 : num(raw);
  let hit = false;
  document.querySelectorAll("#adChips .chip").forEach(c => {
    const on = c.dataset.v !== "custom" && num(c.dataset.v) === v && (raw !== "" || v === 0);
    c.classList.toggle("on", on); hit = hit || on;
  });
  document.querySelector('#adChips [data-v="custom"]').classList.toggle("on", !hit && raw !== "");
}
function resetAll() {
  ["name", "url", "notes", "price", "cost", "ship", "other"].forEach(k => $(k).value = "");
  $("ad").value = 0;
  Object.keys(CONFIG.markets).forEach(k => feeState[k] = { feePct: CONFIG.markets[k].feePct, fixed: CONFIG.markets[k].fixed, taxPct: CONFIG.markets[k].taxPct });
  $("market").value = CONFIG.defaultMarket; fillFees(); update(); toast("Calculator reset");
}

function renderBranding() {
  const s = CONFIG.skillzhub, a = CONFIG.author;
  $("promo").innerHTML = `<div class="promo-in"><div class="brand"><b>${esc(s.name.slice(0, -3))}<span>${esc(s.name.slice(-3))}</span></b><div>${esc(s.tagline)}</div></div>
    <div class="links"><a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a><a href="tel:${esc(s.contact.replace(/\s/g, ""))}">📞 ${esc(s.contact)}</a><a href="${esc(s.website)}" target="_blank" rel="noopener">🌐 Website</a></div></div>`;
  $("foot").innerHTML = `<div class="foot-in"><div>Made with ❤️ by <b>${esc(a.name)}</b></div>
    <div class="links"><a href="https://wa.me/${esc(a.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><a href="${esc(a.facebook)}" target="_blank" rel="noopener">Facebook</a><a href="${esc(a.instagram)}" target="_blank" rel="noopener">Instagram</a></div></div>`;
}

function init() {
  renderBranding();
  document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  $("market").innerHTML = Object.entries(CONFIG.markets).map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join("");
  $("adChips").innerHTML = CONFIG.adPresets.map(v => `<button type="button" class="chip" data-v="${v}">${v}%</button>`).join("") + `<button type="button" class="chip" data-v="custom">Custom</button>`;
  resetAll();

  document.querySelectorAll("#inputs input, #inputs textarea").forEach(el => el.addEventListener("input", () => {
    if (["feePct", "fixed", "taxPct"].includes(el.id)) feeState[$("market").value][el.id] = num(el.value);
    update();
  }));
  $("market").addEventListener("change", () => { fillFees(); update(); });
  $("adChips").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    if (c.dataset.v === "custom") { $("ad").focus(); $("ad").select(); } else { $("ad").value = c.dataset.v; update(); }
  });
  $("saveBtn").onclick = saveProduct;
  $("resetBtn").onclick = resetAll;
  $("printBtn").onclick = () => window.print();
  $("csvBtn").onclick = exportCSV;
  $("compareBtn").onclick = compare;
  $("clearBtn").onclick = () => { if (load().length && confirm("Delete all saved products?")) { store([]); $("compare").innerHTML = ""; renderSaved(); toast("All saved products deleted"); } };
  $("themeBtn").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem(THEME_KEY, t); } catch (e) {} };
  $("saved").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.act === "load") loadProduct(b.dataset.id);
    if (b.dataset.act === "del") { store(load().filter(p => p.id !== b.dataset.id)); $("compare").innerHTML = ""; renderSaved(); toast("Product deleted"); }
  });
  renderSaved();
}
document.addEventListener("DOMContentLoaded", init);