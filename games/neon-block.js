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
  const SHAPES = [
    [[1]],
    [[1,1]],
    [[1],[1]],
    [[1,1,1]],
    [[1],[1],[1]],
    [[1,1],[1,1]],
    [[1,1,1],[0,1,0]],
    [[1,0],[1,0],[1,1]],
    [[0,1],[0,1],[1,1]],
    [[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0]]
  ];
