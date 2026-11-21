export function startGame(container, api) {
  const GRID_SIZE = 8;
  const COLORS = ['#00f0ff', '#ff007f', '#a855f7', '#10b981', '#f59e0b', '#38bdf8'];
  const SHAPES = [
    [[1]],
    [[1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]]
  ];

  let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  let score = 0;
  let rewardClaimed = false;
  let tray = [];
  let dragging = null;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; padding:14px; justify-content:space-between; align-items:center; touch-action:none;">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#8b95b5;">
        <span>Заполняй ряды и столбцы</span>
        <button id="nb-restart" style="background:#1c233d; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px 10px; border-radius:8px; font-weight:700; cursor:pointer;">Заново</button>
      </div>
      <div id="nb-board" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:4px; width:min(86vw, 340px); aspect-ratio:1; background:#11162b; padding:8px; border-radius:16px; border:1px solid rgba(0,240,255,0.25); box-shadow:0 0 25px rgba(0,0,0,0.5);"></div>
      <div id="nb-tray" style="display:flex; justify-content:space-around; align-items:center; width:100%; height:110px; background:rgba(20,25,45,0.6); border-radius:16px; padding:8px; border:1px solid rgba(255,255,255,0.06);"></div>
      <div id="nb-gameover" style="display:none; position:absolute; inset:0; background:rgba(7,9,19,0.9); flex-direction:column; align-items:center; justify-content:center; gap:14px; z-index:20;">
        <h2 style="font-size:24px; color:#ff007f;">Нет ходов!</h2>
        <p style="color:#8b95b5; font-size:14px;">Итоговый счёт: <b id="nb-final" style="color:#fff;">0</b></p>
        <button id="nb-retry" style="background:linear-gradient(135deg,#00f0ff,#3b82f6); border:none; color:#000; font-weight:800; padding:12px 24px; border-radius:14px; font-size:15px; cursor:pointer;">Играть снова</button>
      </div>
    </div>
  `;

  const boardEl = container.querySelector('#nb-board');
  const trayEl = container.querySelector('#nb-tray');
  const overEl = container.querySelector('#nb-gameover');
  const cells = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    cells[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'border-radius:6px; background:#19203b; transition:background 0.12s, transform 0.12s;';
      boardEl.appendChild(cell);
      cells[r][c] = cell;
    }
  }

  function renderBoard(preview = null) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        const cell = cells[r][c];
        cell.style.background = val || '#19203b';
        cell.style.boxShadow = val ? `inset 0 0 8px rgba(255,255,255,0.4), 0 0 8px ${val}66` : 'none';
        cell.style.opacity = '1';
      }
    }
    if (preview) {
      const { shape, r0, c0, color, valid } = preview;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nr = r0 + r, nc = c0 + c;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            cells[nr][nc].style.background = valid ? color : '#ff3333';
            cells[nr][nc].style.opacity = '0.55';
          }
        }
      }
    }
  }
  function canPlace(shape, r0, c0) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nr = r0 + r, nc = c0 + c;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || grid[nr][nc]) return false;
      }
    }
    return true;
  }

  function checkAnyMove() {
    for (const item of tray) {
      if (!item) continue;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlace(item.shape, r, c)) return true;
        }
      }
    }
    return false;
  }

  function spawnTray() {
    tray = Array.from({ length: 3 }, () => ({
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));
    renderTray();
    if (!checkAnyMove()) showGameOver();
  }

  function renderTray() {
    trayEl.innerHTML = '';
    tray.forEach((item, idx) => {
      const slot = document.createElement('div');
      slot.style.cssText = 'width:90px; height:90px; display:flex; align-items:center; justify-content:center; cursor:grab;';
      if (item) {
        const rows = item.shape.length;
        const cols = item.shape[0].length;
        const mini = document.createElement('div');
        mini.style.cssText = `display:grid; grid-template-columns:repeat(${cols}, 18px); gap:2px; pointer-events:none;`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const b = document.createElement('div');
            b.style.cssText = item.shape[r][c]
              ? `width:18px; height:18px; border-radius:4px; background:${item.color}; box-shadow:0 0 6px ${item.color}88;`
              : 'width:18px; height:18px;';
            mini.appendChild(b);
          }
        }
        slot.appendChild(mini);

        slot.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const ghost = mini.cloneNode(true);
          ghost.style.cssText = `position:fixed; display:grid; grid-template-columns:repeat(${cols}, 32px); gap:4px; pointer-events:none; z-index:999; transform:translate(-50%, -120%);`;
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

  function getTargetCoords(clientX, clientY, shape) {
    const rect = boardEl.getBoundingClientRect();
    const cellW = rect.width / GRID_SIZE;
    const x = clientX - rect.left;
    const y = clientY - rect.top - cellW * 1.6;
    const c0 = Math.round(x / cellW - shape[0].length / 2);
    const r0 = Math.round(y / cellW - shape.length / 2);
    return { r0, c0 };
  }

  function moveGhost(x, y) {
    if (!dragging) return;
    dragging.ghost.style.left = `${x}px`;
    dragging.ghost.style.top = `${y - 45}px`;
    const { r0, c0 } = getTargetCoords(x, y, dragging.item.shape);
    const valid = canPlace(dragging.item.shape, r0, c0);
    renderBoard({ shape: dragging.item.shape, r0, c0, color: dragging.item.color, valid });
  }

  function clearLines() {
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every(Boolean)) fullRows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.every(row => row[c])) fullCols.push(c);
    }
    fullRows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) grid[r][c] = null; });
    fullCols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) grid[r][c] = null; });

    const lines = fullRows.length + fullCols.length;
    if (lines > 0) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
      score += lines * 100 * lines;
      if (score >= 600 && !rewardClaimed) {
        rewardClaimed = true;
        api.addGems(30);
      }
    }
  }

  function onPointerMove(e) {
    if (dragging) moveGhost(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    const { idx, item, ghost, slot } = dragging;
    ghost.remove();
    dragging = null;

    const { r0, c0 } = getTargetCoords(e.clientX, e.clientY, item.shape);
    if (canPlace(item.shape, r0, c0)) {
      let blocksCount = 0;
      for (let r = 0; r < item.shape.length; r++) {
        for (let c = 0; c < item.shape[r].length; c++) {
          if (item.shape[r][c]) {
            grid[r0 + r][c0 + c] = item.color;
            blocksCount++;
          }
        }
      }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
      score += blocksCount * 10;
      clearLines();
      api.onScore(score);
      tray[idx] = null;
      renderBoard();
      if (tray.every(x => x === null)) {
        spawnTray();
      } else {
        renderTray();
        if (!checkAnyMove()) showGameOver();
      }
    } else {
      slot.style.opacity = '1';
      renderBoard();
    }
  }

  function showGameOver() {
    container.querySelector('#nb-final').textContent = score;
    overEl.style.display = 'flex';
  }

  function reset() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    score = 0;
    rewardClaimed = false;
    api.onScore(0);
    overEl.style.display = 'none';
    renderBoard();
    spawnTray();
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  container.querySelector('#nb-restart').addEventListener('click', reset);
  container.querySelector('#nb-retry').addEventListener('click', reset);

  reset();

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (dragging?.ghost) dragging.ghost.remove();
  };
}
