// On a product page: a verdict card with risk intelligence and a one-click
// "watch this product". On a search page: a traffic light on every card, so a
// whole page of results is triaged at a glance.

(() => {
  const SITE_URL = "https://tro-radar.vercel.app";
  const L = TRO_I18N;
  const site = troSite();
  if (!site) return;

  const send = (msg) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          // The worker restarts freely; a lost port is normal, not an error.
          if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
          else resolve(resp || { ok: false });
        });
      } catch {
        resolve({ ok: false });
      }
    });

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );

  // ---------- product page card ----------

  const VERDICT_COLOR = { red: "#d03b3b", yellow: "#b98200", green: "#0ca30c" };
  const VERDICT_ICON = { red: "⚠", yellow: "◆", green: "✓" };

  let host = null;
  let lastCheckedUrl = null;
  let dismissedUrl = null;

  function removeCard() {
    if (host) {
      host.remove();
      host = null;
    }
  }

  const CARD_CSS = `
    .card { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; width: 320px;
      background: #fcfcfb; color: #161512; border: 2px solid #c3c2b7;
      box-shadow: 0 6px 24px rgba(22,21,18,.18); }
    .head { display:flex; align-items:center; gap:8px; padding: 10px 12px 0; }
    .label { font-family: ui-monospace, Consolas, monospace; font-size: 11px; font-weight: 700;
      letter-spacing: .14em; }
    .close { margin-left:auto; cursor:pointer; border:none; background:none; font-size:15px;
      color:#898781; line-height:1; padding:2px 4px; }
    .close:hover { color:#161512; }
    .body { padding: 6px 12px 12px; }
    .headline { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    .detail { font-size: 12px; line-height: 1.45; color: #52514e; margin: 0 0 8px; }
    .brands { font-size: 12px; color:#52514e; margin: 0 0 8px; }
    .brands b { color:#161512; }
    .meter { height: 4px; background: #e3e1d8; margin: 0 0 8px; }
    .meter i { display:block; height: 100%; }
    .stats { display:flex; gap:10px; flex-wrap:wrap; font-family: ui-monospace, Consolas, monospace;
      font-size: 10px; color:#52514e; margin: 0 0 10px; }
    .stats span { white-space: nowrap; }
    .row { display:flex; gap:8px; align-items:center; }
    .link { font-size:12px; font-weight:600; color:#1c5cab; text-decoration:none; }
    .link:hover { text-decoration:underline; }
    .watch { border:1px solid #161512; background:#161512; color:#fcfcfb; font-size:11px;
      font-weight:600; letter-spacing:.06em; padding:6px 10px; cursor:pointer; }
    .watch:hover { background:#333; }
    .watch[disabled] { background:#fcfcfb; color:#52514e; border-color:#c3c2b7; cursor:default; }
    .foot { border-top: 1px solid #e3e1d8; padding: 6px 12px; font-family: ui-monospace, Consolas, monospace;
      font-size: 10px; color: #898781; }`;

  function renderCard(state, d) {
    removeCard();
    host = document.createElement("div");
    host.id = "tro-radar-card";
    host.style.cssText = "all:initial; position:fixed; right:16px; bottom:16px; z-index:2147483647;";
    const root = host.attachShadow({ mode: "closed" });
    const wrap = document.createElement("div");
    root.appendChild(wrap);

    if (state === "loading") {
      wrap.innerHTML = `<style>${CARD_CSS}</style>
        <div class="card">
          <div class="head"><span class="label" style="color:#898781">TRO RADAR</span>
            <button class="close" title="${esc(L.dismiss)}">✕</button></div>
          <div class="body"><p class="detail" style="margin:0">${esc(L.checking)}</p></div>
        </div>`;
    } else {
      const color = VERDICT_COLOR[d.verdict] || "#c3c2b7";
      const brands = (d.brands || [])
        .slice(0, 2)
        .map((b) => `<b>${esc(b.brand)}</b> (${b.active} ${esc(L.active)})`)
        .join(", ");

      const i = d.intel || {};
      const stats = [];
      if (typeof d.risk_score === "number" && d.risk_score > 0) {
        stats.push(`<span>${esc(L.riskScore)} ${d.risk_score}/100</span>`);
      }
      if (i.median_days_between) stats.push(`<span>${esc(L.cadence(i.median_days_between))}</span>`);
      if (typeof i.days_since_last_filing === "number") {
        stats.push(`<span>${esc(L.lastFiling(i.days_since_last_filing))}</span>`);
      }
      const serialFirm = (i.firms || []).find((f) => f.serial);

      wrap.innerHTML = `<style>${CARD_CSS}</style>
        <div class="card" style="border-color:${color}">
          <div class="head">
            <span class="label" style="color:${color}">${VERDICT_ICON[d.verdict] || ""} ${esc(L.verdict[d.verdict] || "")}</span>
            <button class="close" title="${esc(L.dismiss)}">✕</button>
          </div>
          <div class="body">
            <p class="headline">${esc(d.headline || "")}</p>
            ${
              typeof d.risk_score === "number" && d.risk_score > 0
                ? `<div class="meter"><i style="width:${Math.max(4, d.risk_score)}%;background:${color}"></i></div>`
                : ""
            }
            ${stats.length ? `<div class="stats">${stats.join("")}</div>` : ""}
            ${brands ? `<p class="brands">${esc(L.matched)} ${brands}</p>` : ""}
            ${serialFirm ? `<p class="detail" style="margin-bottom:8px">⚖ ${esc(serialFirm.firm)}</p>` : ""}
            <div class="row">
              <button class="watch">${esc(L.addToPortfolio)}</button>
              <a class="link" href="${SITE_URL}${L.sitePath}/check?q=${encodeURIComponent(d.query || "")}" target="_blank" rel="noopener">
                ${esc(d.active_cases > 0 ? L.viewActive(d.active_cases) : L.details)}
              </a>
            </div>
          </div>
          <div class="foot">${esc(L.foot)}</div>
        </div>`;

      const watchBtn = wrap.querySelector(".watch");
      watchBtn?.addEventListener("click", async () => {
        watchBtn.disabled = true;
        const resp = await send({
          type: "portfolioAdd",
          item: {
            title: d.query,
            url: location.href.split("?")[0],
            image: troProductImage(),
            source: site.id,
          },
        });
        watchBtn.textContent = resp.ok
          ? L.inPortfolio
          : resp.status === 402
            ? L.portfolioFull
            : L.addToPortfolio;
        if (!resp.ok && resp.status !== 402) watchBtn.disabled = false;
      });
    }

    wrap.querySelector(".close")?.addEventListener("click", () => {
      dismissedUrl = location.href;
      removeCard();
    });
    document.documentElement.appendChild(host);
  }

  async function checkProduct() {
    const q = troProductTitle();
    if (q.length < 5) return;
    lastCheckedUrl = location.href;
    renderCard("loading");
    const resp = await send({ type: "check", q, lang: L.lang });
    if (location.href !== lastCheckedUrl) return; // navigated away mid-flight
    if (resp.ok && resp.data && resp.data.verdict) renderCard("result", resp.data);
    else removeCard();
  }

  // ---------- search results overlay ----------

  const scanned = new Set();
  let scanning = false;
  let scanTotals = { red: 0, yellow: 0, total: 0 };
  let pill = null;
  let pillDismissed = false;

  function showPill(text, danger) {
    if (pillDismissed) return;
    if (!pill) {
      pill = document.createElement("div");
      pill.className = "tro-scan-pill";
      document.documentElement.appendChild(pill);
    }
    pill.classList.toggle("tro-scan-pill--red", Boolean(danger));
    pill.innerHTML = `<span>${esc(text)}</span>`;
    const x = document.createElement("button");
    x.className = "tro-scan-pill__x";
    x.textContent = "✕";
    x.title = L.dismiss;
    x.addEventListener("click", () => {
      pillDismissed = true;
      pill?.remove();
      pill = null;
    });
    pill.appendChild(x);
  }

  function badgeCard(card, result) {
    if (!result || card.el.querySelector(".tro-dot")) return;
    // Anchor to the card's nearest sized container so the dot lands on the image.
    let anchor = card.el;
    for (let i = 0; i < 3 && anchor.parentElement; i++) {
      if (anchor.offsetWidth > 80 && anchor.offsetHeight > 80) break;
      anchor = anchor.parentElement;
    }
    anchor.classList.add("tro-card-anchor");

    const dot = document.createElement("span");
    dot.className = `tro-dot tro-dot--${result.verdict}`;
    dot.textContent =
      result.verdict === "red"
        ? `⚠ ${result.active_cases}`
        : result.verdict === "yellow"
          ? "◆"
          : "✓";
    dot.title =
      result.verdict === "green"
        ? L.verdict.green
        : `${L.verdict[result.verdict]} — ${result.brand || ""} (${result.active_cases} ${L.active})`;
    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(`${SITE_URL}${L.sitePath}/check?q=${encodeURIComponent(card.title)}`, "_blank");
    });
    anchor.appendChild(dot);
  }

  async function scanResults() {
    if (scanning) return;
    const cards = troFindCards(site).filter((c) => !scanned.has(c.key));
    if (cards.length === 0) return;

    scanning = true;
    cards.forEach((c) => scanned.add(c.key));
    if (scanTotals.total === 0) showPill(L.scanning, false);

    const resp = await send({ type: "checkBulk", titles: cards.map((c) => c.title) });
    scanning = false;
    if (!resp.ok) return;

    if (resp.limited) {
      showPill(L.scanLimit, false);
      return;
    }

    (resp.results || []).forEach((r, i) => {
      if (!r) return;
      badgeCard(cards[i], r);
      scanTotals.total++;
      if (r.verdict === "red") scanTotals.red++;
      else if (r.verdict === "yellow") scanTotals.yellow++;
    });

    showPill(
      scanTotals.red > 0
        ? L.scanned(scanTotals.red, scanTotals.total)
        : L.scanClean(scanTotals.total),
      scanTotals.red > 0
    );
  }

  // ---------- lifecycle ----------

  let lastUrl = location.href;

  function tick() {
    if (location.href !== lastUrl) {
      // SPA navigation: reset per-page state.
      lastUrl = location.href;
      scanned.clear();
      scanTotals = { red: 0, yellow: 0, total: 0 };
      pill?.remove();
      pill = null;
      pillDismissed = false;
      lastCheckedUrl = null;
      removeCard();
    }

    if (troIsProductPage(site)) {
      if (location.href !== lastCheckedUrl && location.href !== dismissedUrl) {
        setTimeout(() => {
          if (troIsProductPage(site) && location.href !== lastCheckedUrl && location.href !== dismissedUrl) {
            checkProduct();
          }
        }, 700);
      }
    } else {
      scanResults();
    }
  }

  tick();
  setInterval(tick, 1500);
  // Lazy-loaded grids keep appending cards as the user scrolls.
  window.addEventListener("scroll", () => {
    if (!troIsProductPage(site)) scanResults();
  }, { passive: true });
})();
