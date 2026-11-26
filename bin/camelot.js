#!/usr/bin/env node
// camelot: Camelot wheel, harmonic mixing and mashup checks from the command line. Zero dependencies.
import { readFileSync } from "node:fs";
import { parse, describe, moves, mashup, planSet, wheel, transpose, camelot, name } from "../src/camelot.js";

const SITE = (page, medium = "cli") => `https://hablamusic.com/${page}?utm_source=github&utm_medium=${medium}&utm_campaign=camelot-wheel`;
const HELP = `camelot: Camelot wheel and harmonic mixing toolkit for DJs (zero dependencies)

Usage
  camelot <key>                    Key in every notation + what mixes with it
  camelot mix <bpm> <key> <bpm> <key>
                                   Mashup / transition check for two tracks
  camelot shift <key> <semitones>  Key after a pitch shift (e.g. +2, -1)
  camelot set <file.csv|json>      Order a playlist by key and BPM
  camelot wheel [--lang es|pt]     All 24 keys with Camelot and Open Key codes

Keys: 8A, 12B, 1m, 6d, Am, A minor, F#m, Bb major, La menor, Fá# maior ...
Set files: CSV with columns title (or file), bpm, key (or camelot); the output of bpm-key-finder --csv works as is.
Add --json to any command for machine output.

Guide: ${SITE("learn/harmonic-mixing-camelot-wheel")}`;

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const langIdx = argv.indexOf("--lang");
const lang = langIdx >= 0 ? argv[langIdx + 1] : "en";
const args = argv.filter((a, i) => a !== "--json" && a !== "--lang" && i !== langIdx + 1 || (langIdx < 0 && a !== "--json"));
const out = (obj, text) => console.log(json ? JSON.stringify(obj, null, 2) : text);
const fail = (msg) => { console.error(msg); process.exit(2); };

try {
  const [cmd, ...rest] = args;
  if (!cmd || cmd === "-h" || cmd === "--help") { console.log(HELP); process.exit(cmd ? 0 : 2); }
  else if (cmd === "wheel") cmdWheel();
  else if (cmd === "mix") cmdMix(rest);
  else if (cmd === "shift") cmdShift(rest);
  else if (cmd === "set") cmdSet(rest);
  else cmdKey(args.join(" "));
} catch (e) { fail(e.message); }

function cmdKey(input) {
  const k = parse(input), d = describe(k), m = moves(k);
  const lines = [
    `${d.name}  ·  Camelot ${d.camelot}  ·  Open Key ${d.openKey}  ·  ES ${d.es}  ·  PT ${d.pt}`,
    `Relative: ${d.relative}`,
    "",
    "Mixes with",
    ...m.map((x) => `  ${x.code.padEnd(4)} ${x.key.padEnd(10)} ${x.move.padEnd(18)} ${x.kind.padEnd(8)} ${x.note}`),
  ];
  out({ ...d, moves: m }, lines.join("\n"));
}

function cmdMix(r) {
  if (r.length < 4) fail("usage: camelot mix <bpmA> <keyA> <bpmB> <keyB>   e.g. camelot mix 128 8A 124 Am");
  // keys may be two words ("A minor"): take bpm, then words until the next number
  const parts = [];
  let cur = null;
  for (const t of r) {
    if (/^\d+(\.\d+)?$/.test(t) && (!cur || cur.key.length)) { cur = { bpm: Number(t), key: [] }; parts.push(cur); }
    else if (cur) cur.key.push(t);
  }
  if (parts.length !== 2) fail("need exactly two tracks: <bpm> <key> <bpm> <key>");
  const [a, b] = parts.map((p) => ({ bpm: p.bpm, key: p.key.join(" ") }));
  const res = mashup(a, b);
  const t = res.tempo, k = res.key;
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  const lines = [
    `Deck A: ${a.bpm} BPM, ${k.a.name} (${k.a.camelot})`,
    `Deck B: ${b.bpm} BPM, ${k.b.name} (${k.b.camelot})`,
    "",
    `Score: ${res.score}/100 (${res.verdict})`,
    `Tempo: stretch B by ${sign(t.stretchBPercent)}% to ${t.targetBpm} BPM${t.mode !== "1:1" ? ` (${t.mode})` : ""}`,
    `Keys as they are: ${k.asIs}`,
    `Without key lock B lands on ${k.withoutKeyLock.lands} (${sign(k.withoutKeyLock.semitones)} st): ${k.withoutKeyLock.compatible ? "compatible" : "not compatible"}`,
    k.bestShift.semitones === 0 ? "Best pitch shift: none needed" : `Best pitch shift for B: ${sign(k.bestShift.semitones)} semitones -> ${k.bestShift.lands} (${k.bestShift.relation})`,
    "",
    `Build it in the browser: ${SITE("dj-tools/mashup-maker")}`,
  ];
  out(res, lines.join("\n"));
}

function cmdShift(r) {
  if (r.length < 2) fail("usage: camelot shift <key> <semitones>   e.g. camelot shift 8A +2");
  const s = Number(r[r.length - 1]);
  if (!Number.isFinite(s)) fail("semitones must be a number");
  const from = parse(r.slice(0, -1).join(" ")), to = transpose(from, Math.round(s));
  const pct = Math.round((2 ** (s / 12) - 1) * 1000) / 10;
  out(
    { from: describe(from), semitones: s, to: describe(to), tempoPercentWithoutKeyLock: pct },
    `${name(from)} (${camelot(from)}) ${s >= 0 ? "+" : ""}${s} st -> ${name(to)} (${camelot(to)})\nWithout key lock that is a ${pct >= 0 ? "+" : ""}${pct}% tempo change.`,
  );
}

function readTracks(file) {
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(text).map((t) => ({ title: t.title ?? t.file, bpm: Number(t.bpm), key: t.camelot ?? t.key }));
  const rows = text.trim().split(/\r?\n/).map(splitCsv);
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const col = (...names) => names.map((n) => head.indexOf(n)).find((i) => i >= 0);
  const ti = col("title", "name", "file", "track"), bi = col("bpm", "tempo"), ki = col("camelot", "key");
  if (bi == null || ki == null) throw new Error("CSV needs bpm and key (or camelot) columns");
  return rows.filter((r) => r.length > 1).map((r, i) => ({ title: ti != null ? r[ti] : `track ${i + 1}`, bpm: Number(r[bi]), key: r[ki] }));
}

function splitCsv(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

function cmdSet(r) {
  if (!r[0]) fail("usage: camelot set tracks.csv [--start <title>]");
  const si = r.indexOf("--start");
  const tracks = readTracks(r[0]).filter((t) => t.bpm > 0);
  const plan = planSet(tracks, { start: si >= 0 ? r[si + 1] : null });
  const lines = plan.map((t, i) => {
    const tr = t.transition ? `${t.transition.move} (${t.transition.kind}), tempo ${t.transition.tempoChangePercent > 0 ? "+" : ""}${t.transition.tempoChangePercent}%` : "start";
    return `${String(i + 1).padStart(2)}. ${t.camelot.padEnd(4)} ${String(t.bpm).padEnd(6)} ${t.title}  ·  ${tr}`;
  });
  const clashes = plan.filter((t) => t.transition?.kind === "clash").length;
  lines.push("", clashes ? `${clashes} transition(s) clash in key: cut or use an effect there, or pitch-shift one track.` : "Every transition is harmonic.");
  out(plan, lines.join("\n"));
}

function cmdWheel() {
  const w = wheel();
  const label = (d) => (lang === "es" ? d.es : lang === "pt" ? d.pt : d.name);
  const lines = ["Camelot  Open Key  Key            Camelot  Open Key  Key", "-------  --------  -------------  -------  --------  -------------"];
  for (let i = 0; i < w.length; i += 2) {
    const a = w[i], b = w[i + 1];
    lines.push(`${a.camelot.padEnd(7)}  ${a.openKey.padEnd(8)}  ${label(a).padEnd(13)}  ${b.camelot.padEnd(7)}  ${b.openKey.padEnd(8)}  ${label(b)}`);
  }
  out(w, lines.join("\n"));
}
