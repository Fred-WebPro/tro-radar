// Service worker: owns the account token, proxies every API call (so content
// scripts never fight the host page's CORS policy), caches verdicts, and keeps
// the toolbar badge showing how many pinned products are under active fire.

const API_BASE = "https://tro-radar.vercel.app";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // court data moves daily, not hourly
const CACHE_MAX = 600;
const POLL_MINUTES = 30;

// ---------- account ----------

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return token || null;
}

async function api(path, { method = "GET", body } = {}) {
  const token = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-TRO-Token"] = token;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  // The server mints a token on first contact; persist whatever it hands back.
  if (data && data.token && data.token !== token) {
    await chrome.storage.local.set({ token: data.token });
  }
  return { ok: res.ok, status: res.status, data };
}

async function ensureAccount() {
  const lang = (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en";
  const { data } = await api("/api/account", { method: "POST", body: { lang } });
  return data;
}

// ---------- verdict cache ----------

function cacheKey(title) {
  return `c:${title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120)}`;
}

async function cacheGet(titles) {
  const keys = titles.map(cacheKey);
  const store = await chrome.storage.local.get(keys);
  const now = Date.now();
  const hits = {};
  const misses = [];
  titles.forEach((title, i) => {
    const entry = store[keys[i]];
    if (entry && now - entry.t < CACHE_TTL_MS) hits[title] = entry.v;
    else misses.push(title);
  });
  return { hits, misses };
}

async function cacheSet(results) {
  const now = Date.now();
  const patch = {};
  for (const r of results) patch[cacheKey(r.title)] = { t: now, v: r };
  await chrome.storage.local.set(patch);
  await trimCache();
}

/** Keep the cache bounded; storage.local is capped and we never need history. */
async function trimCache() {
  const all = await chrome.storage.local.get(null);
  const entries = Object.entries(all).filter(([k]) => k.startsWith("c:"));
  if (entries.length <= CACHE_MAX) return;
  entries.sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
  const drop = entries.slice(0, entries.length - CACHE_MAX).map(([k]) => k);
  await chrome.storage.local.remove(drop);
}

// ---------- checks ----------

async function checkOne(q, lang) {
  const { hits, misses } = await cacheGet([q]);
  if (hits[q] && hits[q].full) return hits[q].full;

  const suffix = lang === "ru" ? "&lang=ru" : "";
  const res = await fetch(`${API_BASE}/api/check?q=${encodeURIComponent(q)}${suffix}`);
  const data = await res.json();
  if (data && data.verdict) {
    await cacheSet([{ title: q, verdict: data.verdict, active_cases: data.active_cases, full: data }]);
  }
  void misses;
  return data;
}

async function checkBulk(titles) {
  const { hits, misses } = await cacheGet(titles);
  let fresh = [];
  let quota = null;
  let limited = false;

  if (misses.length > 0) {
    const { ok, status, data } = await api("/api/check-bulk", {
      method: "POST",
      body: { titles: misses },
    });
    if (ok && Array.isArray(data.results)) {
      fresh = data.results;
      quota = data.quota || null;
      await cacheSet(fresh);
    } else if (status === 429) {
      limited = true;
      quota = { used: data.limit, limit: data.limit };
    }
  }

  const byTitle = new Map(fresh.map((r) => [r.title, r]));
  const results = titles.map((t) => hits[t] || byTitle.get(t) || null);
  return { results, quota, limited };
}

// ---------- portfolio badge ----------

async function refreshBadge() {
  const token = await getToken();
  if (!token) return;
  const { ok, data } = await api("/api/portfolio");
  if (!ok || !data.items) return;

  const atRisk = data.at_risk || 0;
  await chrome.storage.local.set({ portfolioCount: data.items.length, atRisk });
  await chrome.action.setBadgeText({ text: atRisk > 0 ? String(atRisk) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#d03b3b" });
  await chrome.action.setTitle({
    title: atRisk > 0 ? `TRO Radar — ${atRisk} product(s) under active lawsuits` : "TRO Radar",
  });
}

// ---------- wiring ----------

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureAccount();
  await chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  if (details.reason === "install") {
    const ru = (navigator.language || "").toLowerCase().startsWith("ru");
    chrome.tabs.create({ url: chrome.runtime.getURL(`welcome.html${ru ? "?lang=ru" : ""}`) });
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES });
  refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll") refreshBadge();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case "check":
          sendResponse({ ok: true, data: await checkOne(msg.q, msg.lang) });
          break;
        case "checkBulk":
          sendResponse({ ok: true, ...(await checkBulk(msg.titles || [])) });
          break;
        case "account":
          sendResponse({ ok: true, data: await ensureAccount() });
          break;
        case "portfolioList": {
          const r = await api("/api/portfolio");
          sendResponse({ ok: r.ok, data: r.data });
          break;
        }
        case "portfolioAdd": {
          const r = await api("/api/portfolio", { method: "POST", body: msg.item });
          await refreshBadge();
          sendResponse({ ok: r.ok, status: r.status, data: r.data });
          break;
        }
        case "portfolioRemove": {
          const r = await api(`/api/portfolio?id=${msg.id}`, { method: "DELETE" });
          await refreshBadge();
          sendResponse({ ok: r.ok, data: r.data });
          break;
        }
        case "saveSettings": {
          const r = await api("/api/account", { method: "POST", body: msg.settings });
          sendResponse({ ok: r.ok, data: r.data });
          break;
        }
        default:
          sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true; // async response
});
