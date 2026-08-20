// Service worker: proxies risk checks to the TRO Radar API so content
// scripts are not subject to the host page's CORS policy.

const API_BASE = "https://tro-radar.vercel.app";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "check" && typeof msg.q === "string") {
    fetch(`${API_BASE}/api/check?q=${encodeURIComponent(msg.q)}`)
      .then((r) => r.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }
});
