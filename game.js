'use strict';

/* ---------- Yardımcılar ---------- */
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const N = 16, S = 40, SIZE = N * S, MAX_LIVES = 3;
// Yılan her 2 meyvede bir halka uzar; bir bölüm 3 görev × 5 meyve.
const GROW_EVERY = 2, MISSIONS = 3, MISSION_SIZE = 5, BITE_REACH = 4;
const canvas = $('#board'), ctx = canvas.getContext('2d');
const overlay = $('#overlay'), toastEl = $('#toast'), countdownEl = $('#countdown');
const scoreEl = $('#score'), heartsEl = $('#hearts'), pauseBtn = $('#pause');
const dirs = {up: {x: 0, y: -1}, down: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}};
const same = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
const rand = n => Math.floor(Math.random() * n);
const pick = list => list[rand(list.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fontStack = '"Fredoka",ui-rounded,"Trebuchet MS",system-ui,sans-serif';
const emojiFont = size => `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;

const store = {
  get(key, fallback) { try { const raw = localStorage.getItem('lara-snake-' + key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('lara-snake-' + key, JSON.stringify(value)); } catch {} },
  flag(key, fallback) { try { const raw = localStorage.getItem('lara-snake-' + key); return raw === null ? fallback : raw !== 'off'; } catch { return fallback; } },
  setFlag(key, on) { try { localStorage.setItem('lara-snake-' + key, on ? 'on' : 'off'); } catch {} }
};

/* ---------- İçerik ---------- */
const fruits = [
  {name: 'Elma', icon: '🍎', points: 10, color: '#e4554f', sound: 'apple'},
  {name: 'Çilek', icon: '🍓', points: 20, color: '#e9507e', sound: 'strawberry'},
  {name: 'Üzüm', icon: '🍇', points: 30, color: '#9b6bd1', sound: 'grape'}
];
const bonuses = [
  {kind: 'star', icon: '⭐', name: 'Yıldız', detail: 'Puanlar iki kat!', duration: 8000, color: '#f2b705'},
  {kind: 'slow', icon: '❄️', name: 'Kar tanesi', detail: 'Yılan yavaşladı, rahat rahat topla!', duration: 8000, color: '#5fb8d8'},
  {kind: 'shield', icon: '🛡️', name: 'Kalkan', detail: 'Bir çarpışmada seni korur!', duration: 15000, color: '#4fae9b'},
  {kind: 'heart', icon: '💖', name: 'Kalp', detail: 'Bir kalbin geri geldi!', duration: 0, color: '#ff6f9c'},
  {kind: 'shrink', icon: '🧪', name: 'Küçülme iksiri', detail: 'Yılan küçüldü, kuyruğu çiçek açtı!', duration: 0, color: '#b36bd8'}
];
const skins = [
  {id: 'green', name: 'Yeşil', badge: '🌼', head: '#5e9a3c', body: ['#7fbf55', '#95cf6b'], spot: '#c8eaa8', pattern: 'spots', accessory: 'flower', unlock: 0},
  {id: 'pink', name: 'Pembe', badge: '🎀', head: '#e2588c', body: ['#f58bb4', '#f9a6c6'], spot: '#fff0f5', pattern: 'hearts', accessory: 'bow', unlock: 0},
  {id: 'purple', name: 'Mor', badge: '🧙', head: '#8a63c9', body: ['#ab8de0', '#bea4ea'], spot: '#fff3b0', pattern: 'stars', accessory: 'hat', unlock: 15},
  {id: 'ocean', name: 'Deniz', badge: '⚓', head: '#3691b8', body: ['#5ebfdf', '#7fcfe8'], spot: '#eaf8fd', pattern: 'stripes', accessory: 'sailor', unlock: 40},
  {id: 'rainbow', name: 'Gökkuşağı', badge: '✨', head: '#ff8a5c', rainbow: true, spot: '#ffffff', pattern: 'none', accessory: 'sparkles', unlock: 80},
  {id: 'gold', name: 'Altın', badge: '👑', head: '#c9951f', body: ['#e8b93c', '#f3cc5c'], spot: '#fff8dc', pattern: 'sparkle', accessory: 'crown', unlock: 150}
];
const stickers = [
  {id: 'first', icon: '🍎', name: 'İlk Lokma', how: 'İlk meyveni topla'},
  {id: 'ten', icon: '🧺', name: 'Sepet Dolu', how: 'Bir turda 10 meyve topla'},
  {id: 'twentyfive', icon: '🍉', name: 'Meyve Şöleni', how: 'Bir turda 25 meyve topla'},
  {id: 'star', icon: '⭐', name: 'Yıldız Avcısı', how: 'Bir yıldız yakala'},
  {id: 'slow', icon: '❄️', name: 'Serinkanlı', how: 'Bir kar tanesi yakala'},
  {id: 'shield', icon: '🛡️', name: 'Kalkan Taşıyıcı', how: 'Bir kalkan yakala'},
  {id: 'rescued', icon: '💫', name: 'Ucuz Kurtuldum', how: 'Kalkan seni kurtarsın'},
  {id: 'heart', icon: '💖', name: 'Kalp Toplayıcı', how: 'Kaybettiğin bir kalbi geri al'},
  {id: 'shrink', icon: '🧪', name: 'Minik Yılan', how: 'Küçülme iksiri iç'},
  {id: 'combo', icon: '🔥', name: 'Seri Ustası', how: '×3 seri yap'},
  {id: 'hundred', icon: '💯', name: 'Yüzlük', how: 'Bir turda 100 puan topla'},
  {id: 'threehundred', icon: '🏅', name: 'Üç Yüzlük', how: 'Bir turda 300 puan topla'},
  {id: 'long', icon: '🐍', name: 'Upuzun', how: 'Yılanın 10 kare uzasın'},
  {id: 'missions', icon: '🌼', name: 'Görev Perisi', how: 'Bir bölümü bitir'},
  {id: 'walls', icon: '🧱', name: 'Cesur Kâşif', how: 'Duvarlı bahçede 10 meyve topla'},
  {id: 'tunnel', icon: '🕳️', name: 'Tünel Kâşifi', how: 'Bir tünelden geç'},
  {id: 'record', icon: '🏆', name: 'Rekor Kıran', how: 'Kendi rekorunu geç'},
  {id: 'stars3', icon: '🌟', name: 'Üç Yıldız', how: 'Bir bölümü 3 yıldızla bitir'},
  {id: 'garden8', icon: '🗺️', name: 'Bahçe Gezgini', how: 'Bütün bahçeleri bitir'},
  {id: 'rainbow', icon: '🌈', name: 'Gökkuşağı', how: 'Gökkuşağı yılanını aç'},
  {id: 'friend', icon: '💕', name: 'Can Dostu', how: 'Sürpriz arkadaşa sarıl'},
  {id: 'gift', icon: '🎁', name: 'Hediye Avcısı', how: 'Arkadaşının bıraktığı hediyeyi aç'},
  {id: 'twins', icon: '💞', name: 'Çifte Sarılma', how: 'Birlikte gelen iki arkadaşa da sarıl'},
  {id: 'escape', icon: '🏃‍♀️', name: 'Kaçış Ustası', how: "Huysuz Yılan'dan ısırılmadan kurtul"},
  {id: 'hide', icon: '🌳', name: 'Saklambaç', how: 'Çalıya saklan, Huysuz Yılan seni kaybetsin'},
  {id: 'ten-games', icon: '🎈', name: 'Bahçe Dostu', how: '10 bölüm oyna'}
];
const praise = ['Harikasın Lara!', 'Süpersin!', 'Vay canına!', 'Muhteşem!', 'Bravo!', 'İşte bu!', 'Çok iyisin!'];

/* ---------- Bölümler ---------- */
// Harita: . çimen, W gölet, B çalı (Lara saklanır, Huysuz giremez), 1/2 tünel çiftleri. Taş yok: çocuğa gereksiz zor geldi.
// Başlangıç sırası (8. satır) boş kalmalı; her bölüm yeni bir şey tanıtır.
const levels = [
  {name: 'Çiçek Bahçesi', icon: '🌼', tip: 'Meyveleri topla, arkadaşlara sarıl!', villain: false, map: Array(N).fill('.'.repeat(N))},
  {name: 'Tüneller', icon: '🕳️', tip: 'Bir delikten gir, öbüründen çık!', villain: false, map: [
    '................', '................', '..1.............', '................',
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '.............1..', '................', '................']},
  {name: 'Çalılık', icon: '🌳', tip: 'Huysuz Yılan gelirse çalıya saklan!', villain: true, map: [
    '................', '................', '..BBB......BBB..', '..BBB......BBB..',
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '..BBB......BBB..', '..BBB......BBB..', '................', '................']},
  {name: 'Gölet', icon: '💧', tip: 'Gölete girme, kenarından dolaş!', villain: true, map: [
    '................', '................', '.BBB.......BBB..', '.BBB.......BBB..',
    '......WWWW......', '.....WWWWWW.....', '......WWWW......', '................',
    '................', '................', '................', '................',
    '................', '......BBBB......', '......BBBB......', '................']},
  {name: 'Göl Kenarı', icon: '🌊', tip: 'Gölün kenarından dolaş, tünelden geç!', villain: false, map: [
    '................', '.1..........BBB.', '............BBB.', '..WWW...........',
    '..WWW...........', '..WWW...........', '................', '................',
    '................', '................', '..........WWW...', '..........WWW...',
    '..BBB.....WWW...', '..BBB...........', '............1...', '................']},
  {name: 'Saklambaç', icon: '🙈', tip: 'Çalılar senin saklanma yerin!', villain: true, map: [
    '................', '................', '..BBB..BB..BBB..', '..BBB..BB..BBB..',
    '................', '..BB...BB...BB..', '..BB...BB...BB..', '................',
    '................', '................', '..BB...BB...BB..', '..BB...BB...BB..',
    '................', '..BBB..BB..BBB..', '..BBB..BB..BBB..', '................']},
  {name: 'Tünel Ağı', icon: '🌀', tip: 'Aynı renkteki delikler birbirine bağlı!', villain: true, map: [
    '................', '................', '..1....BB....2..', '.......BB.......',
    '................', '..BB........BB..', '..BB........BB..', '................',
    '................', '................', '..BB........BB..', '..BB........BB..',
    '................', '.......BB.......', '..2....BB....1..', '................']},
  {name: 'Büyük Bahçe', icon: '👑', tip: 'Her şey burada, sen yaparsın!', villain: true, map: [
    '................', '.1............2.', '................', '..........BBB...',
    '..........BBB...', '.....WWW........', '.....WWW........', '................',
    '................', '...........WW...', '..BBB......WW...', '..BBB...........',
    '................', '................', '.2............1.', '................']}
];
const surprise = {name: 'Sürpriz Bahçe', icon: '🎲', tip: 'Bu bahçeyi daha önce hiç görmedin!', villain: true};

const key = c => c.y * N + c.x;
const inside = c => c.x >= 0 && c.x < N && c.y >= 0 && c.y < N;
const around = c => Object.values(dirs).map(d => ({x: c.x + d.x, y: c.y + d.y}));

// Harita satırlarını hücre türlerine ve tünel eşlerine çevirir.
function parseMap(rows, id) {
  const tiles = rows.join('').split(''), partner = new Map(), ends = {};
  tiles.forEach((ch, i) => {
    if (ch !== '1' && ch !== '2') return;
    const c = {x: i % N, y: Math.floor(i / N)};
    if (ends[ch]) { partner.set(i, ends[ch]); partner.set(key(ends[ch]), c); } else ends[ch] = c;
  });
  return {id, tiles, partner, rows};
}
let terrain = parseMap(levels[0].map, 'L1');
const tile = c => inside(c) ? terrain.tiles[key(c)] : '#';
const solid = c => tile(c) === 'W';
const isBush = c => tile(c) === 'B';
const holeOf = c => inside(c) ? terrain.partner.get(key(c)) || null : null;
const isOpen = c => tile(c) === '.';
// Arkadaşlar çalıya girebilir, Huysuz Yılan yalnız açık çimende yürür; tünelleri yalnız Lara kullanır.
const friendGround = c => { const t = tile(c); return t === '.' || t === 'B'; };
const villainGround = isOpen;

// Haritanın oynanabilir olduğunu sınar: başlangıç boş, çıkmaz sokak yok, her yere ulaşılıyor, tünel ağızları açık.
function mapProblems(rows) {
  const tiles = rows.join(''), at = c => inside(c) ? tiles[c.y * N + c.x] : '#';
  const blocked = c => { const t = at(c); return t === '#' || t === 'W'; };
  const problems = [];
  if (rows.length !== N || rows.some(r => r.length !== N)) return ['boyut'];
  for (let x = 0; x <= 13; x++) if (at({x, y: 8}) !== '.') problems.push('başlangıç ' + x);
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = {x, y};
    if (blocked(c)) continue;
    cells.push(c);
    if (around(c).filter(blocked).length > 2) problems.push(`çıkmaz ${x},${y}`);
    if (at(c) === '1' || at(c) === '2') if (around(c).some(n => at(n) !== '.')) problems.push(`tünel ağzı ${x},${y}`);
  }
  const seen = new Set([key(cells[0])]), todo = [cells[0]];
  while (todo.length) for (const n of around(todo.pop())) if (!blocked(n) && !seen.has(key(n))) { seen.add(key(n)); todo.push(n); }
  if (seen.size !== cells.length) problems.push('kopuk alan');
  for (const ch of ['1', '2']) {
    const ends = cells.filter(c => at(c) === ch);
    if (ends.length && ends.length !== 2) problems.push('tünel sayısı ' + ch);
    else if (ends.length && Math.abs(ends[0].x - ends[1].x) + Math.abs(ends[0].y - ends[1].y) < 6) problems.push('tünel kısa ' + ch);
  }
  return problems;
}

// 8. bölümden sonra her seferinde yeni, rastgele ama sınanmış bir bahçe.
function surpriseMap() {
  for (let attempt = 0; attempt < 400; attempt++) {
    const g = Array.from({length: N}, () => Array(N).fill('.'));
    const taken = [];
    // Engeller birbirine ve kenara değmez: kapalı cep oluşmaz.
    const place = (w, h, ch) => {
      for (let t = 0; t < 40; t++) {
        const x = 1 + rand(N - w - 1), y = 1 + rand(N - h - 1);
        if (y <= 9 && y + h - 1 >= 7) continue;
        if (taken.some(r => x <= r.x + r.w && r.x <= x + w && y <= r.y + r.h && r.y <= y + h)) continue;
        taken.push({x, y, w, h});
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[y + j][x + i] = ch;
        return true;
      }
      return false;
    };
    if (Math.random() < .7) place(2 + rand(3), 2 + rand(2), 'W');
    if (Math.random() < .3) place(2 + rand(2), 2, 'W');
    for (let k = 3 + rand(3); k > 0; k--) place(2 + rand(2), 2, 'B');
    if (Math.random() < .7) { place(1, 1, '1'); place(1, 1, '1'); }
    if (Math.random() < .3) { place(1, 1, '2'); place(1, 1, '2'); }
    const rows = g.map(r => r.join(''));
    if (!mapProblems(rows).length) return rows;
  }
  return levels[levels.length - 1].map;
}
const levelInfo = n => n <= levels.length ? levels[n - 1] : surprise;

/* ---------- Kayıt ---------- */
const profile = Object.assign(
  {best: 0, totalFruit: 0, games: 0, stickers: [], skin: 'green', speed: 230, walls: false, night: false, unlocked: 1, levelStars: []},
  store.get('profile', {})
);
profile.unlocked = Math.max(1, Math.floor(Number(profile.unlocked)) || 1);
if (!Array.isArray(profile.levelStars)) profile.levelStars = [];
profile.best = Math.max(Number(profile.best) || 0, Number(store.get('best', 0)) || 0);
if (![230, 160, 105].includes(profile.speed)) profile.speed = 230;
const saveProfile = () => store.set('profile', profile);
const skin = () => skins.find(s => s.id === profile.skin && s.unlock <= profile.totalFruit) || skins[0];

/* ---------- Durum ---------- */
let snake = [], prevSnake = [], direction = dirs.right, queue = [], foods = [], bonus = null, growth = 0;
let state = 'ready', screen = 'start', stickersReturn = 'start';
let score = 0, collected = 0, combo = 0, comboUntil = 0, missionTarget = MISSION_SIZE, missionsDone = 0, lives = MAX_LIVES, effects = {}, gameTime = 0;
let level = 1, levelFruit = 0, levelStart = {score: 0, collected: 0}, levelFails = 0, recordShown = false;
let speed = profile.speed, walls = !!profile.walls, night = !!profile.night, interval = speed, acc = 0, lastFrame = 0, pace = 1;
let countdownStart = 0, countdownStep = null, hurtStart = 0, hurtDone = false, clearedStart = 0, clearedShown = false, eatPulse = 0;
let particles = [], pops = [], blooms = [], roundStickers = [], roundSkins = [], bestAtStart = 0, toasts = [], toastTimer = 0;
let friends = [], gifts = [], nextFriendAt = 0, villain = null, nextVillainAt = 0, villainVisits = 0;
let sound = store.flag('sound', true), musicOn = store.flag('music', true);
const active = kind => (effects[kind] || 0) > gameTime;
// pace: iyi gidince görev görev biraz hızlanır, kalp gidince biraz yavaşlar (uyarlanan zorluk).
const currentInterval = () => Math.round(speed * pace * (active('slow') ? 1.65 : 1));
const inRound = () => state === 'playing' || state === 'countdown' || state === 'hurt';

/* ---------- Ses ---------- */
// Notalar: [frekans, süre, gecikme, isteğe bağlı bitiş frekansı]
const soundEffects = {
  start: {notes: [[523, .12, 0], [659, .12, .12], [784, .22, .24]]},
  apple: {notes: [[620, .08, 0, 880], [880, .12, .08]]},
  strawberry: {notes: [[740, .09, 0], [988, .15, .09]]},
  grape: {notes: [[659, .08, 0], [831, .08, .08], [988, .15, .16]]},
  spawn: {notes: [[1047, .08, 0], [1319, .14, .12]], volume: .11},
  star: {notes: [[784, .09, 0], [988, .09, .09], [1175, .09, .18], [1568, .2, .27]]},
  slow: {notes: [[880, .14, 0, 440], [440, .25, .14, 220]], wave: 'sine'},
  shield: {notes: [[440, .18, 0], [660, .18, 0], [880, .2, .18]]},
  heart: {notes: [[659, .1, 0], [784, .1, .1], [1047, .22, .2]]},
  rescue: {notes: [[180, .12, 0, 520], [784, .2, .12]]},
  mission: {notes: [[523, .1, 0], [659, .1, .1], [784, .1, .2], [1047, .24, .3]]},
  sticker: {notes: [[784, .08, 0], [1047, .08, .08], [1319, .08, .16], [1568, .26, .24]], volume: .15},
  unlock: {notes: [[523, .1, 0], [659, .1, .1], [784, .1, .2], [1047, .1, .3], [1319, .3, .4]]},
  win: {notes: [[523, .12, 0], [659, .12, .12], [784, .12, .24], [1047, .3, .36], [784, .3, .36]]},
  over: {notes: [[523, .15, 0], [440, .15, .15], [392, .35, .3]], volume: .14},
  ouch: {notes: [[392, .12, 0, 294], [294, .2, .12, 220]], wave: 'sine', volume: .16},
  count: {notes: [[880, .09, 0]], volume: .12},
  go: {notes: [[1047, .12, 0], [1319, .25, .1]], volume: .14},
  pause: {notes: [[659, .1, 0], [523, .14, .1]], volume: .11},
  resume: {notes: [[523, .1, 0], [659, .14, .1]], volume: .11},
  turn: {notes: [[330, .035, 0, 440]], volume: .035},
  locked: {notes: [[330, .1, 0], [262, .16, .1]], volume: .1},
  friend: {notes: [[659, .1, 0], [784, .1, .1], [988, .1, .2], [784, .1, .3], [1175, .28, .4]], volume: .15},
  hug: {notes: [[523, .1, 0], [659, .1, .08], [784, .1, .16], [1047, .32, .24]], volume: .17},
  gift: {notes: [[523, .08, 0], [784, .08, .08], [1047, .08, .16], [1319, .1, .24], [1568, .3, .32]], volume: .16},
  steal: {notes: [[330, .1, 0, 262], [262, .18, .1, 196]], wave: 'sawtooth', volume: .07},
  villain: {notes: [[196, .18, 0], [185, .18, .18], [165, .42, .36]], wave: 'sawtooth', volume: .08},
  shrink: {notes: [[1319, .08, 0, 988], [988, .08, .08, 659], [784, .1, .16], [1175, .22, .26]], volume: .15},
  tunnel: {notes: [[260, .16, 0, 780], [780, .16, .14, 1170]], wave: 'sine', volume: .13},
  hide: {notes: [[523, .1, 0], [392, .1, .12], [523, .1, .24], [659, .2, .36]], wave: 'sine', volume: .14},
  level: {notes: [[523, .1, 0], [659, .1, .1], [784, .1, .2], [1047, .14, .3], [1319, .14, .44], [1568, .4, .58]], volume: .16}
};
let audio = null, sfxGain = null, musicGain = null, soundRevision = 0;

function ensureAudio() {
  if (audio && audio.state !== 'closed') return audio;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio yok');
  audio = new Ctx();
  // Kulaklıkla oynayan bir çocuğu ani tepe sesleri rahatsız etmesin.
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -14; limiter.knee.value = 20; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .2;
  limiter.connect(audio.destination);
  sfxGain = audio.createGain(); sfxGain.gain.value = .7; sfxGain.connect(limiter);
  musicGain = audio.createGain(); musicGain.gain.value = 0; musicGain.connect(limiter);
  return audio;
}

function warmAudio() {
  if (!sound && !musicOn) return;
  try { ensureAudio(); if (audio.state !== 'running') audio.resume(); } catch {}
}

async function playSound(name, pitch = 1) {
  if (!sound) return;
  const revision = soundRevision;
  try {
    ensureAudio();
    if (audio.state !== 'running') await audio.resume();
    if (!sound || revision !== soundRevision || audio.state !== 'running') return;
    const effect = soundEffects[name], base = audio.currentTime + .01;
    for (const [freq, duration, delay, endFreq] of effect.notes) {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = base + delay, end = start + duration;
      oscillator.type = effect.wave || 'triangle';
      oscillator.frequency.setValueAtTime(freq * pitch, start);
      if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(endFreq * pitch, end);
      gain.gain.setValueAtTime(.001, start);
      gain.gain.linearRampToValueAtTime(effect.volume || .18, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, end);
      oscillator.connect(gain); gain.connect(sfxGain);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end + .02);
    }
  } catch {}
}

// Do majör pentatonik, 8 ölçülük neşeli bir ezgi; [midi, vuruş], 0 = sus.
const melody = [
  [72, .5], [74, .5], [76, .5], [79, .5], [76, 1], [74, 1],
  [72, .5], [74, .5], [72, .5], [69, .5], [67, 2],
  [69, .5], [72, .5], [74, .5], [76, .5], [79, 1], [76, 1],
  [74, .5], [72, .5], [74, .5], [76, .5], [72, 2],
  [76, .5], [79, .5], [81, .5], [79, .5], [76, 1], [74, 1],
  [72, .5], [69, .5], [67, .5], [69, .5], [72, 2],
  [74, .5], [76, .5], [79, .5], [81, .5], [84, 1], [81, 1],
  [79, .5], [76, .5], [74, .5], [72, .5], [72, 1], [0, 1]
];
const bassLine = [48, 45, 53, 48, 48, 45, 55, 48].flatMap(root => [[root, 1], [root + 7, 1], [root, 1], [root + 7, 1]]);
// Huysuz Yılan bahçedeyken: La minör, daha hızlı ve gergin.
const dangerMelody = [
  [69, .5], [72, .5], [71, .5], [69, .5], [67, 1], [65, 1],
  [64, .5], [65, .5], [67, .5], [64, .5], [62, 1], [64, 1],
  [69, .5], [72, .5], [71, .5], [69, .5], [67, 1], [65, 1],
  [68, .5], [69, .5], [68, .5], [65, .5], [64, 2]
];
const dangerBass = [45, 41, 45, 40].flatMap(root => [[root, 1], [root + 7, 1], [root, 1], [root + 3, 1]]);
const tunes = {
  happy: {melody, bass: bassLine, tempoScale: 1, wave: 'triangle', volume: .085, bassVolume: .11},
  danger: {melody: dangerMelody, bass: dangerBass, tempoScale: 1.3, wave: 'square', volume: .05, bassVolume: .12}
};

function tone(midi, at, duration, wave, volume) {
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = wave; oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(volume, at + .02);
  gain.gain.setValueAtTime(volume, at + Math.max(.03, duration - .08));
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(gain); gain.connect(musicGain);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(at); oscillator.stop(at + duration + .02);
}

const music = {
  timer: null, playing: false, melAt: 0, bassAt: 0, melIdx: 0, bassIdx: 0, mode: 'happy',
  tempo() { return (100 + (230 - speed * pace) * .3) * tunes[this.mode].tempoScale; },
  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (!this.playing) return;
    this.melIdx = 0; this.bassIdx = 0; this.melAt = this.bassAt = audio.currentTime + .25;
    musicGain.gain.cancelScheduledValues(audio.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audio.currentTime);
    musicGain.gain.linearRampToValueAtTime(.15, audio.currentTime + .2);
    musicGain.gain.linearRampToValueAtTime(1, audio.currentTime + .6);
  },
  async start() {
    if (!musicOn || this.playing) return;
    try { ensureAudio(); if (audio.state !== 'running') await audio.resume(); } catch { return; }
    if (!musicOn || this.playing || audio.state !== 'running' || !inRound()) return;
    this.playing = true; this.melIdx = 0; this.bassIdx = 0; this.mode = villain ? 'danger' : 'happy';
    this.melAt = this.bassAt = audio.currentTime + .1;
    musicGain.gain.cancelScheduledValues(audio.currentTime);
    musicGain.gain.setValueAtTime(0, audio.currentTime);
    musicGain.gain.linearRampToValueAtTime(1, audio.currentTime + .6);
    this.timer = setInterval(() => this.schedule(), 120);
    this.schedule();
  },
  stop() {
    if (!this.playing) return;
    this.playing = false; clearInterval(this.timer);
    musicGain.gain.cancelScheduledValues(audio.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audio.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, audio.currentTime + .4);
  },
  schedule() {
    const tune = tunes[this.mode], beat = 60 / this.tempo(), horizon = audio.currentTime + .4;
    while (this.melAt < horizon) {
      const [note, length] = tune.melody[this.melIdx];
      if (note) tone(note, this.melAt, length * beat * .85, tune.wave, tune.volume);
      this.melAt += length * beat; this.melIdx = (this.melIdx + 1) % tune.melody.length;
    }
    while (this.bassAt < horizon) {
      const [note, length] = tune.bass[this.bassIdx];
      if (note) tone(note, this.bassAt, length * beat * .8, 'sine', tune.bassVolume);
      this.bassAt += length * beat; this.bassIdx = (this.bassIdx + 1) % tune.bass.length;
    }
  }
};

const buzz = pattern => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} };

/* ---------- Bildirimler ---------- */
function toast(text, ms = 1600) {
  toasts.push({text, ms});
  if (toasts.length > 3) toasts.splice(0, toasts.length - 3);
  if (!toastTimer) nextToast();
}
function nextToast() {
  const item = toasts.shift();
  if (!item) { toastEl.classList.remove('show'); toastTimer = 0; return; }
  toastEl.textContent = item.text; toastEl.classList.add('show');
  toastTimer = setTimeout(() => { toastEl.classList.remove('show'); toastTimer = setTimeout(nextToast, 180); }, item.ms);
}
function showCountdown(text, ouch = false) {
  countdownEl.hidden = false; countdownEl.textContent = text;
  countdownEl.classList.toggle('ouch', ouch);
  countdownEl.classList.remove('pop'); void countdownEl.offsetWidth; countdownEl.classList.add('pop');
}
function hideCountdown() { countdownEl.hidden = true; }
function pulse(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* ---------- Oyun kuralları ---------- */
const occupied = c => snake.some(p => same(p, c)) || foods.some(p => same(p, c)) || same(bonus, c) || gifts.some(g => same(g, c))
  || friends.some(f => f.body.some(p => same(p, c))) || !!(villain && villain.body.some(p => same(p, c)));
function freeCell() {
  const free = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cell = {x, y};
    if (isOpen(cell) && !occupied(cell)) free.push(cell);
  }
  return free.length ? pick(free) : null;
}
function spawnFruit(type) { const cell = freeCell(); if (cell) foods.push({...cell, type}); }
function refill() { fruits.forEach(type => { if (!foods.some(item => item.type === type)) spawnFruit(type); }); }

const bonusOf = kind => bonuses.find(b => b.kind === kind);
// Küçülme iksiri yalnız yılan uzunken çıkar; uzadıkça daha sık.
const shrinkChance = () => snake.length >= 9 ? .55 : snake.length >= 6 ? .3 : 0;
function chooseBonus() {
  if (lives < MAX_LIVES && Math.random() < .45) return bonusOf('heart');
  if (Math.random() < shrinkChance()) return bonusOf('shrink');
  return pick(bonuses.filter(b => b.duration));
}
function spawnBonus() {
  bonus = null;
  const cell = freeCell();
  if (!cell) return;
  const type = chooseBonus();
  bonus = {...cell, type, expires: gameTime + 12000};
  toast(`${type.icon} ${type.name} çıktı, çabuk yakala!`, 1500);
  playSound('spawn');
}

const startSnake = () => [{x: 7, y: 8}, {x: 6, y: 8}, {x: 5, y: 8}, {x: 4, y: 8}];
// Bölümü baştan kurar. Aynı bölümü yeniden denerken (again) harita korunur; sürpriz bahçe de değişmez.
function setupLevel(n, again) {
  if (!again || terrain.level !== n) {
    terrain = parseMap(n <= levels.length ? levels[n - 1].map : surpriseMap(), `L${n}-${Date.now()}`);
    terrain.level = n;
  }
  level = n;
  snake = startSnake(); prevSnake = snake.map(p => ({...p})); direction = dirs.right; queue = []; growth = 0;
  foods = []; bonus = null; effects = {}; particles = []; pops = []; blooms = [];
  combo = 0; comboUntil = 0; gameTime = 0; levelFruit = 0; missionTarget = MISSION_SIZE; missionsDone = 0;
  lives = MAX_LIVES; acc = 0; eatPulse = 0; roundStickers = []; roundSkins = [];
  pace = again ? Math.min(1.2, 1 + .07 * levelFails) : 1;
  levelStart = {score, collected};
  friends = []; gifts = []; villain = null; villainVisits = 0; $('#villain-chip').hidden = true;
  // Huysuz'lu bölümde önce o gelir (ilk görev bitince), arkadaşlar o gittikten sonra; ötekilerde arkadaş erken gelir.
  if (levelInfo(n).villain) { nextVillainAt = 25000 + rand(5000); nextFriendAt = Infinity; }
  else { nextVillainAt = Infinity; nextFriendAt = 6000 + rand(4000); }
  fruits.forEach(type => spawnFruit(type));
  buildPonds();
  updateHud();
}

// Tünel ağzındaki baş, bir sonraki adımda eş deliğin üstünden çıkar.
function tunnelExit() {
  const exit = holeOf(snake[0]);
  return exit && !(snake[1] && same(snake[1], exit)) ? exit : null;
}
function candidate(d) {
  const exit = tunnelExit();
  let next;
  if (exit) next = {x: exit.x, y: exit.y};
  else {
    next = {x: snake[0].x + d.x, y: snake[0].y + d.y};
    if (walls && !inside(next)) return null;
    next.x = (next.x + N) % N; next.y = (next.y + N) % N;
  }
  if (solid(next)) return null;
  const grows = foods.some(p => same(p, next)) && growth + 1 >= GROW_EVERY;
  return (grows ? snake : snake.slice(0, -1)).some(p => same(p, next)) ? null : next;
}

function tick() {
  prevSnake = snake.map(p => ({...p}));
  if (bonus && bonus.expires <= gameTime) bonus = null;
  gifts = gifts.filter(g => g.expires > gameTime);
  if (comboUntil <= gameTime) combo = 0;
  if (queue.length) direction = queue.shift();
  const through = tunnelExit();
  let next = candidate(direction);
  if (!next && active('shield')) {
    const escape = Object.values(dirs).find(d => candidate(d));
    if (escape) {
      direction = escape; next = candidate(direction); queue = []; effects.shield = 0;
      toast('🛡️ Kalkan seni kurtardı!'); playSound('rescue'); award('rescued');
    }
  }
  if (!next) return hurt();
  const fruitIndex = foods.findIndex(p => same(p, next));
  snake.unshift(next);
  // Meyve her seferinde değil, GROW_EVERY meyvede bir uzatır.
  let vacated = null;
  if (fruitIndex >= 0 && ++growth >= GROW_EVERY) growth = 0; else vacated = snake.pop();
  if (through) passTunnel(through);
  if (fruitIndex >= 0) eat(foods.splice(fruitIndex, 1)[0], next);
  if (state !== 'playing') return;
  followFriends(vacated);
  if (same(bonus, next)) takeBonus(next);
  const giftIndex = gifts.findIndex(g => same(g, next));
  if (giftIndex >= 0) openGift(gifts.splice(giftIndex, 1)[0]);
  checkHug(); watchVillain(); checkBite();
  refill();
  updateHud();
}

function passTunnel(exit) {
  const entry = holeOf(exit), color = tunnelColor(exit);
  burst(entry, color, 10); burst(exit, color, 14);
  playSound('tunnel'); buzz(12); award('tunnel');
}

function eat(item, cell) {
  combo = Math.min(combo + 1, 3); comboUntil = gameTime + 6000; collected++; levelFruit++; profile.totalFruit++;
  const points = item.type.points * combo * (active('star') ? 2 : 1);
  addScore(points);
  pops.push({x: cell.x, y: cell.y, text: `+${points}`, color: item.type.color, born: performance.now()});
  burst(cell, item.type.color, 12);
  eatPulse = 1;
  playSound(item.type.sound, 1 + (combo - 1) * .12); buzz(15);
  if (collected === 1) award('first');
  if (collected >= 10) award('ten');
  if (collected >= 25) award('twentyfive');
  if (combo === 3) award('combo');
  if (snake.length >= 10) award('long');
  if (walls && collected >= 10) award('walls');
  if (score >= 100) award('hundred');
  if (score >= 300) award('threehundred');
  const unlocked = skins.find(s => s.unlock > 0 && s.unlock === profile.totalFruit);
  if (unlocked) {
    roundSkins.push(unlocked); confetti(40);
    toast(`Yeni yılan açıldı! 🐍 ${unlocked.name}`, 2400); playSound('unlock');
    if (unlocked.id === 'rainbow') award('rainbow');
  }
  if (levelFruit >= missionTarget) {
    missionsDone++; missionTarget += MISSION_SIZE; addScore(50);
    if (missionsDone >= MISSIONS) { saveProfile(); return clearLevel(); }
    // İyi gidiyor: bir sonraki görev azıcık daha hızlı.
    pace = Math.max(.86, pace - .05);
    if (levelInfo(level).villain && !villainVisits) nextVillainAt = Math.min(nextVillainAt, gameTime + 2000 + rand(1500));
    confetti(50); toast(`${pick(praise)} 🌼 +50`, 2000); playSound('mission'); buzz([30, 40, 30]);
  }
  saveProfile();
  if (levelFruit % 4 === 0) spawnBonus();
}

function takeBonus(cell) {
  const type = bonus.type; bonus = null;
  grantBonus(type, cell);
  pops.push({x: cell.x, y: cell.y, text: type.icon, icon: true, color: type.color, born: performance.now()});
  burst(cell, type.color, 16);
  toast(`${type.icon} ${type.detail}`, 1800); playSound(type.kind); buzz([20, 30, 20]);
}
function grantBonus(type, cell) {
  if (type.kind === 'heart') { lives = Math.min(MAX_LIVES, lives + 1); pulse(heartsEl, 'pulse'); }
  else if (type.kind === 'shrink') shrinkTail(cell);
  else effects[type.kind] = gameTime + type.duration;
  award(type.kind);
}

// Küçülme iksiri: kuyruktan 4 halka (en az 3 kalır) kopar, koptuğu yerlerde çiçek açar.
function shrinkTail(cell) {
  const count = Math.min(4, snake.length - 3);
  if (count <= 0) return;
  for (const c of snake.splice(-count)) {
    burst(c, '#ff8fb1', 8);
    if (isOpen(c) && !blooms.some(b => same(b, c)) && blooms.length < 40) blooms.push({x: c.x, y: c.y, born: performance.now(), color: pick(['#ff8fb1', '#ffd24d', '#c9a7f5', '#ffffff'])});
  }
  addScore(10 * count);
  pops.push({x: cell.x, y: cell.y - 1, text: `+${10 * count} 🌸`, color: '#e35a8c', born: performance.now()});
}

function addScore(points) {
  score += points; scoreEl.textContent = score; pulse($('#score-pill'), 'bump');
  if (score > profile.best) profile.best = score;
}

function award(id) {
  if (profile.stickers.includes(id)) return;
  const sticker = stickers.find(s => s.id === id);
  if (!sticker) return;
  profile.stickers.push(id); roundStickers.push(sticker); saveProfile();
  toast(`Yeni çıkartma! ${sticker.icon} ${sticker.name}`, 2200); playSound('sticker'); buzz([20, 40, 20]);
}

function hurt() {
  lives--; combo = 0; queue = []; updateHud(); pulse(heartsEl, 'pulse');
  playSound('ouch'); buzz(120);
  if (lives <= 0) return finish();
  // Zorlanıyor: oyun biraz yavaşlar.
  pace = Math.min(1.2, pace + .1);
  state = 'hurt'; hurtStart = performance.now(); hurtDone = false;
  for (const f of friends) if (f.follow) { f.follow = false; f.leaving = true; f.acc = 0; }
  showCountdown(lives === 2 ? 'Ayy!' : 'Dikkat!', true);
  toast(`💛 ${lives} kalbin kaldı, devam!`, 1500);
}
function stepHurt(now) {
  if (hurtDone || now - hurtStart < 900) return;
  hurtDone = true; respawn(); startCountdown();
}

// Çarpışmadan sonra yılan yarı boyuyla, önü açık ve Huysuz Yılan'dan uzak bir yere sağa bakacak şekilde konur.
function respawn() {
  const near = (c, body) => body.some(p => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= 2);
  const free = c => isOpen(c) && !foods.some(p => same(p, c)) && !same(bonus, c) && !gifts.some(g => same(g, c))
    && !friends.some(f => f.body.some(p => same(p, c))) && !(villain && near(c, villain.body));
  const place = body => { snake = body; prevSnake = body.map(p => ({...p})); direction = dirs.right; queue = []; };
  for (let length = Math.max(3, Math.floor(snake.length / 2)); length >= 3; length--) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const y = rand(N), x = length - 1 + rand(Math.max(1, N - 3 - length));
      const body = Array.from({length}, (_, k) => ({x: x - k, y}));
      const ahead = [1, 2, 3].map(k => ({x: x + k, y}));
      if (body.every(free) && ahead.every(c => isOpen(c) || isBush(c))) return place(body);
    }
  }
  place(startSnake());
}

function startCountdown() {
  state = 'countdown'; countdownStart = performance.now(); countdownStep = null;
  music.start();
}
function stepCountdown(now) {
  const elapsed = now - countdownStart;
  const step = elapsed < 600 ? 3 : elapsed < 1200 ? 2 : elapsed < 1800 ? 1 : elapsed < 2300 ? 0 : -1;
  if (step === countdownStep) return;
  countdownStep = step;
  if (step > 0) { showCountdown(String(step)); playSound('count'); }
  else if (step === 0) { showCountdown('Haydi!'); playSound('go'); }
  else { hideCountdown(); state = 'playing'; acc = 0; prevSnake = snake.map(p => ({...p})); updateHud(); }
}

function launch() {
  overlay.hidden = true; pauseBtn.disabled = false;
  const info = levelInfo(level);
  toast(`${info.icon} Bölüm ${level}: ${info.name}`, 1900); toast(info.tip, 2600);
  playSound('start'); startCountdown();
}
function play(n) {
  score = 0; collected = 0; bestAtStart = profile.best; recordShown = false; levelFails = 0;
  setupLevel(n, false); launch();
}
function nextLevel() { levelFails = 0; setupLevel(level + 1, false); launch(); }
function retryLevel() { score = levelStart.score; collected = levelStart.collected; setupLevel(level, true); launch(); }
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; music.stop(); playSound('pause'); setScreen('pause');
}
function resume() {
  if (state !== 'paused') return;
  overlay.hidden = true; playSound('resume'); startCountdown();
}
function home() {
  state = 'ready'; music.stop(); hideCountdown(); pauseBtn.disabled = true; score = 0; collected = 0;
  setupLevel(profile.unlocked, false); setScreen('start');
}

const recordNow = () => !recordShown && bestAtStart > 0 && score > bestAtStart;
const earnedHtml = () => [
  ...roundStickers.map(s => `<span>${s.icon} ${s.name}</span>`),
  ...roundSkins.map(s => `<span>🐍 Yeni yılan: ${s.name}</span>`)
].join('');

// Kalpler bitti: bölüm yarım kaldı, aynı bölüm yeniden denenir.
function finish() {
  state = 'over'; music.stop(); pauseBtn.disabled = true; hideCountdown(); queue = []; $('#villain-chip').hidden = true;
  profile.games++; levelFails++;
  if (profile.games >= 10) award('ten-games');
  const record = recordNow();
  if (record) { award('record'); recordShown = true; confetti(90); }
  saveProfile();
  playSound(record || missionsDone >= 2 ? 'win' : 'over'); buzz(60);
  $('#over-stars').innerHTML = Array.from({length: MISSIONS}, (_, i) => `<span class="${i < missionsDone ? '' : 'dim'}">🌼</span>`).join('');
  $('#over-title').textContent = record ? 'Yeni rekor, Lara! 🎉' : missionsDone >= 2 ? 'Az kaldı, Lara!' : missionsDone === 1 ? 'Güzel deneme!' : 'Isınma turuydu! 💪';
  $('#over-text').textContent = `${levelInfo(level).icon} Bölüm ${level} · 🌼 ${missionsDone}/${MISSIONS} görev · ${score} puan · 🏆 En iyi ${profile.best}`;
  $('#over-new').innerHTML = earnedHtml();
  setScreen('over');
}

// Üç görev bitti: bölüm tamam. Kalan her kalp bir yıldız.
let clearedStars = 0, clearedRecord = false;
function clearLevel() {
  state = 'cleared'; clearedStart = performance.now(); clearedShown = false;
  music.stop(); pauseBtn.disabled = true; queue = []; $('#villain-chip').hidden = true;
  clearedStars = lives; clearedRecord = recordNow();
  profile.games++;
  if (profile.games >= 10) award('ten-games');
  award('missions');
  if (clearedStars === 3) award('stars3');
  if (level === levels.length) award('garden8');
  if (clearedRecord) { award('record'); recordShown = true; }
  if (level <= levels.length) profile.levelStars[level - 1] = Math.max(profile.levelStars[level - 1] || 0, clearedStars);
  profile.unlocked = Math.max(profile.unlocked, level + 1);
  saveProfile();
  confetti(110); playSound('level'); buzz([40, 60, 40, 60, 80]);
  showCountdown('Bravo!');
}
function stepCleared(now) {
  if (clearedShown || now - clearedStart < 1600) return;
  clearedShown = true; hideCountdown();
  const info = levelInfo(level), next = levelInfo(level + 1);
  $('#level-stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= clearedStars ? '' : 'dim'}">⭐</span>`).join('');
  $('#level-title').textContent = level === levels.length ? 'Bütün bahçeleri gezdin! 👑'
    : clearedRecord ? 'Yeni rekor, Lara! 🎉' : clearedStars === 3 ? 'Muhteşemdin, Lara!' : `Bölüm ${level} bitti!`;
  $('#level-text').textContent = `${info.icon} ${info.name} · ${score} puan · 🏆 En iyi ${profile.best}`;
  $('#level-hint').textContent = clearedStars === 3 ? 'Hiç kalp kaybetmedin, üç yıldız!' : 'Kalan her kalbin bir ⭐ oldu.';
  $('#next-label').textContent = `${next.icon} Bölüm ${level + 1}`;
  $('#level-new').innerHTML = earnedHtml();
  setScreen('level');
}

function turn(name) {
  if (state !== 'playing' && state !== 'countdown') return;
  const d = dirs[name], last = queue.at(-1) || direction;
  if (queue.length < 2 && (d.x !== last.x || d.y !== last.y) && !(d.x === -last.x && d.y === -last.y)) {
    queue.push(d); playSound('turn');
  }
}

/* ---------- Yol bulma ---------- */
const onBorder = c => c.x === 0 || c.y === 0 || c.x === N - 1 || c.y === N - 1;
const stepOf = (c, d) => ({x: c.x + d.x, y: c.y + d.y});
// Engellerin etrafından dolaşan en kısa yolun ilk adımı; wrap açıksa kenardan karşıya geçilebilir.
function firstStep(from, isGoal, canEnter, wrap = false) {
  const seen = new Set([key(from)]), todo = [];
  const visit = (c, first) => {
    for (const d of Object.values(dirs)) {
      let n = stepOf(c, d);
      if (wrap) n = {x: (n.x + N) % N, y: (n.y + N) % N};
      if (!inside(n) || seen.has(key(n))) continue;
      seen.add(key(n));
      if (isGoal(n)) return first || d;
      if (canEnter(n)) todo.push({c: n, d: first || d});
    }
    return null;
  };
  let found = visit(from, null);
  for (let i = 0; !found && i < todo.length; i++) found = visit(todo[i].c, todo[i].d);
  return found;
}
// Bahçeden çıkış yönü: kenardaysa dışarı, değilse en yakın açık kenara.
function exitDir(head, cur, canEnter) {
  const back = d => d.x === -cur.x && d.y === -cur.y;
  const out = Object.values(dirs).filter(d => !inside(stepOf(head, d)) && !back(d));
  if (out.length) return out.includes(cur) ? cur : out[0];
  return firstStep(head, c => onBorder(c) && canEnter(c), canEnter);
}
// Bahçeye girilebilecek kenar kapıları: ilk üç hücresi yürünebilir ve Lara'nın başından uzak; her kenardan en çok bir tane.
function entryGates(ground, count, minGap) {
  const gates = [];
  for (const side of shuffle([0, 1, 2, 3])) {
    const dir = [dirs.right, dirs.left, dirs.down, dirs.up][side];
    for (const lane of shuffle(Array.from({length: N - 4}, (_, i) => i + 2))) {
      const head = side === 0 ? {x: -1, y: lane} : side === 1 ? {x: N, y: lane} : side === 2 ? {x: lane, y: -1} : {x: lane, y: N};
      const path = [1, 2, 3].map(k => ({x: head.x + dir.x * k, y: head.y + dir.y * k}));
      if (path.every(ground) && gap(path[0], snake[0]) >= minGap) { gates.push({head, dir}); break; }
    }
    if (gates.length >= count) break;
  }
  return gates;
}
const poof = cells => cells.filter(inside).forEach(c => burst(c, '#ffffff', 5));

/* ---------- Sürpriz arkadaşlar ve hediyeler ---------- */
// Arada bahçeye giren, çarpınca zarar vermeyen yılan dostları: dokununca sarılma, giderken hediye.
const friendNames = ['Boncuk', 'Fıstık', 'Pamuk', 'Limon', 'Zeytin', 'Badem', 'Şeker', 'Kiraz'];
const friendInterval = () => Math.round(currentInterval() * 1.35);
const shuffle = list => list.slice().sort(() => Math.random() - .5);
function scheduleFriend() { nextFriendAt = gameTime + 22000 + rand(16000); }

function spawnFriends() {
  const gates = entryGates(friendGround, Math.random() < .25 ? 2 : 1, 4), count = gates.length;
  if (!count) { scheduleFriend(); return; }
  const names = shuffle(friendNames), looks = shuffle(skins.filter(s => s.id !== skin().id));
  const visit = {size: count, hugs: 0};
  gates.forEach(({head, dir}, k) => {
    const body = Array.from({length: 5}, (_, i) => ({x: head.x - dir.x * i, y: head.y - dir.y * i}));
    friends.push({body, prev: body.map(p => ({...p})), dir, skin: looks[k], name: names[k], acc: -k * 450, until: gameTime + 18000, leaving: false, hugged: false, happyUntil: 0, visit, phase: 900 + k * 700});
  });
  toast(count === 2 ? `🐍🐍 Sürpriz! ${names[0]} ve ${names[1]} birlikte geldi!` : `🐍 Sürpriz! ${names[0]} bahçeye geldi, ona sarıl!`, 2400);
  playSound('friend');
}

function updateFriends(dt) {
  if (!friends.length) { if (gameTime >= nextFriendAt && !villain) spawnFriends(); return; }
  for (const f of [...friends]) {
    if (f.follow) {
      if (gameTime >= f.until) { f.follow = false; f.leaving = true; f.acc = 0; toast(`👋 ${f.name} el sallayıp gitti!`, 1800); }
      continue;
    }
    // Yolu kapanıp çıkamayan arkadaş bir süre sonra pırıltıyla kaybolur.
    if (f.leaving) { f.leftAt ??= gameTime; if (gameTime - f.leftAt > 10000) { poof(f.body); friends.splice(friends.indexOf(f), 1); continue; } }
    f.acc += dt;
    while (friends.includes(f) && f.acc >= friendInterval()) { f.acc -= friendInterval(); stepFriend(f); }
  }
  if (!friends.length) scheduleFriend();
}

const blockedForFriend = n => !inside(n) || !friendGround(n) || snake.some(p => same(p, n)) || friends.some(o => o.body.some(p => same(p, n))) || foods.some(p => same(p, n)) || same(bonus, n) || gifts.some(g => same(g, n));

function stepFriend(f) {
  const head = f.body[0], reverse = d => d.x === -f.dir.x && d.y === -f.dir.y;
  if (!f.leaving && gameTime >= f.until) {
    f.leaving = true;
    if (!f.hugged && inside(head) && Math.random() < .4) dropGift(f, head);
  }
  let dir = f.dir;
  if (f.leaving) {
    if (f.body.every(c => !inside(c))) { friends.splice(friends.indexOf(f), 1); return; }
    if (inside(head)) {
      dir = exitDir(head, f.dir, n => !blockedForFriend(n));
      if (!dir) return;
    }
  } else if (inside(head)) {
    const ok = d => !blockedForFriend(stepOf(head, d));
    if (!(ok(f.dir) && Math.random() < .75)) {
      const good = Object.values(dirs).filter(d => !reverse(d) && (d.x !== f.dir.x || d.y !== f.dir.y) && ok(d));
      if (good.length) dir = pick(good); else if (!ok(f.dir)) { f.leaving = true; return; }
    }
  }
  f.dir = dir;
  f.prev = f.body.map(p => ({...p}));
  f.body.unshift(stepOf(head, dir)); f.body.pop();
  checkHug();
}

function checkHug() {
  if (state !== 'playing') return;
  for (const f of friends) if (!f.hugged && (f.body.some(c => same(c, snake[0])) || snake.some(c => same(c, f.body[0])))) hug(f);
}

function hug(f) {
  f.hugged = true; f.leaving = false; f.follow = true; f.until = gameTime + 10000; f.happyUntil = gameTime + 2600; f.visit.hugs++;
  addScore(30);
  pops.push({x: snake[0].x, y: snake[0].y, text: '+30 💕', color: '#e35a8c', born: performance.now()});
  heartBurst(snake[0]);
  toast(`💕 ${f.name} sana sarıldı! +30`, 2200); playSound('hug'); buzz([20, 30, 20, 30]); award('friend');
  if (f.visit.size === 2 && f.visit.hugs === 2) award('twins');
  dropGift(f, f.body[0]);
}

// Sarılan arkadaş bir süre Lara'nın yılanının peşinden, kuyruğunun boşalttığı hücrelere basarak gelir.
function followFriends(vacated) {
  let target = vacated || snake[snake.length - 1];
  for (const f of friends) {
    if (!f.follow) continue;
    const head = f.body[0];
    let moved = false;
    if (vacated || gap(head, target) > 1) {
      const free = c => friendGround(c) && !snake.some(p => same(p, c)) && !friends.some(k => k.body.some(p => same(p, c))) && !(villain && villain.body.some(p => same(p, c)));
      const goal = target;
      const d = firstStep(head, c => same(c, goal) && friendGround(c), free, !walls);
      if (d) {
        f.dir = d; f.prev = f.body.map(p => ({...p}));
        f.body.unshift(wrapCell(stepOf(head, d))); vacated = f.body.pop(); moved = true;
      }
    }
    target = moved ? vacated : f.body[f.body.length - 1];
    if (!moved) vacated = null;
  }
}
const wrapCell = c => walls ? c : {x: (c.x + N) % N, y: (c.y + N) % N};
function gap(a, b) {
  let dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  if (!walls) { dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); }
  return dx + dy;
}

function dropGift(f, cell) {
  if (gifts.length >= 3) return;
  const spots = [cell, ...around(cell)].filter(c => isOpen(c) && !occupied(c));
  const spot = spots[0] || freeCell();
  if (!spot) return;
  gifts.push({x: spot.x, y: spot.y, from: f.name, expires: gameTime + 15000});
  toast(f.quiet ? '🎁 Çaldığı meyve hediyeye dönüştü!' : `🎁 ${f.name} sana bir hediye bıraktı!`, 2000); playSound('spawn');
}

function openGift(g) {
  let text;
  if (lives < MAX_LIVES && Math.random() < .5) { grantBonus(bonusOf('heart'), g); text = '💖 bir kalp'; }
  else if (Math.random() < .4) { addScore(50); text = '+50 puan'; }
  else {
    const type = Math.random() < shrinkChance() ? bonusOf('shrink') : pick(bonuses.filter(b => b.duration));
    grantBonus(type, g); text = `${type.icon} ${type.name}`;
  }
  pops.push({x: g.x, y: g.y, text: '🎁', icon: true, color: '#e35a8c', born: performance.now()});
  confetti(30);
  toast(`🎁 Hediyeden ${text} çıktı!`, 2200); playSound('gift'); buzz([20, 30, 20]); award('gift');
}

function heartBurst(cell) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, sp = .05 + Math.random() * .12;
    particles.push({x: (cell.x + .5) * S, y: (cell.y + .5) * S, vx: Math.cos(a) * sp, vy: -.08 - Math.random() * .12, g: .00012, life: 1300, max: 1300, size: 4 + Math.random() * 4, color: pick(['#ff6f9c', '#ff8fb1', '#e35a8c', '#ffb3d1']), shape: 'heart'});
  }
}

/* ---------- Huysuz Yılan ---------- */
// Kaşları çatık kara yılan: kovalar, Lara'nın başına ya da ilk 3 boğumuna değerse bir kalp alır; kuyruğa dokunması zarar vermez.
// Lara çalıya girince onu kaybeder; bir süre bulamazsa pes edip gider. Kalkan onu korkutur, kaçan ödül kazanır.
const villainSkin = {id: 'villain', name: 'Huysuz Yılan', head: '#3d3d50', body: ['#2f2f3a', '#3a3a47'], spot: '#5a5a70', pattern: 'stripes', accessory: 'none'};
const villainInterval = () => Math.round(currentInterval() * 1.5);
function scheduleVillain() { nextVillainAt = levelInfo(level).villain ? gameTime + 30000 + rand(15000) : Infinity; }

function spawnVillain() {
  const gate = entryGates(villainGround, 1, 6)[0];
  if (!gate) { nextVillainAt = gameTime + 3000; return; }
  villainVisits++;
  const {head, dir} = gate;
  const body = Array.from({length: 6}, (_, i) => ({x: head.x - dir.x * i, y: head.y - dir.y * i}));
  villain = {body, prev: body.map(p => ({...p})), dir, acc: 0, until: gameTime + 15000, leaving: false, bit: false, carry: null, lost: false, lostAt: 0, foundAt: -1e9, hidNote: false, tailNote: false};
  $('#villain-chip').hidden = false;
  toast('😈 Dikkat! Huysuz Yılan geldi, kaç ya da çalıya saklan!', 2600); playSound('villain'); buzz([60, 40, 60]); music.setMode('danger');
}

function updateVillain(dt) {
  if (!villain) { if (gameTime >= nextVillainAt && !friends.length) spawnVillain(); return; }
  if (villain.leaving) { villain.leftAt ??= gameTime; if (gameTime - villain.leftAt > 10000) { poof(villain.body); villainLeaves(); return; } }
  villain.acc += dt;
  while (villain && state === 'playing' && villain.acc >= villainInterval()) { villain.acc -= villainInterval(); stepVillain(); }
}

// Lara'nın başı çalıdaysa Huysuz Yılan onu kaybeder; ancak çalı dışında 3 kareye kadar yaklaşırsa yeniden görür.
function watchVillain() {
  const v = villain;
  if (!v || v.leaving || !v.body.some(inside)) return;
  const me = snake[0], head = v.body[0];
  if (isBush(me)) {
    if (!v.lost) {
      v.lost = true; v.lostAt = gameTime;
      if (!v.hidNote) { v.hidNote = true; toast('🌳 Saklandın! Huysuz Yılan seni göremiyor.', 2000); playSound('hide'); }
      award('hide');
    }
  } else if (v.lost && Math.abs(me.x - head.x) + Math.abs(me.y - head.y) <= 3) { v.lost = false; v.foundAt = gameTime; }
  if (v.lost && gameTime - v.lostAt > 3500) {
    v.leaving = true;
    toast('😮‍💨 Huysuz Yılan seni bulamadı, gidiyor!', 2000);
  }
}

function stepVillain() {
  const v = villain, head = v.body[0], reverse = d => d.x === -v.dir.x && d.y === -v.dir.y;
  const canEnter = c => villainGround(c) && !v.body.some(p => same(p, c));
  if (!v.leaving && gameTime >= v.until) v.leaving = true;
  if (!v.leaving && inside(head)) watchVillain();
  let dir = v.dir;
  if (v.leaving) {
    if (v.body.every(c => !inside(c))) { villainLeaves(); return; }
    if (inside(head)) { dir = exitDir(head, v.dir, canEnter); if (!dir) return; }
  } else if (inside(head)) {
    const options = Object.values(dirs).filter(d => !reverse(d) && canEnter(stepOf(head, d)));
    if (v.lost) {
      // Göremiyor: Lara'nın başına ve ilk boğumlarına yaklaşmadan rastgele dolaşır.
      const near = c => snake.slice(0, BITE_REACH).some(p => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= 1);
      const safe = options.filter(d => !near(stepOf(head, d)));
      dir = safe.includes(v.dir) && Math.random() < .6 ? v.dir : safe.length ? pick(safe) : null;
      if (!dir) return;
    } else {
      const target = snake[0];
      const best = firstStep(head, c => same(c, target) && villainGround(c), canEnter);
      dir = best && Math.random() < .7 ? best : options.length ? pick(options) : best;
      if (!dir) { v.leaving = true; return; }
    }
  }
  v.dir = dir;
  v.prev = v.body.map(p => ({...p}));
  v.body.unshift(stepOf(head, dir)); v.body.pop();
  const loot = foods.findIndex(p => same(p, v.body[0]));
  if (loot >= 0 && !v.carry && !v.leaving && Math.random() < .6) {
    v.carry = foods.splice(loot, 1)[0].type.icon;
    toast(`😈 Huysuz Yılan bir ${v.carry} kaptı!`, 1800); playSound('steal');
  }
  checkBite();
}

function villainLeaves() {
  const bit = villain.bit, carried = villain.carry;
  villain = null; $('#villain-chip').hidden = true; scheduleVillain(); music.setMode('happy');
  nextFriendAt = Math.min(nextFriendAt, gameTime + 5000 + rand(4000));
  if (bit) { toast('😮‍💨 Huysuz Yılan gitti.', 2000); return; }
  if (carried) toast(`😮‍💨 Huysuz Yılan ${carried} ile kaçtı ama sen kurtuldun!`, 2400);
  addScore(40); confetti(40);
  toast('🎉 Huysuz Yılan pes etti, kaçmayı başardın! +40', 2600); playSound('mission'); award('escape');
}

// Isırık yalnız baş ve ilk 3 boğumda sayılır; kuyruğa dokunmak zararsız.
function checkBite() {
  if (!villain || villain.leaving || state !== 'playing') return;
  const head = villain.body[0];
  const bitten = villain.body.some(c => same(c, snake[0])) || snake.slice(0, BITE_REACH).some(c => same(c, head));
  if (!bitten) {
    if (!villain.tailNote && snake.some(c => same(c, head))) { villain.tailNote = true; toast('😤 Huysuz Yılan kuyruğunu yakalayamadı!', 1800); }
    return;
  }
  if (active('shield')) {
    effects.shield = 0; villain.leaving = true;
    toast("🛡️ Kalkan Huysuz Yılan'ı korkuttu!", 2000); playSound('rescue');
    if (villain.carry) { villain.carry = null; dropGift({name: 'Huysuz Yılan', quiet: true}, villain.body[0]); }
    return;
  }
  villain.bit = true; villain.leaving = true;
  toast('😈 Huysuz Yılan seni ısırdı!', 1800);
  hurt();
}

/* ---------- Arayüz ---------- */
function updateHud() {
  scoreEl.textContent = score;
  heartsEl.textContent = '❤️'.repeat(lives) + '🤍'.repeat(MAX_LIVES - lives);
  heartsEl.setAttribute('aria-label', `${lives} kalp`);
  const progress = levelFruit - (missionTarget - MISSION_SIZE), info = levelInfo(level);
  $('#mission-label').textContent = `${info.icon} Bölüm ${level} · Görev ${Math.min(missionsDone + 1, MISSIONS)}/${MISSIONS}`;
  $('#mission-count').textContent = `🍎 ${progress} / ${MISSION_SIZE}`;
  $('#mission-progress').value = progress;
  const comboEl = $('#combo');
  comboEl.hidden = combo < 2; comboEl.textContent = `🔥 Seri ×${combo}`;
  for (const type of bonuses) {
    if (!type.duration) continue;
    const chip = $(`#effect-${type.kind}`), on = active(type.kind);
    chip.hidden = !on;
    if (on) chip.textContent = `${type.icon} ${Math.ceil((effects[type.kind] - gameTime) / 1000)} sn`;
  }
  const bonusChip = $('#bonus-timer');
  bonusChip.hidden = !bonus;
  if (bonus) bonusChip.textContent = `${bonus.type.icon} ${Math.ceil((bonus.expires - gameTime) / 1000)} sn`;
}

function setScreen(name) {
  screen = name; overlay.hidden = false;
  $$('.screen').forEach(s => s.hidden = s.dataset.screen !== name);
  overlay.scrollTop = 0;
  if (name === 'start') { renderLevels(); renderSkins(); syncSettings(); }
  if (name === 'pause') syncSettings();
  if (name === 'stickers') renderStickers();
}
function openStickers() {
  if (state === 'countdown' || state === 'hurt' || (state === 'cleared' && !clearedShown)) return;
  if (state === 'playing') pause();
  stickersReturn = screen; setScreen('stickers');
}

// Bölüm seçimi: açılan bölümler yıldızlarıyla; 8. bölümden sonra sürpriz bahçeler.
function renderLevels() {
  const surpriseOpen = profile.unlocked > levels.length;
  const tiles = levels.map((info, i) => {
    const n = i + 1, locked = n > profile.unlocked, stars = profile.levelStars[i] || 0;
    const cls = locked ? ' locked' : n === profile.unlocked ? ' next' : '';
    return `<button type="button" class="level${cls}" data-level="${n}" aria-label="Bölüm ${n}: ${info.name}${locked ? ', kilitli' : `, ${stars} yıldız`}">` +
      `<span class="icon">${locked ? '🔒' : info.icon}</span><b>${n}</b><small><i>${'★'.repeat(stars)}</i>${'★'.repeat(3 - stars)}</small></button>`;
  });
  tiles.push(`<button type="button" class="level${surpriseOpen ? ' next' : ' locked'}" data-level="surprise" aria-label="Sürpriz bahçe${surpriseOpen ? '' : ', kilitli'}">` +
    `<span class="icon">${surpriseOpen ? surprise.icon : '🔒'}</span><b>∞</b><small>Sürpriz</small></button>`);
  $('#levels').innerHTML = tiles.join('');
  const n = profile.unlocked;
  $('#start-label').textContent = n > levels.length ? `Oyna · ${surprise.icon} Sürpriz` : `Oyna · Bölüm ${n}`;
}

function renderSkins() {
  $('#skins').innerHTML = skins.map(s => {
    const locked = s.unlock > profile.totalFruit;
    const body = s.rainbow ? 'linear-gradient(90deg,#ff6b6b,#ffb347,#ffe66d,#8ce99a,#74c0fc,#b197fc)' : s.body[0];
    return `<button type="button" class="skin${locked ? ' locked' : ''}" role="radio" aria-checked="${s.id === skin().id}" data-skin="${s.id}" style="--c1:${body};--head:${s.head}">` +
      `<span class="mini"></span><span>${locked ? '🔒' : s.badge} ${s.name}</span>${locked ? `<small>${s.unlock} meyve</small>` : ''}</button>`;
  }).join('');
  const next = skins.find(s => s.unlock > profile.totalFruit);
  $('#next-skin').textContent = next
    ? `🍎 ${next.badge} ${next.name} yılan için ${next.unlock - profile.totalFruit} meyve daha! (${profile.totalFruit} / ${next.unlock})`
    : '🎉 Bütün yılanları açtın!';
}

function renderSettings() {
  $$('[data-settings]').forEach(el => el.innerHTML =
    '<div><h2>Hız</h2><div class="speed" role="group" aria-label="Hız">' +
    '<button type="button" data-speed="230" aria-pressed="false">🐢<span>Sakin</span></button>' +
    '<button type="button" data-speed="160" aria-pressed="false">🐇<span>Neşeli</span></button>' +
    '<button type="button" data-speed="105" aria-pressed="false">⚡<span>Hızlı</span></button></div></div>' +
    '<label class="switch"><span>🧱 Duvarlı bahçe<small>Kenarlara çarpmamaya çalış</small></span><input type="checkbox" role="switch" data-walls></label>' +
    '<label class="switch"><span>🌙 Gece bahçesi<small>Yıldızlar ve ateşböcekleri</small></span><input type="checkbox" role="switch" data-night></label>');
  syncSettings();
}
function syncSettings() {
  $$('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)));
  $$('[data-walls]').forEach(i => { i.checked = walls; });
  $$('[data-night]').forEach(i => { i.checked = night; });
  document.body.classList.toggle('night', night);
}

function renderStickers() {
  $('#sticker-count').textContent = `${profile.stickers.length} / ${stickers.length} çıkartma topladın`;
  $('#sticker-grid').innerHTML = stickers.map(s => {
    const got = profile.stickers.includes(s.id), fresh = roundStickers.includes(s);
    return `<div class="sticker${got ? '' : ' locked'}${fresh ? ' fresh' : ''}"><span class="icon">${s.icon}</span><span>${s.name}</span><small>${s.how}</small></div>`;
  }).join('');
}

function updateToggles() {
  const s = $('#sound'), m = $('#music');
  s.setAttribute('aria-pressed', String(sound)); s.textContent = sound ? '🔊' : '🔇'; s.setAttribute('aria-label', sound ? 'Sesi kapat' : 'Sesi aç');
  m.setAttribute('aria-pressed', String(musicOn)); m.setAttribute('aria-label', musicOn ? 'Müziği kapat' : 'Müziği aç');
}

/* ---------- Çizim ---------- */
let bgCanvas = null, bgKey = '';
function background() {
  const cacheKey = canvas.width + (night ? 'n' : 'd') + terrain.id;
  if (bgCanvas && bgKey === cacheKey) return bgCanvas;
  const scale = canvas.width / SIZE;
  bgCanvas = document.createElement('canvas'); bgCanvas.width = canvas.width; bgCanvas.height = canvas.height; bgKey = cacheKey;
  const g = bgCanvas.getContext('2d'); g.scale(scale, scale);
  const tiles = night ? ['#35624a', '#3a6a50'] : ['#c8e69e', '#d2eca9'];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = tiles[(x + y) % 2]; g.fillRect(x * S, y * S, S, S); }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round'; g.lineWidth = 2.5; g.strokeStyle = night ? '#4f8664' : '#b4d98a';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * SIZE, y = rnd() * SIZE;
    for (const dx of [-5, 0, 5]) { g.beginPath(); g.moveTo(x + dx, y + 6); g.lineTo(x + dx * 1.4, y - 5); g.stroke(); }
  }
  const petals = ['#ffb3d1', '#ffe08a', '#ffffff', '#d9c6f2', '#ffc8a2'];
  g.globalAlpha = night ? .45 : .75;
  for (let i = 0; i < 12; i++) {
    const x = rnd() * SIZE, y = rnd() * SIZE;
    g.fillStyle = petals[i % petals.length];
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f7d04b'; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  drawGround(g);
  return bgCanvas;
}

// Gölet ve tünel ağızlarının içi; değişmedikleri için arka planla birlikte bir kez çizilir.
function drawGround(g) {
  const cells = ch => terrain.tiles.flatMap((t, i) => t === ch ? [{x: i % N, y: Math.floor(i / N), i}] : []);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const pond of ponds) {
    // Kumlu kıyı ve üstünde çakıllar
    g.fillStyle = night ? '#6d6a4f' : '#efdcaa'; g.beginPath(); pond.cells.forEach(c => pondShape(g, c, 8, 20)); g.fill();
    for (const c of pond.cells) for (const d of Object.values(dirs)) {
      if (tile(stepOf(c, d)) === 'W') continue;
      for (let k = 0; k < 2; k++) {
        const along = 6 + rnd() * (S - 12), out = 4 + rnd() * 3;
        const px = d.x ? (d.x > 0 ? (c.x + 1) * S + out : c.x * S - out) : c.x * S + along;
        const py = d.y ? (d.y > 0 ? (c.y + 1) * S + out : c.y * S - out) : c.y * S + along;
        g.fillStyle = night ? '#55534a' : pick(['#c9b48a', '#b9b2a6', '#d8c59b']);
        g.beginPath(); g.ellipse(px, py, 2.2 + rnd() * 1.4, 1.6 + rnd(), rnd() * 3, 0, Math.PI * 2); g.fill();
      }
    }
    // Su kenarı ve ortaya doğru koyulaşan su
    g.fillStyle = night ? '#1f4a62' : '#3f9fc8'; g.beginPath(); pond.cells.forEach(c => pondShape(g, c, 2, 16)); g.fill();
    const deep = g.createRadialGradient(pond.cx, pond.cy, 4, pond.cx, pond.cy, pond.reach);
    deep.addColorStop(0, night ? '#24607f' : '#4cb2dd'); deep.addColorStop(1, night ? '#3a86a8' : '#96dff5');
    g.fillStyle = deep; g.fill(pond.clip);
  }
  for (const c of [...cells('1'), ...cells('2')]) {
    const cx = c.x * S + S / 2, cy = c.y * S + S / 2;
    g.fillStyle = night ? '#6b5238' : '#a7835a'; g.beginPath(); g.ellipse(cx, cy, 18, 15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = tunnelColor(c); g.beginPath(); g.ellipse(cx, cy, 15, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#26190d'; g.beginPath(); g.ellipse(cx, cy + 1, 11, 8.5, 0, 0, Math.PI * 2); g.fill();
  }
}
// Gölet hücresinin şekli: komşusu da gölet olan kenar düz, dışa bakan köşe yuvarlak; hepsi tek yolda birleşir.
function pondShape(target, c, pad, r) {
  const has = (dx, dy) => tile({x: c.x + dx, y: c.y + dy}) === 'W';
  const u = has(0, -1), d = has(0, 1), l = has(-1, 0), rt = has(1, 0);
  const x0 = c.x * S - (l ? 0 : pad), y0 = c.y * S - (u ? 0 : pad), x1 = (c.x + 1) * S + (rt ? 0 : pad), y1 = (c.y + 1) * S + (d ? 0 : pad);
  target.roundRect(x0, y0, x1 - x0, y1 - y0, [!u && !l ? r : 0, !u && !rt ? r : 0, !d && !rt ? r : 0, !d && !l ? r : 0]);
}

/* ---------- Gölet: balıklar ve nilüferler ---------- */
// Balık ve nilüfer çizimleri Codex ile üretildi (img/). Yüklenemezse gölet yine çizilir, yalnız onlar görünmez.
const sprite = name => { const img = new Image(); img.src = `img/${name}.png?v=1`; return img; };
const art = {fish: ['fish-orange', 'fish-blue', 'fish-pink'].map(sprite), lily: sprite('lily-pad'), lotus: sprite('lily-flower')};
const loaded = img => img.complete && img.naturalWidth > 0;
let ponds = [], ripples = [];

const cellCenter = c => ({x: (c.x + .5) * S, y: (c.y + .5) * S});
// Balık bir gölet hücresinden komşu gölet hücresine yüzer: iki komşu kare birlikte dikdörtgen olduğundan yol hep suyun içinde kalır.
function fishTarget(f, cells) {
  const next = Math.random() < .35 ? f.cell : pick([f.cell, ...around(f.cell).filter(n => tile(n) === 'W')]);
  f.cell = next;
  const c = cellCenter(next);
  f.tx = c.x + (Math.random() - .5) * 18; f.ty = c.y + (Math.random() - .5) * 16;
}
function buildPonds() {
  ponds = []; ripples = [];
  const seen = new Set();
  terrain.tiles.forEach((t, i) => {
    if (t !== 'W' || seen.has(i)) return;
    const cells = [], todo = [{x: i % N, y: Math.floor(i / N)}];
    seen.add(i);
    while (todo.length) {
      const c = todo.pop(); cells.push(c);
      for (const n of around(c)) if (tile(n) === 'W' && !seen.has(key(n))) { seen.add(key(n)); todo.push(n); }
    }
    const clip = new Path2D(); cells.forEach(c => pondShape(clip, c, -1, 12));
    const cx = cells.reduce((a, c) => a + c.x + .5, 0) / cells.length * S, cy = cells.reduce((a, c) => a + c.y + .5, 0) / cells.length * S;
    const reach = Math.max(...cells.map(c => Math.hypot((c.x + .5) * S - cx, (c.y + .5) * S - cy))) + S * .7;
    const lilyCells = shuffle(cells).slice(0, Math.max(1, Math.round(cells.length / 3.5)));
    const lilies = lilyCells.map((c, k) => ({x: (c.x + .5) * S + (Math.random() - .5) * 12, y: (c.y + .5) * S + (Math.random() - .5) * 12, size: 23 + rand(5), rot: Math.random() * Math.PI * 2, lotus: k === 0 && cells.length >= 4 || Math.random() < .25, phase: Math.random() * 9}));
    const kinds = shuffle([0, 1, 2]);
    const fish = Array.from({length: clamp(Math.round(cells.length / 5), 1, 3)}, (_, k) => {
      const cell = pick(cells), c = cellCenter(cell);
      const f = {cell, x: c.x, y: c.y, tx: c.x, ty: c.y, kind: kinds[k], size: 31 + rand(6), face: Math.random() < .5 ? 1 : -1, tilt: 0, speed: 16 + Math.random() * 12, rest: rand(1500), wag: Math.random() * 6, jump: null};
      fishTarget(f, cells);
      return f;
    });
    ponds.push({cells, clip, cx, cy, reach, lilies, fish, nextJump: 3000 + rand(5000)});
  });
}

function updatePonds(dt) {
  const now = performance.now();
  ripples = ripples.filter(r => now - r.born < 1100);
  for (const pond of ponds) {
    pond.nextJump -= dt;
    if (pond.nextJump <= 0) {
      // Arada bir balık sudan zıplar: kalkışta ve dalışta halka halka dalga, damlacık.
      pond.nextJump = 5000 + rand(7000);
      const f = pick(pond.fish.filter(k => !k.jump));
      if (f) { f.jump = {born: now}; splash(f.x, f.y); }
    }
    for (const f of pond.fish) {
      f.wag += dt * (f.rest > 0 ? .006 : .014);
      if (f.jump) {
        if (now - f.jump.born >= 950) { f.jump = null; splash(f.x, f.y); f.rest = 600; }
        continue;
      }
      if (f.rest > 0) { f.rest -= dt; continue; }
      const dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy);
      if (dist < 1.5) { if (Math.random() < .35) f.rest = 400 + rand(1400); fishTarget(f, pond.cells); continue; }
      const step = Math.min(dist, f.speed * dt / 1000);
      f.x += dx / dist * step; f.y += dy / dist * step;
      if (Math.abs(dx) > 1) f.face = dx > 0 ? 1 : -1;
      f.tilt += (clamp(Math.atan2(dy, Math.abs(dx) + 1e-6), -.5, .5) - f.tilt) * Math.min(1, dt / 200);
    }
  }
}
function splash(x, y) {
  ripples.push({x, y, born: performance.now()});
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, sp = .05 + Math.random() * .09;
    particles.push({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: .0004, life: 520, max: 520, size: 1.8 + Math.random() * 1.6, color: night ? '#bfe6f5' : '#ffffff', shape: 'dot'});
  }
}

// Kuyruk sallansın diye balık burnuna yakın bir noktanın çevresinde hafifçe döner.
function drawFish(f, x, y, angle) {
  const img = art.fish[f.kind];
  if (!loaded(img)) return;
  const w = f.size, h = w * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.translate(x, y); ctx.scale(f.face, 1); ctx.rotate(angle);
  ctx.translate(w * .22, 0); ctx.rotate(Math.sin(f.wag) * .09); ctx.translate(-w * .22, 0);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawPonds(now) {
  for (const pond of ponds) {
    ctx.save(); ctx.clip(pond.clip);
    // Su altındaki balıklar: önce gölgesi, sonra kendisi; üstüne suyun rengi hafifçe biner.
    ctx.globalAlpha = night ? .85 : 1;
    for (const f of pond.fish) if (!f.jump) drawFish(f, f.x, f.y, f.tilt);
    ctx.globalAlpha = 1;
    ctx.fillStyle = night ? 'rgba(36,96,127,.25)' : 'rgba(120,205,238,.13)'; ctx.fill(pond.clip);
    // Kıpırdayan ışıltılar
    ctx.strokeStyle = night ? 'rgba(200,235,255,.3)' : 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let k = 0; k < Math.min(4, pond.cells.length); k++) {
      const x = pond.cx + Math.sin(now / 2600 + k * 2.1) * pond.reach * .5, y = pond.cy + Math.cos(now / 3100 + k * 1.4) * pond.reach * .45;
      ctx.globalAlpha = .35 + .55 * Math.max(0, Math.sin(now / 700 + k * 1.7));
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 3.5, y - 3.5, x, y); ctx.quadraticCurveTo(x + 3.5, y + 3.5, x + 7, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const r of ripples) {
      const age = (now - r.born) / 1100;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - age) * .8})`; ctx.lineWidth = 2;
      for (const k of [0, .35]) if (age > k) { ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, 4 + (age - k) * 22, 2 + (age - k) * 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    // Nilüferler balıkların üstünde, hafifçe sallanır.
    for (const l of pond.lilies) {
      const img = l.lotus ? art.lotus : art.lily;
      if (!loaded(img)) continue;
      const size = l.size * (l.lotus ? 1.15 : 1);
      ctx.save(); ctx.translate(l.x, l.y + Math.sin(now / 900 + l.phase) * .8); ctx.rotate(l.rot + Math.sin(now / 1300 + l.phase) * .06);
      if (night) ctx.globalAlpha = .85;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    // Zıplayan balık su yüzeyinin üstünde, kavis çizerek.
    for (const f of pond.fish) {
      if (!f.jump) continue;
      const p = clamp((now - f.jump.born) / 950, 0, 1);
      drawFish(f, f.x + f.face * (p - .5) * 10, f.y - Math.sin(p * Math.PI) * 30, (p - .5) * 1.4);
    }
  }
}

// Aynı renkteki iki delik birbirine bağlı.
const tunnelColor = c => tile(c) === '2' ? '#a98be0' : '#f2a65a';

// Kopan kuyruk halkalarının açtığı çiçekler; büyüyerek belirir.
function drawBlooms(now) {
  for (const b of blooms) {
    const grow = clamp((now - b.born) / 450, 0, 1), cx = b.x * S + S / 2, cy = b.y * S + S / 2, r = 5.5 * (.4 + .6 * grow);
    ctx.fillStyle = b.color;
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + b.x; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f7c531'; ctx.beginPath(); ctx.arc(cx, cy, r * .75, 0, Math.PI * 2); ctx.fill();
  }
}
// Tünel ağzında dönen kıvılcımlar (yılanın altında kalır).
function drawTunnels(now) {
  terrain.partner.forEach((_, i) => {
    const c = {x: i % N, y: Math.floor(i / N)}, cx = c.x * S + S / 2, cy = c.y * S + S / 2 + 1;
    ctx.fillStyle = tunnelColor(c);
    for (let k = 0; k < 3; k++) { const a = now / 380 + k * Math.PI * 2 / 3; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 6, cy + Math.sin(a) * 4.5, 1.8, 0, Math.PI * 2); ctx.fill(); }
  });
}
// Deliğin ön kenarı yılanın üstüne çizilir: yılan deliğe giriyormuş gibi görünür.
function drawTunnelRims() {
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  terrain.partner.forEach((_, i) => {
    const c = {x: i % N, y: Math.floor(i / N)};
    if (!snake.some(p => same(p, c))) return;
    ctx.strokeStyle = tunnelColor(c);
    ctx.beginPath(); ctx.ellipse(c.x * S + S / 2, c.y * S + S / 2, 15.5, 12.5, 0, .15, Math.PI - .15); ctx.stroke();
  });
}
// Çalılar her şeyin üstünde: içindeki yılan yarı saydam görünür, yapraklar kıpırdar.
function drawBushes(now) {
  terrain.tiles.forEach((t, i) => {
    if (t !== 'B') return;
    const c = {x: i % N, y: Math.floor(i / N)}, cx = c.x * S + S / 2, cy = c.y * S + S / 2;
    const busy = snake.some(p => same(p, c)) || friends.some(f => f.body.some(p => same(p, c)));
    const sway = busy ? Math.sin(now / 90 + i) * 1.6 : 0;
    ctx.globalAlpha = busy ? .62 : .96;
    ctx.fillStyle = night ? '#25552d' : '#4f9a35';
    for (const [dx, dy, r] of [[-9, 6, 15], [9, 6, 15], [0, -6, 16], [-12, -6, 11], [12, -6, 11]]) { ctx.beginPath(); ctx.arc(cx + dx + sway, cy + dy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = night ? '#33703c' : '#6cbc48';
    for (const [dx, dy, r] of [[-7, 1, 9], [7, 2, 9], [0, -9, 9]]) { ctx.beginPath(); ctx.arc(cx + dx + sway, cy + dy, r, 0, Math.PI * 2); ctx.fill(); }
    if (i % 3 === 0) { ctx.fillStyle = night ? '#d9667f' : '#e4554f'; for (const [dx, dy] of [[-8, -2], [5, 8]]) { ctx.beginPath(); ctx.arc(cx + dx + sway, cy + dy, 2.6, 0, Math.PI * 2); ctx.fill(); } }
  });
  ctx.globalAlpha = 1;
}

function drawEmoji(icon, x, y, size) { ctx.fillStyle = '#000'; ctx.font = emojiFont(size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, x, y + 1); }

function drawFence() {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#c99a66'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(5, 5, SIZE - 10, SIZE - 10, 14); ctx.stroke();
  ctx.strokeStyle = '#eccfa4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(5, 5, SIZE - 10, SIZE - 10, 14); ctx.stroke();
}

function drawFoods(now) {
  foods.forEach((item, i) => {
    const cx = item.x * S + S / 2, cy = item.y * S + S / 2 + Math.sin(now / 320 + i * 2) * 2.5;
    ctx.fillStyle = 'rgba(60,90,30,.12)'; ctx.beginPath(); ctx.ellipse(cx, item.y * S + S - 5, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    drawEmoji(item.type.icon, cx, cy, 27);
  });
}

function drawPickup(item, color, icon, remain, now) {
  const cx = item.x * S + S / 2, cy = item.y * S + S / 2, beat = .5 + Math.sin(now / 180) * .5;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 22 + beat * 8);
  glow.addColorStop(0, color + '77'); glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(remain, 0, 1)); ctx.stroke();
  drawEmoji(icon, cx, cy + Math.sin(now / 200) * 1.5, 22);
}

function drawFireflies(now) {
  for (let k = 0; k < 9; k++) {
    const x = ((k * 71 + Math.sin(now / 1400 + k * 1.7) * 60 + now / 55 * (k % 2 ? 1 : -1)) % SIZE + SIZE) % SIZE;
    const y = ((k * 113 + Math.cos(now / 1700 + k) * 50) % SIZE + SIZE) % SIZE;
    const glow = .35 + .65 * Math.max(0, Math.sin(now / 420 + k * 2.1));
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 12);
    grad.addColorStop(0, `rgba(255,240,150,${glow})`); grad.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,250,200,${glow})`; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSnow(now) {
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let k = 0; k < 10; k++) {
    const x = ((k * 97 + Math.sin(now / 900 + k) * 20 + now / 40) % SIZE + SIZE) % SIZE;
    const y = ((now / (14 - k % 4) + k * 131) % SIZE + SIZE) % SIZE;
    ctx.beginPath(); ctx.arc(x, y, 3 + k % 3, 0, Math.PI * 2); ctx.fill();
  }
}

const segColor = (sk, i, now) => sk.rainbow ? `hsl(${((i * 24 - now / 10) % 360 + 360) % 360} 85% 62%)` : sk.body[i % 2];

function heartPath(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * .55);
  ctx.bezierCurveTo(x - s * 1.1, y - s * .25, x - s * .55, y - s * 1.05, x, y - s * .45);
  ctx.bezierCurveTo(x + s * .55, y - s * 1.05, x + s * 1.1, y - s * .25, x, y + s * .55);
  ctx.closePath();
}
function sparklePath(x, y, s) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, rad = k % 2 ? s * .38 : s; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath();
}

// Gövde deseni: benek, kalp, yıldız, çizgi ya da pırıltı.
function drawPattern(sk, pts, width, linked, now) {
  ctx.fillStyle = sk.spot; ctx.strokeStyle = sk.spot; ctx.lineCap = 'round';
  for (let i = 2; i < pts.length; i += 2) {
    const {x, y} = pts[i], w = width(i);
    if (sk.pattern === 'spots') { ctx.beginPath(); ctx.arc(x, y, w * .18, 0, Math.PI * 2); ctx.fill(); }
    else if (sk.pattern === 'hearts') { heartPath(x, y, w * .2); ctx.fill(); }
    else if (sk.pattern === 'stars') { sparklePath(x, y, w * .26); ctx.fill(); }
    else if (sk.pattern === 'stripes' && linked(i)) {
      const dx = pts[i - 1].x - x, dy = pts[i - 1].y - y, m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m;
      ctx.lineWidth = w * .2; ctx.beginPath(); ctx.moveTo(x - nx * w * .36, y - ny * w * .36); ctx.lineTo(x + nx * w * .36, y + ny * w * .36); ctx.stroke();
    }
    else if (sk.pattern === 'sparkle') { ctx.globalAlpha = .55 + .45 * Math.sin(now / 150 + i); sparklePath(x, y, w * .24); ctx.fill(); ctx.globalAlpha = 1; }
  }
}

// Hem Lara'nın yılanı hem sürpriz arkadaş bu çiziciyle çizilir.
function drawCreature(cells, prev, t, sk, o) {
  const scale = o.scale || 1, len = cells.length;
  // Kenardan geçişte hücre farkı 15 görünür; gerçek hareket 1 hücredir, yönü koruyarak tahtanın dışına doğru sür.
  const unwrap = d => o.wrap ? (d > 1 ? d - N : d < -1 ? d + N : d) : d;
  // Tünelden geçen yılanın zinciri iki deliğin arasında kopar.
  const jump = i => i > 0 && !!holeOf(cells[i]) && same(holeOf(cells[i]), cells[i - 1]);
  const pts = cells.map((c, i) => {
    const p = prev[i];
    if (p && holeOf(p) && same(holeOf(p), c)) return {x: (c.x + .5) * S, y: (c.y + .5) * S};
    if (!p) return {x: (c.x + .5) * S, y: (c.y + .5) * S};
    const dx = unwrap(c.x - p.x), dy = unwrap(c.y - p.y);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return {x: (c.x + .5) * S, y: (c.y + .5) * S};
    return {x: (p.x + dx * t + .5) * S, y: (p.y + dy * t + .5) * S};
  });
  const shiftsX = [0], shiftsY = [0];
  if (o.wrap) {
    // Zinciri kesintisiz yap: her nokta bir öncekine yakın olacak şekilde bir tahta boyu kaydır.
    for (let i = 1; i < len; i++) {
      if (jump(i)) continue;
      if (pts[i].x - pts[i - 1].x > SIZE / 2) pts[i].x -= SIZE; else if (pts[i - 1].x - pts[i].x > SIZE / 2) pts[i].x += SIZE;
      if (pts[i].y - pts[i - 1].y > SIZE / 2) pts[i].y -= SIZE; else if (pts[i - 1].y - pts[i].y > SIZE / 2) pts[i].y += SIZE;
    }
    // Tahta dışına taşan parçalar karşı kenardan görünsün diye zincir kaydırılarak yeniden çizilir.
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
    if (Math.min(...xs) < S) shiftsX.push(SIZE); if (Math.max(...xs) > SIZE - S) shiftsX.push(-SIZE);
    if (Math.min(...ys) < S) shiftsY.push(SIZE); if (Math.max(...ys) > SIZE - S) shiftsY.push(-SIZE);
  }
  const width = i => S * .72 * scale * (i >= len - 3 ? .78 + .07 * (len - 1 - i) : 1);
  const linked = i => i > 0 && !jump(i) && Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < S * 1.6;
  const pass = (w, color) => {
    for (let i = len - 1; i >= 1; i--) {
      ctx.strokeStyle = ctx.fillStyle = color ? color(i) : ctx.strokeStyle;
      ctx.lineWidth = w(i); ctx.beginPath();
      if (linked(i)) { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke(); }
      else { ctx.arc(pts[i].x, pts[i].y, w(i) / 2, 0, Math.PI * 2); ctx.fill(); }
    }
  };
  const paint = () => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.star) { const glow = `rgba(255,214,77,${.35 + Math.sin(o.now / 120) * .15})`; pass(i => width(i) + 16, () => glow); }
    if (o.evil) { const aura = `rgba(220,50,70,${.16 + Math.sin(o.now / 150) * .08})`; pass(i => width(i) + 14, () => aura); }
    pass(i => width(i) + 5, () => o.evil ? 'rgba(10,10,16,.6)' : 'rgba(45,75,30,.45)');
    pass(width, i => segColor(sk, i, o.now));
    drawPattern(sk, pts, width, linked, o.now);
    drawHead(pts, sk, scale, o);
    if (o.carry) drawEmoji(o.carry, pts[0].x, pts[0].y - S * .78 + Math.sin(o.now / 180) * 2, 20);
    if (o.mark) drawEmoji(o.mark, pts[0].x + S * .5, pts[0].y - S * .85 + Math.sin(o.now / 140) * 2, 22);
  };
  for (const sx of shiftsX) for (const sy of shiftsY) {
    if (sx || sy) { ctx.save(); ctx.translate(sx, sy); paint(); ctx.restore(); } else paint();
  }
}

function drawAccessory(sk, r, now) {
  const a = sk.accessory;
  if (a === 'hat') {
    ctx.fillStyle = '#5b3fa0'; ctx.beginPath(); ctx.ellipse(-r * .3, 0, r * .3, r * .98, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6d4fc2'; ctx.strokeStyle = '#4a3390'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-r * .3, -r * .7); ctx.lineTo(-r * 2, 0); ctx.lineTo(-r * .3, r * .7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe066'; sparklePath(-r * 1.05, 0, r * .22); ctx.fill();
  } else if (a === 'crown') {
    ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#a0701a'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-r * .15, -r * .72); ctx.lineTo(-r * .95, -r * .78); ctx.lineTo(-r * .7, -r * .36); ctx.lineTo(-r * 1.15, 0);
    ctx.lineTo(-r * .7, r * .36); ctx.lineTo(-r * .95, r * .78); ctx.lineTo(-r * .15, r * .72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e4554f'; ctx.beginPath(); ctx.arc(-r * .55, 0, r * .14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4fae9b'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-r * .5, side * r * .42, r * .09, 0, Math.PI * 2); ctx.fill(); }
  } else if (a === 'sailor') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(45,75,30,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-r * .2, 0, r * .82, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f7fb8'; ctx.lineWidth = r * .2; ctx.beginPath(); ctx.arc(-r * .2, 0, r * .62, Math.PI * .6, Math.PI * 1.4); ctx.stroke();
    ctx.fillStyle = '#e4554f'; ctx.beginPath(); ctx.arc(-r * .95, 0, r * .14, 0, Math.PI * 2); ctx.fill();
  } else if (a === 'bow') {
    ctx.save(); ctx.translate(-r * .3, -r * .82); ctx.rotate(-.35);
    ctx.fillStyle = '#ff4f8b'; ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * .72, -r * .42); ctx.lineTo(-r * .66, r * .38); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * .72, -r * .42); ctx.lineTo(r * .66, r * .38); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6336c'; ctx.beginPath(); ctx.arc(0, 0, r * .18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (a === 'flower') {
    const fx = -r * .3, fy = -r * .8;
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 5; k++) { const ang = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(ang) * r * .22, fy + Math.sin(ang) * r * .22, r * .16, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd24d'; ctx.beginPath(); ctx.arc(fx, fy, r * .14, 0, Math.PI * 2); ctx.fill();
  } else if (a === 'sparkles') {
    for (let k = 0; k < 3; k++) {
      const ang = now / 700 + k * Math.PI * 2 / 3, dist = r * 1.35;
      ctx.globalAlpha = .6 + .4 * Math.sin(now / 160 + k * 2); ctx.fillStyle = k % 2 ? '#fff' : '#ffe066';
      sparklePath(Math.cos(ang) * dist, Math.sin(ang) * dist, r * .22); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawHead(pts, sk, scale, o) {
  const now = o.now, h = pts[0]; let d = o.dir;
  if (pts[1]) {
    const dx = h.x - pts[1].x, dy = h.y - pts[1].y;
    if ((dx || dy) && Math.hypot(dx, dy) < S * 1.6) d = Math.abs(dx) > Math.abs(dy) ? {x: Math.sign(dx), y: 0} : {x: 0, y: Math.sign(dy)};
  }
  const angle = Math.atan2(d.y, d.x);
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(angle);
  const r = S * .46 * scale, grow = 1 + (o.eatPulse || 0) * .12; ctx.scale(grow, grow);
  if (o.shield) {
    ctx.fillStyle = 'rgba(120,205,225,.28)'; ctx.strokeStyle = 'rgba(80,170,200,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r + 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = sk.head; ctx.strokeStyle = o.evil ? 'rgba(10,10,16,.6)' : 'rgba(45,75,30,.45)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (!o.evil) {
    ctx.fillStyle = 'rgba(255,110,150,.45)';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-r * .04, side * r * .65, r * .15, 0, Math.PI * 2); ctx.fill(); }
  }
  // Gözler: bakış yönü, kırpma, mutlu kapalı gözler, çarpınca X.
  let look = {x: r * .11, y: 0};
  if (o.lookAt) {
    const lx = Math.cos(-angle) * (o.lookAt.x - h.x) - Math.sin(-angle) * (o.lookAt.y - h.y);
    const ly = Math.sin(-angle) * (o.lookAt.x - h.x) + Math.cos(-angle) * (o.lookAt.y - h.y);
    const m = Math.hypot(lx, ly) || 1; look = {x: lx / m * r * .12, y: ly / m * r * .12};
  }
  const blink = !o.hurt && !o.happy && (now + (o.phase || 0)) % 3400 < 130;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = r * .22, ey = side * r * .43;
    if (o.hurt) {
      ctx.strokeStyle = '#2d3b22'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
      continue;
    }
    if (o.happy) { ctx.strokeStyle = '#2d3b22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, r * .28, -Math.PI / 3, Math.PI / 3); ctx.stroke(); continue; }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * .35, blink ? r * .05 : r * .35, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) {
      ctx.fillStyle = o.evil ? '#e03131' : '#2d3b22'; ctx.beginPath(); ctx.arc(ex + look.x, ey + look.y, r * .185, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + look.x + r * .07, ey + look.y - r * .08, r * .065, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.evil) {
    // Çatık kaşlar: iç uçlar göze yakın, dış uçlar yukarıda.
    ctx.strokeStyle = '#08080c'; ctx.lineWidth = r * .2; ctx.lineCap = 'round';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * .46, side * r * .14); ctx.lineTo(r * .7, side * r * .76); ctx.stroke(); }
    ctx.strokeStyle = '#0b0b10'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(r * .85, 0, r * .28, Math.PI - Math.PI / 3, Math.PI + Math.PI / 3); ctx.stroke();
  }
  ctx.strokeStyle = '#2d3b22'; ctx.lineWidth = 2.5;
  if (o.evil) {
    if ((now + (o.phase || 0)) % 1900 < 260) {
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(r * .9, 0); ctx.lineTo(r * 1.45, 0); ctx.lineTo(r * 1.68, -r * .17); ctx.moveTo(r * 1.45, 0); ctx.lineTo(r * 1.68, r * .17); ctx.stroke();
    }
  } else if ((o.eatPulse || 0) > .05) {
    ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.ellipse(r * .65, 0, r * .17 + o.eatPulse * r * .09, r * .15 + o.eatPulse * r * .11, 0, 0, Math.PI * 2); ctx.fill();
  } else if (o.hurt) {
    ctx.beginPath(); ctx.arc(r * .65, 0, r * .11, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(r * .43, 0, r * .3, -Math.PI / 3, Math.PI / 3); ctx.stroke();
    if ((now + (o.phase || 0)) % 2600 < 240) {
      ctx.strokeStyle = '#e5536f'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(r * .87, 0); ctx.lineTo(r * 1.43, 0); ctx.lineTo(r * 1.65, -r * .17); ctx.moveTo(r * 1.43, 0); ctx.lineTo(r * 1.65, r * .17); ctx.stroke();
    }
  }
  drawAccessory(sk, r, now);
  ctx.restore();
  if (o.happy) drawEmoji('💕', h.x, h.y - S * .9 + Math.sin(now / 200) * 3, 20);
}

function burst(cell, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = .08 + Math.random() * .22;
    particles.push({x: (cell.x + .5) * S, y: (cell.y + .5) * S, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .1, g: .0006, life: 650, max: 650, size: 3 + Math.random() * 3, color, shape: 'dot'});
  }
}
function confetti(count) {
  const colors = ['#ff6b6b', '#ffb347', '#ffe66d', '#8ce99a', '#74c0fc', '#b197fc', '#ff8fb1'];
  for (let i = 0; i < count; i++) {
    particles.push({x: SIZE / 2 + (Math.random() - .5) * SIZE * .7, y: -10 - Math.random() * 90, vx: (Math.random() - .5) * .25, vy: .05 + Math.random() * .15, g: .00035, life: 2200, max: 2200, size: 5 + Math.random() * 5, color: pick(colors), shape: 'rect', rot: Math.random() * Math.PI, spin: (Math.random() - .5) * .012});
  }
}
function updateParticles(dt) {
  particles = particles.filter(p => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    if (p.shape === 'rect') { p.vy = Math.min(p.vy, .3); p.rot += p.spin * dt; }
  }
}
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / (p.max * .4)); ctx.fillStyle = p.color;
    if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore(); }
    else if (p.shape === 'heart') { heartPath(p.x, p.y, p.size); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * Math.min(1, p.life / p.max + .3), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function drawPops(now) {
  pops = pops.filter(p => now - p.born < 900);
  for (const p of pops) {
    const age = (now - p.born) / 900, grow = 1 + .5 * Math.sin(Math.min(1, age * 3) * Math.PI);
    ctx.save(); ctx.globalAlpha = 1 - Math.max(0, age - .5) * 2;
    ctx.translate(clamp((p.x + .5) * S, 40, SIZE - 40), clamp((p.y + .5) * S - 14 - age * 40, 24, SIZE));
    ctx.scale(grow, grow); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (p.icon) { ctx.font = emojiFont(26); ctx.fillText(p.text, 0, 0); }
    else {
      ctx.font = `700 22px ${fontStack}`; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff';
      ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
    }
    ctx.restore();
  }
}

function draw(now) {
  const t = clamp(acc / interval, 0, 1);
  ctx.save();
  ctx.clearRect(0, 0, SIZE, SIZE);
  const hurtAge = state === 'hurt' ? now - hurtStart : Infinity;
  if (hurtAge < 450) ctx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
  ctx.drawImage(background(), 0, 0, SIZE, SIZE);
  drawPonds(now);
  if (walls) drawFence();
  drawBlooms(now); drawTunnels(now);
  drawFoods(now);
  if (bonus) drawPickup(bonus, bonus.type.color, bonus.type.icon, (bonus.expires - gameTime) / 12000, now);
  for (const g of gifts) drawPickup(g, '#e35a8c', '🎁', (g.expires - gameTime) / 15000, now);
  if (night) drawFireflies(now);
  if (active('slow')) drawSnow(now);
  const look = {x: (snake[0].x + .5) * S, y: (snake[0].y + .5) * S};
  for (const f of friends) drawCreature(f.body, f.prev, f.follow ? t : clamp(f.acc / friendInterval(), 0, 1), f.skin, {now, scale: .8, dir: f.dir, happy: gameTime < f.happyUntil, lookAt: look, phase: f.phase, wrap: f.follow && !walls});
  if (villain) {
    const mark = villain.leaving ? null : villain.lost ? '❓' : gameTime - villain.foundAt < 1200 ? '❗' : null;
    drawCreature(villain.body, villain.prev, clamp(villain.acc / villainInterval(), 0, 1), villainSkin, {now, scale: .9, dir: villain.dir, evil: true, lookAt: villain.lost ? null : look, phase: 500, carry: villain.carry, mark});
  }
  drawCreature(snake, prevSnake, t, skin(), {now, dir: direction, hurt: state === 'hurt', eatPulse, shield: active('shield'), star: active('star'), wrap: !walls});
  drawTunnelRims(); drawBushes(now);
  drawParticles(); drawPops(now);
  if (hurtAge < 700) { ctx.fillStyle = `rgba(255,120,150,${(1 - hurtAge / 700) * .35})`; ctx.fillRect(-10, -10, SIZE + 20, SIZE + 20); }
  ctx.restore();
}

function fitCanvas() {
  const css = canvas.getBoundingClientRect().width;
  if (!css) return;
  const px = Math.round(css * Math.min(3, window.devicePixelRatio || 1));
  if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
  ctx.setTransform(px / SIZE, 0, 0, px / SIZE, 0, 0);
}

function update(dt, now) {
  if (state === 'playing') {
    gameTime += dt; acc += dt; interval = currentInterval();
    for (let guard = 0; acc >= interval && state === 'playing' && guard < 4; guard++) { acc -= interval; tick(); }
    if (state === 'playing') updateFriends(dt);
    if (state === 'playing') updateVillain(dt);
  } else if (state === 'countdown') stepCountdown(now);
  else if (state === 'hurt') stepHurt(now);
  else if (state === 'cleared') stepCleared(now);
  eatPulse = Math.max(0, eatPulse - dt / 260);
  updatePonds(dt);
  updateParticles(dt);
}
function frame(now) {
  const dt = Math.min(250, now - lastFrame || 16); lastFrame = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}

/* ---------- Girdi ---------- */
const boardWrap = $('#board-wrap');
let swipe = null;
boardWrap.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  swipe = {x: e.clientX, y: e.clientY, id: e.pointerId, turned: false};
  try { boardWrap.setPointerCapture(e.pointerId); } catch {}
  warmAudio();
});
boardWrap.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < (swipe.turned ? 44 : 22)) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  swipe = {x: e.clientX, y: e.clientY, id: e.pointerId, turned: true};
});
['pointerup', 'pointercancel'].forEach(type => boardWrap.addEventListener(type, () => { swipe = null; }));

$$('[data-dir]').forEach(button => {
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.classList.add('pressed'); turn(button.dataset.dir); warmAudio(); buzz(10); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, () => button.classList.remove('pressed')));
  button.addEventListener('click', e => { if (e.detail === 0) turn(button.dataset.dir); });
});

document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  const map = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right'};
  const name = map[e.key] || map[e.key.toLowerCase()];
  if (name) { e.preventDefault(); turn(name); return; }
  if (e.target.matches('button,a')) return;
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    if (state === 'playing') pause(); else if (state === 'paused') resume(); else if (state === 'ready') play(profile.unlocked);
    else if (state === 'over') retryLevel(); else if (state === 'cleared' && clearedShown) nextLevel();
  }
  if (e.key === 'Escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
});

$('#start').addEventListener('click', () => play(profile.unlocked));
$('#again').addEventListener('click', retryLevel);
$('#next-level').addEventListener('click', nextLevel);
$('#resume').addEventListener('click', resume);
pauseBtn.addEventListener('click', () => state === 'paused' ? resume() : pause());
$('#stickers-btn').addEventListener('click', openStickers);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action],[data-open],[data-speed],[data-skin],[data-level]');
  if (!el) return;
  if (el.dataset.open === 'stickers') openStickers();
  else if (el.dataset.action === 'close-stickers') setScreen(stickersReturn);
  else if (el.dataset.action === 'restart') retryLevel();
  else if (el.dataset.level) {
    const n = el.dataset.level === 'surprise' ? Math.max(levels.length + 1, profile.unlocked) : Number(el.dataset.level);
    if (n > profile.unlocked) { toast(`🔒 Önce Bölüm ${Math.min(profile.unlocked, levels.length)}'i bitir`, 1800); playSound('locked'); return; }
    play(n);
  }
  else if (el.dataset.action === 'home') home();
  else if (el.dataset.speed) { speed = Number(el.dataset.speed); profile.speed = speed; saveProfile(); syncSettings(); playSound('turn'); }
  else if (el.dataset.skin) {
    const chosen = skins.find(s => s.id === el.dataset.skin);
    if (chosen.unlock > profile.totalFruit) { toast(`🔒 ${chosen.unlock - profile.totalFruit} meyve daha toplayınca açılır`, 1800); playSound('locked'); return; }
    profile.skin = chosen.id; saveProfile(); renderSkins(); playSound('spawn');
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-walls]')) { walls = e.target.checked; profile.walls = walls; }
  else if (e.target.matches('[data-night]')) { night = e.target.checked; profile.night = night; }
  else return;
  saveProfile(); syncSettings(); playSound('turn');
});
$('#sound').addEventListener('click', () => {
  sound = !sound; soundRevision++; store.setFlag('sound', sound); updateToggles();
  if (sound) playSound('start');
});
$('#music').addEventListener('click', () => {
  musicOn = !musicOn; store.setFlag('music', musicOn); updateToggles();
  if (musicOn) { if (inRound()) music.start(); else { try { ensureAudio(); audio.resume(); } catch {} } }
  else music.stop();
});

const fsButton = $('#fullscreen'), root = document.documentElement;
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if ((root.requestFullscreen || root.webkitRequestFullscreen) && !standalone) {
  fsButton.hidden = false;
  fsButton.addEventListener('click', () => {
    const current = document.fullscreenElement || document.webkitFullscreenElement;
    const result = current ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    if (result && result.catch) result.catch(() => {});
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(type => document.addEventListener(type, () => {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fsButton.textContent = on ? '🗗' : '⛶'; fsButton.setAttribute('aria-label', on ? 'Tam ekrandan çık' : 'Tam ekran');
  }));
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'playing') pause(); return; }
  lastFrame = performance.now();
  if (state === 'countdown') countdownStart = performance.now();
  if (state === 'hurt') hurtStart = performance.now();
  if (state === 'cleared') clearedStart = performance.now();
});

/* ---------- Başlat ---------- */
renderSettings(); updateToggles(); fitCanvas(); setupLevel(profile.unlocked, false); setScreen('start');
new ResizeObserver(fitCanvas).observe(canvas);
window.addEventListener('resize', fitCanvas);
requestAnimationFrame(now => { lastFrame = now; frame(now); });
