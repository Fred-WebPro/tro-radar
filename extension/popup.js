const API_BASE = "https://tro-radar.vercel.app";
const RU = (navigator.language || "").toLowerCase().startsWith("ru");

const COLORS = { red: "#d03b3b", yellow: "#b98200", green: "#0ca30c" };
const LABELS = RU
  ? { red: "⚠ ВЫСОКИЙ РИСК", yellow: "◆ ОСТОРОЖНО", green: "✓ СОВПАДЕНИЙ НЕТ" }
  : { red: "⚠ HIGH RISK", yellow: "◆ CAUTION", green: "✓ NO MATCHES" };

if (RU) {
  document.getElementById("q").placeholder = "Бренд или название товара…";
  document.querySelector("#form button").textContent = "ПРОВЕРИТЬ";
  document.getElementById("link").textContent = "Все дела →";
  const foots = document.querySelectorAll(".foot");
  foots[0].textContent =
    "Совет: откройте любой товар на AliExpress / Temu — вердикт появится в углу автоматически. Это поле — для ручных проверок.";
  foots[1].innerHTML =
    'Публичные судебные записи · не юрконсультация · <a href="https://tro-radar.vercel.app/ru/guide" target="_blank" rel="noopener" style="color:#1c5cab">как пользоваться</a>';
}

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = document.getElementById("q").value.trim();
  if (q.length < 2) return;

  const result = document.getElementById("result");
  const verdict = document.getElementById("verdict");
  result.style.display = "block";
  result.style.borderColor = "#c3c2b7";
  verdict.style.color = "#898781";
  verdict.textContent = RU ? "ПРОВЕРЯЕМ…" : "CHECKING…";
  document.getElementById("headline").textContent = "";
  document.getElementById("brands").textContent = "";

  try {
    const res = await fetch(`${API_BASE}/api/check?q=${encodeURIComponent(q)}${RU ? "&lang=ru" : ""}`);
    const d = await res.json();
    if (!d.verdict) throw new Error(d.error || "No verdict");

    result.style.borderColor = COLORS[d.verdict];
    verdict.style.color = COLORS[d.verdict];
    verdict.textContent = LABELS[d.verdict];
    document.getElementById("headline").textContent = d.headline;
    document.getElementById("brands").textContent = (d.brands || [])
      .slice(0, 3)
      .map((b) =>
        RU ? `${b.brand} (${b.active} активных / ${b.total} всего)` : `${b.brand} (${b.active} active / ${b.total} total)`
      )
      .join(", ");
    document.getElementById("link").href = `${API_BASE}${RU ? "/ru" : ""}/check?q=${encodeURIComponent(q)}`;
  } catch (err) {
    verdict.style.color = "#d03b3b";
    verdict.textContent = "ERROR";
    document.getElementById("headline").textContent = String(err.message || err);
  }
});
