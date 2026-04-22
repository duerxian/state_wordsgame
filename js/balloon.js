// js/balloon-game.js

document.addEventListener('DOMContentLoaded', function() {
  // 初始化 Lucide 图标
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ── WORD BANK ──
  const WORD_BANK = [
    'flow','can','pear','cake','cock','egg','dog','list','apple','cat',
    'tiger','bird','fish','frog','lion','bear','wolf','duck','star','moon',
    'rain','snow','wind','fire','tree','leaf','rose','blue','gold','sand'
  ];

  let currentWords = [...WORD_BANK.slice(0, 12)];
  let gameRunning = false;
  let score = 0;
  let penalty = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let animFrame = null;

  // difficulty settings
  const DIFFICULTY = {
    easy:   { speed: 0.35, spawnRate: 180, maxBalloons: 4 },
    normal: { speed: 0.65, spawnRate: 120, maxBalloons: 6 },
    hard:   { speed: 1.1,  spawnRate: 80,  maxBalloons: 8 }
  };
  let currentDiff = 'easy';
let currentMode = 'click'; // 默认鼠标模式

  // ── CANVAS SETUP ──
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // ── GAME STATE ──
  let balloons = [];
  let particles = [];
  let bullets = [];
  let shipX = W / 2;
  const SHIP_Y = H - 100;
  const SHIP_SPEED = 8;
  let keys = {};
  let spawnCounter = 0;
  let inputWord = '';
  let lastTypedWord = '';
  let popAnimation = [];   // {x,y,word,alpha,scale}
  let missFlash = [];      // {balloon,alpha}

  // ship emoji/drawing params
  const SHIP_W = 100;
  const SHIP_H = 56;

  // Balloon color sets
  const BALLOON_COLORS_BLUE   = ['#3b82f6','#60a5fa','#2563eb'];
  const BALLOON_COLORS_RED    = ['#ef4444','#f87171','#dc2626'];
  const BALLOON_COLORS_GREEN  = ['#22c55e','#4ade80','#16a34a'];
  const BALLOON_COLORS_PURPLE = ['#a855f7','#c084fc','#9333ea'];
  const ALL_COLORS = [BALLOON_COLORS_BLUE, BALLOON_COLORS_RED, BALLOON_COLORS_GREEN, BALLOON_COLORS_PURPLE];

  // ── DRAW FUNCTIONS ──

  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H - 80);
    grad.addColorStop(0, '#bae6fd');
    grad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H - 80);

    // Clouds
    drawCloud(ctx, 120, 60, 0.7);
    drawCloud(ctx, 400, 40, 0.9);
    drawCloud(ctx, 750, 80, 0.6);
    drawCloud(ctx, 1050, 50, 0.8);

    // Sea
    const seaGrad = ctx.createLinearGradient(0, H - 80, 0, H);
    seaGrad.addColorStop(0, '#0ea5e9');
    seaGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, H - 80, W, 80);

    // Sea shimmer
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const sy = H - 70 + i * 10;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W * 0.3, sy - 4);
      ctx.lineTo(W * 0.6, sy + 4);
      ctx.lineTo(W, sy - 2);
      ctx.stroke();
    }
  }

  function drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.arc(32, -10, 22, 0, Math.PI * 2);
    ctx.arc(60, 0, 26, 0, Math.PI * 2);
    ctx.arc(30, 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Hull
    const hullGrad = ctx.createLinearGradient(-SHIP_W/2, 0, SHIP_W/2, SHIP_H);
    hullGrad.addColorStop(0, '#fb923c');
    hullGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(-SHIP_W/2, 0);
    ctx.lineTo(SHIP_W/2, 0);
    ctx.lineTo(SHIP_W/2 - 14, SHIP_H * 0.55);
    ctx.lineTo(-SHIP_W/2 + 14, SHIP_H * 0.55);
    ctx.closePath();
    ctx.fill();

    // Deck
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-SHIP_W/2 + 6, -10, SHIP_W - 12, 14);
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1;
    ctx.strokeRect(-SHIP_W/2 + 6, -10, SHIP_W - 12, 14);

    // Cabin left
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-28, -34, 30, 24);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-24, -30, 10, 10);
    ctx.fillRect(-10, -30, 10, 10);

    // Cabin right (smaller)
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(6, -28, 20, 18);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(9, -24, 7, 7);

    // Cannon / gun
    ctx.save();
    ctx.translate(0, -36);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.rect(-4, -20, 8, 20);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, -18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Chimney
    ctx.fillStyle = '#475569';
    ctx.fillRect(16, -44, 8, 20);
    // Smoke
    ctx.fillStyle = 'rgba(203,213,225,0.6)';
    ctx.beginPath();
    ctx.arc(20, -52, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, -60, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBalloon(b) {
    const r = b.radius;
    ctx.save();
    ctx.translate(b.x, b.y - r);

    // Balloon body
    const grd = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
    grd.addColorStop(0, b.lightColor);
    grd.addColorStop(0.7, b.color);
    grd.addColorStop(1, b.darkColor);
    ctx.fillStyle = grd;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.32, r * 0.28, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Knot
    ctx.fillStyle = b.darkColor;
    ctx.beginPath();
    ctx.arc(0, r, 4, 0, Math.PI * 2);
    ctx.fill();

    // String
    ctx.strokeStyle = 'rgba(100,116,139,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, r + 4);
    ctx.quadraticCurveTo(6, r + 25, 0, r + 50);
    ctx.stroke();

    // Word box
    ctx.translate(0, r + 56);
    const label = b.word;
    const metrics = ctx.measureText(label);
    const bw = metrics.width + 20;
    const bh = 26;
    // shadow
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff';
    roundRect(ctx, -bw/2, -bh/2, bw, bh, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, -bw/2, -bh/2, bw, bh, 6);
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBullet(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 7);
    grad.addColorStop(0, '#fde68a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPopAnimations() {
    popAnimation.forEach(pa => {
      ctx.save();
      ctx.globalAlpha = pa.alpha;
      ctx.scale(pa.scale, pa.scale);
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('+10', pa.x / pa.scale, pa.y / pa.scale);
      ctx.restore();
    });
  }

  function drawInputFeedback() {
    if (!inputWord) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('输入: ' + inputWord, 16, H - 100);
    ctx.restore();
  }

  // ── SPAWN BALLOON ──
  function spawnBalloon() {
    const cfg = DIFFICULTY[currentDiff];
    if (balloons.length >= cfg.maxBalloons) return;
    const availableWords = currentWords.filter(w => !balloons.find(b => b.word === w));
    if (!availableWords.length) return;

    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    const colorSet = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
    const xPad = 80;
    const x = xPad + Math.random() * (W - xPad * 2);

    balloons.push({
      x,
      y: -20,
      word,
      speed: cfg.speed * (0.8 + Math.random() * 0.4),
      radius: 28 + Math.random() * 12,
      color: colorSet[0],
      lightColor: colorSet[1],
      darkColor: colorSet[2],
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.01
    });
  }

  // ── POP BALLOON ──
  function popBalloon(balloon) {
    // particles
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x: balloon.x,
        y: balloon.y - balloon.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: 3 + Math.random() * 4,
        color: balloon.color
      });
    }
    // score animation
    popAnimation.push({
      x: balloon.x,
      y: balloon.y - balloon.radius - 20,
      alpha: 1,
      scale: 1
    });
    score += 10;
    document.getElementById('scoreDisplay').textContent = score;

    // remove from list display
    markWordPopped(balloon.word);
    balloons = balloons.filter(b => b !== balloon);
  }

  function missedBalloon(balloon) {
    penalty += 5;
    document.getElementById('penaltyDisplay').textContent = penalty;
    balloons = balloons.filter(b => b !== balloon);
    // re-add word after 3s
    setTimeout(function() {
      if (gameRunning && !balloons.find(b2 => b2.word === balloon.word)) {
        // word comes back
      }
    }, 3000);
  }

  // ── GAME LOOP ──
  function gameLoop() {
    if (!gameRunning) return;
    const cfg = DIFFICULTY[currentDiff];

    ctx.clearRect(0, 0, W, H);
    drawBackground();

    // Spawn
    spawnCounter++;
    if (spawnCounter >= cfg.spawnRate) {
      spawnBalloon();
      spawnCounter = 0;
    }

    // Move ship
    if (keys['ArrowLeft'] || keys['KeyA']) shipX -= SHIP_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) shipX += SHIP_SPEED;
    shipX = Math.max(SHIP_W / 2 + 10, Math.min(W - SHIP_W / 2 - 10, shipX));

    // Move bullets
    bullets = bullets.filter(b => b.y > -20);
    bullets.forEach(b => {
      b.y -= 12;
      drawBullet(b);
    });

    // Move balloons
    balloons.forEach(b => {
      b.y += b.speed;
      b.wobble += b.wobbleSpeed;
      b.x += Math.sin(b.wobble) * 0.5;
      drawBalloon(b);
    });

    // Bullet-balloon collision
    bullets.forEach(bullet => {
      balloons.forEach(balloon => {
        const dx = bullet.x - balloon.x;
        const dy = bullet.y - (balloon.y - balloon.radius);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < balloon.radius + 6) {
          if (bullet.targetWord === balloon.word || currentMode === 'click') {
            bullet.dead = true;
            popBalloon(balloon);
          }
        }
      });
    });
    bullets = bullets.filter(b => !b.dead);

    // Balloon hits sea
    balloons.forEach(b => {
      if (b.y > H - 60) {
        missedBalloon(b);
      }
    });

    // Move particles
    particles = particles.filter(p => p.alpha > 0.02);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.alpha -= 0.025;
      p.r *= 0.97;
    });

    // Pop animations
    popAnimation = popAnimation.filter(pa => pa.alpha > 0.05);
    popAnimation.forEach(pa => {
      pa.y -= 1;
      pa.alpha -= 0.02;
      pa.scale += 0.01;
    });

    drawParticles();
    drawPopAnimations();
    drawInputFeedback();
    drawShip(shipX, SHIP_Y);

    animFrame = requestAnimationFrame(gameLoop);
  }

  // ── FIRE ──
  function fire(word) {
    if (!gameRunning) return;
    const targetBalloon = balloons.find(b => b.word.toLowerCase() === word.toLowerCase().trim());
    if (currentMode === 'keyboard' && !targetBalloon) {
      // wrong word flash
      const input = document.getElementById('wordInput');
      input.style.borderColor = '#ef4444';
      setTimeout(function() { input.style.borderColor = '#cbd5e1'; }, 500);
      penalty += 2;
      document.getElementById('penaltyDisplay').textContent = penalty;
      return;
    }
    bullets.push({
      x: shipX,
      y: SHIP_Y - SHIP_H / 2 - 20,
      targetWord: word.trim().toLowerCase(),
      dead: false
    });
    document.getElementById('wordInput').value = '';
    inputWord = '';
  }

  // ── WORD LIST UI ──
  function renderWordList() {
    const container = document.getElementById('wordList');
    container.innerHTML = '';
    currentWords.forEach(function(w) {
      const el = document.createElement('div');
      el.className = 'word-item';
      el.dataset.word = w;
      el.textContent = w;
      container.appendChild(el);
    });
  }

  function markWordPopped(word) {
    const el = document.querySelector('.word-item[data-word="' + word + '"]');
    if (el) {
      el.classList.add('popped');
      setTimeout(function() { el.classList.remove('popped'); }, 4000);
    }
  }

  // ── TIMER ──
  function startTimer() {
    timerSeconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
      timerSeconds++;
      const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
      const s = String(timerSeconds % 60).padStart(2, '0');
      document.getElementById('timerDisplay').textContent = m + ':' + s;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── START / STOP ──
  function startGame() {
    if (gameRunning) {
      // stop
      gameRunning = false;
      stopTimer();
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      document.getElementById('startBtn').textContent = '开始游戏';
      document.getElementById('startBtn').classList.remove('running');
      document.getElementById('overlay').style.display = 'flex';
      // show result
      const ob = document.querySelector('.overlay-box');
      ob.querySelector('h2').textContent = '游戏结束 🎉';
      ob.querySelector('p').textContent = '得分：' + score + ' 分  |  扣分：' + penalty + ' 分  |  净分：' + (score - penalty) + ' 分';
      ob.querySelector('button').textContent = '再来一局';
      return;
    }

    gameRunning = true;
    score = 0; penalty = 0;
    document.getElementById('scoreDisplay').textContent = '0';
    document.getElementById('penaltyDisplay').textContent = '0';
    balloons = []; bullets = []; particles = []; popAnimation = [];
    spawnCounter = 0;
    shipX = W / 2;
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('startBtn').textContent = '结束游戏';
    document.getElementById('startBtn').classList.add('running');
    startTimer();
    renderWordList();
    gameLoop();
  }

  // ── CLICK BALLOON ──
  canvas.addEventListener('click', function(e) {
    if (!gameRunning || currentMode !== 'click') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let hit = null;
    balloons.forEach(b => {
      const dx = mx - b.x;
      const dy = my - (b.y - b.radius);
      if (Math.sqrt(dx * dx + dy * dy) < b.radius) hit = b;
    });
    if (hit) {
      bullets.push({ x: shipX, y: SHIP_Y - SHIP_H/2 - 20, targetWord: hit.word, dead: false });
    }
  });

  // ── KEYBOARD EVENTS ──
  document.addEventListener('keydown', function(e) {
    keys[e.code] = true;
  });
  document.addEventListener('keyup', function(e) {
    keys[e.code] = false;
  });

  const wordInput = document.getElementById('wordInput');
  wordInput.addEventListener('input', function() {
    inputWord = wordInput.value;
  });
  wordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      fire(wordInput.value);
    }
  });
  document.getElementById('fireBtn').addEventListener('click', function() {
    fire(wordInput.value);
  });

  // ── START BUTTONS ──
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('overlayStartBtn').addEventListener('click', startGame);

  // ── DROPDOWNS ──
  function setupDropdown(btnId, menuId, onSelect) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('.dropdown-item').forEach(function(item) {
      item.addEventListener('click', function() {
        menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        onSelect(item.dataset.value, item.textContent);
        menu.classList.remove('open');
      });
    });
    document.addEventListener('click', function() { menu.classList.remove('open'); });
  }

  setupDropdown('levelBtn', 'levelMenu', function(val, label) {
    document.getElementById('levelBtn').childNodes[0].textContent = label + ' ';
  });
  setupDropdown('unitBtn', 'unitMenu', function(val, label) {
    document.getElementById('unitBtn').childNodes[0].textContent = label + ' ';
  });
  setupDropdown('diffBtn', 'diffMenu', function(val, label) {
    currentDiff = val;
    document.getElementById('diffBtn').childNodes[0].textContent = label + ' ';
  });
  setupDropdown('modeBtn', 'modeMenu', function(val, label) {
    currentMode = val;
    document.getElementById('modeBtn').childNodes[0].textContent = label + ' ';
    wordInput.style.display = val === 'keyboard' ? '' : 'none';
    document.getElementById('fireBtn').style.display = val === 'keyboard' ? '' : 'none';
  });

  // Record button
  document.getElementById('recordBtn').addEventListener('click', function() {
    alert('最高分记录功能开发中～');
  });

  // ── INITIAL RENDER ──
  renderWordList();

  // Draw static background on load
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawShip(shipX, SHIP_Y);
});