const API_BASE = "https://tro-radar.vercel.app";
const RU = (navigator.language || "").toLowerCase().startsWith("ru");

const T = RU
  ? {
      placeholder: "Бренд или название товара…",
      check: "ПРОВЕРИТЬ",
      checking: "ПРОВЕРЯЕМ…",
      error: "ОШИБКА",
      labels: { red: "⚠ ВЫСОКИЙ РИСК", yellow: "◆ ОСТОРОЖНО", green: "✓ СОВПАДЕНИЙ НЕТ" },
      risk: "Риск",
      cadence: (d) => `иск каждые ~${d} дн.`,
      lastFiled: (d) => (d <= 1 ? "иск сегодня" : `последний ${d} дн. назад`),
      brandLine: (b) => `${b.brand} (${b.active} активных / ${b.total} всего)`,
      watch: "Следить",
      watched: "✓ В портфеле",
      limitHit: "Лимит достигнут",
      allCases: "Все дела →",
      portfolio: "Портфель",
      pfEmpty:
        "Пока пусто. Откройте товар на AliExpress или Temu и нажмите «Следить за товаром» — будем присылать алерт, если по нему подадут иск.",
      atRisk: (n) => `${n} под ударом`,
      settings: "Настройки",
      foot: "Публичные судебные записи · не юрконсультация",
      guide: "как пользоваться",
    }
  : {
      placeholder: "Brand or product name…",
      check: "CHECK",
      checking: "CHECKING…",
      error: "ERROR",
      labels: { red: "⚠ HIGH RISK", yellow: "◆ CAUTION", green: "✓ NO MATCHES" },
      risk: "Risk",
      cadence: (d) => `new case every ~${d}d`,
      lastFiled: (d) => (d <= 1 ? "filed today" : `last filed ${d}d ago`),
      brandLine: (b) => `${b.brand} (${b.active} active / ${b.total} total)`,
      watch: "Watch",
      watched: "✓ Watching",
      limitHit: "Limit reached",
      allCases: "See all cases →",
      portfolio: "Portfolio",
      pfEmpty:
        "Nothing pinned yet. Open a product on AliExpress or Temu and hit “Watch this product” — we'll alert you the day a lawsuit hits it.",
      atRisk: (n) => `${n} at risk`,
      settings: "Settings",
      foot: "Public court records · not legal advice",
      guide: "how to use",
    };

const COLORS = { red: "#d03b3b", yellow: "#b98200", green: "#0ca30c" };
const $ = (id) => document.getElementById(id);

const send = (msg) => new Promise((r) => chrome.runtime.sendMessage(msg, (resp) => r(resp || { ok: false })));

// ---------- localize chrome ----------
$("q").placeholder = T.placeholder;
$("checkBtn").textContent = T.check;
$("watch").textContent = T.watch;
$("link").textContent = T.allCases;
$("pfHeading").textContent = T.portfolio;
$("settings").title = T.settings;
$("foot").innerHTML = `${T.foot} · <a href="${API_BASE}${RU ? "/ru" : ""}/guide" target="_blank" rel="noopener">${T.guide}</a>`;

$("settings").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ---------- manual check ----------
let currentQuery = "";

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("q").value.trim();
  if (q.length < 2) return;
  currentQuery = q;

  $("result").style.display = "block";
  $("result").style.borderColor = "#c3c2b7";
  $("verdict").style.color = "#898781";
  $("verdict").textContent = T.checking;
  $("headline").textContent = "";
  $("stats").textContent = "";
  $("brands").textContent = "";
  $("meterWrap").style.display = "none";
  $("watch").disabled = false;
  $("watch").textContent = T.watch;

  const resp = await send({ type: "check", q, lang: RU ? "ru" : "en" });
  const d = resp.data;
  if (!resp.ok || !d || !d.verdict) {
    $("verdict").style.color = COLORS.red;
    $("verdict").textContent = T.error;
    return;
  }

  const color = COLORS[d.verdict];
  $("result").style.borderColor = color;
  $("verdict").style.color = color;
  $("verdict").textContent = T.labels[d.verdict];
  $("headline").textContent = d.headline;

  if (typeof d.risk_score === "number" && d.risk_score > 0) {
    $("meterWrap").style.display = "block";
    $("meter").style.width = `${Math.max(4, d.risk_score)}%`;
    $("meter").style.background = color;
  }

  const i = d.intel || {};
  const stats = [];
  if (typeof d.risk_score === "number" && d.risk_score > 0) stats.push(`${T.risk} ${d.risk_score}/100`);
  if (i.median_days_between) stats.push(T.cadence(i.median_days_between));
  if (typeof i.days_since_last_filing === "number") stats.push(T.lastFiled(i.days_since_last_filing));
  $("stats").innerHTML = stats.map((s) => `<span>${s}</span>`).join("");

  $("brands").textContent = (d.brands || []).slice(0, 3).map(T.brandLine).join(", ");
  $("link").href = `${API_BASE}${RU ? "/ru" : ""}/check?q=${encodeURIComponent(q)}`;
});

$("watch").addEventListener("click", async () => {
  if (!currentQuery) return;
  $("watch").disabled = true;
  const resp = await send({ type: "portfolioAdd", item: { title: currentQuery, source: "popup" } });
  $("watch").textContent = resp.ok ? T.watched : resp.status === 402 ? T.limitHit : T.watch;
  if (resp.ok) loadPortfolio();
});

// ---------- portfolio ----------
async function loadPortfolio() {
  const resp = await send({ type: "portfolioList" });
  const box = $("portfolio");
  const items = resp.ok && resp.data ? resp.data.items || [] : [];

  if (items.length === 0) {
    box.innerHTML = `<p class="empty">${T.pfEmpty}</p>`;
    return;
  }

  const atRisk = items.filter((i) => i.last_verdict === "red").length;
  $("pfHeading").textContent = atRisk > 0 ? `${T.portfolio} — ${T.atRisk(atRisk)}` : T.portfolio;

  box.innerHTML = items
    .slice(0, 8)
    .map(
      (i) => `<div class="pf-item">
        <span class="pf-dot" style="background:${COLORS[i.last_verdict] || "#c3c2b7"}"></span>
        <span class="pf-title" title="${i.title.replace(/"/g, "&quot;")}">${i.title}</span>
        <span class="pf-n">${i.last_active_cases || 0}</span>
      </div>`
    )
    .join("");
}

loadPortfolio();
