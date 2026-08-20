const RU =
  new URLSearchParams(location.search).get("lang") === "ru" ||
  (navigator.language || "").toLowerCase().startsWith("ru");

const T = RU
  ? {
      over: "Установлено · тур на 30 секунд",
      h1: "Теперь вы под защитой.",
      lead:
        "TRO Radar следит за исками Schedule A — теми, где один бренд судится сразу с сотнями продавцов, а список ответчиков запечатан. Вот три вещи, которые он делает за вас.",
      steps: [
        {
          t: "Светофор прямо в выдаче",
          d: 'Откройте поиск на AliExpress, Temu, 1688, Amazon, eBay или Etsy — на карточках товаров появятся метки вроде <span class="demo">⚠ 31</span>. Это число активных исков по бренду. Красное — не трогать.',
        },
        {
          t: "Портфель под наблюдением",
          d: "На странице товара нажмите «Следить за товаром». Дальше мы сами сверяем ваши товары с каждым новым иском и присылаем алерт на почту или в Telegram — обычно за дни до того, как ордера на заморозку дойдут до площадок.",
        },
        {
          t: "Глубина, а не просто цвет",
          d: "Для каждого бренда видно, насколько агрессивно он судится: «иск каждые ~2 дня», сколько дел за год, ведёт ли дело юрфирма-конвейер. Это разница между «когда-то судился» и «судится прямо сейчас».",
        },
      ],
      try: "ПОПРОБОВАТЬ НА ALIEXPRESS",
      guide: "ПОЛНЫЙ ГИД",
      foot:
        "Значок расширения показывает, сколько товаров из портфеля под ударом. Данные — публичные записи федеральных судов США (CourtListener/RECAP). Это не юридическая консультация.",
      guideUrl: "https://tro-radar.vercel.app/ru/guide",
    }
  : {
      over: "Installed · 30-second tour",
      h1: "You're covered.",
      lead:
        "TRO Radar tracks Schedule A lawsuits — the ones where a single brand sues hundreds of sellers at once and the defendant list is sealed. Here's what it does for you.",
      steps: [
        {
          t: "Traffic lights on search results",
          d: 'Open any search on AliExpress, Temu, 1688, Amazon, eBay or Etsy and product cards get a badge like <span class="demo">⚠ 31</span> — the number of active lawsuits behind that brand. Red means don\'t touch it.',
        },
        {
          t: "A portfolio that watches itself",
          d: "On a product page, hit “Watch this product”. From then on we re-check your products against every new filing and alert you by email or Telegram — usually days before freeze orders reach the platforms.",
        },
        {
          t: "Depth, not just a colour",
          d: "For every brand you see how aggressively it enforces: “new case every ~2 days”, how many cases this year, whether an enforcement-mill law firm is running it. That's the difference between “sued once” and “suing right now”.",
        },
      ],
      try: "TRY IT ON ALIEXPRESS",
      guide: "FULL GUIDE",
      foot:
        "The extension icon shows how many of your pinned products are under fire. Data comes from public U.S. federal court records (CourtListener/RECAP). Not legal advice.",
      guideUrl: "https://tro-radar.vercel.app/guide",
    };

document.getElementById("over").textContent = T.over;
document.getElementById("h1").textContent = T.h1;
document.getElementById("lead").textContent = T.lead;
document.getElementById("try").textContent = T.try;
document.getElementById("guide").textContent = T.guide;
document.getElementById("guide").href = T.guideUrl;
document.getElementById("foot").textContent = T.foot;

document.getElementById("steps").innerHTML = T.steps
  .map(
    (s, i) => `<li><div class="n">0${i + 1}</div><div class="t">${s.t}</div><p class="d">${s.d}</p></li>`
  )
  .join("");
