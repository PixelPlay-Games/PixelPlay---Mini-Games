export function startGame(container, api) {
  let bestScore = parseInt(localStorage.getItem('solar_2048_best') || '0', 10);
  let maxTileEver = parseInt(localStorage.getItem('solar_2048_max_tile') || '2', 10);
  let grid = [];
  let prevGrid = null;
  let score = 0;
  let prevScore = 0;
  let gameOver = false;
  let mergedCells = new Set();
  let newCell = null;
  let milestonesHit = new Set();

  // Уникальная теплая палитра (Янтарь -> Коралл -> Рубин -> Изумруд -> Золото)
  const TILE_STYLES = {
    2:    { bg: 'linear-gradient(135deg, #3d2b1f, #261a12)', border: '#d4a373', text: '#faedcd', glow: 'rgba(212,163,115,0.25)' },
    4:    { bg: 'linear-gradient(135deg, #5c3317, #3b1e0b)', border: '#ff9f1c', text: '#ffbf69', glow: 'rgba(255,159,28,0.35)' },
    8:    { bg: 'linear-gradient(135deg, #6b2416, #421209)', border: '#ff5400', text: '#ffd166', glow: 'rgba(255,84,0,0.4)' },
    16:   { bg: 'linear-gradient(135deg, #691428, #3d0814)', border: '#ff0054', text: '#ffffff', glow: 'rgba(255,0,84,0.45)' },
    32:   { bg: 'linear-gradient(135deg, #59114d, #33062b)', border: '#f72585', text: '#ffffff', glow: 'rgba(247,37,133,0.5)' },
    64:   { bg: 'linear-gradient(135deg, #104547, #08292b)', border: '#00f5d4', text: '#ffffff', glow: 'rgba(0,245,212,0.55)' },
    128:  { bg: 'linear-gradient(135deg, #134e2a, #092e17)', border: '#38b000', text: '#ccff33', glow: 'rgba(56,176,0,0.6)' },
    256:  { bg: 'linear-gradient(135deg, #004e89, #00294d)', border: '#00bbf9', text: '#ffffff', glow: 'rgba(0,187,249,0.7)' },
    512:  { bg: 'linear-gradient(135deg, #3c096c, #240046)', border: '#c77dff', text: '#ffffff', glow: 'rgba(199,125,255,0.75)' },
    1024: { bg: 'linear-gradient(135deg, #800f2f, #590d22)', border: '#ff758f', text: '#fff0f3', glow: 'rgba(255,117,143,0.85)' },
    2048: { bg: 'linear-gradient(135deg, #ffb703, #fb8500)', border: '#ffffff', text: '#1a0f00', glow: 'rgba(255,183,3,1)' }
  };

  function initGame() {
    grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    prevGrid = null;
    score = 0;
    gameOver = false;
    mergedCells.clear();
    milestonesHit.clear();
    addRandomTile();
    addRandomTile();
    api.onScore(0);
    render();
  }

  function addRandomTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length > 0) {
      const pick = empty[Math.floor(Math.random() * empty.length)];
      grid[pick.r][pick.c] = Math.random() < 0.88 ? 2 : 4;
      newCell = `${pick.r}-${pick.c}`;
    }
  }
  function slideRow(row, rowIdx, isVertical, reverse) {
    let arr = row.filter(v => v !== 0);
    if (reverse) arr.reverse();
    let gained = 0;
    const mergedIndices = [];

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        mergedIndices.push(i);
        if (arr[i] > maxTileEver) {
          maxTileEver = arr[i];
          localStorage.setItem('solar_2048_max_tile', String(maxTileEver));
        }
        if (arr[i] >= 256 && !milestonesHit.has(arr[i])) {
          milestonesHit.add(arr[i]);
          api.addGems(arr[i] === 2048 ? 50 : 10);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        }
        arr.splice(i + 1, 1);
      }
    }

    while (arr.length < 4) arr.push(0);
    if (reverse) arr.reverse();

    mergedIndices.forEach(idx => {
      const realIdx = reverse ? 3 - idx : idx;
      const key = isVertical ? `${realIdx}-${rowIdx}` : `${rowIdx}-${realIdx}`;
      mergedCells.add(key);
    });

    return { row: arr, gained };
  }

  function move(dir) {
    if (gameOver) return;
    const snapshot = JSON.stringify(grid);
    const scoreSnap = score;
    mergedCells.clear();
    newCell = null;
    let moved = false;

    for (let i = 0; i < 4; i++) {
      let line = [];
      for (let j = 0; j < 4; j++) {
        line.push(dir === 'UP' || dir === 'DOWN' ? grid[j][i] : grid[i][j]);
      }
      const isVert = dir === 'UP' || dir === 'DOWN';
      const isRev = dir === 'RIGHT' || dir === 'DOWN';
      const res = slideRow(line, i, isVert, isRev);
      score += res.gained;

      for (let j = 0; j < 4; j++) {
        const oldVal = isVert ? grid[j][i] : grid[i][j];
        if (oldVal !== res.row[j]) moved = true;
        if (isVert) grid[j][i] = res.row[j];
        else grid[i][j] = res.row[j];
      }
    }

    if (moved) {
      prevGrid = snapshot;
      prevScore = scoreSnap;
      addRandomTile();
      api.onScore(score);
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('solar_2048_best', String(bestScore));
      }
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      checkGameOver();
      render();
    }
  }

  function checkGameOver() {
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
  let touchStartX = 0, touchStartY = 0;

  function render() {
    container.innerHTML = `
      <style>
        @keyframes tilePop { 0% { transform: scale(0.3); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes tileMerge { 0% { transform: scale(1); } 50% { transform: scale(1.16); filter: brightness(1.4); } 100% { transform: scale(1); } }
        .t-new { animation: tilePop 0.22s ease-out; }
        .t-merge { animation: tileMerge 0.25s ease-out; }
      </style>
      <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; background:radial-gradient(circle at 50% 15%, #2b141d 0%, #12090d 80%); position:relative; overflow:hidden; touch-action:none;">
        
        <div style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; background:rgba(30,12,18,0.85); border-bottom:1px solid rgba(255,159,28,0.2); font-size:12px;">
          <span style="color:#d4a373;">🏆 Рекорд: <b style="color:#ffb703;">${bestScore}</b></span>
          <span style="color:#d4a373;">👑 Макс. плитка: <b style="color:#ff5400;">${maxTileEver}</b></span>
        </div>

        <div id="grid-2048-wrap" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; position:relative;">
          <div id="board-2048" style="
            width:min(86vw, 320px); height:min(86vw, 320px);
            background:rgba(20, 8, 13, 0.9);
            border:2px solid rgba(255, 159, 28, 0.35);
            box-shadow:0 0 30px rgba(255, 84, 0, 0.2), inset 0 0 20px rgba(0,0,0,0.8);
            border-radius:18px;
            padding:10px;
            display:grid; grid-template-columns:repeat(4, 1fr); grid-template-rows:repeat(4, 1fr); gap:8px;
          ">
            ${grid.map((row, r) => row.map((val, c) => {
              if (val === 0) {
                return `<div style="background:rgba(255, 255, 255, 0.03); border-radius:12px; border:1px solid rgba(255, 159, 28, 0.08);"></div>`;
              }
              const st = TILE_STYLES[val] || TILE_STYLES[2048];
              const key = `${r}-${c}`;
              const animClass = mergedCells.has(key) ? 't-merge' : (newCell === key ? 't-new' : '');
              const fontSize = val >= 1024 ? '18px' : (val >= 128 ? '22px' : '26px');
              return `
                <div class="${animClass}" style="
                  background:${st.bg};
                  border:1.5px solid ${st.border};
                  box-shadow:0 0 14px ${st.glow}, inset 0 1px 2px rgba(255,255,255,0.35);
                  border-radius:12px;
                  display:flex; align-items:center; justify-content:center;
                  font-weight:900; font-size:${fontSize}; color:${st.text};
                  text-shadow:0 2px 4px rgba(0,0,0,0.6);
                ">${val}</div>
              `;
            }).join('')).join('')}
          </div>

          <div style="margin-top:10px; font-size:11px; color:rgba(250,237,205,0.45);">Свайпай по полю в любую сторону</div>

          ${gameOver ? `
            <div style="position:absolute; inset:0; background:rgba(18,9,13,0.88); z-index:15; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
              <div style="font-size:24px; font-weight:900; color:#ff5400; margin-bottom:6px;">ХОДОВ БОЛЬШЕ НЕТ!</div>
              <div style="font-size:15px; color:#ffb703; font-weight:700; margin-bottom:14px;">Счет: ${score} | Рекорд: ${bestScore}</div>
              <button id="retry-2048-overlay" style="background:linear-gradient(135deg, #ff9f1c, #ff5400); border:none; color:#fff; padding:10px 22px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer;">Играть снова</button>
            </div>
          ` : ''}
        </div>

        <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:6px; padding:0 10px; background:#1c0c12; border-top:1px solid rgba(255,159,28,0.15);">
          <button id="undo-2048" style="background:rgba(255,159,28,0.15); border:1px solid #ff9f1c; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">
            ↩ Шаг (10 💎)
          </button>
          <button id="clear-low-2048" style="background:rgba(255,0,84,0.18); border:1px solid #ff0054; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">
            🔨 Убрать 2/4 (25 💎)
          </button>
          <button id="double-max-2048" style="background:rgba(56,176,0,0.2); border:1px solid #38b000; color:#fff; padding:7px 8px; border-radius:10px; font-size:10.5px; font-weight:700; cursor:pointer;">
            ⚡ x2 Макс (40 💎)
          </button>
          <button id="reset-2048" style="background:rgba(255,255,255,0.08); border:none; color:#d4a373; padding:7px 9px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">
            ↻
          </button>
        </div>
      </div>
    `;

    const wrap = document.getElementById('grid-2048-wrap');
    wrap.addEventListener('touchstart', (e) => {
      touchStartX = e.touches.clientX;
      touchStartY = e.touches.clientY;
    }, { passive: true });

    wrap.addEventListener('touchend', (e) => {
      const dx = e.changedTouches.clientX - touchStartX;
      const dy = e.changedTouches.clientY - touchStartY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'RIGHT' : 'LEFT');
      else move(dy > 0 ? 'DOWN' : 'UP');
    }, { passive: true });

    document.getElementById('undo-2048').onclick = () => {
      if (prevGrid && !gameOver && api.spendGems(10)) {
        grid = JSON.parse(prevGrid);
        score = prevScore;
        prevGrid = null;
        api.onScore(score);
        render();
      }
    };

    document.getElementById('clear-low-2048').onclick = () => {
      if (!gameOver && api.spendGems(25)) {
        let removed = false;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (grid[r][c] === 2 || grid[r][c] === 4) {
              grid[r][c] = 0;
              removed = true;
            }
          }
        }
        if (!removed) addRandomTile();
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
        render();
      }
    };

    document.getElementById('double-max-2048').onclick = () => {
      if (!gameOver && api.spendGems(40)) {
        let maxV = 0, mr = 0, mc = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (grid[r][c] > maxV) { maxV = grid[r][c]; mr = r; mc = c; }
          }
        }
        if (maxV > 0) {
          grid[mr][mc] *= 2;
          mergedCells.clear();
          mergedCells.add(`${mr}-${mc}`);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          render();
        }
      }
    };

    document.getElementById('reset-2048').onclick = () => initGame();
    const overlayBtn = document.getElementById('retry-2048-overlay');
    if (overlayBtn) overlayBtn.onclick = () => initGame();
  }

  initGame();
  return () => {};
}
