export function startGame(container, api) {
  let bestScore = parseInt(localStorage.getItem('neon_merge_best') || '0', 10);
  let unlockedSkins = JSON.parse(localStorage.getItem('neon_merge_skins') || '["neon"]');
  let currentSkin = localStorage.getItem('neon_merge_active_skin') || 'neon';

  const LEVELS = [
    { r: 15, c1: '#00f0ff', c2: '#0051ff', pts: 1 },
    { r: 21, c1: '#00ff88', c2: '#008844', pts: 2 },
    { r: 27, c1: '#ffe600', c2: '#ff8800', pts: 4 },
    { r: 34, c1: '#ff7700', c2: '#ff0044', pts: 8 },
    { r: 41, c1: '#ff007f', c2: '#8800ff', pts: 16 },
    { r: 49, c1: '#b829ff', c2: '#4400cc', pts: 32 },
    { r: 57, c1: '#ffffff', c2: '#88ccff', pts: 64 },
    { r: 65, c1: '#ffd700', c2: '#ff5500', pts: 125 },
    { r: 73, c1: '#ff00ff', c2: '#00ffff', pts: 250 }
  ];

  container.innerHTML = `
    <div style="height:40px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:rgba(20,24,41,0.9); border-bottom:1px solid rgba(0,240,255,0.15); font-size:12px;">
      <span style="color:#8b95b5;">🏆 Рекорд: <b id="nm-best" style="color:#ffd700;">${bestScore}</b></span>
      <span style="color:#8b95b5; display:flex; align-items:center; gap:6px;">След: <span id="nm-next-dot" style="display:inline-block; width:14px; height:14px; border-radius:50%; background:#00f0ff; box-shadow:0 0 8px #00f0ff;"></span></span>
    </div>
    <canvas id="drop-canvas" style="display:block; width:100%; height:calc(100% - 96px); touch-action:none;"></canvas>
    <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 12px; background:#141829; border-top:1px solid rgba(255,255,255,0.08);">
      <button id="bomb-booster" style="background:linear-gradient(135deg, rgba(255,0,127,0.25), rgba(255,0,127,0.1)); border:1px solid #ff007f; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
        💣 Бомба (20 💎)
      </button>
      <button id="skins-btn" style="background:linear-gradient(135deg, rgba(0,240,255,0.25), rgba(0,240,255,0.1)); border:1px solid #00f0ff; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
        🎨 Скины
      </button>
      <button id="restart-drop" style="background:rgba(255,255,255,0.08); border:none; color:#8b95b5; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:600; cursor:pointer;">
        ↻
      </button>
    </div>
    <div id="skins-modal" style="display:none; position:absolute; inset:0; background:rgba(11,13,23,0.94); z-index:20; padding:20px; flex-direction:column; justify-content:center; gap:12px;">
      <h3 style="text-align:center; color:#00f0ff; margin-bottom:6px;">Выбор стиля сфер</h3>
      <button class="skin-opt" data-skin="neon" data-cost="0" style="padding:12px; border-radius:12px; background:#1d2238; border:1px solid #00f0ff; color:#fff; font-weight:700;">🔮 Неоновые сферы (Бесплатно)</button>
      <button class="skin-opt" data-skin="planet" data-cost="150" style="padding:12px; border-radius:12px; background:#1d2238; border:1px solid rgba(255,255,255,0.15); color:#fff; font-weight:700;">🪐 Кибер-планеты (150 💎)</button>
      <button class="skin-opt" data-skin="crystal" data-cost="300" style="padding:12px; border-radius:12px; background:#1d2238; border:1px solid rgba(255,255,255,0.15); color:#fff; font-weight:700;">💎 Энерго-кристаллы (300 💎)</button>
      <button id="close-skins" style="margin-top:8px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.1); border:none; color:#8b95b5; font-weight:600;">Закрыть</button>
    </div>
  `;
  const canvas = document.getElementById('drop-canvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width = container.clientWidth;
  let height = canvas.height = container.clientHeight - 96;

  let balls = [], particles = [], popups = [];
  let score = 0, currentLevel = 0, nextLevel = Math.floor(Math.random() * 3);
  let aimX = width / 2, canDrop = true, gameOver = false, animId;
  const DANGER_Y = 85;

  function updateNextPreview() {
    const dot = document.getElementById('nm-next-dot');
    if (dot) {
      dot.style.background = LEVELS[nextLevel].c1;
      dot.style.boxShadow = `0 0 8px ${LEVELS[nextLevel].c1}`;
    }
  }
  updateNextPreview();

  function addScore(pts, x, y, color) {
    score += pts;
    api.onScore(score);
    popups.push({ x, y, text: `+${pts}`, color, life: 1 });
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('neon_merge_best', String(bestScore));
      const bestEl = document.getElementById('nm-best');
      if (bestEl) bestEl.textContent = bestScore;
    }
    if (score % 50 === 0) api.addGems(5);
  }

  function spawnParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const spd = 2 + Math.random() * 4;
      particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color });
    }
  }

  function dropBall() {
    if (!canDrop || gameOver) return;
    const lvl = LEVELS[currentLevel];
    balls.push({
      x: Math.max(lvl.r + 6, Math.min(width - lvl.r - 6, aimX)),
      y: 44, vx: 0, vy: 2, level: currentLevel, r: lvl.r, mergeCooldown: 0
    });
    canDrop = false;
    currentLevel = nextLevel;
    nextLevel = Math.floor(Math.random() * 3);
    updateNextPreview();
    setTimeout(() => { canDrop = true; }, 420);
  }

  canvas.addEventListener('pointermove', (e) => {
    aimX = e.clientX - canvas.getBoundingClientRect().left;
  });
  canvas.addEventListener('pointerdown', (e) => {
    aimX = e.clientX - canvas.getBoundingClientRect().left;
    dropBall();
  });

  document.getElementById('bomb-booster').onclick = () => {
    if (!gameOver && api.spendGems(20)) {
      balls = balls.filter(b => {
        if (b.level <= 1) { spawnParticles(b.x, b.y, LEVELS[b.level].c1); return false; }
        return true;
      });
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    }
  };

  const modal = document.getElementById('skins-modal');
  document.getElementById('skins-btn').onclick = () => { modal.style.display = 'flex'; };
  document.getElementById('close-skins').onclick = () => { modal.style.display = 'none'; };

  document.querySelectorAll('.skin-opt').forEach(btn => {
    btn.onclick = () => {
      const skin = btn.dataset.skin;
      const cost = parseInt(btn.dataset.cost, 10);
      if (unlockedSkins.includes(skin) || api.spendGems(cost)) {
        if (!unlockedSkins.includes(skin)) {
          unlockedSkins.push(skin);
          localStorage.setItem('neon_merge_skins', JSON.stringify(unlockedSkins));
        }
        currentSkin = skin;
        localStorage.setItem('neon_merge_active_skin', skin);
        modal.style.display = 'none';
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      }
    };
  });

  document.getElementById('restart-drop').onclick = () => {
    balls = []; particles = []; popups = []; score = 0; gameOver = false;
    api.onScore(0);
  };
  function update() {
    if (gameOver) return;

    for (let b of balls) {
      b.vy += 0.36;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.99;
      if (b.mergeCooldown > 0) b.mergeCooldown--;

      if (b.y + b.r > height - 4) { b.y = height - 4 - b.r; b.vy *= -0.22; b.vx *= 0.9; }
      if (b.x - b.r < 4) { b.x = 4 + b.r; b.vx *= -0.4; }
      if (b.x + b.r > width - 4) { b.x = width - 4 - b.r; b.vx *= -0.4; }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i], b2 = balls[j];
        const dx = b2.x - b1.x, dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.r + b2.r;

        if (dist < minDist && dist > 0) {
          if (b1.level === b2.level && b1.mergeCooldown === 0 && b2.mergeCooldown === 0) {
            const nx = (b1.x + b2.x) / 2, ny = (b1.y + b2.y) / 2;
            balls.splice(j, 1);
            balls.splice(i, 1);

            // Если столкнулись два максимальных шара — аннигиляция с наградой!
            if (b1.level === LEVELS.length - 1) {
              spawnParticles(nx, ny, '#ffffff', 36);
              addScore(500, nx, ny, '#ffd700');
              api.addGems(15);
              window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
              return;
            }

            const newLvl = b1.level + 1;
            balls.push({
              x: nx, y: ny, vx: 0, vy: -1,
              level: newLvl, r: LEVELS[newLvl].r, mergeCooldown: 10
            });
            addScore(LEVELS[newLvl].pts, nx, ny, LEVELS[newLvl].c1);
            spawnParticles(nx, ny, LEVELS[newLvl].c1);
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            return;
          }

          const overlap = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          b1.x -= nx * overlap; b1.y -= ny * overlap;
          b2.x += nx * overlap; b2.y += ny * overlap;

          const dot = (b2.vx - b1.vx) * nx + (b2.vy - b1.vy) * ny;
          if (dot < 0) {
            b1.vx += dot * nx * 0.6; b1.vy += dot * ny * 0.6;
            b2.vx -= dot * nx * 0.6; b2.vy -= dot * ny * 0.6;
          }
        }
      }
    }

    for (let b of balls) {
      if (b.y - b.r < DANGER_Y && Math.abs(b.vy) < 0.25 && b.y > 60) gameOver = true;
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.035; });
    particles = particles.filter(p => p.life > 0);
    popups.forEach(p => { p.y -= 0.8; p.life -= 0.025; });
    popups = popups.filter(p => p.life > 0);
  }
  function drawBackground() {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);
  }

  function drawEntity(x, y, r, lvlData) {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = lvlData.c1;

    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, lvlData.c1);
    grad.addColorStop(1, lvlData.c2);

    ctx.fillStyle = grad;
    ctx.strokeStyle = lvlData.c1;
    ctx.lineWidth = 2;

    if (currentSkin === 'crystal') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + Math.cos(a) * (r - 2);
        const py = y + Math.sin(a) * (r - 2);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (currentSkin === 'planet') {
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.25, r * 0.32, -0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();

    ctx.strokeStyle = 'rgba(255, 0, 127, 0.45)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(width, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);

    if (canDrop && !gameOver) {
      const preview = LEVELS[currentLevel];
      const cx = Math.max(preview.r + 6, Math.min(width - preview.r - 6, aimX));
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath(); ctx.moveTo(cx, 44); ctx.lineTo(cx, height); ctx.stroke();
      drawEntity(cx, 44, preview.r, preview);
    }

    for (let b of balls) drawEntity(b.x, b.y, b.r, LEVELS[b.level]);

    for (let p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let pop of popups) {
      ctx.globalAlpha = pop.life;
      ctx.fillStyle = pop.color;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 11, 18, 0.88)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Игра окончена!', width / 2, height / 2 - 18);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Счет: ${score} | Рекорд: ${bestScore}`, width / 2, height / 2 + 12);
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  return () => cancelAnimationFrame(animId);
}
