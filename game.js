'use strict';

const $ = selector => document.querySelector(selector);
const canvas = $('#board'), ctx = canvas.getContext('2d'), overlay = $('#overlay');
const scoreEl = $('#score'), bestEl = $('#best'), pauseBtn = $('#pause'), startBtn = $('#start');
const N = 20, S = 30;
const dirs = {up: {x: 0, y: -1}, down: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}};
const fruits = [
  {name: 'Elma', icon: '🍎', points: 10, color: '#d98169'},
  {name: 'Çilek', icon: '🍓', points: 20, color: '#d97988'},
  {name: 'Üzüm', icon: '🍇', points: 30, color: '#9a7bb0'}
];
const bonuses = [
  {kind: 'star', icon: '⭐', name: 'Yıldız', detail: '8 saniye iki kat puan!', duration: 8000, color: '#d6ad47'},
  {kind: 'slow', icon: '❄️', name: 'Serinlik', detail: '8 saniye yavaş ve rahat!', duration: 8000, color: '#7aafb8'},
  {kind: 'shield', icon: '🛡️', name: 'Kalkan', detail: 'Bir çarpışmada seni kurtarır!', duration: 15000, color: '#77a8a0'}
];
let snake, foods = [], bonus = null, direction, queue = [];
let score = 0, best = 0, state = 'ready', speed = 220, timer = null, interval = speed;
let walls = false, sound = true, audio = null, masterGain = null, audioFailed = false, soundRevision = 0, gameTime = 0, lastTick = 0;
let collected = 0, combo = 0, comboUntil = 0, missionTarget = 5, effects = {}, bursts = [];
try { best = Number(localStorage.getItem('lara-snake-best')) || 0; } catch {}
try { sound = localStorage.getItem('lara-snake-sound') !== 'off'; } catch {}
bestEl.textContent = best;

// Notes are [frequency, duration, delay, optional ending frequency].
const soundEffects = {
  start: {notes: [[523, .12, 0], [659, .12, .12], [784, .22, .24]]},
  apple: {notes: [[620, .08, 0, 880], [880, .12, .08]]},
  strawberry: {notes: [[740, .09, 0], [988, .15, .09]]},
  grape: {notes: [[659, .08, 0], [831, .08, .08], [988, .15, .16]]},
  spawn: {notes: [[1047, .08, 0], [1319, .14, .12]], volume: .11},
  star: {notes: [[784, .09, 0], [988, .09, .09], [1175, .09, .18], [1568, .2, .27]]},
  slow: {notes: [[880, .14, 0, 440], [440, .25, .14, 220]], wave: 'sine'},
  shield: {notes: [[440, .18, 0], [660, .18, 0], [880, .2, .18]]},
  rescue: {notes: [[180, .12, 0, 520], [784, .2, .12]]},
  mission: {notes: [[523, .1, 0], [659, .1, .1], [784, .1, .2], [1047, .24, .3]]},
  win: {notes: [[523, .12, 0], [659, .12, .12], [784, .12, .24], [1047, .3, .36], [784, .3, .36]]},
  over: {notes: [[240, .18, 0, 130], [130, .26, .18, 65]], wave: 'sawtooth', volume: .09},
  pause: {notes: [[659, .1, 0], [523, .14, .1]], volume: .11},
  resume: {notes: [[523, .1, 0], [659, .14, .1]], volume: .11},
  turn: {notes: [[330, .035, 0, 440]], volume: .035}
};

const same = (a, b) => a && b && a.x === b.x && a.y === b.y;
const active = kind => (effects[kind] || 0) > gameTime;

function freeCell() {
  const free = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cell = {x, y};
    if (!snake.some(p => same(p, cell)) && !foods.some(p => same(p, cell)) && !same(bonus, cell)) free.push(cell);
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function spawnFruit(type) {
  const cell = freeCell();
  if (cell) foods.push({...cell, type});
}

function spawnBonus() {
  // Each fourth fruit refreshes the surprise and its collection window.
  bonus = null;
  const cell = freeCell();
  if (!cell) return;
  const type = bonuses[Math.floor(Math.random() * bonuses.length)];
  bonus = {...cell, type, expires: gameTime + 12000};
  announce(`${type.icon} ${type.name} çıktı! 12 saniye içinde yakala.`);
  playSound('spawn');
}

function reset() {
  snake = [{x: 8, y: 10}, {x: 7, y: 10}, {x: 6, y: 10}, {x: 5, y: 10}];
  direction = dirs.right;
  queue = []; foods = []; bonus = null; effects = {}; bursts = [];
  score = 0; collected = 0; combo = 0; comboUntil = 0; gameTime = 0; missionTarget = 5;
  scoreEl.textContent = 0;
  fruits.forEach(spawnFruit);
  updateHud(); draw();
}

function rounded(x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

function drawItem(item, special = false) {
  const x = item.x * S + 15, y = item.y * S + 15;
  ctx.save();
  if (special) {
    ctx.fillStyle = '#fff8d6'; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = item.type.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, (item.expires - gameTime) / 12000)); ctx.stroke();
  }
  ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.type.icon, x, y + 1);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, 600, 600);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#eaf0dc' : '#eef3e2'; ctx.fillRect(x * S, y * S, S, S);
  }
  if (walls) { ctx.strokeStyle = '#a3b889'; ctx.lineWidth = 5; ctx.strokeRect(2.5, 2.5, 595, 595); }
  foods.forEach(item => drawItem(item));
  if (bonus) drawItem(bonus, true);
  snake.slice().reverse().forEach((p, i) => {
    const head = i === snake.length - 1;
    const color = active('star') ? (head ? '#b28c35' : i % 2 ? '#d6b857' : '#e1c76b') : head ? '#618447' : i % 2 ? '#90ac69' : '#9db978';
    rounded(p.x * S + 2, p.y * S + 2, 26, 26, head ? 10 : 9, color);
  });
  const h = snake[0], cx = h.x * S + 15, cy = h.y * S + 15;
  if (active('shield')) {
    ctx.strokeStyle = '#63aab5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
  }
  const px = -direction.y, py = direction.x;
  for (const side of [-1, 1]) {
    const ex = cx + direction.x * 6 + px * side * 6, ey = cy + direction.y * 6 + py * side * 6;
    ctx.fillStyle = '#fffdf3'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#304629'; ctx.beginPath(); ctx.arc(ex + direction.x, ey + direction.y, 2, 0, Math.PI * 2); ctx.fill();
  }
  for (const burst of bursts) {
    const progress = (gameTime - burst.born) / 1000;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = burst.color; ctx.font = 'bold 19px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(burst.text, Math.max(35, Math.min(565, burst.x * S + 15)), Math.max(24, burst.y * S - progress * 22));
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      ctx.beginPath(); ctx.arc(burst.x * S + 15 + Math.cos(angle) * (10 + progress * 30), burst.y * S + 15 + Math.sin(angle) * (10 + progress * 30), 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function updateSoundButton() {
  const button = $('#sound');
  const label = audioFailed && sound ? 'Ses için tekrar dene' : sound ? 'Sesi kapat' : 'Sesi aç';
  button.textContent = audioFailed && sound ? '🔈 Tekrar dene' : sound ? '🔊 Ses açık' : '🔇 Ses kapalı';
  button.setAttribute('aria-pressed', String(sound));
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
}

async function playSound(name, pitch = 1) {
  if (!sound) return;
  const revision = soundRevision;
  try {
    if (!audio || audio.state === 'closed') {
      // Create/resume directly inside the start, key or touch gesture.
      audio = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audio.createGain();
      masterGain.gain.value = .65;
      masterGain.connect(audio.destination);
    }
    if (audio.state !== 'running') await audio.resume();
    if (!sound || revision !== soundRevision) return;
    if (audio.state !== 'running') throw new Error('Audio is suspended');
    audioFailed = false;
    updateSoundButton();
    masterGain.gain.setValueAtTime(.65, audio.currentTime);
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
      oscillator.connect(gain); gain.connect(masterGain);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end + .02);
    }
  } catch {
    if (!sound || revision !== soundRevision) return;
    audioFailed = true;
    updateSoundButton();
  }
}

function announce(message) { $('#cheer').textContent = message; }
function addScore(points) {
  score += points; scoreEl.textContent = score;
  if (score > best) {
    best = score; bestEl.textContent = best;
    try { localStorage.setItem('lara-snake-best', String(best)); } catch {}
  }
}

function updateHud() {
  const missionStart = missionTarget - 5, progress = collected - missionStart;
  $('#mission-title').textContent = `Bu tur ${missionTarget} meyve topla`;
  $('#mission-count').textContent = `${progress} / 5`;
  $('#mission-progress').value = progress;
  $('#mission-progress').setAttribute('aria-label', `${missionTarget} meyve görevi: ${progress} / 5`);
  $('#collected').textContent = collected;
  $('#combo').textContent = combo > 1 ? `🔥 Seri ×${combo} · ${Math.max(0, Math.ceil((comboUntil - gameTime) / 1000))} sn` : 'Peş peşe topla, puanı katla!';
  $('#combo').classList.toggle('hot', combo > 1);
  for (const type of bonuses) {
    const chip = $(`#effect-${type.kind}`);
    chip.hidden = !active(type.kind);
    chip.textContent = `${type.icon} ${type.kind === 'star' ? 'Puan ×2' : type.name} · ${Math.ceil(((effects[type.kind] || 0) - gameTime) / 1000)} sn`;
  }
  $('#effect-empty').hidden = bonuses.some(type => active(type.kind));
  $('#garden-status').textContent = bonus ? `${bonus.type.icon} Bonus: ${Math.ceil((bonus.expires - gameTime) / 1000)} sn` : 'Meyve şöleni!';
}

function schedule() {
  clearInterval(timer);
  interval = active('slow') ? Math.round(speed * 1.65) : speed;
  timer = setInterval(tick, interval);
}

function begin() {
  startBtn.blur(); reset(); state = 'playing'; overlay.hidden = true;
  pauseBtn.disabled = false; pauseBtn.textContent = 'Ⅱ Duraklat';
  announce('Üç farklı meyve seni bekliyor! Bakalım ilk bonusun ne olacak?');
  lastTick = performance.now(); schedule(); playSound('start');
}

function candidate(d) {
  const next = {x: snake[0].x + d.x, y: snake[0].y + d.y};
  if (walls && (next.x < 0 || next.x >= N || next.y < 0 || next.y >= N)) return null;
  next.x = (next.x + N) % N; next.y = (next.y + N) % N;
  const grows = foods.some(p => same(p, next));
  return (grows ? snake : snake.slice(0, -1)).some(p => same(p, next)) ? null : next;
}

function tick() {
  if (state !== 'playing') return;
  const now = performance.now(); gameTime += now - lastTick; lastTick = now;
  if (bonus && bonus.expires <= gameTime) bonus = null;
  if (comboUntil <= gameTime) combo = 0;
  bursts = bursts.filter(b => gameTime - b.born < 1000);
  if (queue.length) direction = queue.shift();
  let next = candidate(direction);
  if (!next) {
    if (!active('shield')) return finish(false);
    const escape = Object.values(dirs).find(d => candidate(d));
    if (!escape) return finish(false);
    direction = escape; next = candidate(direction); queue = []; effects.shield = 0;
    announce('🛡️ Kalkan seni kurtardı ve güvenli yöne çevirdi!'); playSound('rescue');
  }
  const fruitIndex = foods.findIndex(p => same(p, next));
  snake.unshift(next);
  if (fruitIndex >= 0) {
    const item = foods.splice(fruitIndex, 1)[0];
    combo = Math.min(combo + 1, 3); comboUntil = gameTime + 6000; collected++;
    const points = item.type.points * combo * (active('star') ? 2 : 1);
    addScore(points);
    bursts.push({...next, text: `+${points}`, color: item.type.color, born: gameTime});
    announce(`${item.type.icon} ${item.type.name} +${points} puan!${combo > 1 ? ` Seri ×${combo}!` : ''}`);
    playSound(['apple', 'strawberry', 'grape'][fruits.indexOf(item.type)], 1 + (combo - 1) * .12);
    if (collected >= missionTarget) {
      addScore(50); missionTarget += 5;
      announce('🌼 Görev tamam! +50 puan. Yeni hedefin hazır!'); playSound('mission');
    }
    if (snake.length === N * N) { draw(); updateHud(); return finish(true); }
    if (collected % 4 === 0) spawnBonus();
  } else snake.pop();
  if (same(bonus, next)) {
    const type = bonus.type; effects[type.kind] = gameTime + type.duration; bonus = null;
    bursts.push({...next, text: type.icon, color: type.color, born: gameTime});
    announce(`${type.icon} ${type.detail}`); playSound(type.kind);
  }
  // Refill missing types when the tail or a collected bonus frees a crowded cell.
  fruits.forEach(type => { if (!foods.some(item => item.type === type)) spawnFruit(type); });
  const desiredInterval = active('slow') ? Math.round(speed * 1.65) : speed;
  if (interval !== desiredInterval) schedule();
  updateHud(); draw();
}

function panel(label, title, text, button, art) {
  $('#overlay-label').textContent = label; $('#overlay-title').textContent = title;
  $('#overlay-text').textContent = text; startBtn.textContent = button;
  $('#welcome-art').textContent = art; $('#overlay-hint').textContent = 'Lara’nın bahçesinde her tur yeni bir macera.'; overlay.hidden = false;
}

function finish(win) {
  clearInterval(timer); state = 'over'; pauseBtn.disabled = true; updateHud(); draw(); playSound(win ? 'win' : 'over');
  panel(win ? 'BAHÇENİN ŞAMPİYONU' : 'GÜZEL BİR MACERAYDI', win ? 'Bahçeyi doldurdun, Lara!' : 'Bir tur daha, Lara?',
    `${collected} meyve, ${score} puan! En iyi skorun ${best}. Yeni turda yeni sürprizler seni bekliyor.`, 'Yeniden oyna →', win ? '🏆' : '🍓');
}

function pause() {
  if (state === 'playing') {
    gameTime += performance.now() - lastTick;
    state = 'paused'; clearInterval(timer); pauseBtn.textContent = '▶ Devam et';
    playSound('pause');
    panel('KÜÇÜK BİR MOLA', 'Bahçe seni bekliyor.', 'Bonusların ve serinliğin de seninle mola veriyor. Hazır olduğunda devam edebilirsin.', 'Devam edelim →', '🌿');
  } else if (state === 'paused') {
    startBtn.blur(); pauseBtn.blur(); state = 'playing'; overlay.hidden = true;
    pauseBtn.textContent = 'Ⅱ Duraklat'; lastTick = performance.now(); schedule(); playSound('resume');
  }
}

function turn(name) {
  if (state !== 'playing') return;
  const d = dirs[name], last = queue.at(-1) || direction;
  if (queue.length < 2 && (d.x !== last.x || d.y !== last.y) && !(d.x === -last.x && d.y === -last.y)) { queue.push(d); playSound('turn'); }
}

startBtn.addEventListener('click', () => state === 'paused' ? pause() : begin());
pauseBtn.addEventListener('click', pause);
document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); turn(b.dataset.dir); }));
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  const map = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right'};
  const name = map[e.key] || map[e.key.toLowerCase()];
  if (name) { e.preventDefault(); turn(name); }
  if (e.code === 'Space' && !e.target.matches('button,a')) { e.preventDefault(); if (state === 'playing' || state === 'paused') pause(); else begin(); }
});
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
  speed = Number(b.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(item => { item.classList.toggle('selected', item === b); item.setAttribute('aria-pressed', String(item === b)); });
  if (state === 'playing') schedule();
}));
$('#walls').addEventListener('change', e => {
  walls = e.target.checked;
  $('#mode-hint').textContent = walls ? 'Dikkat, bahçenin duvarları var!' : 'Kenardan geç, diğer taraftan çık!'; draw();
});
$('#sound').addEventListener('click', () => {
  if (audioFailed && sound) { playSound('start'); return; }
  sound = !sound; soundRevision++;
  try { localStorage.setItem('lara-snake-sound', sound ? 'on' : 'off'); } catch {}
  if (masterGain) masterGain.gain.setValueAtTime(sound ? .65 : 0, audio.currentTime);
  updateSoundButton();
  if (sound) playSound('start');
});
let touch = null;
canvas.addEventListener('pointerdown', e => { touch = {x: e.clientX, y: e.clientY}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) turn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  touch = null;
});
canvas.addEventListener('pointercancel', () => touch = null);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
updateSoundButton();
reset();
