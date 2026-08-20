export const LANGS = ["en", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(x: string): x is Lang {
  return (LANGS as readonly string[]).includes(x);
}

/** Locale-aware path: English lives at the root, Russian under /ru. */
export function p(lang: Lang, path: string): string {
  if (lang === "en") return path;
  return path === "/" ? "/ru" : `/ru${path}`;
}

export const ui = {
  en: {
    nav: { guide: "How to use", recent: "Recent filings", plaintiffs: "Serial plaintiffs" },
    footer: {
      disclaimerTitle: "Not legal advice.",
      disclaimer:
        "TRO Radar surfaces public court records for research purposes. A green result is not a guarantee of safety, and a red result is not a legal determination. Consult an attorney before acting on anything you see here.",
      data: "Data: federal court records via",
      dataTail: "/RECAP (Free Law Project) · © 2026 TRO Radar",
    },
    search: {
      placeholder: "Brand or product name — “Harley-Davidson”, “Paddington plush”…",
      button: "Check",
      aria: "Brand or product name to check",
    },
    subscribe: {
      brand: "Brand to watch",
      email: "you@store.com",
      button: "Watch brand",
      saving: "Saving…",
      error: "Something went wrong — try again.",
      done: (q: string) => `Watching “${q}” — we’ll email you when a new matching case is filed.`,
    },
    badge: { active: "Active", closed: "Closed" },
    caseList: {
      filed: "Filed",
      today: "today",
      yesterday: "yesterday",
      daysAgo: (n: number) => `${n} days ago`,
    },
    ticker: "Live filings",
    chart: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      cases: "cases",
      mtd: "(month to date)",
      caption: "Schedule A cases filed per month · current month is partial",
    },
    verdict: { red: "High risk", yellow: "Caution", green: "No matches" },
  },
  ru: {
    nav: { guide: "Как пользоваться", recent: "Свежие иски", plaintiffs: "Серийные истцы" },
    footer: {
      disclaimerTitle: "Не является юридической консультацией.",
      disclaimer:
        "TRO Radar показывает публичные судебные записи в исследовательских целях. Зелёный результат — не гарантия безопасности, красный — не юридическое заключение. Прежде чем принимать решения, проконсультируйтесь с юристом.",
      data: "Данные: записи федеральных судов США через",
      dataTail: "/RECAP (Free Law Project) · © 2026 TRO Radar",
    },
    search: {
      placeholder: "Бренд или название товара — «Harley-Davidson», «Paddington plush»…",
      button: "Проверить",
      aria: "Бренд или название товара для проверки",
    },
    subscribe: {
      brand: "Бренд для наблюдения",
      email: "you@store.com",
      button: "Следить",
      saving: "Сохраняем…",
      error: "Что-то пошло не так — попробуйте ещё раз.",
      done: (q: string) => `Следим за «${q}» — пришлём письмо, как только появится новый иск.`,
    },
    badge: { active: "Активно", closed: "Закрыто" },
    caseList: {
      filed: "Подан",
      today: "сегодня",
      yesterday: "вчера",
      daysAgo: (n: number) => `${n} дн. назад`,
    },
    ticker: "Свежие иски",
    chart: {
      months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
      cases: "дел",
      mtd: "(неполный месяц)",
      caption: "Исков Schedule A в месяц · текущий месяц неполный",
    },
    verdict: { red: "Высокий риск", yellow: "Осторожно", green: "Совпадений нет" },
  },
} as const;

export type UIDict = (typeof ui)[Lang];
