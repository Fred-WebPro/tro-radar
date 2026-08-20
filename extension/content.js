// TRO Radar content script: on supplier product pages, checks the product
// title against the Schedule A lawsuit database and shows a traffic-light
// verdict badge. All styling lives in a shadow root so host CSS can't leak.

(() => {
  const SITE_URL = "https://tro-radar.vercel.app";

  const PRODUCT_PATTERNS = [
    { host: /(^|\.)aliexpress\.(com|us)$/i, path: /\/(item|i)\// },
    { host: /(^|\.)temu\.com$/i, path: /(-g-\d+|goods\.html|\/g\/)/ },
    { host: /(^|\.)1688\.com$/i, path: /offer\/\d+/ },
    { host: /(^|\.)alibaba\.com$/i, path: /product-detail/ },
  ];

  function isProductPage() {
    const { hostname, pathname, href } = location;
    return PRODUCT_PATTERNS.some((p) => p.host.test(hostname) && (p.path.test(pathname) || p.path.test(href)));
  }

  function getProductTitle() {
    const h1 = document.querySelector("h1");
    const og = document.querySelector('meta[property="og:title"]');
    let t = (h1 && h1.textContent) || (og && og.content) || document.title || "";
    t = t
      .replace(/\s*[|\-–—]\s*(AliExpress|Temu|Alibaba(\.com)?|1688(\.com)?).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return t.slice(0, 140);
  }

  const VERDICT_UI = {
    red: { color: "#d03b3b", label: "HIGH RISK", icon: "⚠" },
    yellow: { color: "#b98200", label: "CAUTION", icon: "◆" },
    green: { color: "#0ca30c", label: "NO MATCHES", icon: "✓" },
  };

  let host = null;
  let lastCheckedUrl = null;
  let dismissedUrl = null;

  function removeBadge() {
    if (host) {
      host.remove();
      host = null;
    }
  }

  function renderBadge(state, payload) {
    removeBadge();
    host = document.createElement("div");
    host.id = "tro-radar-badge-host";
    host.style.cssText = "all:initial; position:fixed; right:16px; bottom:16px; z-index:2147483647;";
    const root = host.attachShadow({ mode: "closed" });

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const base = `
      <style>
        .card { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; width: 300px;
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
        .brands { font-size: 12px; color:#52514e; margin: 0 0 10px; }
        .brands b { color:#161512; }
        .link { display:inline-block; font-size:12px; font-weight:600; color:#1c5cab;
          text-decoration:none; }
        .link:hover { text-decoration:underline; }
        .foot { border-top: 1px solid #e3e1d8; padding: 6px 12px; font-family: ui-monospace, Consolas, monospace;
          font-size: 10px; color: #898781; }
      </style>`;

    if (state === "loading") {
      wrap.innerHTML = `${base}
        <div class="card">
          <div class="head"><span class="label" style="color:#898781">TRO RADAR</span>
            <button class="close" title="Dismiss">✕</button></div>
          <div class="body"><p class="detail" style="margin:0">Checking this product against Schedule A lawsuits…</p></div>
        </div>`;
    } else if (state === "result") {
      const d = payload;
      const ui = VERDICT_UI[d.verdict] || VERDICT_UI.green;
      const brands = (d.brands || [])
        .slice(0, 3)
        .map((b) => `<b>${escapeHtml(b.brand)}</b> (${b.active} active)`)
        .join(", ");
      const caseWord = d.active_cases === 1 ? "case" : "cases";
      wrap.innerHTML = `${base}
        <div class="card" style="border-color:${ui.color}">
          <div class="head">
            <span class="label" style="color:${ui.color}">${ui.icon} ${ui.label}</span>
            <button class="close" title="Dismiss">✕</button>
          </div>
          <div class="body">
            <p class="headline">${escapeHtml(d.headline)}</p>
            ${brands ? `<p class="brands">Matched: ${brands}</p>` : ""}
            <a class="link" href="${SITE_URL}/check?q=${encodeURIComponent(d.query)}" target="_blank" rel="noopener">
              ${d.active_cases > 0 ? `View ${d.active_cases} active ${caseWord} →` : "See details →"}
            </a>
          </div>
          <div class="foot">TRO Radar · public court records · not legal advice</div>
        </div>`;
    }

    wrap.querySelector(".close")?.addEventListener("click", () => {
      dismissedUrl = location.href;
      removeBadge();
    });
    document.documentElement.appendChild(host);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function check() {
    const q = getProductTitle();
    if (q.length < 4) return;
    lastCheckedUrl = location.href;
    renderBadge("loading");
    chrome.runtime.sendMessage({ type: "check", q }, (resp) => {
      if (location.href !== lastCheckedUrl) return; // navigated away meanwhile
      if (resp && resp.ok && resp.data && resp.data.verdict) {
        renderBadge("result", resp.data);
      } else {
        removeBadge();
      }
    });
  }

  function tick() {
    if (!isProductPage()) {
      if (lastCheckedUrl) {
        lastCheckedUrl = null;
        removeBadge();
      }
      return;
    }
    if (location.href === lastCheckedUrl || location.href === dismissedUrl) return;
    // Give SPA navigation a moment to render the new title.
    setTimeout(() => {
      if (isProductPage() && location.href !== lastCheckedUrl && location.href !== dismissedUrl) check();
    }, 800);
  }

  tick();
  setInterval(tick, 1500);
})();
