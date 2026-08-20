const RU = (navigator.language || "").toLowerCase().startsWith("ru");
const BOT = "TroRadarBot"; // set to your bot's username once created

const T = RU
  ? {
      h1: "Настройки",
      sub: "Куда приходят алерты и за чем вы следите.",
      plan: "Тариф",
      planFree: (n, b) => `— портфель до ${n} товаров, ${b} проверок выдачи в день, дайджест раз в день.`,
      planPro: (n) => `— портфель до ${n} товаров, безлимитный скан, мгновенные алерты.`,
      email: "Алерты на почту",
      pEmail: "Пришлём письмо в день, когда по товару из портфеля подадут иск.",
      save: "СОХРАНИТЬ",
      saved: "Сохранено",
      tg: "Алерты в Telegram",
      pTg: "Мгновенные уведомления в Telegram — обычно быстрее, чем вы проверите почту.",
      connect: "ПОДКЛЮЧИТЬ TELEGRAM",
      linked: "✓ Подключено",
      tgHint: (code) =>
        `Откроется бот. Если он не запустится автоматически, отправьте ему: /start ${code}`,
      pf: "Портфель",
      pPf: "Товары под наблюдением. Удалите то, что больше не продаёте.",
      empty: "Пока пусто. Откройте товар на AliExpress или Temu и нажмите «Следить за товаром».",
    }
  : {
      h1: "Settings",
      sub: "Where your lawsuit alerts go, and what you're watching.",
      plan: "Plan",
      planFree: (n, b) => `— up to ${n} products, ${b} result-page checks per day, daily digest.`,
      planPro: (n) => `— up to ${n} products, unlimited scanning, instant alerts.`,
      email: "Email alerts",
      pEmail: "We'll email you the day a new lawsuit hits a product in your portfolio.",
      save: "SAVE",
      saved: "Saved",
      tg: "Telegram alerts",
      pTg: "Get alerts instantly in Telegram — usually faster than you'd check email.",
      connect: "CONNECT TELEGRAM",
      linked: "✓ Connected",
      tgHint: (code) => `The bot opens in a new tab. If it doesn't start, send it: /start ${code}`,
      pf: "Portfolio",
      pPf: "Products you're monitoring. Remove anything you no longer sell.",
      empty: "Nothing pinned yet. Open a product on AliExpress or Temu and hit “Watch this product”.",
    };

const COLORS = { red: "#d03b3b", yellow: "#b98200", green: "#0ca30c" };
const $ = (id) => document.getElementById(id);
const send = (m) => new Promise((r) => chrome.runtime.sendMessage(m, (resp) => r(resp || { ok: false })));

$("h1").textContent = T.h1;
$("sub").textContent = T.sub;
$("h2plan").textContent = T.plan;
$("h2email").textContent = T.email;
$("pEmail").textContent = T.pEmail;
$("saveEmail").textContent = T.save;
$("h2tg").textContent = T.tg;
$("pTg").textContent = T.pTg;
$("tgConnect").textContent = T.connect;
$("h2pf").textContent = T.pf;
$("pPf").textContent = T.pPf;

let account = null;

async function loadAccount() {
  const resp = await send({ type: "account" });
  if (!resp.ok) return;
  account = resp.data;

  $("planBadge").textContent = (account.plan || "free").toUpperCase();
  const lim = account.limits || {};
  $("planInfo").textContent =
    account.plan === "pro" ? T.planPro(lim.portfolioItems) : T.planFree(lim.portfolioItems, lim.bulkPerDay);

  if (account.email) $("email").value = account.email;
  if (account.telegram_linked) {
    $("tgStatus").textContent = T.linked;
    $("tgConnect").style.display = "none";
  } else if (account.telegram_link_code) {
    $("tgHint").textContent = T.tgHint(account.telegram_link_code);
  }
}

$("saveEmail").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return;
  const resp = await send({ type: "saveSettings", settings: { email, lang: RU ? "ru" : "en" } });
  $("emailOk").textContent = resp.ok ? T.saved : "";
  setTimeout(() => ($("emailOk").textContent = ""), 2500);
});

$("tgConnect").addEventListener("click", () => {
  if (!account || !account.telegram_link_code) return;
  window.open(`https://t.me/${BOT}?start=${account.telegram_link_code}`, "_blank");
});

async function loadPortfolio() {
  const resp = await send({ type: "portfolioList" });
  const items = resp.ok && resp.data ? resp.data.items || [] : [];
  const box = $("items");

  if (items.length === 0) {
    box.innerHTML = `<p class="muted">${T.empty}</p>`;
    return;
  }

  box.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item";

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = COLORS[item.last_verdict] || "#c3c2b7";

    const title = document.createElement("span");
    title.className = "t";
    title.textContent = item.title;
    title.title = item.title;

    const n = document.createElement("span");
    n.className = "n";
    n.textContent = item.last_active_cases || 0;

    const x = document.createElement("button");
    x.className = "x";
    x.textContent = "✕";
    x.addEventListener("click", async () => {
      await send({ type: "portfolioRemove", id: item.id });
      loadPortfolio();
    });

    row.append(dot, title, n, x);
    box.appendChild(row);
  }
}

loadAccount();
loadPortfolio();
