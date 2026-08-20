// Per-marketplace adapters. Product cards are discovered from their links
// rather than CSS classes — marketplaces rewrite class names constantly, but
// the shape of a product URL is stable.

const TRO_SITES = [
  {
    id: "aliexpress",
    host: /(^|\.)aliexpress\.(com|us|ru)$/i,
    productUrl: /\/(item|i)\/\d+/,
    linkSelector: 'a[href*="/item/"]',
  },
  {
    id: "temu",
    host: /(^|\.)temu\.com$/i,
    productUrl: /(-g-\d+|goods\.html|\/g\/)/,
    linkSelector: 'a[href*="-g-"], a[href*="goods.html"]',
  },
  {
    id: "1688",
    host: /(^|\.)1688\.com$/i,
    productUrl: /offer\/\d+/,
    linkSelector: 'a[href*="offer/"]',
  },
  {
    id: "alibaba",
    host: /(^|\.)alibaba\.com$/i,
    productUrl: /product-detail/,
    linkSelector: 'a[href*="product-detail"]',
  },
  {
    id: "amazon",
    host: /(^|\.)amazon\.(com|co\.uk|de)$/i,
    productUrl: /\/(dp|gp\/product)\//,
    linkSelector: '[data-component-type="s-search-result"] h2 a, a.a-link-normal[href*="/dp/"]',
    // Sellers also want to audit their own live listings.
    ownListings: /\/(dp|gp\/product)\//,
  },
  {
    id: "ebay",
    host: /(^|\.)ebay\.(com|co\.uk|de)$/i,
    productUrl: /\/itm\//,
    linkSelector: 'a.s-item__link, a[href*="/itm/"]',
  },
  {
    id: "etsy",
    host: /(^|\.)etsy\.com$/i,
    productUrl: /\/listing\/\d+/,
    linkSelector: 'a.listing-link, a[href*="/listing/"]',
  },
];

function troSite() {
  return TRO_SITES.find((s) => s.host.test(location.hostname)) || null;
}

function troIsProductPage(site) {
  return Boolean(site && (site.productUrl.test(location.pathname) || site.productUrl.test(location.href)));
}

/** Clean a raw marketplace title down to something worth searching. */
function troCleanTitle(raw) {
  return String(raw || "")
    .replace(/\s*[|\-–—]\s*(AliExpress|Temu|Alibaba(\.com)?|1688(\.com)?|Amazon(\.com)?|eBay|Etsy).*$/i, "")
    .replace(/^\s*(Amazon\.com\s*:|Amazon\.com:)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function troProductTitle() {
  const h1 = document.querySelector("h1");
  const og = document.querySelector('meta[property="og:title"]');
  const amazonTitle = document.getElementById("productTitle");
  const raw =
    (amazonTitle && amazonTitle.textContent) ||
    (h1 && h1.textContent) ||
    (og && og.content) ||
    document.title;
  return troCleanTitle(raw);
}

function troProductImage() {
  const og = document.querySelector('meta[property="og:image"]');
  if (og && og.content) return og.content;
  const img = document.querySelector("#landingImage, img[data-role='pdp-main-image'], picture img");
  return img ? img.src : null;
}

/**
 * Find product cards in a search listing. Returns [{el, title, key}] where el
 * is the anchor the badge attaches to.
 */
function troFindCards(site, limit = 80) {
  if (!site) return [];
  const seen = new Set();
  const cards = [];

  for (const link of document.querySelectorAll(site.linkSelector)) {
    if (cards.length >= limit) break;
    const href = link.getAttribute("href") || "";
    if (!site.productUrl.test(href)) continue;

    // One badge per product, even when a card has image + title links.
    const idMatch = href.match(/(\d{6,})/);
    const key = idMatch ? idMatch[1] : href;
    if (seen.has(key)) continue;

    const title = troCleanTitle(
      link.getAttribute("title") || link.getAttribute("aria-label") || link.textContent
    );
    // Image-only links carry no usable text; skip rather than guess.
    if (title.length < 8) continue;

    seen.add(key);
    cards.push({ el: link, title, key });
  }
  return cards;
}
