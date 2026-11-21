export function startGame(container, api) {
  let bestScore = parseInt(localStorage.getItem('cyber_stack_best') || '0', 10);

  container.innerHTML = `
    <div style="height:40px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:rgba(15,18,34,0.92); border-bottom:1px solid rgba(168,85,247,0.25); font-size:12px;">
      <span style="color:#8b95b5;">🏆 Рекорд: <b id="cs-best" style="color:#ffd700;">${bestScore}</b></span>
      <span id="cs-combo" style="color:#00f0ff; font-weight:800; letter-spacing:0.5px;"></span>
    </div>
    <canvas id="stack-canvas" style="display:block; width:100%; height:calc(100% - 96px); touch-action:none;"></canvas>
    <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 12px; background:#141829; border-top:1px solid rgba(255,255,255,0.08);">
      <button id="expand-booster" style="background:linear-gradient(135deg, rgba(168,85,247,0.3), rgba(0,240,255,0.15)); border:1px solid #a855f7; color:#fff; padding:8px 12px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
        ↔ Расширить блок (25 💎)
      </button>
      <button id="restart-stack" style="background:rgba(255,255,255,0.08); border:none; color:#8b95b5; padding:8px 12px; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer;">
        ↻ Заново
      </button>
    </div>
  `;

  const canvas = document.getElementById('stack-canvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width = container.clientWidth;
  const height = canvas.height = container.clientHeight - 96;

  // Генерация детализированного ночного города на заднем фоне
  const stars = Array.from({ length: 45 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.65,
    r: Math.random() * 1.4 + 0.4,
    phase: Math.random() * Math.PI * 2
  }));

  const skylineBack = Array.from({ length: 12 }, (_, i) => ({
    x: i * (width / 10) - 10,
    w: width / 9 + Math.random() * 15,
    h: 110 + Math.random() * 140,
    hue: i % 2 === 0 ? '#161b33' : '#1b1636'
  }));

  const skylineFront = Array.from({ length: 9 }, (_, i) => {
    const w = width / 7 + Math.random() * 18;
    const h = 70 + Math.random() * 110;
    const wins = [];
    for (let wy = 12; wy < h - 14; wy += 14) {
      for (let wx = 8; wx < w - 10; wx += 10) {
        if (Math.random() > 0.45) {
          wins.push({ wx, wy, c: Math.random() > 0.7 ? '#ff007f' : '#00f0ff' });
        }
      }
    }
    return { x: i * (width / 7.5) - 8, w, h, wins };
  });

  const drones = Array.from({ length: 5 }, () => ({
    x: Math.random() * width,
    y: 40 + Math.random() * (height * 0.55),
    vx: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.2),
    color: Math.random() > 0.5 ? '#ff007f' : '#00f0ff'
  }));
  const BLOCK_H = 22;
  const DEPTH_3D = 10;
  let stack = [];
  let debris = [];
  let sparks = [];
  let popups = [];
  let current = null;
  let score = 0;
  let combo = 0;
  let cameraY = 0;
  let targetCameraY = 0;
  let gameOver = false;
  let animId;

  const PALETTE = [
    { top: '#5efce8', front: '#00c6ff', side: '#0072ff', glow: '#00f0ff' },
    { top: '#b86bff', front: '#8a2be2', side: '#4b0082', glow: '#a855f7' },
    { top: '#ff7eb3', front: '#ff007f', side: '#99004d', glow: '#ff007f' },
    { top: '#81fbb8', front: '#00e676', side: '#008844', glow: '#00ff88' },
    { top: '#ffe666', front: '#ffaa00', side: '#b36b00', glow: '#ffd700' }
  ];

  function getColors(idx) {
    return PALETTE[Math.floor(idx / 3) % PALETTE.length];
  }

  function initGame() {
    const baseW = Math.min(180, width * 0.52);
    stack = [{
      x: (width - baseW) / 2,
      y: height - 60,
      w: baseW,
      colorIdx: 0
    }];
    debris = [];
    sparks = [];
    popups = [];
    score = 0;
    combo = 0;
    cameraY = 0;
    targetCameraY = 0;
    gameOver = false;
    api.onScore(0);
    updateComboUI();
    spawnNextBlock();
  }

  function updateComboUI() {
    const el = document.getElementById('cs-combo');
    if (el) el.textContent = combo > 1 ? `🔥 COMBO x${combo}` : '';
  }

  function spawnNextBlock() {
    const prev = stack[stack.length - 1];
    const dir = stack.length % 2 === 0 ? 1 : -1;
    const speed = Math.min(2.4 + stack.length * 0.14, 6.2);
    current = {
      x: dir === 1 ? -prev.w : width,
      y: prev.y - BLOCK_H,
      w: prev.w,
      vx: dir * speed,
      colorIdx: stack.length
    };
    if (stack.length > 5) {
      targetCameraY = (stack.length - 5) * BLOCK_H;
    }
  }

  function spawnSparks(x, y, w, color, count = 18) {
    for (let i = 0; i < count; i++) {
      sparks.push({
        x: x + Math.random() * w,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -1 - Math.random() * 4,
        life: 1,
        color
      });
    }
  }

  function placeBlock() {
    if (gameOver || !current) return;
    const prev = stack[stack.length - 1];
    const diff = current.x - prev.x;
    const absDiff = Math.abs(diff);
    const col = getColors(current.colorIdx);

    if (absDiff >= prev.w) {
      debris.push({ x: current.x, y: current.y, w: current.w, vx: current.vx * 0.5, vy: 1, rot: 0, vrot: diff > 0 ? 0.06 : -0.06, colorIdx: current.colorIdx });
      current = null;
      gameOver = true;
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    if (absDiff <= 6) {
      // Идеальное попадание!
      current.x = prev.x;
      combo++;
      if (combo >= 3 && current.w < width * 0.65) {
        current.w = Math.min(width * 0.65, current.w + 14);
        current.x = Math.max(10, Math.min(width - current.w - 10, current.x - 7));
      }
      stack.push({ x: current.x, y: current.y, w: current.w, colorIdx: current.colorIdx });
      spawnSparks(current.x, current.y + BLOCK_H, current.w, col.glow, 26);
      popups.push({ x: current.x + current.w / 2, y: current.y - 8, text: combo > 1 ? `PERFECT x${combo}!` : 'PERFECT!', color: '#ffd700', life: 1 });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } else {
      combo = 0;
      const newW = prev.w - absDiff;
      const newX = diff > 0 ? current.x : prev.x;
      const cutX = diff > 0 ? newX + newW : current.x;

      debris.push({
        x: cutX, y: current.y, w: absDiff,
        vx: diff > 0 ? 2.2 : -2.2, vy: -1.5,
        rot: 0, vrot: diff > 0 ? 0.08 : -0.08,
        colorIdx: current.colorIdx
      });

      stack.push({ x: newX, y: current.y, w: newW, colorIdx: current.colorIdx });
      spawnSparks(newX, current.y + BLOCK_H, newW, col.glow, 10);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    }

    score++;
    api.onScore(score);
    updateComboUI();

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('cyber_stack_best', String(bestScore));
      const bestEl = document.getElementById('cs-best');
      if (bestEl) bestEl.textContent = bestScore;
    }
    if (score % 15 === 0) api.addGems(5);

    spawnNextBlock();
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    placeBlock();
  });

  document.getElementById('expand-booster').onclick = () => {
    if (gameOver || !current) return;
    if (api.spendGems(25)) {
      const top = stack[stack.length - 1];
      const maxW = Math.min(200, width * 0.68);
      top.w = maxW;
      top.x = (width - maxW) / 2;
      current.w = maxW;
      spawnSparks(top.x, top.y, top.w, '#a855f7', 30);
      popups.push({ x: width / 2, y: top.y - 12, text: 'ПЛАТФОРМА РАСШИРЕНА!', color: '#a855f7', life: 1.2 });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  };

  document.getElementById('restart-stack').onclick = () => initGame();

  function drawCityBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#060714');
    skyGrad.addColorStop(0.55, '#121530');
    skyGrad.addColorStop(1, '#1e1438');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const t = Date.now() * 0.002;
    for (let s of stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t + s.phase));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Неоновая луна на горизонте
    const moonGrad = ctx.createRadialGradient(width * 0.78, height * 0.22, 4, width * 0.78, height * 0.22, 34);
    moonGrad.addColorStop(0, '#ff7eb3');
    moonGrad.addColorStop(0.6, 'rgba(255, 0, 127, 0.35)');
    moonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGrad;
    ctx.beginPath(); ctx.arc(width * 0.78, height * 0.22, 34, 0, Math.PI * 2); ctx.fill();

    // Дальний слой силуэтов небоскребов (параллакс 0.15)
    const backOffset = Math.min(cameraY * 0.15, 110);
    for (let b of skylineBack) {
      const by = height - b.h + backOffset;
      ctx.fillStyle = b.hue;
      ctx.fillRect(b.x, by, b.w, b.h + 120);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, by, b.w, b.h + 120);
    }

    // Ближний слой зданий со светящимися окнами (параллакс 0.35)
    const frontOffset = Math.min(cameraY * 0.35, 160);
    for (let b of skylineFront) {
      const by = height - b.h + frontOffset;
      ctx.fillStyle = '#0d1021';
      ctx.fillRect(b.x, by, b.w, b.h + 170);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.28)';
      ctx.strokeRect(b.x, by, b.w, b.h + 170);
      for (let win of b.wins) {
        ctx.fillStyle = win.c;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(b.x + win.wx, by + win.wy, 4, 6);
      }
      ctx.globalAlpha = 1;
    }

    // Летающие дроны с огнями
    for (let d of drones) {
      d.x += d.vx;
      if (d.x < -20) d.x = width + 20;
      if (d.x > width + 20) d.x = -20;
      ctx.fillStyle = d.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = d.color;
      ctx.fillRect(d.x, d.y, 7, 2.5);
      ctx.shadowBlur = 0;
    }
  }

  function draw3DBlock(x, y, w, colorIdx) {
    const c = getColors(colorIdx);
    ctx.save();
    // Верхняя изометрическая грань
    ctx.fillStyle = c.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + DEPTH_3D, y - DEPTH_3D);
    ctx.lineTo(x + w + DEPTH_3D, y - DEPTH_3D);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    // Правая боковая 3D-грань
    ctx.fillStyle = c.side;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + DEPTH_3D, y - DEPTH_3D);
    ctx.lineTo(x + w + DEPTH_3D, y + BLOCK_H - DEPTH_3D);
    ctx.lineTo(x + w, y + BLOCK_H);
    ctx.closePath();
    ctx.fill();

    // Лицевая неоновая панель с окнами этажа
    const frontGrad = ctx.createLinearGradient(x, y, x + w, y + BLOCK_H);
    frontGrad.addColorStop(0, c.front);
    frontGrad.addColorStop(1, c.side);
    ctx.fillStyle = frontGrad;
    ctx.fillRect(x, y, w, BLOCK_H);

    // Светящаяся кромка и полоска окон
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, BLOCK_H - 1);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let wx = x + 6; wx < x + w - 8; wx += 11) {
      ctx.fillRect(wx, y + 7, 5, 7);
    }
    ctx.restore();
  }

  function loop() {
    cameraY += (targetCameraY - cameraY) * 0.1;

    if (!gameOver && current) {
      current.x += current.vx;
      if (current.x + current.w > width + 15) current.vx = -Math.abs(current.vx);
      if (current.x < -15) current.vx = Math.abs(current.vx);
    }

    drawCityBackground();

    ctx.save();
    ctx.translate(0, cameraY);

    for (let b of stack) {
      if (b.y + cameraY < height + 40) draw3DBlock(b.x, b.y, b.w, b.colorIdx);
    }
    if (current) draw3DBlock(current.x, current.y, current.w, current.colorIdx);

    for (let d of debris) {
      d.x += d.vx; d.y += d.vy; d.vy += 0.35; d.rot += d.vrot;
      ctx.save();
      ctx.translate(d.x + d.w / 2, d.y + BLOCK_H / 2);
      ctx.rotate(d.rot);
      draw3DBlock(-d.w / 2, -BLOCK_H / 2, d.w, d.colorIdx);
      ctx.restore();
    }
    debris = debris.filter(d => d.y + cameraY < height + 100);

    for (let s of sparks) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 0.03;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, 3, 3);
    }
    sparks = sparks.filter(s => s.life > 0);

    for (let p of popups) {
      p.y -= 0.9; p.life -= 0.025;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    }
    popups = popups.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (gameOver) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.85)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Башня рухнула!', width / 2, height / 2 - 20);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Этажей: ${score} | Рекорд: ${bestScore}`, width / 2, height / 2 + 10);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '13px sans-serif';
      ctx.fillText('Нажми "↻ Заново" внизу', width / 2, height / 2 + 38);
    }

    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();
  return () => cancelAnimationFrame(animId);
}
