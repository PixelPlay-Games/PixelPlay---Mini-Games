export function startGame(container, api) {
  let bestScore = parseInt(localStorage.getItem('q2048_best') || '0', 10);
  let maxTile = parseInt(localStorage.getItem('q2048_max') || '2', 10);

  container.innerHTML = `
    <div style="height:40px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:rgba(10,25,22,0.95); border-bottom:1px solid rgba(0,255,170,0.2); font-size:12px;">
      <span style="color:#80cbc4;">🏆 Рекорд: <b id="q2048-best" style="color:#ffd700;">${bestScore}</b></span>
      <span style="color:#80cbc4;">💠 Макс. ядро: <b id="q2048-max" style="color:#00ffaa;">${maxTile}</b></span>
    </div>
    <canvas id="canvas-2048" style="display:block; width:100%; height:calc(100% - 96px); touch-action:none;"></canvas>
    <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:6px; padding:0 10px; background:#0b1a17; border-top:1px solid rgba(0,255,170,0.15);">
      <button id="q-undo" style="background:rgba(0,255,170,0.15); border:1px solid #00ffaa; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">↩ Шаг (10 💎)</button>
      <button id="q-smash" style="background:rgba(255,82,82,0.2); border:1px solid #ff5252; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">💥 Убрать 2/4 (25 💎)</button>
      <button id="q-upgrade" style="background:rgba(255,215,0,0.2); border:1px solid #ffd700; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">⚡ Апгрейд (40 💎)</button>
      <button id="q-reset" style="background:rgba(255,255,255,0.08); border:none; color:#80cbc4; padding:7px 9px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">↻</button>
    </div>
  `;

  const canvas = document.getElementById('canvas-2048');
  const ctx = canvas.getContext('2d');
  const width = canvas.width = container.clientWidth;
  const height = canvas.height = container.clientHeight - 96;

  const CORES = {
    2: { c1: '#26a69a', c2: '#004d40', text: '#e0f2f1' },
    4: { c1: '#00e676', c2: '#00695c', text: '#ffffff' },
    8: { c1: '#00e5ff', c2: '#006064', text: '#ffffff' },
    16: { c1: '#2979ff', c2: '#0d47a1', text: '#ffffff' },
    32: { c1: '#d500f9', c2: '#4a148c', text: '#ffffff' },
    64: { c1: '#ff1744', c2: '#880e4f', text: '#ffffff' },
    128: { c1: '#ff9100', c2: '#e65100', text: '#ffffff' },
    256: { c1: '#ffd600', c2: '#ff6f00', text: '#1a1a1a' },
    512: { c1: '#76ff03', c2: '#33691e', text: '#1a1a1a' },
    1024: { c1: '#f50057', c2: '#311b92', text: '#ffffff' },
    2048: { c1: '#ffffff', c2: '#ffd700', text: '#000000' }
  };

  let grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  let prevGrid = null, score = 0, prevScore = 0, gameOver = false;
  let particles = [], animScales = {}, animId;

  const boardSize = Math.min(width - 28, height - 40, 330);
  const startX = (width - boardSize) / 2;
  const startY = (height - boardSize) / 2;
  const gap = 10;
  const cellSize = (boardSize - gap * 5) / 4;

  function spawnBurst(r, c, color) {
    const cx = startX + gap + c * (cellSize + gap) + cellSize / 2;
    const cy = startY + gap + r * (cellSize + gap) + cellSize / 2;
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const spd = 2 + Math.random() * 3.5;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color });
    }
  }

  function addTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) if (grid[r][c] === 0) empty.push({ r, c });
    }
    if (empty.length > 0) {
      const pick = empty[Math.floor(Math.random() * empty.length)];
      grid[pick.r][pick.c] = Math.random() < 0.88 ? 2 : 4;
      animScales[`${pick.r}-${pick.c}`] = 0.2;
    }
  }

  function init() {
    grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    prevGrid = null; score = 0; gameOver = false; particles = []; animScales = {};
    addTile(); addTile(); api.onScore(0);
  }
  function slideLine(line, lineIdx, isVert, isRev) {
    let arr = line.filter(v => v !== 0);
    if (isRev) arr.reverse();
    const mergedPos = [];

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        mergedPos.push(i);
        if (arr[i] > maxTile) {
          maxTile = arr[i];
          localStorage.setItem('q2048_max', String(maxTile));
          const maxEl = document.getElementById('q2048-max');
          if (maxEl) maxEl.textContent = maxTile;
        }
        if (arr[i] >= 256 && arr[i] % 256 === 0) api.addGems(10);
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) arr.push(0);
    if (isRev) arr.reverse();

    mergedPos.forEach(idx => {
      const realIdx = isRev ? 3 - idx : idx;
      const r = isVert ? realIdx : lineIdx;
      const c = isVert ? lineIdx : realIdx;
      animScales[`${r}-${c}`] = 1.32;
      const core = CORES[grid[r][c]] || CORES[2048];
      spawnBurst(r, c, core.c1);
    });
    return arr;
  }

  function move(dir) {
    if (gameOver) return;
    const snap = JSON.stringify(grid);
    const scoreSnap = score;
    let moved = false;

    for (let i = 0; i < 4; i++) {
      const line = [];
      for (let j = 0; j < 4; j++) line.push(dir === 'UP' || dir === 'DOWN' ? grid[j][i] : grid[i][j]);
      const isVert = dir === 'UP' || dir === 'DOWN';
      const isRev = dir === 'RIGHT' || dir === 'DOWN';
      const next = slideLine(line, i, isVert, isRev);
      for (let j = 0; j < 4; j++) {
        const old = isVert ? grid[j][i] : grid[i][j];
        if (old !== next[j]) moved = true;
        if (isVert) grid[j][i] = next[j]; else grid[i][j] = next[j];
      }
    }

    if (moved) {
      prevGrid = snap;
      prevScore = scoreSnap;
      addTile();
      api.onScore(score);
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('q2048_best', String(bestScore));
        const bEl = document.getElementById('q2048-best');
        if (bEl) bEl.textContent = bestScore;
      }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      checkOver();
    }
  }

  function checkOver() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return;
      }
    }
    gameOver = true;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
  }

  let startX = 0, startY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'RIGHT' : 'LEFT');
    else move(dy > 0 ? 'DOWN' : 'UP');
  });

  document.getElementById('q-undo').onclick = () => {
    if (prevGrid && !gameOver && api.spendGems(10)) {
      grid = JSON.parse(prevGrid);
      score = prevScore;
      prevGrid = null;
      api.onScore(score);
    }
  };

  document.getElementById('q-smash').onclick = () => {
    if (!gameOver && api.spendGems(25)) {
      let cleared = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] === 2 || grid[r][c] === 4) {
            spawnBurst(r, c, '#ff5252');
            grid[r][c] = 0;
            cleared = true;
          }
        }
      }
      if (!cleared) addTile();
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    }
  };

  document.getElementById('q-upgrade').onclick = () => {
    if (!gameOver && api.spendGems(40)) {
      let maxV = 0, mr = 0, mc = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] > maxV) { maxV = grid[r][c]; mr = r; mc = c; }
        }
      }
      if (maxV > 0) {
        grid[mr][mc] *= 2;
        animScales[`${mr}-${mc}`] = 1.4;
        spawnBurst(mr, mc, '#ffd700');
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      }
    }
  };

  document.getElementById('q-reset').onclick = () => init();

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loop() {
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.3, 10, width / 2, height / 2, height * 0.8);
    bgGrad.addColorStop(0, '#102e28');
    bgGrad.addColorStop(1, '#060f0d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0, 255, 170, 0.06)';
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
    ctx.lineWidth = 2;
    roundRect(startX, startY, boardSize, boardSize, 18);
    ctx.fill();
    ctx.stroke();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = startX + gap + c * (cellSize + gap);
        const y = startY + gap + r * (cellSize + gap);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        roundRect(x, y, cellSize, cellSize, 12);
        ctx.fill();

        const val = grid[r][c];
        if (val > 0) {
          const key = `${r}-${c}`;
          let sc = animScales[key] || 1;
          if (sc !== 1) {
            sc += (1 - sc) * 0.22;
            if (Math.abs(1 - sc) < 0.01) sc = 1;
            animScales[key] = sc;
          }

          const core = CORES[val] || CORES[2048];
          ctx.save();
          ctx.translate(x + cellSize / 2, y + cellSize / 2);
          ctx.scale(sc, sc);

          const grad = ctx.createLinearGradient(-cellSize / 2, -cellSize / 2, cellSize / 2, cellSize / 2);
          grad.addColorStop(0, core.c1);
          grad.addColorStop(1, core.c2);

          ctx.shadowBlur = 14;
          ctx.shadowColor = core.c1;
          ctx.fillStyle = grad;
          roundRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 12);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = core.text;
          ctx.font = `900 ${val >= 1024 ? 18 : val >= 128 ? 22 : 26}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), 0, 1);
          ctx.restore();
        }
      }
    }

    for (let p of particles) {
      p.x += p.vx; p.y += p.vy; p.life -= 0.035;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    particles = particles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    if (gameOver) {
      ctx.fillStyle = 'rgba(6, 15, 13, 0.88)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00ffaa';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ходов больше нет!', width / 2, height / 2 - 16);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Счет: ${score} | Рекорд: ${bestScore}`, width / 2, height / 2 + 14);
    }

    animId = requestAnimationFrame(loop);
  }

  init();
  loop();
  return () => cancelAnimationFrame(animId);
}
