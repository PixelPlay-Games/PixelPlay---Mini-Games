export function startGame(container, api) {
  const SIZE = 7;
  const TYPES = [
    { color: '#00f0ff', symbol: '💎' },
    { color: '#ff007f', symbol: '🔮' },
    { color: '#a855f7', symbol: '⚡' },
    { color: '#10b981', symbol: '🍀' },
    { color: '#f59e0b', symbol: '🔥' }
  ];

  let board = [];
  let score = 0;
  let moves = 25;
  let selected = null;
  let busy = false;
  let rewardGiven = false;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; padding:14px; justify-content:space-between; align-items:center;">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center; background:#13182b; padding:10px 14px; border-radius:14px; border:1px solid rgba(255,255,255,0.07);">
        <span style="font-size:13px; color:#8b95b5;">Ходов осталось: <b id="cg-moves" style="color:#ff007f; font-size:16px;">25</b></span>
        <button id="cg-reset" style="background:#1c233d; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px 10px; border-radius:8px; font-weight:700; cursor:pointer;">Заново</button>
      </div>
      <div id="cg-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; width:min(90vw, 355px); aspect-ratio:1; background:#11162b; padding:8px; border-radius:18px; border:1px solid rgba(255,0,127,0.3); box-shadow:0 0 28px rgba(255,0,127,0.15);"></div>
      <p style="font-size:12px; color:#8b95b5; text-align:center;">Меняй соседние кристаллы местами, чтобы собрать 3+ в ряд</p>
      <div id="cg-over" style="display:none; position:absolute; inset:0; background:rgba(7,9,19,0.92); flex-direction:column; align-items:center; justify-content:center; gap:14px; z-index:20;">
        <h2 style="font-size:24px; color:#00f0ff;">Ходы закончились!</h2>
        <p style="color:#8b95b5; font-size:15px;">Твой рекорд: <b id="cg-final" style="color:#fff;">0</b></p>
        <button id="cg-again" style="background:linear-gradient(135deg,#ff007f,#a855f7); border:none; color:#fff; font-weight:800; padding:12px 24px; border-radius:14px; font-size:15px; cursor:pointer;">Сыграть ещё</button>
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#cg-grid');
  const movesEl = container.querySelector('#cg-moves');
  const overEl = container.querySelector('#cg-over');

  function randType() {
    return Math.floor(Math.random() * TYPES.length);
  }

  function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let t;
        do {
          t = randType();
        } while (
          (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) ||
          (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t)
        );
        board[r][c] = t;
      }
    }
  }

  function render() {
    gridEl.innerHTML = '';
    movesEl.textContent = moves;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = TYPES[board[r][c]];
        const cell = document.createElement('div');
        const isSel = selected && selected.r === r && selected.c === c;
        cell.style.cssText = `
          border-radius:10px;
          background:${isSel ? 'rgba(255,255,255,0.2)' : '#19213c'};
          border:1.5px solid ${isSel ? '#00f0ff' : t.color + '44'};
          display:flex; align-items:center; justify-content:center;
          font-size:22px; cursor:pointer;
          transform:${isSel ? 'scale(1.08)' : 'scale(1)'};
          transition:transform 0.12s, background 0.12s;
        `;
        cell.textContent = t.symbol;
        cell.addEventListener('click', () => handleTap(r, c));
        gridEl.appendChild(cell);
      }
    }
  }
  function findMatches() {
    const matched = new Set();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 2; c++) {
        const v = board[r][c];
        if (v !== null && v === board[r][c + 1] && v === board[r][c + 2]) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c + 1}`);
          matched.add(`${r},${c + 2}`);
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 2; r++) {
        const v = board[r][c];
        if (v !== null && v === board[r + 1][c] && v === board[r + 2][c]) {
          matched.add(`${r},${c}`);
          matched.add(`${r + 1},${c}`);
          matched.add(`${r + 2},${c}`);
        }
      }
    }
    return matched;
  }

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  async function resolveMatches() {
    let combo = 1;
    while (true) {
      const matches = findMatches();
      if (matches.size === 0) break;

      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
      score += matches.size * 20 * combo;
      api.onScore(score);

      if (score >= 800 && !rewardGiven) {
        rewardGiven = true;
        api.addGems(35);
      }

      matches.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = null;
      });
      render();
      await sleep(180);

      for (let c = 0; c < SIZE; c++) {
        let empty = SIZE - 1;
        for (let r = SIZE - 1; r >= 0; r--) {
          if (board[r][c] !== null) {
            board[empty][c] = board[r][c];
            if (empty !== r) board[r][c] = null;
            empty--;
          }
        }
        for (let r = empty; r >= 0; r--) {
          board[r][c] = randType();
        }
      }
      render();
      await sleep(180);
      combo++;
    }
  }

  async function handleTap(r, c) {
    if (busy || moves <= 0) return;
    if (!selected) {
      selected = { r, c };
      render();
      return;
    }
    const dr = Math.abs(selected.r - r);
    const dc = Math.abs(selected.c - c);
    if (dr + dc !== 1) {
      selected = { r, c };
      render();
      return;
    }

    busy = true;
    const r1 = selected.r, c1 = selected.c;
    selected = null;

    [board[r1][c1], board[r][c]] = [board[r][c], board[r1][c1]];
    render();
    await sleep(150);

    if (findMatches().size > 0) {
      moves--;
      await resolveMatches();
      if (moves <= 0) {
        container.querySelector('#cg-final').textContent = score;
        overEl.style.display = 'flex';
      }
    } else {
      [board[r1][c1], board[r][c]] = [board[r][c], board[r1][c1]];
      render();
    }
    busy = false;
  }

  function reset() {
    score = 0;
    moves = 25;
    selected = null;
    busy = false;
    rewardGiven = false;
    api.onScore(0);
    overEl.style.display = 'none';
    initBoard();
    render();
  }

  container.querySelector('#cg-reset').addEventListener('click', reset);
  container.querySelector('#cg-again').addEventListener('click', reset);

  reset();
  return () => { busy = true; };
}
