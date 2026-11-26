// Zero-dependency tests: node test/run.js
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, camelot, openKey, name, moves, mashup, planSet, wheel, transpose, keyDistance, tempoMatch } from "../src/camelot.js";

let passed = 0, failed = 0;
const test = (n, fn) => { try { fn(); passed++; console.log(`ok   ${n}`); } catch (e) { failed++; console.log(`FAIL ${n}\n     ${e.message}`); } };

test("parse: every notation of A minor", () => {
  for (const s of ["8A", "8a", "1m", "Am", "A minor", "A min", "amin", "La menor", "Lá menor", "la menor"]) assert.equal(camelot(parse(s)), "8A", s);
});
test("parse: sharps, flats and unicode", () => {
  assert.equal(camelot(parse("F#m")), "11A");
  assert.equal(camelot(parse("Gbm")), "11A");
  assert.equal(camelot(parse("A♭ major")), "4B");
  assert.equal(camelot(parse("Bb")), "6B");
  assert.equal(camelot(parse("Fá# maior")), "2B");
  assert.equal(camelot(parse("Do mayor")), "8B");
  assert.equal(camelot(parse("Sol menor")), "6A");
  assert.equal(camelot(parse("Si bemol mayor")), "6B");
  assert.equal(camelot(parse("CM")), "8B");
  assert.equal(camelot(parse("6d")), "1B");
});
test("parse rejects nonsense", () => {
  assert.throws(() => parse("H minor"));
  assert.throws(() => parse("13A"));
  assert.throws(() => parse("C lydian"));
});
test("wheel has 24 unique keys and round-trips", () => {
  const w = wheel();
  assert.equal(new Set(w.map((d) => d.camelot)).size, 24);
  assert.equal(new Set(w.map((d) => d.openKey)).size, 24);
  for (const d of w) { assert.equal(camelot(parse(d.camelot)), d.camelot); assert.equal(camelot(parse(d.openKey)), d.camelot); assert.equal(camelot(parse(d.name)), d.camelot); }
});
test("standard Camelot table", () => {
  const table = { "1A": "Ab minor", "1B": "B major", "5A": "C minor", "8B": "C major", "9A": "E minor", "12B": "E major", "10A": "B minor", "6B": "Bb major" };
  for (const [c, n] of Object.entries(table)) assert.equal(name(parse(c)), n, c);
});
test("moves from 8A", () => {
  const m = Object.fromEntries(moves(parse("8A")).map((x) => [x.move, x.code]));
  assert.equal(m["+1"], "9A"); assert.equal(m["-1"], "7A"); assert.equal(m["relative major"], "8B");
  assert.equal(m["+2"], "10A"); assert.equal(m["+7 (semitone up)"], "3A"); assert.equal(m["diagonal"], "9B"); assert.equal(m["parallel major"], "11B");
});
test("+7 on the wheel is one semitone up", () => {
  for (const d of wheel()) {
    const k = parse(d.camelot);
    const plus7 = moves(k).find((x) => x.move.startsWith("+7")).code;
    assert.equal(camelot(transpose(k, 1)), plus7, d.camelot);
  }
});
test("wrap-around 12 -> 1", () => {
  const m = moves(parse("12B")).map((x) => x.code);
  assert.ok(m.includes("1B") && m.includes("11B") && m.includes("12A"));
});
test("key distance", () => {
  assert.equal(keyDistance(parse("8A"), parse("8A")), 0);
  assert.equal(keyDistance(parse("8A"), parse("9A")), 1);
  assert.equal(keyDistance(parse("8A"), parse("10A")), 2);
  assert.equal(keyDistance(parse("8A"), parse("2B")), 5);
});
test("tempo match uses half/double time", () => {
  assert.equal(tempoMatch(128, 128).percent, 0);
  assert.equal(tempoMatch(140, 70).mode, "B double-time");
  assert.equal(tempoMatch(94, 188).mode, "B half-time");
  assert.equal(tempoMatch(128, 124).percent, 3.2);
});
test("mashup: same key, close tempo scores high", () => {
  const r = mashup({ bpm: 124, key: "Am" }, { bpm: 122, key: "C" });
  assert.ok(r.score >= 80, String(r.score));
  assert.equal(r.key.bestShift.semitones, 0);
});
test("mashup: clashing keys get a pitch-shift suggestion", () => {
  const r = mashup({ bpm: 96, key: "8A" }, { bpm: 94, key: "2A" });
  assert.equal(r.key.asIs, "clash");
  assert.ok(Math.abs(r.key.bestShift.semitones) <= 6 && r.key.bestShift.semitones !== 0);
  assert.equal(r.key.bestShift.relation, "compatible");
});
test("set planner: harmonic order", () => {
  const set = planSet([
    { title: "a", bpm: 124, key: "8A" }, { title: "b", bpm: 126, key: "2B" }, { title: "c", bpm: 124, key: "9A" },
    { title: "d", bpm: 125, key: "10A" }, { title: "e", bpm: 125, key: "1B" }, { title: "f", bpm: 126, key: "12B" },
  ]);
  assert.equal(set.length, 6);
  assert.equal(new Set(set.map((t) => t.title)).size, 6);
  const clashes = set.filter((t) => t.transition?.kind === "clash").length;
  assert.ok(clashes <= 1, `clashes ${clashes}: ${set.map((t) => t.camelot).join(" ")}`);
});
const bin = new URL("../bin/camelot.js", import.meta.url).pathname;
const run = (...a) => execFileSync(process.execPath, [bin, ...a]).toString();
test("CLI: key, mix, shift, wheel, set", () => {
  assert.match(run("Am"), /Camelot 8A/);
  assert.match(run("A", "minor", "--json"), /"camelot": "8A"/);
  assert.match(run("mix", "128", "8A", "124", "C", "major"), /Score: \d+\/100/);
  assert.match(run("shift", "8A", "+2"), /10A/);
  assert.match(run("wheel", "--lang", "es"), /La menor/);
  const dir = mkdtempSync(join(tmpdir(), "cw-"));
  writeFileSync(join(dir, "s.csv"), "file,bpm,key,camelot\nx.wav,124,A minor,8A\n\"y, remix.wav\",125,E minor,9A\nz.wav,126,C major,8B\n");
  const out = run("set", join(dir, "s.csv"));
  assert.match(out, /Every transition is harmonic/);
  assert.match(out, /y, remix\.wav/);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
