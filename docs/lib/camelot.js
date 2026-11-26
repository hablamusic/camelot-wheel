// Camelot wheel and harmonic mixing toolkit. Zero dependencies; works in Node 18+ and in browsers (ES module).
// https://github.com/hablamusic/camelot-wheel

export const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
// Solfege names used in Spanish and Portuguese (Do = C).
const SOLFEGE = { es: ["Do", "Do#", "Re", "Mi♭", "Mi", "Fa", "Fa#", "Sol", "La♭", "La", "Si♭", "Si"], pt: ["Dó", "Dó#", "Ré", "Mi♭", "Mi", "Fá", "Fá#", "Sol", "Lá♭", "Lá", "Si♭", "Si"] };
const MODE_WORD = { en: ["major", "minor"], es: ["mayor", "menor"], pt: ["maior", "menor"] };

// Camelot number by tonic pitch class (C = 0).
const CAM_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAM_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

/** A key is { tonic: 0-11, minor: boolean }. */
export const key = (tonic, minor) => ({ tonic: ((tonic % 12) + 12) % 12, minor: !!minor });

export const camelot = (k) => `${(k.minor ? CAM_MINOR : CAM_MAJOR)[k.tonic]}${k.minor ? "A" : "B"}`;
export const openKey = (k) => `${(((k.minor ? CAM_MINOR : CAM_MAJOR)[k.tonic] - 8 + 12) % 12) + 1}${k.minor ? "m" : "d"}`;
export const shortName = (k) => `${NOTES[k.tonic]}${k.minor ? "m" : ""}`;
export function name(k, lang = "en") {
  const notes = SOLFEGE[lang] ?? NOTES;
  const words = MODE_WORD[lang] ?? MODE_WORD.en;
  return `${notes[k.tonic]} ${words[k.minor ? 1 : 0]}`;
}

/** Full description of a key in every notation. */
export function describe(k) {
  return { name: name(k), short: shortName(k), camelot: camelot(k), openKey: openKey(k), es: name(k, "es"), pt: name(k, "pt"), relative: name(relative(k)) };
}

export const relative = (k) => (k.minor ? key(k.tonic + 3, false) : key(k.tonic + 9, true));

const fromCamelot = (n, letter) => {
  const table = letter === "A" ? CAM_MINOR : CAM_MAJOR;
  return key(table.indexOf(n), letter === "A");
};

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEGE_PC = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

/**
 * Parse a key in almost any notation: "8A", "12b", "1m" / "6d" (Open Key), "Am", "A minor", "F#m", "Gbmin",
 * "Bb major", "A♭", "La menor", "Fá# maior", "Do mayor". Returns { tonic, minor } or throws.
 */
export function parse(input) {
  const s = String(input).trim().replace(/♯/g, "#").replace(/♭/g, "b");
  let m = s.match(/^(1[0-2]|[1-9])\s*([ABab])$/);
  if (m) return fromCamelot(Number(m[1]), m[2].toUpperCase());
  m = s.match(/^(1[0-2]|[1-9])\s*([dmDM])$/);
  if (m) {
    const cam = ((Number(m[1]) - 1 + 7) % 12) + 1; // 1d -> 8B
    return fromCamelot(cam, m[2].toLowerCase() === "m" ? "A" : "B");
  }
  const lower = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  m = lower.match(/^(do|re|mi|fa|sol|la|si)\s*(sostenido|sustenido|bemol|#|b)?\s*(.*)$/);
  let pc, rest;
  if (m && !/^[a-g]$/.test(m[1])) {
    pc = SOLFEGE_PC[m[1]] + (m[2] === "#" || m[2] === "sostenido" || m[2] === "sustenido" ? 1 : m[2] ? -1 : 0);
    rest = m[3];
  } else {
    m = s.match(/^([A-Ga-g])\s*(#|b|-?sharp|-?flat)?\s*(.*)$/i);
    if (!m) throw new Error(`cannot parse key "${input}"`);
    const acc = (m[2] || "").toLowerCase();
    pc = LETTER_PC[m[1].toUpperCase()] + (acc === "#" || acc.endsWith("sharp") ? 1 : acc ? -1 : 0);
    rest = m[3];
  }
  rest = rest.trim();
  let minor;
  if (rest === "M" || /^(|maj|major|dur|mayor|maior)$/i.test(rest)) minor = false;
  else if (/^(m|min|minor|moll|menor)$/i.test(rest)) minor = true;
  else throw new Error(`cannot parse key "${input}"`);
  return key(pc, minor);
}

/** Transpose a key by semitones (pitch shift). */
export const transpose = (k, semitones) => key(k.tonic + semitones, k.minor);

/** Speed factor for a semitone shift when pitch follows tempo (turntable / no key-lock). */
export const ratioForSemitones = (s) => 2 ** (s / 12);
/** Semitones that a tempo change moves the key when key lock is off. 6% faster is about +1 semitone. */
export const semitonesForTempoChange = (fromBpm, toBpm) => 12 * Math.log2(toBpm / fromBpm);

const wrap = (v) => ((v - 1 + 120) % 12) + 1;

/**
 * Moves from a key on the Camelot wheel, ordered from safest to boldest.
 * Each move: { code, key, move, kind: "safe" | "energy" | "creative", note }.
 */
export function moves(k) {
  const code = camelot(k), n = parseInt(code, 10), l = code.slice(-1), o = l === "A" ? "B" : "A";
  const list = [
    [`${n}${l}`, "same key", "safe", "Perfect match: blend for as long as you like."],
    [`${wrap(n + 1)}${l}`, "+1", "safe", "One step clockwise: a fifth up, lifts the energy slightly."],
    [`${wrap(n - 1)}${l}`, "-1", "safe", "One step anticlockwise: a fifth down, a calmer move."],
    [`${n}${o}`, l === "A" ? "relative major" : "relative minor", "safe", l === "A" ? "Same notes, brighter mood." : "Same notes, darker mood."],
    [`${wrap(n + 2)}${l}`, "+2", "energy", "Two steps up: a whole tone up, a clear energy boost. Keep the overlap short."],
    [`${wrap(n + 7)}${l}`, "+7 (semitone up)", "energy", "One semitone up: the classic key-change lift. Works best as a quick cut."],
    [`${wrap(n + (l === "A" ? 1 : -1))}${o}`, "diagonal", "creative", l === "A" ? "Minor to the major one step up: bright and uplifting." : "Major to the minor one step down: moody turn."],
    [`${wrap(n + (l === "A" ? -1 : 1))}${o}`, "diagonal back", "creative", "The reverse diagonal: still one note apart, a softer change of colour."],
    [`${wrap(n + (l === "A" ? 3 : -3))}${o}`, l === "A" ? "parallel major" : "parallel minor", "creative", "Same root note, other mode: dramatic mood switch, short overlap."],
  ];
  return list.map(([c, move, kind, note]) => ({ code: c, key: name(parse(c)), move, kind, note }));
}

/** Cost of moving between two keys: 0 same, 1 safe neighbour, 2 energy move, 3 creative, 5 clash. */
export function keyDistance(a, b) {
  const one = (x, y) => {
    const hit = moves(x).find((m) => m.code === camelot(y));
    if (!hit) return 5;
    return hit.move === "same key" ? 0 : hit.kind === "safe" ? 1 : hit.kind === "energy" ? 2 : 3;
  };
  return Math.min(one(a, b), one(b, a));
}

/** The smallest tempo change between two BPMs, allowing half- and double-time. Returns { ratio, percent, mode }. */
export function tempoMatch(bpmA, bpmB) {
  const opts = [
    { ratio: bpmA / bpmB, mode: "1:1" },
    { ratio: bpmA / (bpmB * 2), mode: "B double-time" },
    { ratio: (bpmA * 2) / bpmB, mode: "B half-time" },
  ];
  const best = opts.sort((x, y) => Math.abs(Math.log(x.ratio)) - Math.abs(Math.log(y.ratio)))[0];
  return { ratio: best.ratio, percent: Math.round((best.ratio - 1) * 1000) / 10, mode: best.mode };
}

/**
 * Mashup check for two tracks { bpm, key }: how far deck B must be stretched to deck A's tempo,
 * where B's key lands with and without key lock, and the smallest pitch shift (-6..+6) that makes it compatible.
 */
export function mashup(a, b) {
  const ka = typeof a.key === "string" ? parse(a.key) : a.key;
  const kb = typeof b.key === "string" ? parse(b.key) : b.key;
  const t = tempoMatch(a.bpm, b.bpm);
  const drift = 12 * Math.log2(t.ratio);
  const noLock = transpose(kb, Math.round(drift));
  let best = null;
  for (let s = -6; s <= 6; s++) {
    const d = keyDistance(ka, transpose(kb, s));
    const cost = d * 2 + Math.abs(s);
    if (!best || cost < best.cost) best = { semitones: s, distance: d, cost };
  }
  const shifted = transpose(kb, best.semitones);
  const tempoScore = Math.max(0, 1 - Math.abs(t.percent) / 16);
  const keyScore = [1, 0.85, 0.6, 0.45, 0, 0][keyDistance(ka, kb)];
  const score = Math.round(100 * (0.5 * tempoScore + 0.5 * keyScore));
  return {
    score,
    verdict: score >= 80 ? "great" : score >= 60 ? "good" : score >= 40 ? "workable with edits" : "hard",
    tempo: { stretchBPercent: t.percent, mode: t.mode, targetBpm: a.bpm },
    key: {
      a: describe(ka), b: describe(kb),
      asIs: keyDistance(ka, kb) <= 1 ? "compatible" : keyDistance(ka, kb) <= 3 ? "workable" : "clash",
      withoutKeyLock: { semitones: Math.round(drift * 10) / 10, lands: camelot(noLock), compatible: keyDistance(ka, noLock) <= 1 },
      bestShift: { semitones: best.semitones, lands: camelot(shifted), relation: keyDistance(ka, shifted) <= 1 ? "compatible" : "workable" },
    },
  };
}

/**
 * Order tracks [{ title, bpm, key }] into a set that moves smoothly in key and tempo (greedy nearest neighbour
 * from `start`, or from the slowest track, then 2-opt clean-up). Returns tracks with a `transition` note.
 */
export function planSet(tracks, { start = null, bpmWeight = 0.25, maxBpmJump = 8 } = {}) {
  const items = tracks.map((t, i) => ({ ...t, _k: typeof t.key === "string" ? parse(t.key) : t.key, _i: i }));
  if (items.length < 2) return items.map(clean);
  const cost = (x, y) => {
    const tm = Math.abs(tempoMatch(x.bpm, y.bpm).percent);
    return keyDistance(x._k, y._k) * 2 + tm * bpmWeight + (tm > maxBpmJump ? 10 : 0);
  };
  let cur = start != null ? items.find((t) => t.title === start || t._i === start) : [...items].sort((a, b) => a.bpm - b.bpm)[0];
  if (!cur) throw new Error(`start track "${start}" not found`);
  const left = new Set(items.filter((t) => t !== cur));
  const order = [cur];
  while (left.size) {
    let best = null, bc = Infinity;
    for (const t of left) { const c = cost(cur, t); if (c < bc) { bc = c; best = t; } }
    order.push(best); left.delete(best); cur = best;
  }
  // 2-opt: reverse segments while it lowers the total cost (first track stays fixed).
  const total = (o) => o.slice(1).reduce((s, t, i) => s + cost(o[i], t), 0);
  let improved = true, guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) for (let j = i + 1; j < order.length; j++) {
      const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
      if (total(cand) + 1e-9 < total(order)) { order.splice(0, order.length, ...cand); improved = true; }
    }
  }
  return order.map((t, i) => {
    const out = clean(t);
    if (i > 0) {
      const p = order[i - 1], to = camelot(t._k);
      const mv = moves(p._k).find((m) => m.code === to);
      out.transition = { from: camelot(p._k), to, move: mv ? mv.move : "clash", kind: mv ? mv.kind : "clash", tempoChangePercent: tempoMatch(t.bpm, p.bpm).percent };
    }
    return out;
  });
}

function clean(t) {
  const { _k, _i, ...rest } = t;
  return { ...rest, key: shortName(_k), camelot: camelot(_k) };
}

/** All 24 keys in wheel order (1A, 1B, 2A, ...). */
export function wheel() {
  const out = [];
  for (let n = 1; n <= 12; n++) for (const l of ["A", "B"]) out.push(describe(fromCamelot(n, l)));
  return out;
}
