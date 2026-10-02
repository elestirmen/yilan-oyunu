'use strict';

/* ---------- Yardımcılar ---------- */
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const N = 16, S = 40, SIZE = N * S, MAX_LIVES = 3;
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
  {kind: 'heart', icon: '💖', name: 'Kalp', detail: 'Bir kalbin geri geldi!', duration: 0, color: '#ff6f9c'}
];
const skins = [
  {id: 'green', name: 'Yeşil', head: '#5e9a3c', body: ['#7fbf55', '#95cf6b'], spot: '#c8eaa8', unlock: 0},
  {id: 'pink', name: 'Pembe', head: '#e2588c', body: ['#f58bb4', '#f9a6c6'], spot: '#ffe0ec', unlock: 0},
  {id: 'purple', name: 'Mor', head: '#8a63c9', body: ['#ab8de0', '#bea4ea'], spot: '#eadfff', unlock: 15},
  {id: 'ocean', name: 'Deniz', head: '#3691b8', body: ['#5ebfdf', '#7fcfe8'], spot: '#d9f3fb', unlock: 40},
  {id: 'rainbow', name: 'Gökkuşağı', head: '#ff8a5c', rainbow: true, spot: '#ffffff', unlock: 80},
  {id: 'gold', name: 'Altın', head: '#c9951f', body: ['#e8b93c', '#f3cc5c'], spot: '#fff2c4', unlock: 150}
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
  {id: 'combo', icon: '🔥', name: 'Seri Ustası', how: '×3 seri yap'},
  {id: 'hundred', icon: '💯', name: 'Yüzlük', how: 'Bir turda 100 puan topla'},
  {id: 'threehundred', icon: '🏅', name: 'Üç Yüzlük', how: 'Bir turda 300 puan topla'},
  {id: 'long', icon: '🐍', name: 'Upuzun', how: 'Yılanın 15 kare uzasın'},
  {id: 'missions', icon: '🌼', name: 'Görev Perisi', how: 'Bir turda 3 görev tamamla'},
  {id: 'walls', icon: '🧱', name: 'Cesur Kâşif', how: 'Duvarlı bahçede 10 meyve topla'},
  {id: 'record', icon: '🏆', name: 'Rekor Kıran', how: 'Kendi rekorunu geç'},
  {id: 'stars3', icon: '🌟', name: 'Üç Yıldız', how: 'Bir turda 3 yıldız kazan'},
  {id: 'rainbow', icon: '🌈', name: 'Gökkuşağı', how: 'Gökkuşağı yılanını aç'},
  {id: 'ten-games', icon: '🎈', name: 'Bahçe Dostu', how: '10 tur oyna'}
];
const praise = ['Harikasın Lara!', 'Süpersin!', 'Vay canına!', 'Muhteşem!', 'Bravo!', 'İşte bu!', 'Çok iyisin!'];

/* ---------- Kayıt ---------- */
const profile = Object.assign(
  {best: 0, totalFruit: 0, games: 0, stickers: [], skin: 'green', speed: 230, walls: false},
  store.get('profile', {})
);
profile.best = Math.max(Number(profile.best) || 0, Number(store.get('best', 0)) || 0);
if (![230, 160, 105].includes(profile.speed)) profile.speed = 230;
const saveProfile = () => store.set('profile', profile);
const skin = () => skins.find(s => s.id === profile.skin && s.unlock <= profile.totalFruit) || skins[0];

/* ---------- Durum ---------- */
let snake = [], prevSnake = [], direction = dirs.right, queue = [], foods = [], bonus = null;
let state = 'ready', screen = 'start', stickersReturn = 'start';
let score = 0, collected = 0, combo = 0, comboUntil = 0, missionTarget = 5, missionsDone = 0, lives = MAX_LIVES, effects = {}, gameTime = 0;
let speed = profile.speed, walls = !!profile.walls, interval = speed, acc = 0, lastFrame = 0;
let countdownStart = 0, countdownStep = null, hurtStart = 0, hurtDone = false, eatPulse = 0;
let particles = [], pops = [], roundStickers = [], roundSkins = [], bestAtStart = 0, toasts = [], toastTimer = 0;
let sound = store.flag('sound', true), musicOn = store.flag('music', true);
const active = kind => (effects[kind] || 0) > gameTime;
const currentInterval = () => active('slow') ? Math.round(speed * 1.65) : speed;
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
  locked: {notes: [[330, .1, 0], [262, .16, .1]], volume: .1}
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
  timer: null, playing: false, melAt: 0, bassAt: 0, melIdx: 0, bassIdx: 0,
  tempo() { return 100 + (230 - speed) * .3; },
  async start() {
    if (!musicOn || this.playing) return;
    try { ensureAudio(); if (audio.state !== 'running') await audio.resume(); } catch { return; }
    if (!musicOn || this.playing || audio.state !== 'running' || !inRound()) return;
    this.playing = true; this.melIdx = 0; this.bassIdx = 0;
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
    const beat = 60 / this.tempo(), horizon = audio.currentTime + .4;
    while (this.melAt < horizon) {
      const [note, length] = melody[this.melIdx];
      if (note) tone(note, this.melAt, length * beat * .85, 'triangle', .085);
      this.melAt += length * beat; this.melIdx = (this.melIdx + 1) % melody.length;
    }
    while (this.bassAt < horizon) {
      const [note, length] = bassLine[this.bassIdx];
      if (note) tone(note, this.bassAt, length * beat * .8, 'sine', .11);
      this.bassAt += length * beat; this.bassIdx = (this.bassIdx + 1) % bassLine.length;
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
function freeCell() {
  const free = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cell = {x, y};
    if (!snake.some(p => same(p, cell)) && !foods.some(p => same(p, cell)) && !same(bonus, cell)) free.push(cell);
  }
  return free.length ? pick(free) : null;
}
function spawnFruit(type) { const cell = freeCell(); if (cell) foods.push({...cell, type}); }
function refill() { fruits.forEach(type => { if (!foods.some(item => item.type === type)) spawnFruit(type); }); }

function spawnBonus() {
  bonus = null;
  const cell = freeCell();
  if (!cell) return;
  let type = pick(bonuses.filter(b => b.kind !== 'heart'));
  if (lives < MAX_LIVES && Math.random() < .45) type = bonuses.find(b => b.kind === 'heart');
  bonus = {...cell, type, expires: gameTime + 12000};
  toast(`${type.icon} ${type.name} çıktı, çabuk yakala!`, 1500);
  playSound('spawn');
}

function reset() {
  snake = [{x: 7, y: 8}, {x: 6, y: 8}, {x: 5, y: 8}, {x: 4, y: 8}];
  prevSnake = snake.map(p => ({...p})); direction = dirs.right; queue = [];
  foods = []; bonus = null; effects = {}; particles = []; pops = [];
  score = 0; collected = 0; combo = 0; comboUntil = 0; gameTime = 0; missionTarget = 5; missionsDone = 0;
  lives = MAX_LIVES; acc = 0; eatPulse = 0; roundStickers = []; roundSkins = []; bestAtStart = profile.best;
  fruits.forEach(type => spawnFruit(type));
  updateHud();
}

function candidate(d) {
  const next = {x: snake[0].x + d.x, y: snake[0].y + d.y};
  if (walls && (next.x < 0 || next.x >= N || next.y < 0 || next.y >= N)) return null;
  next.x = (next.x + N) % N; next.y = (next.y + N) % N;
  const grows = foods.some(p => same(p, next));
  return (grows ? snake : snake.slice(0, -1)).some(p => same(p, next)) ? null : next;
}

function tick() {
  prevSnake = snake.map(p => ({...p}));
  if (bonus && bonus.expires <= gameTime) bonus = null;
  if (comboUntil <= gameTime) combo = 0;
  if (queue.length) direction = queue.shift();
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
  if (fruitIndex >= 0) eat(foods.splice(fruitIndex, 1)[0], next); else snake.pop();
  if (state !== 'playing') return;
  if (same(bonus, next)) takeBonus(next);
  refill();
  updateHud();
}

function eat(item, cell) {
  combo = Math.min(combo + 1, 3); comboUntil = gameTime + 6000; collected++; profile.totalFruit++;
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
  if (snake.length >= 15) award('long');
  if (walls && collected >= 10) award('walls');
  if (score >= 100) award('hundred');
  if (score >= 300) award('threehundred');
  if (collected >= missionTarget) {
    missionsDone++; missionTarget += 5; addScore(50); confetti(50);
    toast(`${pick(praise)} 🌼 +50`, 2000); playSound('mission'); buzz([30, 40, 30]);
    if (missionsDone >= 3) award('missions');
  }
  const unlocked = skins.find(s => s.unlock > 0 && s.unlock === profile.totalFruit);
  if (unlocked) {
    roundSkins.push(unlocked); confetti(40);
    toast(`Yeni yılan açıldı! 🐍 ${unlocked.name}`, 2400); playSound('unlock');
    if (unlocked.id === 'rainbow') award('rainbow');
  }
  saveProfile();
  if (snake.length === N * N) return finish(true);
  if (collected % 4 === 0) spawnBonus();
}

function takeBonus(cell) {
  const type = bonus.type; bonus = null;
  if (type.kind === 'heart') { lives = Math.min(MAX_LIVES, lives + 1); pulse(heartsEl, 'pulse'); }
  else effects[type.kind] = gameTime + type.duration;
  award(type.kind);
  pops.push({x: cell.x, y: cell.y, text: type.icon, icon: true, color: type.color, born: performance.now()});
  burst(cell, type.color, 16);
  toast(`${type.icon} ${type.detail}`, 1800); playSound(type.kind); buzz([20, 30, 20]);
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
  if (lives <= 0) return finish(false);
  state = 'hurt'; hurtStart = performance.now(); hurtDone = false;
  showCountdown(lives === 2 ? 'Ayy!' : 'Dikkat!', true);
  toast(`💛 ${lives} kalbin kaldı, devam!`, 1500);
}
function stepHurt(now) {
  if (hurtDone || now - hurtStart < 900) return;
  hurtDone = true; respawn(); startCountdown();
}

// Çarpışmadan sonra yılan yarı boyuyla boş bir yere, sağa bakacak şekilde konur.
function respawn() {
  const blocked = cell => foods.some(p => same(p, cell)) || same(bonus, cell);
  for (let length = Math.max(3, Math.min(12, Math.floor(snake.length / 2))); length >= 1; length--) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const y = rand(N), x = length - 1 + rand(Math.max(1, N - 2 - length));
      const body = Array.from({length}, (_, k) => ({x: x - k, y}));
      if (body.every(cell => !blocked(cell))) {
        snake = body; prevSnake = body.map(p => ({...p})); direction = dirs.right; queue = [];
        return;
      }
    }
  }
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

function begin() {
  reset(); overlay.hidden = true; pauseBtn.disabled = false;
  playSound('start'); startCountdown();
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; music.stop(); playSound('pause'); setScreen('pause');
}
function resume() {
  if (state !== 'paused') return;
  overlay.hidden = true; playSound('resume'); startCountdown();
}
function home() {
  state = 'ready'; music.stop(); hideCountdown(); pauseBtn.disabled = true; reset(); setScreen('start');
}

function finish(win) {
  state = 'over'; music.stop(); pauseBtn.disabled = true; hideCountdown(); queue = [];
  profile.games++;
  if (profile.games >= 10) award('ten-games');
  const stars = win ? 3 : collected >= 22 ? 3 : collected >= 12 ? 2 : collected >= 5 ? 1 : 0;
  if (stars === 3) award('stars3');
  const record = bestAtStart > 0 && score > bestAtStart;
  if (record) award('record');
  saveProfile();
  if (win || record || stars === 3) confetti(90);
  playSound(win || stars >= 2 ? 'win' : 'over'); buzz(stars >= 2 ? [40, 60, 40, 60, 80] : 60);
  $('#over-stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? '' : 'dim'}">⭐</span>`).join('');
  $('#over-title').textContent = win ? 'Bahçeyi doldurdun, Lara!' : record ? 'Yeni rekor, Lara! 🎉'
    : stars === 3 ? 'Muhteşemdin, Lara!' : stars === 2 ? 'Harikaydın, Lara!' : stars === 1 ? 'Güzel bir turdu!' : 'Isınma turuydu! 💪';
  $('#over-text').textContent = `🧺 ${collected} meyve · ${score} puan · 🏆 En iyi ${profile.best}`;
  $('#over-new').innerHTML = [
    ...roundStickers.map(s => `<span>${s.icon} ${s.name}</span>`),
    ...roundSkins.map(s => `<span>🐍 Yeni yılan: ${s.name}</span>`)
  ].join('');
  setScreen('over');
}

function turn(name) {
  if (state !== 'playing' && state !== 'countdown') return;
  const d = dirs[name], last = queue.at(-1) || direction;
  if (queue.length < 2 && (d.x !== last.x || d.y !== last.y) && !(d.x === -last.x && d.y === -last.y)) {
    queue.push(d); playSound('turn');
  }
}

/* ---------- Arayüz ---------- */
function updateHud() {
  scoreEl.textContent = score;
  heartsEl.textContent = '❤️'.repeat(lives) + '🤍'.repeat(MAX_LIVES - lives);
  heartsEl.setAttribute('aria-label', `${lives} kalp`);
  const progress = collected - (missionTarget - 5);
  $('#mission-label').textContent = `🌼 ${missionTarget} meyve topla`;
  $('#mission-count').textContent = `${progress} / 5`;
  $('#mission-progress').value = progress;
  const comboEl = $('#combo');
  comboEl.hidden = combo < 2; comboEl.textContent = `🔥 Seri ×${combo}`;
  for (const type of bonuses) {
    if (type.kind === 'heart') continue;
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
  if (name === 'start') { renderSkins(); syncSettings(); }
  if (name === 'pause') syncSettings();
  if (name === 'stickers') renderStickers();
}
function openStickers() {
  if (state === 'countdown' || state === 'hurt') return;
  if (state === 'playing') pause();
  stickersReturn = screen; setScreen('stickers');
}

function renderSkins() {
  $('#skins').innerHTML = skins.map(s => {
    const locked = s.unlock > profile.totalFruit;
    const body = s.rainbow ? 'linear-gradient(90deg,#ff6b6b,#ffb347,#ffe66d,#8ce99a,#74c0fc,#b197fc)' : s.body[0];
    return `<button type="button" class="skin${locked ? ' locked' : ''}" role="radio" aria-checked="${s.id === skin().id}" data-skin="${s.id}" style="--c1:${body};--head:${s.head}">` +
      `<span class="mini"></span><span>${locked ? '🔒 ' : ''}${s.name}</span>${locked ? `<small>${s.unlock} meyve</small>` : ''}</button>`;
  }).join('');
  const next = skins.find(s => s.unlock > profile.totalFruit);
  $('#next-skin').textContent = next
    ? `🍎 ${next.name} yılan için ${next.unlock - profile.totalFruit} meyve daha! (${profile.totalFruit} / ${next.unlock})`
    : '🎉 Bütün yılanları açtın!';
}

function renderSettings() {
  $$('[data-settings]').forEach(el => el.innerHTML =
    '<div><h2>Hız</h2><div class="speed" role="group" aria-label="Hız">' +
    '<button type="button" data-speed="230" aria-pressed="false">🐢<span>Sakin</span></button>' +
    '<button type="button" data-speed="160" aria-pressed="false">🐇<span>Neşeli</span></button>' +
    '<button type="button" data-speed="105" aria-pressed="false">⚡<span>Hızlı</span></button></div></div>' +
    '<label class="switch"><span>🧱 Duvarlı bahçe<small>Kenarlara çarpmamaya çalış</small></span><input type="checkbox" role="switch" data-walls></label>');
  syncSettings();
}
function syncSettings() {
  $$('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)));
  $$('[data-walls]').forEach(i => { i.checked = walls; });
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
let bgCanvas = null, bgKey = 0;
function background() {
  if (bgCanvas && bgKey === canvas.width) return bgCanvas;
  const scale = canvas.width / SIZE;
  bgCanvas = document.createElement('canvas'); bgCanvas.width = canvas.width; bgCanvas.height = canvas.height; bgKey = canvas.width;
  const g = bgCanvas.getContext('2d'); g.scale(scale, scale);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? '#c8e69e' : '#d2eca9'; g.fillRect(x * S, y * S, S, S); }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round'; g.lineWidth = 2.5; g.strokeStyle = '#b4d98a';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * SIZE, y = rnd() * SIZE;
    for (const dx of [-5, 0, 5]) { g.beginPath(); g.moveTo(x + dx, y + 6); g.lineTo(x + dx * 1.4, y - 5); g.stroke(); }
  }
  const petals = ['#ffb3d1', '#ffe08a', '#ffffff', '#d9c6f2', '#ffc8a2'];
  g.globalAlpha = .75;
  for (let i = 0; i < 12; i++) {
    const x = rnd() * SIZE, y = rnd() * SIZE;
    g.fillStyle = petals[i % petals.length];
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f7d04b'; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
  }
  return bgCanvas;
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

function drawBonus(now) {
  const cx = bonus.x * S + S / 2, cy = bonus.y * S + S / 2, beat = .5 + Math.sin(now / 180) * .5;
  const remain = Math.max(0, (bonus.expires - gameTime) / 12000);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 22 + beat * 8);
  glow.addColorStop(0, bonus.type.color + '77'); glow.addColorStop(1, bonus.type.color + '00');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = bonus.type.color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain); ctx.stroke();
  drawEmoji(bonus.type.icon, cx, cy + Math.sin(now / 200) * 1.5, 22);
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

function drawSnake(now, t) {
  const sk = skin(), len = snake.length;
  const pts = snake.map((c, i) => {
    const p = prevSnake[i];
    if (!p || Math.abs(p.x - c.x) > 1 || Math.abs(p.y - c.y) > 1) return {x: (c.x + .5) * S, y: (c.y + .5) * S};
    return {x: (p.x + (c.x - p.x) * t + .5) * S, y: (p.y + (c.y - p.y) * t + .5) * S};
  });
  const width = i => S * .72 * (i >= len - 3 ? .78 + .07 * (len - 1 - i) : 1);
  const linked = i => Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < S * 1.6;
  const pass = (w, color) => {
    for (let i = len - 1; i >= 1; i--) {
      ctx.strokeStyle = ctx.fillStyle = color ? color(i) : ctx.strokeStyle;
      ctx.lineWidth = w(i); ctx.beginPath();
      if (linked(i)) { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke(); }
      else { ctx.arc(pts[i].x, pts[i].y, w(i) / 2, 0, Math.PI * 2); ctx.fill(); }
    }
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (active('star')) { const glow = `rgba(255,214,77,${.35 + Math.sin(now / 120) * .15})`; pass(i => width(i) + 16, () => glow); }
  pass(i => width(i) + 5, () => 'rgba(45,75,30,.45)');
  pass(width, i => segColor(sk, i, now));
  if (!sk.rainbow) {
    ctx.fillStyle = sk.spot;
    for (let i = 2; i < len; i += 2) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, width(i) * .18, 0, Math.PI * 2); ctx.fill(); }
  }
  drawHead(pts, sk, now);
}

function drawHead(pts, sk, now) {
  const h = pts[0]; let d = direction;
  if (pts[1]) {
    const dx = h.x - pts[1].x, dy = h.y - pts[1].y;
    if ((dx || dy) && Math.hypot(dx, dy) < S * 1.6) d = Math.abs(dx) > Math.abs(dy) ? {x: Math.sign(dx), y: 0} : {x: 0, y: Math.sign(dy)};
  }
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(d.y, d.x));
  const r = S * .46, grow = 1 + eatPulse * .12; ctx.scale(grow, grow);
  if (active('shield')) {
    ctx.fillStyle = 'rgba(120,205,225,.28)'; ctx.strokeStyle = 'rgba(80,170,200,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r + 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = sk.head; ctx.strokeStyle = 'rgba(45,75,30,.45)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,150,.45)';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-S * .02, side * S * .3, S * .07, 0, Math.PI * 2); ctx.fill(); }
  const hurting = state === 'hurt', blink = !hurting && now % 3400 < 130;
  for (const side of [-1, 1]) {
    const ex = S * .1, ey = side * S * .2;
    if (hurting) {
      ctx.strokeStyle = '#2d3b22'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, S * .16, blink ? S * .025 : S * .16, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) {
      ctx.fillStyle = '#2d3b22'; ctx.beginPath(); ctx.arc(ex + S * .05, ey, S * .085, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + S * .08, ey - S * .04, S * .03, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = '#2d3b22'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (eatPulse > .05) {
    ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.ellipse(S * .3, 0, S * .08 + eatPulse * S * .04, S * .07 + eatPulse * S * .05, 0, 0, Math.PI * 2); ctx.fill();
  } else if (hurting) {
    ctx.beginPath(); ctx.arc(S * .3, 0, S * .05, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(S * .2, 0, S * .14, -Math.PI / 3, Math.PI / 3); ctx.stroke();
    if (now % 2600 < 240) {
      ctx.strokeStyle = '#e5536f'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(S * .4, 0); ctx.lineTo(S * .66, 0); ctx.lineTo(S * .76, -S * .08); ctx.moveTo(S * .66, 0); ctx.lineTo(S * .76, S * .08); ctx.stroke();
    }
  }
  ctx.restore();
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
  if (walls) drawFence();
  drawFoods(now);
  if (bonus) drawBonus(now);
  if (active('slow')) drawSnow(now);
  drawSnake(now, t);
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

function frame(now) {
  const dt = Math.min(250, now - lastFrame || 16); lastFrame = now;
  if (state === 'playing') {
    gameTime += dt; acc += dt; interval = currentInterval();
    for (let guard = 0; acc >= interval && state === 'playing' && guard < 4; guard++) { acc -= interval; tick(); }
  } else if (state === 'countdown') stepCountdown(now);
  else if (state === 'hurt') stepHurt(now);
  eatPulse = Math.max(0, eatPulse - dt / 260);
  updateParticles(dt);
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
    if (state === 'playing') pause(); else if (state === 'paused') resume(); else if (state === 'ready' || state === 'over') begin();
  }
  if (e.key === 'Escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
});

$('#start').addEventListener('click', begin);
$('#again').addEventListener('click', begin);
$('#resume').addEventListener('click', resume);
pauseBtn.addEventListener('click', () => state === 'paused' ? resume() : pause());
$('#stickers-btn').addEventListener('click', openStickers);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action],[data-open],[data-speed],[data-skin]');
  if (!el) return;
  if (el.dataset.open === 'stickers') openStickers();
  else if (el.dataset.action === 'close-stickers') setScreen(stickersReturn);
  else if (el.dataset.action === 'restart') begin();
  else if (el.dataset.action === 'home') home();
  else if (el.dataset.speed) { speed = Number(el.dataset.speed); profile.speed = speed; saveProfile(); syncSettings(); playSound('turn'); }
  else if (el.dataset.skin) {
    const chosen = skins.find(s => s.id === el.dataset.skin);
    if (chosen.unlock > profile.totalFruit) { toast(`🔒 ${chosen.unlock - profile.totalFruit} meyve daha toplayınca açılır`, 1800); playSound('locked'); return; }
    profile.skin = chosen.id; saveProfile(); renderSkins(); playSound('spawn');
  }
});
document.addEventListener('change', e => {
  if (!e.target.matches('[data-walls]')) return;
  walls = e.target.checked; profile.walls = walls; saveProfile(); syncSettings(); playSound('turn');
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
});

/* ---------- Başlat ---------- */
renderSettings(); updateToggles(); fitCanvas(); reset(); setScreen('start');
new ResizeObserver(fitCanvas).observe(canvas);
window.addEventListener('resize', fitCanvas);
requestAnimationFrame(now => { lastFrame = now; frame(now); });
