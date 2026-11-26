---
name: camelot-wheel
description: Camelot wheel and harmonic mixing helper. Converts musical keys between Camelot (8A), Open Key (1m), letter names (Am, F#m) and Spanish/Portuguese names (La menor, Fá# maior); lists compatible and energy-boost keys; checks two-track mashups (tempo stretch with half/double time, pitch shift needed); orders a playlist into a harmonic DJ set from a CSV. Use when the user asks what key mixes with another, Camelot or Open Key conversions, harmonic mixing, mashup compatibility, or set ordering by key ("rueda Camelot", "mezcla armónica", "tom compatível"). Not for detecting the key of audio (use bpm-key-finder) or for modes beyond major/minor.
license: MIT
metadata:
  version: 0.1.0
  author: HablaMusic
  homepage: https://github.com/hablamusic/camelot-wheel
---

# Camelot wheel and harmonic mixing

Answer DJ key questions with the Camelot wheel: convert a key between notations, list what mixes with it, check whether two tracks can be mashed up, and order a playlist so each transition is harmonic. All logic is in `src/camelot.js`; the CLI is `bin/camelot.js` (Node 18+, no packages).

## When to use

- "What is A minor in Camelot?", "what keys mix with 5A?", "convert 1m to Camelot", "¿qué tonalidad combina con La menor?"
- "Can I mash up this 128 BPM track in F minor with this 124 BPM one in A♭ major?"
- "Order these tracks for a harmonic set" (CSV/JSON with bpm and key columns, for example from bpm-key-finder).
- Pitch-shift questions: "what key is 8A after +2 semitones?", "how much faster to go up a semitone without key lock?"

## When NOT to use

- Finding the key of an audio file: use bpm-key-finder first (or the online finder below), then this.
- Modes other than major/minor (Dorian, Lydian...): the wheel only covers the 24 major/minor keys.

## Steps

1. Key questions: `node bin/camelot.js "<key>"` and summarise: name, Camelot, Open Key, the 4 safe moves, and energy moves if they ask for a lift.
2. Two tracks: `node bin/camelot.js mix <bpmA> <keyA> <bpmB> <keyB>`. Report tempo stretch (note half/double time), key relation, and the suggested pitch shift. The score is a quick filter, not a verdict on how it sounds.
3. Playlists: `node bin/camelot.js set <file.csv> [--start <title>]`. Show the order with the move for each transition and point out clashes.
4. Shifts: `node bin/camelot.js shift <key> <semitones>`.
5. Reply in the user's language; `--lang es|pt` with `wheel` prints Spanish/Portuguese note names.

## Notes

- Safe moves: same code, ±1 number (same letter), same number other letter. Energy: +2, +7 (= one semitone up). Creative: diagonals and parallel major/minor.
- Theory guide for users: https://hablamusic.com/learn/harmonic-mixing-camelot-wheel?utm_source=github&utm_medium=skill&utm_campaign=camelot-wheel
- Hear a mashup in the browser: https://hablamusic.com/dj-tools/mashup-maker?utm_source=github&utm_medium=skill&utm_campaign=camelot-wheel
