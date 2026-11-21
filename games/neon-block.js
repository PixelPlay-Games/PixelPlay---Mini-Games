export function startGame(container, api) {
  const N = 8;
  const COLORS = ['#00f0ff', '#ff007f', '#a855f7', '#10b981', '#f59e0b', '#38bdf8'];
  const RAW_SHAPES = [
    ['1'], ['11'], ['111'], ['1111'],
    ['1', '1'], ['1', '1', '1'], ['1', '1', '1', '1'],
    ['11', '11'], ['111', '111', '111'],
    ['10', '11'], ['01', '11'], ['11', '10'], ['11', '01'],
    ['111', '010'], ['010', '111'], ['110', '011'], ['011', '110']
  ];
  const SHAPES = RAW_SHAPES.map(rows => rows.map(r => r.split('').map(Number)));

  let grid = Array.from({ length: N }, () => Array(N).fill(null));
  let score = 0, rewardClaimed = false, tray = [], dragging = null;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;padding:14px;justify-content:space-between;align-items:center;touch-action:none;">
      <div style="width:100%;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#8b95b5;">
        <span>Заполняй ряды и столбцы</span>
        <button id="nb-restart" style="background:#1c233d;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:5px 10px;border-radius:8px;font-weight:700;cursor:pointer;">Заново</button>
      </div>
      <div id="nb-board" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;width:min(86vw,340px);aspect-ratio:1;background:#11162b;padding:8px;border-radius:16px;border:1px solid rgba(0,240,255,0.25);"></div>
      <div id="nb-tray" style="display:flex;justify-content:space-around;align-items:center;width:100%;height:110px;background:rgba(20,25,45,0.6);border-radius:16px;padding:8px;border:1px solid rgba(255,255,255,0.06);"></div>
      <div id="nb-gameover" style="display:none;position:absolute;inset:0;background:rgba(7,9,19,0.92);flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:20;">
        <h2 style="font-size:24px;color:#ff007f;">Нет ходов!</h2>
        <p style="color:#8b95b5;font-size:14px;">Итоговый счёт: <b id="nb-final" style="color:#fff;">0</b></p>
        <button id="nb-retry" style="background:linear-gradient(135deg,#00f0ff,#3b82f6);border:none;color:#000;font-weight:800;padding:12px 24px;border-radius:14px;font-size:15px;cursor:pointer;">Играть снова</button>
      </div>
    </div>`;

  const boardEl = container.querySelector('#nb-board');
  const trayEl = container.querySelector('#nb-tray');
  const overEl = container.querySelector('#nb-gameover');
  const cells = Array.from({ length: N }, () => Array.from({ length: N }, () => {
    const d = document.createElement('div');
    d.style.cssText = 'border-radius:6px;background:#19203b;transition:background 0.1s;';
    boardEl.appendChild(d);
    return d;
  }));

  function renderBoard(prev = null) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = grid[r][c], cell = cells[r][c];
        cell.style.background = v || '#19203b';
        cell.style.boxShadow = v ? `inset 0 0 8px rgba(255,255,255,0.4),0 0 8px ${v}66` : 'none';
        cell.style.opacity = '1';
      }
    }
    if (prev) {
      prev.shape.forEach((row, r) => row.forEach((on, c) => {
        const nr = prev.r0 + r, nc = prev.c0 + c;
        if (on && nr >= 0 && nr < N && nc >= 0 && nc < N) {
          cells[nr][nc].style.background = prev.valid ? prev.color : '#ff3333';
          cells[nr][nc].style.opacity = '0.55';
        }
      }));
    }
  }

  function canPlace(shape, r0, c0) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nr = r0 + r, nc = c0 + c;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || grid[nr][nc]) return false;
      }
    }
    return true;
  }

  function checkAnyMove() {
    return tray.some(it => it && grid.some((_, r) => grid[r].some((__, c) => canPlace(it.shape, r, c))));
  }

  function spawnTray() {
    tray = Array.from({ length: 3 }, () => ({
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));
    renderTray();
    if (!checkAnyMove()) showOver();
  }

  function renderTray() {
    trayEl.innerHTML = '';
    tray.forEach((item, idx) => {
      const slot = document.createElement('div');
      slot.style.cssText = 'width:90px;height:90px;display:flex;align-items:center;justify-content:center;cursor:grab;';
      if (item) {
        const cols = item.shape[0].length;
        const mini = document.createElement('div');
        mini.style.cssText = `display:grid;grid-template-columns:repeat(${cols},18px);gap:2px;pointer-events:none;`;
        item.shape.forEach(row => row.forEach(on => {
          const b = document.createElement('div');
          b.style.cssText = on ? `width:18px;height:18px;border-radius:4px;background:${item.color};box-shadow:0 0 6px ${item.color}88;` : 'width:18px;height:18px;';
          mini.appendChild(b);
        }));
        slot.appendChild(mini);
        slot.addEventListener('pointerdown', e => {
          e.preventDefault();
          const ghost = mini.cloneNode(true);
          ghost.style.cssText = `position:fixed;display:grid;grid-template-columns:repeat(${cols},32px);gap:4px;pointer-events:none;z-index:999;transform:translate(-50%,-120%);`;
          ghost.querySelectorAll('div').forEach(d => { d.style.width = '32px'; d.style.height = '32px'; d.style.borderRadius = '6px'; });
          document.body.appendChild(ghost);
          slot.style.opacity = '0.25';
          dragging = { idx, item, ghost, slot };
          moveGhost(e.clientX, e.clientY);
        });
      }
      trayEl.appendChild(slot);
    });
  }

  function getCoords(x, y, shape) {
    const rect = boardEl.getBoundingClientRect(), cw = rect.width / N;
    return {
      c0: Math.round((x - rect.left) / cw - shape[0].length / 2),
      r0: Math.round((y - rect.top - cw * 1.6) / cw - shape.length / 2)
    };
  }

  function moveGhost(x, y) {
    if (!dragging) return;
    dragging.ghost.style.left = `${x}px`;
    dragging.ghost.style.top = `${y - 45}px`;
    const { r0, c0 } = getCoords(x, y, dragging.item.shape);
    renderBoard({ shape: dragging.item.shape, r0, c0, color: dragging.item.color, valid: canPlace(dragging.item.shape, r0, c0) });
  }

  function onMove(e) { if (dragging) moveGhost(e.clientX, e.clientY); }

  function onUp(e) {
    if (!dragging) return;
    const { idx, item, ghost, slot } = dragging;
    ghost.remove();
    dragging = null;
    const { r0, c0 } = getCoords(e.clientX, e.clientY, item.shape);
    if (canPlace(item.shape, r0, c0)) {
      let cnt = 0;
      item.shape.forEach((row, r) => row.forEach((on, c) => { if (on) { grid[r0 + r][c0 + c] = item.color; cnt++; } }));
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
      score += cnt * 10;
      const rows = [], cols = [];
      for (let r = 0; r < N; r++) if (grid[r].every(Boolean)) rows.push(r);
      for (let c = 0; c < N; c++) if (grid.every(r => r[c])) cols.push(c);
      rows.forEach(r => grid[r].fill(null));
      cols.forEach(c => grid.forEach(r => { r[c] = null; }));
      const lines = rows.length + cols.length;
      if (lines > 0) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        score += lines * 100 * lines;
        if (score >= 600 && !rewardClaimed) { rewardClaimed = true; api.addGems(30); }
      }
      api.onScore(score);
      tray[idx] = null;
      renderBoard();
      if (tray.every(x => !x)) spawnTray();
      else { renderTray(); if (!checkAnyMove()) showOver(); }
    } else {
      slot.style.opacity = '1';
      renderBoard();
    }
  }

  function showOver() { container.querySelector('#nb-final').textContent = score; overEl.style.display = 'flex'; }
  function reset() {
    grid = Array.from({ length: N }, () => Array(N).fill(null));
    score = 0; rewardClaimed = false; api.onScore(0); overEl.style.display = 'none';
    renderBoard(); spawnTray();
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  container.querySelector('#nb-restart').addEventListener('click', reset);
  container.querySelector('#nb-retry').addEventListener('click', reset);
  reset();

  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    dragging?.ghost?.remove();
  };
}
