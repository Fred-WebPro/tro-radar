// Law-firm name normalization. CourtListener carries the same firm under
// several spellings ("Greer, Burns, and Crain", "Greer, Burns & Crain Ltd."),
// so aggregation needs a canonical key.

const FIRM_SUFFIXES = new Set([
  "llp", "llc", "l.l.c", "ltd", "pllc", "p.l.l.c", "pc", "p.c", "pa", "p.a",
  "inc", "incorporated", "chartered", "co", "corp", "lp", "plc", "esq",
  "attorneys", "attorney", "law", "lawyers", "firm", "group", "office", "offices",
]);

/**
 * Address fragments and stray tokens ride along in the firm field — "Il" for
 * Illinois turns up on hundreds of dockets and would otherwise rank as the
 * busiest enforcement mill in the database.
 */
const NOT_A_FIRM = new Set([
  "il", "ny", "ca", "fl", "tx", "dc", "pa", "nj", "ga", "wa", "ma", "mi", "oh",
  "usa", "us", "llc", "llp", "ltd", "pllc", "inc", "esq", "pro", "hac", "vice",
  "united", "states", "court", "district", "plaintiff", "defendant", "unknown",
]);

/** Is this string a usable law-firm name at all? */
export function isRealFirm(name: string): boolean {
  const norm = normalizeFirm(name);
  if (norm.length < 4) return false;
  // A lone word that is a state, a suffix or courtroom vocabulary names no firm;
  // the same word inside a longer name is fine ("United States Law Group").
  const parts = norm.split(" ");
  return parts.length > 1 || !NOT_A_FIRM.has(parts[0]);
}

/** Canonical key for a firm name: lowercase, no punctuation or legal suffixes. */
export function normalizeFirm(name: string): string {
  let words = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "and" && w !== "the");

  // Strip trailing suffix words ("… & Crain Ltd." -> "greer burns crain").
  while (words.length > 1 && FIRM_SUFFIXES.has(words[words.length - 1])) {
    words = words.slice(0, -1);
  }
  return words.join(" ");
}

/** Prettiest of several raw spellings: the longest one still under 60 chars. */
export function bestFirmLabel(names: string[]): string {
  return names
    .slice()
    .sort((a, b) => (b.length <= 60 ? b.length : 0) - (a.length <= 60 ? a.length : 0))[0] ?? names[0];
}
