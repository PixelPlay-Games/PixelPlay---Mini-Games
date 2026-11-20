export function startGame(container, api) {
  container.innerHTML = `
    <canvas id="drop-canvas" style="display:block; width:100%; height:calc(100% - 54px); touch-action:none;"></canvas>
    <div style="height:54px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:#141829; border-top:1px solid rgba(255,255,255,0.08);">
      <button id="bomb-booster" style="background:rgba(255,0,127,0.18); border:1px solid #ff007f; color:#fff; padding:7px 12px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">
        💣 Убрать мелкие (20 💎)
      </button>
      <button id="restart-drop" style="background:rgba(255,255,255,0.08); border:none; color:#8b95b5; padding:7px 12px; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer;">
        Заново
      </button>
    </div>
  `;

  const canvas = document.getElementById('drop-canvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width = container.clientWidth;
  let height = canvas.height = container.clientHeight - 54;

  const LEVELS = [
    { r: 16, color: '#00f0ff', points: 2 },
    { r: 22, color: '#00ff88', points: 4 },
    { r: 28, color: '#ffe600', points: 8 },
    { r: 35, color: '#ff8800', points: 16 },
    { r: 43, color: '#ff007f', points: 32 },
    { r: 52, color: '#a855f7', points: 64 },
    { r: 62, color: '#ffffff', points: 128 }
  ];

  let balls = [];
  let particles = [];
  let score = 0;
  let currentLevel = 0;
  let nextLevel = Math.floor(Math.random() * 3);
  let aimX = width / 2;
  let canDrop = true;
  let gameOver = false;
  let animId;
  const DANGER_Y = 95;
  function spawnParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
  }

  function dropBall() {
    if (!canDrop || gameOver) return;
    const lvl = LEVELS[currentLevel];
    balls.push({
      x: Math.max(lvl.r + 4, Math.min(width - lvl.r - 4, aimX)),
      y: 50,
      vx: 0,
      vy: 2,
      level: currentLevel,
      r: lvl.r,
      mergeCooldown: 0
    });
    canDrop = false;
    currentLevel = nextLevel;
    nextLevel = Math.floor(Math.random() * 3);
    setTimeout(() => { canDrop = true; }, 450);
  }

  const updateAim = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    aimX = clientX - rect.left;
  };

  canvas.addEventListener('pointermove', (e) => updateAim(e.clientX));
  canvas.addEventListener('pointerdown', (e) => {
    updateAim(e.clientX);
    dropBall();
  });

  document.getElementById('bomb-booster').onclick = () => {
    if (gameOver) return;
    if (api.spendGems(20)) {
      balls = balls.filter(b => {
        if (b.level <= 1) {
          spawnParticles(b.x, b.y, LEVELS[b.level].color);
          return false;
        }
        return true;
      });
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    }
  };

  document.getElementById('restart-drop').onclick = () => {
    balls = [];
    particles = [];
    score = 0;
    gameOver = false;
    api.onScore(0);
  };
  function update() {
    if (gameOver) return;

    for (let b of balls) {
      b.vy += 0.35;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.99;
      if (b.mergeCooldown > 0) b.mergeCooldown--;

      if (b.y + b.r > height) { b.y = height - b.r; b.vy *= -0.25; b.vx *= 0.9; }
      if (b.x - b.r < 0) { b.x = b.r; b.vx *= -0.4; }
      if (b.x + b.r > width) { b.x = width - b.r; b.vx *= -0.4; }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.r + b2.r;

        if (dist < minDist && dist > 0) {
          if (b1.level === b2.level && b1.level < LEVELS.length - 1 && b1.mergeCooldown === 0 && b2.mergeCooldown === 0) {
            const newLvl = b1.level + 1;
            const nx = (b1.x + b2.x) / 2;
            const ny = (b1.y + b2.y) / 2;
            balls.splice(j, 1);
            balls.splice(i, 1);
            balls.push({
              x: nx, y: ny, vx: 0, vy: -1,
              level: newLvl, r: LEVELS[newLvl].r, mergeCooldown: 10
            });
            score += LEVELS[newLvl].points;
            api.onScore(score);
            spawnParticles(nx, ny, LEVELS[newLvl].color);
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            if (score % 100 === 0) api.addGems(5);
            return;
          }

          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          b1.x -= nx * overlap;
          b1.y -= ny * overlap;
          b2.x += nx * overlap;
          b2.y += ny * overlap;

          const dvx = b2.vx - b1.vx;
          const dvy = b2.vy - b1.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot < 0) {
            b1.vx += dot * nx * 0.6;
            b1.vy += dot * ny * 0.6;
            b2.vx -= dot * nx * 0.6;
            b2.vy -= dot * ny * 0.6;
          }
        }
      }
    }

    for (let b of balls) {
      if (b.y - b.r < DANGER_Y && Math.abs(b.vy) < 0.3 && b.y > 65) {
        gameOver = true;
      }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.04; });
    particles = particles.filter(p => p.life > 0);
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 0, 127, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, DANGER_Y);
    ctx.lineTo(width, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (canDrop && !gameOver) {
      const preview = LEVELS[currentLevel];
      const clampedX = Math.max(preview.r + 4, Math.min(width - preview.r - 4, aimX));
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(clampedX, 50);
      ctx.lineTo(clampedX, height);
      ctx.stroke();

      drawNeonBall(clampedX, 50, preview.r, preview.color);
    }

    for (let b of balls) {
      drawNeonBall(b.x, b.y, b.r, LEVELS[b.level].color);
    }

    for (let p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 11, 18, 0.85)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Игра окончена!', width / 2, height / 2 - 15);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Счет: ${score} (нажми "Заново")`, width / 2, height / 2 + 18);
    }
  }

  function drawNeonBall(x, y, r, color) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color + '33';
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  return () => cancelAnimationFrame(animId);
}
