// Interactive Camelot wheel. ./lib/camelot.js is a copy of ../src/camelot.js (checked in CI).
import { parse, describe, moves, mashup, camelot, name } from "./lib/camelot.js";

const S = window.S || {};
const L = S.lang || "en";
const $ = (id) => document.getElementById(id);
const svg = $("wheel");
const NS = "http://www.w3.org/2000/svg";
const label = (code) => { const k = parse(code); return L === "en" ? name(k) : name(k, L); };
const COLORS = { safe: "#38d39f", energy: "#fb5607", creative: "#ffbe0b" };

function arc(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}
const segs = {};
for (let n = 1; n <= 12; n++) {
  const a0 = ((n - 1) / 12) * 2 * Math.PI - Math.PI / 12, a1 = a0 + (2 * Math.PI) / 12;
  for (const [l, r0, r1] of [["B", 140, 205], ["A", 75, 138]]) {
    const code = `${n}${l}`, g = document.createElementNS(NS, "g");
    g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", `${code} ${label(code)}`);
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", arc(r0, r1, a0 + 0.008, a1 - 0.008));
    const am = (a0 + a1) / 2, rm = (r0 + r1) / 2;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", (rm * Math.sin(am)).toFixed(1)); t.setAttribute("y", (-rm * Math.cos(am) + 1).toFixed(1));
    t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "middle");
    t.textContent = code;
    const t2 = document.createElementNS(NS, "text");
    t2.setAttribute("x", (rm * Math.sin(am)).toFixed(1)); t2.setAttribute("y", (-rm * Math.cos(am) + 15).toFixed(1));
    t2.setAttribute("text-anchor", "middle"); t2.setAttribute("class", "sm");
    const k = parse(code); t2.textContent = describe(k).short;
    g.append(path, t, t2);
    g.addEventListener("click", () => select(code));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(code); } });
    svg.append(g); segs[code] = g;
  }
}
const hub = document.createElementNS(NS, "text");
hub.setAttribute("text-anchor", "middle"); hub.setAttribute("dominant-baseline", "middle"); hub.setAttribute("class", "hub");
svg.append(hub);
const st = document.createElement("style");
st.textContent = `#wheel path{fill:#24282c;stroke:#1a1d20;stroke-width:2;transition:fill .2s}#wheel g{cursor:pointer;outline:none}#wheel g:hover path,#wheel g:focus path{fill:#343a40}#wheel text{fill:#e9ecef;font:700 15px Geist,system-ui;pointer-events:none}#wheel text.sm{font:500 10px Geist,system-ui;fill:#adb5bd}#wheel text.hub{font:800 34px Geist,system-ui;fill:#fff}#wheel g.on path{fill:#fb5607}#wheel g.safe path{fill:#1f6f55}#wheel g.energy path{fill:#7a3413}#wheel g.creative path{fill:#6b5410}`;
document.head.append(st);

function select(code) {
  const k = parse(code);
  Object.values(segs).forEach((g) => g.setAttribute("class", ""));
  const mv = moves(k);
  mv.slice(1).forEach((m) => segs[m.code] && segs[m.code].setAttribute("class", m.kind));
  segs[camelot(k)].setAttribute("class", "on");
  hub.textContent = camelot(k);
  const d = describe(k);
  $("sel").innerHTML = `<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="pill" style="font-size:16px">${d.camelot}</span><strong style="font-size:20px">${label(d.camelot)}</strong><span class="muted small">${d.name} · ${d.short} · Open Key ${d.openKey}</span></div>
  <h3 style="margin-top:14px">${S.moves_h || "Mixes with"}</h3><table><tbody>${mv.slice(1).map((m) => `<tr><td><span class="pill" style="background:${COLORS[m.kind]}22;color:${COLORS[m.kind]}">${m.code}</span></td><td>${label(m.code)}<br><span class="small muted">${m.move} · ${(S.kinds || {})[m.kind] || m.kind}</span></td></tr>`).join("")}</tbody></table>`;
  document.dispatchEvent(new CustomEvent("tool_used", { detail: { tool: "camelot-wheel", camelot: d.camelot } }));
}
$("q").addEventListener("input", (e) => {
  const v = e.target.value.trim(); if (!v) return;
  try { select(camelot(parse(v))); } catch { $("sel").innerHTML = `<span class="muted">${S.notfound}</span>`; }
});
select("8A");

$("mf").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const r = mashup({ bpm: +f.get("ba"), key: f.get("ka") }, { bpm: +f.get("bb"), key: f.get("kb") });
    const v = (S.verdicts || {})[r.verdict] || r.verdict;
    const col = r.score >= 80 ? "ok" : r.score >= 60 ? "" : "warn";
    $("mres").innerHTML = `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><strong style="font-size:40px;line-height:1">${r.score}</strong><div><span class="pill ${col}">${v}</span><br><span class="small muted">${S.score}</span></div></div>
    <p>${S.stretch} <strong>${r.tempo.stretchBPercent > 0 ? "+" : ""}${r.tempo.stretchBPercent}%</strong> (${r.tempo.mode}).<br>
    ${S.shift}: <strong>${r.key.bestShift.semitones > 0 ? "+" : ""}${r.key.bestShift.semitones} ${S.semis}</strong> → ${S.lands} <span class="pill">${r.key.bestShift.lands}</span> (${label(r.key.bestShift.lands)}).</p>`;
    document.dispatchEvent(new CustomEvent("tool_used", { detail: { tool: "mashup-check", score: r.score } }));
  } catch { $("mres").innerHTML = `<span class="muted">${S.notfound}</span>`; }
});
$("mf").requestSubmit();
