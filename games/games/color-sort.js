export function startGame(container, api) {
  let level = parseInt(localStorage.getItem('neon_flasks_lvl') || '1', 10);
  let score = 0;
  let flasks = [];
  let selected = null;
  let history = [];
  let extraUsed = false;

  const COLORS = ['#00f0ff', '#ff007f', '#00ff88', '#ffe600', '#a855f7', '#ff7700'];

  function initLevel() {
    selected = null;
    history = [];
    extraUsed = false;
    const colorCount = Math.min(3 + Math.floor((level - 1) / 2), 6);
    const pool = [];
    for (let c = 0; c < colorCount; c++) {
      for (let i = 0; i < 4; i++) pool.push(COLORS[c]);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    flasks = [];
    for (let c = 0; c < colorCount; c++) {
      flasks.push(pool.slice(c * 4, (c + 1) * 4));
    }
    flasks.push([], []);
    render();
  }
  function canPour(fromIdx, toIdx) {
    if (fromIdx === toIdx) return false;
    const from = flasks[fromIdx];
    const to = flasks[toIdx];
    if (from.length === 0 || to.length >= 4) return false;
    if (to.length === 0) return true;
    return from[from.length - 1] === to[to.length - 1];
  }

  function handleFlaskClick(idx) {
    if (selected === null) {
      if (flasks[idx].length > 0) {
        selected = idx;
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        render();
      }
      return;
    }

    if (selected === idx) {
      selected = null;
      render();
      return;
    }

    if (canPour(selected, idx)) {
      history.push(JSON.stringify(flasks));
      const color = flasks[selected][flasks[selected].length - 1];
      while (flasks[selected].length > 0 && flasks[selected][flasks[selected].length - 1] === color && flasks[idx].length < 4) {
        flasks[idx].push(flasks[selected].pop());
      }
      selected = null;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      render();
      checkWin();
    } else {
      selected = flasks[idx].length > 0 ? idx : null;
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      render();
    }
  }

  function checkWin() {
    const won = flasks.every(f => f.length === 0 || (f.length === 4 && f.every(c => c === f[0])));
    if (won) {
      score += 25;
      api.onScore(score);
      api.addGems(15);
      level++;
      localStorage.setItem('neon_flasks_lvl', String(level));
      setTimeout(() => initLevel(), 650);
    }
  }
  function render() {
    container.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; background:radial-gradient(circle at top, #131933 0%, #080a12 80%);">
        <div style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-weight:800; color:#00f0ff; font-size:14px;">УРОВЕНЬ ${level}</span>
          <span style="font-size:12px; color:#8b95b5;">Награда: <b style="color:#00ff88;">+15 💎</b></span>
        </div>

        <div id="flasks-grid" style="flex:1; display:flex; flex-wrap:wrap; align-content:center; justify-content:center; gap:18px 14px; padding:16px;">
          ${flasks.map((f, idx) => `
            <div class="neon-flask" data-idx="${idx}" style="
              width:46px; height:148px;
              border:2px solid ${selected === idx ? '#00f0ff' : 'rgba(255,255,255,0.28)'};
              border-top:none;
              border-radius:0 0 22px 22px;
              padding:4px;
              display:flex; flex-direction:column-reverse; gap:3px;
              background:rgba(255,255,255,0.03);
              box-shadow:${selected === idx ? '0 0 18px rgba(0,240,255,0.5)' : 'inset 0 -8px 16px rgba(0,0,0,0.4)'};
              transform:${selected === idx ? 'translateY(-14px)' : 'none'};
              transition:transform 0.18s ease, box-shadow 0.18s ease;
              cursor:pointer;
            ">
              ${f.map(color => `
                <div style="
                  height:23%; width:100%;
                  background:${color};
                  box-shadow:0 0 10px ${color}88;
                  border-radius:4px;
                "></div>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 12px; background:#141829; border-top:1px solid rgba(255,255,255,0.08);">
          <button id="flask-undo" style="background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
            ↩ Отмена (10 💎)
          </button>
          <button id="flask-add" style="background:rgba(255,0,127,0.18); border:1px solid #ff007f; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
            🧪 +Колба (30 💎)
          </button>
          <button id="flask-reset" style="background:rgba(255,255,255,0.08); border:none; color:#8b95b5; padding:8px 10px; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer;">
            ↻
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll('.neon-flask').forEach(el => {
      el.onclick = () => handleFlaskClick(parseInt(el.dataset.idx, 10));
    });

    document.getElementById('flask-undo').onclick = () => {
      if (history.length > 0 && api.spendGems(10)) {
        flasks = JSON.parse(history.pop());
        selected = null;
        render();
      }
    };

    document.getElementById('flask-add').onclick = () => {
      if (!extraUsed && api.spendGems(30)) {
        flasks.push([]);
        extraUsed = true;
        render();
      }
    };

    document.getElementById('flask-reset').onclick = () => initLevel();
  }

  initLevel();
  return () => {};
}
