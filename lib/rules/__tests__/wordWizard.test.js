import { describe, expect, it } from 'vitest';
import {
  CLEAR_BONUS_POINTS,
  LETTER_COUNT,
  MIN_WORD,
  ROUNDS,
  ROUND_SECONDS,
  backspace,
  canSpell,
  clearWord,
  createState,
  nextRound,
  normalize,
  pickTile,
  pointsFor,
  progress,
  remaining,
  resetState,
  submit,
  tick,
  wordFromTiles
} from '../wordWizard.js';

function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fresh(seed = 3) {
  return createState(seeded(seed));
}

describe('round data', () => {
  it('every round has exactly 7 letters', () => {
    for (const r of ROUNDS) {
      expect(r.letters.length).toBe(LETTER_COUNT);
      expect(r.letters).toBe(r.letters.toUpperCase());
    }
  });

  it('every answer is at least 3 letters and spellable from the round letters', () => {
    for (const r of ROUNDS) {
      for (const w of r.words) {
        expect(w.length).toBeGreaterThanOrEqual(MIN_WORD);
        expect(w.length).toBeLessThanOrEqual(LETTER_COUNT);
        expect(canSpell(w, r.letters)).toBe(true);
      }
    }
  });

  it('no round lists the same word twice', () => {
    for (const r of ROUNDS) {
      expect(new Set(r.words).size).toBe(r.words.length);
    }
  });

  it('every round includes its own 7-letter word', () => {
    for (const r of ROUNDS) {
      expect(r.words).toContain(r.letters);
    }
  });

  it('every round has a solvable set of at least 15 words', () => {
    for (const r of ROUNDS) {
      expect(r.words.length).toBeGreaterThanOrEqual(15);
    }
  });
});

describe('canSpell', () => {
  it('respects letter counts', () => {
    expect(canSpell('PLANET', 'PLANETS')).toBe(true);
    expect(canSpell('PLANETS', 'PLANETS')).toBe(true);
    expect(canSpell('PLANETSS', 'PLANETS')).toBe(false);
    expect(canSpell('ZOO', 'PLANETS')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(canSpell('planet', 'PLANETS')).toBe(true);
  });
});

describe('pointsFor', () => {
  it('scales with length and ignores short words', () => {
    expect(pointsFor('')).toBe(0);
    expect(pointsFor('AB')).toBe(0);
    expect(pointsFor('PAN')).toBe(30);
    expect(pointsFor('PLAN')).toBe(60);
    expect(pointsFor('PLANE')).toBe(100);
    expect(pointsFor('PLANET')).toBe(150);
    expect(pointsFor('PLANETS')).toBe(250);
  });
});

describe('normalize', () => {
  it('uppercases and strips non-letters', () => {
    expect(normalize(' planet! ')).toBe('PLANET');
    expect(normalize('p-l-a-n')).toBe('PLAN');
    expect(normalize(null)).toBe('');
  });
});

describe('createState', () => {
  it('deals a full round with a clean board', () => {
    const s = fresh();
    expect(s.round.letters).toHaveLength(LETTER_COUNT);
    expect(s.word).toEqual([]);
    expect(s.found.size).toBe(0);
    expect(s.score).toBe(0);
    expect(s.time).toBe(ROUND_SECONDS);
  });

  it('is deterministic for a given seed', () => {
    expect(fresh(11).round.index).toBe(fresh(11).round.index);
  });
});

describe('pickTile', () => {
  it('adds tiles in order and toggles them off', () => {
    const s = fresh();
    pickTile(s, 0);
    pickTile(s, 2);
    expect(s.word).toEqual([0, 2]);
    pickTile(s, 0);
    expect(s.word).toEqual([2]);
  });

  it('rejects out-of-range indices and ignores a tile already used', () => {
    const s = fresh();
    expect(pickTile(s, -1)).toBe(false);
    expect(pickTile(s, 99)).toBe(false);
    pickTile(s, 1);
    expect(pickTile(s, 1)).toBe(true);
    expect(s.word).toEqual([]);
  });

  it('never exceeds the number of tiles', () => {
    const s = fresh();
    for (let i = 0; i < LETTER_COUNT + 4; i++) pickTile(s, i % LETTER_COUNT);
    expect(s.word.length).toBeLessThanOrEqual(LETTER_COUNT);
  });
});

describe('backspace / clearWord', () => {
  it('removes the last tile or clears everything', () => {
    const s = fresh();
    pickTile(s, 0);
    pickTile(s, 1);
    expect(backspace(s)).toBe(true);
    expect(s.word).toEqual([0]);
    expect(clearWord(s)).toBe(true);
    expect(s.word).toEqual([]);
    expect(backspace(s)).toBe(false);
  });
});

describe('submit', () => {
  it('scores a real word and adds it to found', () => {
    const s = createState(seeded(1));
    const target = s.round.solutions.find((w) => w.length === 3);
    const res = submit(s, target);
    expect(res.ok).toBe(true);
    expect(res.points).toBe(pointsFor(target));
    expect(s.score).toBe(res.points);
    expect(s.found.has(target)).toBe(true);
    expect(s.word).toEqual([]);
  });

  it('rejects words shorter than three letters', () => {
    const s = fresh();
    expect(submit(s, 'AT').reason).toBe('short');
  });

  it('rejects a word that cannot be spelled from the tiles', () => {
    const s = fresh();
    expect(submit(s, 'ZZZ').reason).toBe('letters');
  });

  it('rejects a spellable word that is not in the answer key', () => {
    const s = fresh();
    // Find a 3-letter combination of the tiles that is not an answer.
    const letters = s.round.letters.join('');
    let probe = null;
    for (const a of letters) {
      for (const b of letters) {
        for (const c of letters) {
          const w = a + b + c;
          if (!s.round.lookup.has(w) && canSpell(w, letters)) {
            probe = w;
            break;
          }
        }
        if (probe) break;
      }
      if (probe) break;
    }
    if (!probe) return; // every combination is an answer; nothing to assert
    expect(submit(s, probe).reason).toBe('unknown');
  });

  it('rejects the same word twice', () => {
    const s = createState(seeded(1));
    const target = s.round.solutions.find((w) => w.length === 4);
    submit(s, target);
    expect(submit(s, target).reason).toBe('used');
  });

  it('submits the built word when no argument is given', () => {
    const s = createState(seeded(1));
    const target = s.round.solutions.find((w) => w.length === 3);
    for (let i = 0; i < target.length; i++) {
      const idx = s.round.letters.indexOf(target[i]);
      pickTile(s, idx);
    }
    expect(wordFromTiles(s)).toBe(target);
    expect(submit(s).ok).toBe(true);
  });

  it('flags the round as cleared when every answer is found', () => {
    const s = createState(seeded(1));
    let last = null;
    for (const w of s.round.solutions) last = submit(s, w);
    expect(last.cleared).toBe(true);
    expect(progress(s).found).toBe(progress(s).total);
  });
});

describe('tick', () => {
  it('counts the clock down and ends the run at zero', () => {
    const s = fresh();
    s.time = 0.03;
    expect(tick(s, 1 / 60).gameover).toBe(false);
    const res = tick(s, 1 / 60);
    expect(res.gameover).toBe(true);
    expect(s.time).toBe(0);
  });

  it('never runs the clock backwards', () => {
    const s = fresh();
    s.time = 5;
    tick(s, -3);
    expect(s.time).toBe(5);
  });
});

describe('nextRound', () => {
  it('deals a different round and clears the board', () => {
    const s = createState(seeded(5));
    const before = s.round.index;
    submit(s, s.round.solutions[0]);
    nextRound(s);
    expect(s.round.index).not.toBe(before);
    expect(s.found.size).toBe(0);
    expect(s.word).toEqual([]);
  });

  it('keeps the score across rounds', () => {
    const s = createState(seeded(5));
    submit(s, s.round.solutions[0]);
    const score = s.score;
    nextRound(s);
    expect(s.score).toBe(score);
  });
});

describe('resetState', () => {
  it('clears score, found words and the clock', () => {
    const s = createState(seeded(2));
    submit(s, s.round.solutions[0]);
    s.time = 12;
    resetState(s, s.rand);
    expect(s.score).toBe(0);
    expect(s.found.size).toBe(0);
    expect(s.time).toBe(ROUND_SECONDS);
  });
});

describe('remaining', () => {
  it('lists unfound words longest first', () => {
    const s = fresh();
    const list = remaining(s);
    expect(list).toHaveLength(s.round.solutions.length);
    expect(list[0].length).toBeGreaterThanOrEqual(list[list.length - 1].length);
  });
});

describe('constants', () => {
  it('exposes a clear bonus', () => {
    expect(CLEAR_BONUS_POINTS).toBeGreaterThan(0);
  });
});
