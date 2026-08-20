// Legal-entity suffixes stripped (repeatedly) from the tail of a plaintiff name
// to recover the recognizable brand: "Deckers Outdoor Corporation" -> "Deckers Outdoor".
const LEGAL_SUFFIXES = [
  "incorporated", "corporation", "company", "limited", "international",
  "inc", "llc", "l.l.c", "ltd", "co", "corp", "gmbh", "plc", "llp", "lp",
  "s.a.s", "s.a", "sa", "s.r.l", "srl", "sarl", "a.g", "ag", "b.v", "bv",
  "n.v", "nv", "pty", "k.k", "kk", "kft", "oy", "ab", "aps", "a/s", "as",
  "s.p.a", "spa", "d.o.o", "sdn", "bhd", "pte", "ug", "kg", "ohg", "e.k",
];

const SUFFIX_SET = new Set(LEGAL_SUFFIXES);

/** Extract the plaintiff (left side of "X v. Y") from a case name. */
export function extractPlaintiff(caseName: string): string {
  const m = caseName.split(/\s+v\.?\s+/i);
  return (m[0] ?? caseName).trim();
}

/** Strip trailing legal suffixes and boilerplate to get a displayable brand name. */
export function extractBrand(plaintiff: string): string {
  let words = plaintiff
    .replace(/\bet\s+al\.?$/i, "")
    .replace(/[,;.]+/g, " ")
    .trim()
    .split(/\s+/);

  while (words.length > 1) {
    const last = words[words.length - 1].toLowerCase().replace(/[.,]+$/, "");
    if (SUFFIX_SET.has(last) || last === "&" || last === "and") {
      words = words.slice(0, -1);
    } else {
      break;
    }
  }
  return words.join(" ").trim() || plaintiff.trim();
}

/** Lowercased, punctuation-free form used for grouping and indexing. */
export function normalizeBrand(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
