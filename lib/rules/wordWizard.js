// Word Wizard rules — pure, no DOM, no canvas.
//
// Timed anagram hunt: every round deals 7 letters, and the player builds
// 3–7 letter words from them. A word only scores if it is in the round's own
// curated answer key, so the game never rejects a word it cannot prove.

export const LETTER_COUNT = 7;
export const MIN_WORD = 3;
export const ROUND_SECONDS = 90;
export const CLEAR_BONUS_SECONDS = 20;
export const CLEAR_BONUS_POINTS = 500;

// Points by word length. Longer words are worth disproportionately more.
export const WORD_POINTS = { 3: 30, 4: 60, 5: 100, 6: 150, 7: 250 };

// Hand-curated rounds. Every word below is spellable from the round letters,
// which is asserted by the test suite.
export const ROUNDS = [
  {
    letters: 'PLANETS',
    words: [
      'PLAN', 'PLANE', 'PLANET', 'PLANETS', 'PLANT', 'PLANTS', 'PLATE', 'PLATES',
      'LANE', 'LANES', 'LATE', 'LEAST', 'LEAN', 'LEANS', 'NEAT', 'NEST', 'PANE',
      'PANEL', 'PANELS', 'PANTS', 'PASTE', 'PAST', 'PEAT', 'PEST', 'PETAL',
      'PETALS', 'SALE', 'SALT', 'SANE', 'SEAL', 'SENT', 'SLANT', 'SLATE', 'TALE',
      'TALES', 'TAPE', 'TAPES', 'TEAL', 'ANTE', 'ANTS', 'APE', 'APES', 'EAT',
      'EATS', 'LAP', 'LAPS', 'LAST', 'NET', 'NETS', 'NAP', 'NAPS', 'PALE',
      'PALES', 'PALS', 'PAN', 'PANS', 'PAT', 'PATS', 'PEA', 'PEAS', 'PEN',
      'PENS', 'PENT', 'PET', 'PETS', 'SATE', 'SAT', 'SET', 'SPA', 'SPAN',
      'SPAT', 'TAP', 'TAPS', 'TAN', 'TANS', 'TEA', 'TEAS', 'TEN', 'TENS', 'ASP'
    ]
  },
  {
    letters: 'MONSTER',
    words: [
      'MONSTER', 'STONE', 'STORM', 'STORE', 'STERN', 'TONES', 'TONER', 'TONERS',
      'TORE', 'TORN', 'TERM', 'TERMS', 'MOTE', 'MOTES', 'MORE', 'MOST', 'MORN',
      'MORNS', 'NEST', 'NETS', 'NORM', 'NORMS', 'NOSE', 'NOTE', 'NOTES', 'OMEN',
      'OMENS', 'ONES', 'ONSET', 'ORES', 'REST', 'RENT', 'RENTS', 'ROTE', 'ROTES',
      'ROT', 'ROTS', 'ROSE', 'SENT', 'SNORE', 'SNORT', 'SOME', 'SORE', 'SORT',
      'STEM', 'TENS', 'TENSOR', 'TERN', 'TERNS', 'TOES', 'TONE', 'METRO', 'EONS',
      'EON', 'ONE', 'NOR', 'NOT', 'NET', 'MET', 'MEN', 'SON', 'ROE', 'ROES',
      'TEN', 'TOE', 'TOM', 'TOMS', 'SET'
    ]
  },
  {
    letters: 'GARDENS',
    words: [
      'GARDENS', 'GARDEN', 'GRAND', 'GRADE', 'GRADES', 'RANGE', 'RANGES',
      'DANGER', 'DANGERS', 'RAGES', 'RAGE', 'RANG', 'RANGED', 'DARN', 'DARNS',
      'DARE', 'DARES', 'DEAN', 'DEANS', 'DEAR', 'DEARS', 'DEN', 'DENS', 'DRAG',
      'DRAGS', 'EARN', 'EARNS', 'EARS', 'END', 'ENDS', 'ERA', 'ERAS', 'GAS',
      'GEAR', 'GEARS', 'NEAR', 'NEARS', 'NAG', 'NAGS', 'NERD', 'NERDS', 'RAG',
      'RAGS', 'RAN', 'READ', 'READS', 'RED', 'REDS', 'REND', 'RENDS', 'SAD',
      'SAGE', 'SAGER', 'SANE', 'SAND', 'SANDER', 'SANG', 'SEAR', 'SEND', 'SNAG',
      'SNARE', 'SNARED', 'AGE', 'AGES', 'AND', 'ARE', 'EAR', 'GANDER', 'GANDERS'
    ]
  },
  {
    letters: 'PICTURE',
    words: [
      'PICTURE', 'CUTE', 'CUTER', 'CURE', 'CURT', 'CITE', 'CUP', 'CUT', 'CUTIE',
      'EPIC', 'ERUPT', 'ICE', 'IRE', 'PIE', 'PIER', 'PIT', 'PRICE', 'PUCE',
      'PURE', 'PUT', 'RICE', 'RIPE', 'RITE', 'TIE', 'TIER', 'TIP', 'TIRE',
      'TRICE', 'TRIP', 'TRIPE', 'TRUE', 'TRUCE', 'URIC', 'CRUET'
    ]
  },
  {
    letters: 'KITCHEN',
    words: [
      'KITCHEN', 'THICKEN', 'THICK', 'THIN', 'THINE', 'NECK', 'NICE', 'NICK',
      'NICHE', 'INCH', 'ITCH', 'ETCH', 'CHIN', 'CHINE', 'CHINK', 'CHIT', 'KNIT',
      'KITE', 'KIT', 'KIN', 'KEN', 'HINT', 'HIKE', 'HIT', 'HEN', 'THE',
      'THEN', 'TIE', 'TIN', 'TINE', 'TIC', 'ICE', 'INK', 'TEN', 'NET', 'NIT',
      'HIE'
    ]
  },
  {
    letters: 'DOLPHIN',
    words: [
      'DOLPHIN', 'HOLD', 'HOP', 'HID', 'HIND', 'HIP', 'IDOL', 'ION', 'LID',
      'LIP', 'LOIN', 'LION', 'LOP', 'NIL', 'NIP', 'NOD', 'OIL', 'OLD', 'PIN',
      'POD', 'POND', 'PHI', 'PLOD', 'DIP', 'DIN', 'DON'
    ]
  },
  {
    letters: 'HARVEST',
    words: [
      'HARVEST', 'HAVE', 'HAT', 'HATE', 'HATER', 'HASTE', 'HARE', 'HARES',
      'HART', 'HARTS', 'HEAR', 'HEART', 'HEARTS', 'HEAT', 'HEATS', 'HER', 'RAT',
      'RATE', 'RATES', 'RAVE', 'RAVES', 'RASH', 'REST', 'SAVE', 'SAVER', 'SEAT',
      'SEAR', 'SET', 'SHAVE', 'SHAVER', 'SHARE', 'SHEAR', 'SHE', 'STAR', 'STARE',
      'STARVE', 'STAVE', 'TAR', 'TARE', 'TARES', 'TEA', 'TEAR', 'TEARS', 'TEAS',
      'THE', 'TRASH', 'VASE', 'VAST', 'VAT', 'VATS', 'VEST', 'VET', 'VETS',
      'AVE', 'AVERT', 'EAR', 'EARS', 'EAT', 'EATS', 'ERA', 'ERAS', 'SATE'
    ]
  },
  {
    letters: 'BLANKET',
    words: [
      'BLANKET', 'BLANK', 'BLEAK', 'BLEAT', 'BALE', 'BALK', 'BANK', 'BATE',
      'BAT', 'BEAN', 'BEAT', 'BELT', 'BENT', 'BET', 'KALE', 'LAKE', 'LANE',
      'LANK', 'LATE', 'LEAN', 'LEANT', 'LEAK', 'LENT', 'NAB', 'NEAT', 'NET',
      'TAKE', 'TAKEN', 'TALE', 'TALK', 'TANK', 'TEAK', 'TEAL', 'TEN', 'ABLE',
      'ANKLE', 'ANT', 'ANTE', 'ATE', 'BAN', 'BANE', 'LATKE'
    ]
  },
  {
    letters: 'SNOWMAN',
    words: [
      'SNOWMAN', 'SNOW', 'MAN', 'MOAN', 'MOANS', 'MOWN', 'MOW', 'NOW', 'OWN',
      'SAW', 'SAWN', 'SOW', 'SOWN', 'SWAN', 'SWAM', 'WAN', 'WAS', 'WOMAN', 'WON',
      'AWN', 'MAW', 'MOA', 'MOAS', 'SOMA'
    ]
  },
  {
    letters: 'THUNDER',
    words: [
      'THUNDER', 'UNDER', 'TUNED', 'TUNE', 'TUNER', 'TURN', 'TURNED', 'HUNT',
      'HUNTER', 'HUNTED', 'HURT', 'HUT', 'HERD', 'HER', 'RUDE', 'RUED', 'RUNT',
      'RUNE', 'RENT', 'REND', 'RED', 'NET', 'NUT', 'NUDE', 'DENT', 'DUE', 'DUN',
      'DUNE', 'END', 'HUE', 'HUED', 'TEND', 'TERN', 'THE', 'THEN', 'THUD',
      'TREND', 'TRUE', 'TRUED', 'TURD', 'URN', 'NERD'
    ]
  },
  {
    letters: 'JOURNEY',
    words: [
      'JOURNEY', 'JOY', 'JURY', 'RUN', 'RUNE', 'RUE', 'RYE', 'OUR', 'ORE', 'ONE',
      'YOU', 'YOUR', 'YON', 'YORE', 'YEN', 'EURO', 'EON', 'JURE', 'ROUE', 'URN'
    ]
  },
  {
    letters: 'MACHINE',
    words: [
      'MACHINE', 'CHAIN', 'CHIME', 'CHIN', 'CHINE', 'EACH', 'MEAN', 'MANE', 'MAN',
      'MAIN', 'MINE', 'MINCE', 'MICE', 'MICA', 'HEM', 'HEN', 'HIM', 'INCH',
      'ICE', 'MACE', 'NAME', 'NICE', 'NICHE', 'CANE', 'CAME', 'CAM', 'ACNE',
      'ACME', 'ACHE', 'AHEM', 'AMEN', 'ANIME', 'HAM', 'MANIC', 'MIEN', 'HIE'
    ]
  },
  {
    letters: 'PENGUIN',
    words: [
      'PENGUIN', 'PEN', 'PUN', 'PIN', 'PINE', 'PING', 'PIG', 'PUG', 'NINE',
      'NUN', 'NIP', 'INN', 'GUN', 'GIN', 'UNPEG', 'PIE', 'GNU'
    ]
  },
  {
    letters: 'TROPICS',
    words: [
      'TROPICS', 'TROPIC', 'STRIP', 'SPORT', 'SPOT', 'SPIT', 'SORT', 'STOP',
      'STIR', 'SIT', 'SIR', 'SIP', 'SCRIPT', 'SCRIP', 'CRISP', 'CROP', 'CROPS',
      'COST', 'COT', 'COTS', 'COP', 'COPS', 'CIST', 'PIT', 'PITS', 'POT', 'POTS',
      'PORT', 'PORTS', 'POST', 'PRO', 'PROS', 'ROT', 'ROTS', 'RIP', 'RIPS',
      'TIP', 'TIPS', 'TOP', 'TOPS', 'TOR', 'TORC', 'TRIP', 'TRIPS', 'TRIO',
      'TRIOS', 'TIC', 'TICS', 'TOPIC', 'TOPICS', 'PIC', 'PICS', 'PSI', 'STROP'
    ]
  },
  {
    letters: 'FARMERS',
    words: [
      'FARMERS', 'FARMER', 'FARMS', 'FARM', 'FARE', 'FARES', 'FEAR', 'FEARS',
      'FRAME', 'FRAMES', 'FAME', 'SAFE', 'SAFER', 'SAME', 'SEAM', 'SEAR',
      'SERF', 'MAR', 'MARE', 'MARES', 'MESA', 'RARE', 'RASE', 'REAM', 'REAMS',
      'REAR', 'REARS', 'REARMS', 'REF', 'REFS', 'SMEAR', 'ARE', 'ARES', 'ARM',
      'ARMS', 'EAR', 'EARS', 'ERA', 'ERAS', 'ERR', 'ERRS', 'RAM', 'RAMS'
    ]
  }
];

export function pointsFor(word) {
  const len = String(word || '').length;
  if (len < MIN_WORD) return 0;
  return WORD_POINTS[Math.min(7, len)] || 250;
}

// Multiset check: can `word` be spelled from `letters`?
export function canSpell(word, letters) {
  const pool = String(letters || '').toUpperCase().split('');
  const counts = new Map();
  for (const ch of pool) counts.set(ch, (counts.get(ch) || 0) + 1);
  for (const ch of String(word || '').toUpperCase()) {
    const n = counts.get(ch) || 0;
    if (n <= 0) return false;
    counts.set(ch, n - 1);
  }
  return true;
}

export function normalize(word) {
  return String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function makeRound(index) {
  const def = ROUNDS[index];
  return {
    index,
    letters: def.letters.split(''),
    solutions: def.words.slice(),
    lookup: new Set(def.words)
  };
}

export function createState(rng, opts) {
  const rand = typeof rng === 'function' ? rng : Math.random;
  const options = opts || {};
  const round = makeRound(Math.floor(rand() * ROUNDS.length) % ROUNDS.length);
  return {
    round,
    word: [],            // tile indices, in the order the player picked them
    found: new Set(),
    score: 0,
    time: options.seconds || ROUND_SECONDS,
    cleared: false,
    lastEvent: null,
    rand
  };
}

export function resetState(state, rng) {
  const rand = typeof rng === 'function' ? rng : state.rand || Math.random;
  const fresh = createState(rand);
  state.round = fresh.round;
  state.word = [];
  state.found = new Set();
  state.score = 0;
  state.time = ROUND_SECONDS;
  state.cleared = false;
  state.lastEvent = null;
  state.rand = rand;
  return state;
}

export function wordFromTiles(state) {
  return state.word.map((i) => state.round.letters[i]).join('');
}

// Toggle a tile in or out of the current word. A tile can only be used once.
export function pickTile(state, index) {
  if (!state || index < 0 || index >= state.round.letters.length) return false;
  const at = state.word.indexOf(index);
  if (at >= 0) {
    state.word.splice(at, 1);
    return true;
  }
  if (state.word.length >= state.round.letters.length) return false;
  state.word.push(index);
  return true;
}

export function backspace(state) {
  if (!state || !state.word.length) return false;
  state.word.pop();
  return true;
}

export function clearWord(state) {
  if (!state || !state.word.length) return false;
  state.word = [];
  return true;
}

// Submit the built word. Returns { ok, reason, points }.
export function submit(state, rawWord) {
  if (!state) return { ok: false, reason: 'empty', points: 0 };
  const word = normalize(rawWord == null ? wordFromTiles(state) : rawWord);
  state.word = [];

  if (word.length < MIN_WORD) return { ok: false, reason: 'short', points: 0, word };
  if (state.found.has(word)) return { ok: false, reason: 'used', points: 0, word };
  if (!canSpell(word, state.round.letters.join(''))) {
    return { ok: false, reason: 'letters', points: 0, word };
  }
  if (!state.round.lookup.has(word)) return { ok: false, reason: 'unknown', points: 0, word };

  const points = pointsFor(word);
  state.found.add(word);
  state.score += points;
  const cleared = state.found.size >= state.round.solutions.length;
  if (cleared) state.cleared = true;
  state.lastEvent = { type: 'found', word, points, cleared };
  return { ok: true, reason: 'ok', points, word, cleared };
}

// Advance the clock. Returns { gameover, cleared }.
export function tick(state, dt) {
  const out = { gameover: false, cleared: false };
  if (!state) return out;
  const h = Math.max(0, Math.min(dt, 0.05));
  state.time = Math.max(0, state.time - h);
  if (state.cleared) {
    out.cleared = true;
    state.cleared = false;
  }
  if (state.time <= 0) out.gameover = true;
  return out;
}

// Deal a fresh round, never the one just played.
export function nextRound(state) {
  if (!state) return null;
  let index = state.round.index;
  if (ROUNDS.length > 1) {
    const rand = state.rand || Math.random;
    let guard = 0;
    do {
      index = Math.floor(rand() * ROUNDS.length) % ROUNDS.length;
      guard++;
    } while (index === state.round.index && guard < 20);
    if (index === state.round.index) index = (index + 1) % ROUNDS.length;
  }
  state.round = makeRound(index);
  state.word = [];
  state.found = new Set();
  state.cleared = false;
  state.lastEvent = null;
  return state.round;
}

export function progress(state) {
  if (!state) return { found: 0, total: 0 };
  return { found: state.found.size, total: state.round.solutions.length };
}

// Words still to find, longest first — used by the hint line.
export function remaining(state) {
  if (!state) return [];
  return state.round.solutions
    .filter((w) => !state.found.has(w))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
}
