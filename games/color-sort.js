export function startGame(container, api) {
  let level = parseInt(localStorage.getItem('neon_flasks_lvl') || '1', 10);
  let score = 0;
  let flasks = [];
  let selected = null;
  let history = [];
  let extraUsed = false;
  let isWinning = false;

  const GRADIENTS = [
    { top: '#5efce8', bottom: '#00a8ff', glow: '#00f0ff' },
    { top: '#ff7eb3', bottom: '#ff0055', glow: '#ff007f' },
    { top: '#81fbb8', bottom: '#00b85c', glow: '#00ff88' },
    { top: '#fff066', bottom: '#ff9900', glow: '#ffe600' },
    { top: '#d896ff', bottom: '#7b1fa2', glow: '#a855f7' },
    { top: '#ffb366', bottom: '#e65100', glow: '#ff7700' }
  ];

  function isFlaskComplete(f) {
    return f.length === 4 && f.every(c => c === f);
  }

  function initLevel() {
    selected = null;
    history = [];
    extraUsed = false;
    isWinning = false;
    const colorCount = Math.min(3 + Math.floor((level - 1) / 2), 6);
    const pool = [];
    for (let c = 0; c < colorCount; c++) {
      for (let i = 0; i < 4; i++) pool.push(c);
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
    const from = flasks[fromIdx], to = flasks[toIdx];
    if (from.length === 0 || to.length >= 4 || isFlaskComplete(from)) return false;
    if (to.length === 0) return true;
    return from[from.length - 1] === to[to.length - 1];
  }

  function handleFlaskClick(idx) {
    if (isWinning || isFlaskComplete(flasks[idx])) return;

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
      if (isFlaskComplete(flasks[idx])) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } else {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      }
      selected = null;
      render();
      checkWin();
    } else {
      selected = flasks[idx].length > 0 ? idx : null;
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      render();
    }
  }

  function checkWin() {
    if (flasks.every(f => f.length === 0 || isFlaskComplete(f))) {
      isWinning = true;
      score += 25;
      api.onScore(score);
      api.addGems(15);
      level++;
      localStorage.setItem('neon_flasks_lvl', String(level));
      render();
      setTimeout(() => initLevel(), 1100);
    }
  }
  function render() {
    container.innerHTML = `
      <style>
        @keyframes flaskPop { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
        .flask-done { animation: flaskPop 0.4s ease; }
      </style>
      <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; background:radial-gradient(circle at 50% 25%, #172042 0%, #080a12 85%); position:relative; overflow:hidden;">
        <div style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,240,255,0.12); background:rgba(15,19,36,0.6);">
          <span style="font-weight:800; color:#00f0ff; font-size:14px; letter-spacing:0.5px;">УРОВЕНЬ ${level}</span>
          <span style="font-size:12px; color:#8b95b5;">Победа: <b style="color:#00ff88;">+15 💎</b></span>
        </div>

        ${isWinning ? `
          <div style="position:absolute; inset:0; background:rgba(8,10,18,0.75); z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
            <div style="font-size:46px; margin-bottom:8px;">🎉</div>
            <div style="font-size:20px; font-weight:800; color:#00ff88; text-shadow:0 0 15px rgba(0,255,136,0.6);">УРОВЕНЬ ПРОЙДЕН!</div>
            <div style="font-size:14px; color:#fff; margin-top:4px;">+15 💎 начислено</div>
          </div>
        ` : ''}

        <div id="flasks-grid" style="flex:1; display:flex; flex-wrap:wrap; align-content:center; justify-content:center; gap:24px 16px; padding:18px;">
          ${flasks.map((f, idx) => {
            const done = isFlaskComplete(f);
            const isSel = selected === idx;
            const mainGlow = done ? GRADIENTS[f].glow : (isSel ? '#00f0ff' : 'rgba(255,255,255,0.28)');
            return `
              <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                ${done ? `<div style="position:absolute; top:-22px; color:#00ff88; font-weight:900; font-size:14px; text-shadow:0 0 8px #00ff88;">✓</div>` : ''}
                <div class="neon-flask ${done ? 'flask-done' : ''}" data-idx="${idx}" style="
                  position:relative;
                  width:48px; height:152px;
                  border:2px solid ${mainGlow};
                  border-top:none;
                  border-radius:0 0 24px 24px;
                  padding:5px;
                  display:flex; flex-direction:column-reverse; gap:3px;
                  background:linear-gradient(90deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.25) 100%);
                  box-shadow:${done ? `0 0 22px ${mainGlow}66` : (isSel ? '0 10px 22px rgba(0,240,255,0.45)' : 'inset 0 -10px 18px rgba(0,0,0,0.5)')};
                  transform:${isSel ? 'translateY(-16px) scale(1.04)' : 'none'};
                  transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                  cursor:pointer;
                ">
                  <div style="position:absolute; top:-4px; left:-4px; right:-4px; height:5px; border-radius:4px; background:${mainGlow}; opacity:0.85;"></div>
                  <div style="position:absolute; top:8px; bottom:16px; left:5px; width:3px; border-radius:2px; background:rgba(255,255,255,0.22); pointer-events:none;"></div>
                  ${f.map((colorIdx, layerIdx) => {
                    const g = GRADIENTS[colorIdx];
                    const isBottom = layerIdx === 0;
                    return `
                      <div style="
                        height:23%; width:100%;
                        background:linear-gradient(180deg, ${g.top} 0%, ${g.bottom} 100%);
                        box-shadow:0 0 12px ${g.glow}77, inset 0 2px 3px rgba(255,255,255,0.45);
                        border-radius:${isBottom ? '4px 4px 18px 18px' : '4px'};
                      "></div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="height:56px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 12px; background:#141829; border-top:1px solid rgba(255,255,255,0.08);">
          <button id="flask-undo" style="background:linear-gradient(135deg, rgba(0,240,255,0.22), rgba(0,240,255,0.08)); border:1px solid #00f0ff; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
            ↩ Отмена (10 💎)
          </button>
          <button id="flask-add" style="background:linear-gradient(135deg, rgba(255,0,127,0.25), rgba(255,0,127,0.1)); border:1px solid #ff007f; color:#fff; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
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
