// Brand-match plausibility.
//
// Full-text search retrieves anything sharing a word with the query, which is
// far too loose for verdicts: "Universal Silicone Spatula" hits *Universal City
// Studios*, "Stainless Steel Bottle" hits *Steel City Enterprises*. A checker
// that paints everything red is worse than no checker, so retrieval is followed
// by this precision filter.
//
// The test: does the query contain a word that actually *identifies* this
// plaintiff? Descriptive vocabulary and corporate boilerplate never identify
// anyone, so a brand is only matched through its distinctive words — "bosch",
// not "robert"; "sony", not "entertainment".

import { normalizeBrand } from "./brands";

/** Words that appear constantly in product listings as ordinary description. */
const GENERIC_WORDS = new Set([
  // qualities and marketing
  "universal", "premium", "classic", "original", "natural", "pure", "fresh",
  "smart", "super", "mega", "ultra", "power", "magic", "perfect", "elite",
  "prime", "select", "quality", "luxury", "deluxe", "professional", "pro",
  "advanced", "essential", "genuine", "authentic", "modern", "vintage",
  "portable", "wireless", "digital", "electric", "automatic", "adjustable",
  "waterproof", "heavy", "light", "mini", "micro", "macro", "plus", "max",
  "soft", "hard", "strong", "fast", "quick", "easy", "safe", "comfort",
  // materials and colours
  "steel", "metal", "iron", "gold", "golden", "silver", "copper", "bronze",
  "wood", "wooden", "glass", "plastic", "leather", "cotton", "silicone",
  "rubber", "ceramic", "crystal", "diamond", "marble", "black", "white",
  "blue", "green", "red", "pink", "purple", "orange", "yellow", "grey", "gray",
  // nature and place words used as brand-ish names
  "city", "star", "stars", "sun", "sunshine", "moon", "ocean", "sea", "river",
  "lake", "mountain", "forest", "garden", "sky", "cloud", "storm", "thunder",
  "fire", "flame", "ice", "snow", "summer", "winter", "spring", "autumn",
  "rainbow", "eagle", "lion", "tiger", "bear", "wolf", "dragon", "phoenix",
  "horse", "bird", "fish", "rose", "lotus", "pearl",
  // categories a listing routinely mentions
  "home", "house", "life", "style", "fashion", "beauty", "health", "sport",
  "sports", "kids", "baby", "pet", "pets", "auto", "car", "cars", "tech",
  "shop", "store", "market", "outdoor", "indoor", "kitchen", "office",
  "travel", "toy", "toys", "game", "games", "wear", "apparel", "footwear",
  "furniture", "tool", "tools", "light", "lighting", "camping", "fitness",
  "music", "audio", "video", "photo", "camera", "phone", "mobile", "computer",
  // roles and scale words
  "king", "queen", "prince", "royal", "master", "chief", "captain", "hero",
  "global", "world", "international", "national", "american", "usa", "euro",
  "first", "best", "great", "good", "little", "grand", "true", "real",
]);

/** Legal and corporate boilerplate: present in half the plaintiff names. */
const CORPORATE_WORDS = new Set([
  "studios", "studio", "entertainment", "enterprises", "enterprise",
  "holdings", "holding", "brands", "brand", "group", "company", "companies",
  "industries", "industrial", "technologies", "technology", "solutions",
  "systems", "products", "product", "trading", "trade", "commerce",
  "licensing", "license", "properties", "property", "ventures", "partners",
  "partnership", "associates", "association", "consulting", "services",
  "service", "management", "capital", "investment", "investments", "media",
  "creative", "design", "designs", "collection", "collections", "labs",
  "laboratories", "works", "manufacturing", "supply", "distribution",
  "motor", "motors", "sales", "retail", "wholesale", "import", "export",
  "development", "innovations", "innovation", "corporation", "incorporated",
]);

function tokens(s: string): string[] {
  return normalizeBrand(s).split(" ").filter(Boolean);
}

/** A word specific enough to name this plaintiff and nobody else. */
function isIdentifying(token: string): boolean {
  return token.length >= 4 && !GENERIC_WORDS.has(token) && !CORPORATE_WORDS.has(token);
}

/**
 * Does `brand` plausibly name the product in `query`?
 *
 * Accepts when the brand's full name appears, or when any of its distinctive
 * words does — "sony" identifies *Sony Interactive Entertainment*, "bosch"
 * identifies *Robert Bosch*, while "universal" identifies nothing.
 */
export function isPlausibleBrandMatch(query: string, brand: string): boolean {
  const qTokens = new Set(tokens(query));
  const bTokens = tokens(brand);
  if (bTokens.length === 0 || qTokens.size === 0) return false;

  // Whole brand name present in the query — unambiguous, and the only way a
  // brand built entirely from common words can ever match.
  if (bTokens.every((t) => qTokens.has(t))) return true;

  return bTokens.some((t) => isIdentifying(t) && qTokens.has(t));
}
