export function startGame(container, api) {
  let bestWave = parseInt(localStorage.getItem('solis_best_wave') || '1', 10);

  container.innerHTML = `
    <div style="height:42px; display:flex; align-items:center; justify-content:space-between; padding:0 10px; background:#0b3b36; border-bottom:2px solid #ffd166; font-size:11px;">
      <span style="color:#fefae0;">🌊 Волна <b id="sb-wave" style="color:#ffd166;">1</b> <span style="opacity:0.7;">(Рекорд: <b id="sb-best">${bestWave}</b>)</span></span>
      <span style="color:#ffd166; font-weight:800;">🪙 <span id="sb-gold">140</span></span>
      <span style="color:#ff6b6b; font-weight:800;">❤️ <span id="sb-hp">20</span></span>
      <button id="sb-speed" style="background:#118ab2; border:1px solid #06d6a0; color:#fff; padding:3px 7px; border-radius:6px; font-size:10px; font-weight:800;">1x</button>
    </div>
    <div style="position:relative; width:100%; height:calc(100% - 114px);">
      <canvas id="bastion-canvas" style="display:block; width:100%; height:100%; touch-action:none;"></canvas>
      <div id="sb-tower-menu" style="display:none; position:absolute; bottom:10px; left:12px; right:12px; background:rgba(11,59,54,0.96); border:2px solid #ffd166; border-radius:14px; padding:10px 12px; justify-content:space-between; align-items:center; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
        <div>
          <div id="sb-tm-title" style="font-weight:800; color:#ffd166; font-size:13px;">Башня LVL 1</div>
          <div id="sb-tm-stats" style="font-size:11px; color:#fefae0;">Урон: 15 | Дальность: 95</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button id="sb-tm-upg" style="background:#06d6a0; border:none; color:#073b3a; padding:7px 10px; border-radius:8px; font-weight:800; font-size:11px;">⬆ Апгрейд</button>
          <button id="sb-tm-sell" style="background:#ef476f; border:none; color:#fff; padding:7px 9px; border-radius:8px; font-weight:800; font-size:11px;">💰 Продать</button>
          <button id="sb-tm-close" style="background:rgba(255,255,255,0.15); border:none; color:#fff; padding:7px 8px; border-radius:8px; font-size:11px;">✕</button>
        </div>
      </div>
    </div>
    <div style="height:72px; display:flex; align-items:center; justify-content:space-between; gap:4px; padding:0 6px; background:#072a27; border-top:2px solid #1b6b63;">
      <button class="sb-build" data-type="archer" style="flex:1; background:#14534c; border:2px solid #06d6a0; color:#fff; padding:5px 2px; border-radius:10px; font-size:10px; font-weight:800;">🏹 Стрела<br><span style="color:#ffd166;">50🪙</span></button>
      <button class="sb-build" data-type="frost" style="flex:1; background:#144552; border:1.5px solid rgba(76,201,240,0.4); color:#fff; padding:5px 2px; border-radius:10px; font-size:10px; font-weight:800;">❄️ Лед<br><span style="color:#ffd166;">75🪙</span></button>
      <button class="sb-build" data-type="cannon" style="flex:1; background:#4a2511; border:1.5px solid rgba(247,127,0,0.4); color:#fff; padding:5px 2px; border-radius:10px; font-size:10px; font-weight:800;">💣 Пушка<br><span style="color:#ffd166;">100🪙</span></button>
      <button class="sb-build" data-type="sun" style="flex:1; background:#4a3511; border:1.5px solid rgba(255,209,102,0.4); color:#fff; padding:5px 2px; border-radius:10px; font-size:10px; font-weight:800;">☀️ Солнце<br><span style="color:#ffd166;">140🪙</span></button>
      <button id="sb-meteor" style="background:linear-gradient(135deg, #ef476f, #f77f00); border:none; color:#fff; padding:6px 7px; border-radius:10px; font-size:9.5px; font-weight:800;">☄️ Залп<br>25💎</button>
      <button id="sb-chest" style="background:linear-gradient(135deg, #ffd166, #f77f00); border:none; color:#1a1a1a; padding:6px 7px; border-radius:10px; font-size:9.5px; font-weight:800;">🪙 +150<br>15💎</button>
    </div>
  `;

  const canvas = document.getElementById('bastion-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = container.clientWidth || 350;
  const H = canvas.height = (container.clientHeight || 500) - 114;

  const TOWERS = {
    archer: { name: 'Башня Лучников', cost: 50,  range: 95,  rate: 22, dmg: 16, color: '#06d6a0', roof: '#048a67', splash: 0, slow: 0 },
    frost:  { name: 'Ледяной Обелиск',cost: 75,  range: 88,  rate: 36, dmg: 10, color: '#4cc9f0', roof: '#2176ae', splash: 48, slow: 0.45 },
    cannon: { name: 'Огненная Мортира',cost: 100, range: 108, rate: 54, dmg: 38, color: '#f77f00', roof: '#b54400', splash: 54, slow: 0 },
    sun:    { name: 'Солнечный Призмат',cost: 140, range: 145, rate: 72, dmg: 85, color: '#ffd166', roof: '#d48806', splash: 0, slow: 0 }
  };

  const PATH = [
    { x: W * 0.16, y: -15 },
    { x: W * 0.16, y: H * 0.22 },
    { x: W * 0.84, y: H * 0.22 },
    { x: W * 0.84, y: H * 0.50 },
    { x: W * 0.18, y: H * 0.50 },
    { x: W * 0.18, y: H * 0.78 },
    { x: W * 0.76, y: H * 0.78 },
    { x: W * 0.76, y: H * 0.91 }
  ];

  const PADS = [
    { x: W * 0.36, y: H * 0.11, tower: null },
    { x: W * 0.64, y: H * 0.11, tower: null },
    { x: W * 0.48, y: H * 0.36, tower: null },
    { x: W * 0.68, y: H * 0.36, tower: null },
    { x: W * 0.36, y: H * 0.64, tower: null },
    { x: W * 0.64, y: H * 0.64, tower: null },
    { x: W * 0.40, y: H * 0.89, tower: null },
    { x: W * 0.58, y: H * 0.89, tower: null }
  ];

  const PALMS = [
    { x: W * 0.06, y: H * 0.36, s: 1 },
    { x: W * 0.92, y: H * 0.12, s: 0.9 },
    { x: W * 0.93, y: H * 0.65, s: 1.1 },
    { x: W * 0.07, y: H * 0.88, s: 0.95 },
    { x: W * 0.50, y: H * 0.10, s: 0.8 }
  ];
  let gold = 140, hp = 20, wave = 1, speedMult = 1;
  let selectedBuild = 'archer', selectedPad = null;
  let enemies = [], bullets = [], particles = [], popups = [];
  let waveQueue = [], spawnTimer = 0, waveCooldown = 90, gameOver = false, animId;

  function updateHUD() {
    document.getElementById('sb-wave').textContent = wave;
    document.getElementById('sb-gold').textContent = gold;
    document.getElementById('sb-hp').textContent = Math.max(0, hp);
  }

  function addPopup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1 });
  }

  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const spd = 1.5 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color });
    }
  }

  function prepareWave(w) {
    waveQueue = [];
    const count = 6 + w * 2;
    for (let i = 0; i < count; i++) {
      let kind = 'scout';
      if (w >= 2 && i % 3 === 0) kind = 'golem';
      if (w >= 3 && i % 4 === 1) kind = 'wasp';
      waveQueue.push(kind);
    }
    if (w % 5 === 0) waveQueue.push('boss');
  }

  function createEnemy(kind) {
    const scale = 1 + (wave - 1) * 0.28;
    const stats = {
      scout: { hp: 38 * scale, speed: 1.55, reward: 12, r: 10, color: '#ff9f1c' },
      golem: { hp: 95 * scale, speed: 0.85, reward: 20, r: 14, color: '#9d4edd' },
      wasp:  { hp: 28 * scale, speed: 2.25, reward: 10, r: 8,  color: '#06d6a0' },
      boss:  { hp: 420 * scale, speed: 0.65, reward: 80, r: 20, color: '#ef476f' }
    }[kind];
    const startPt = PATH;
    enemies.push({
      x: startPt.x, y: startPt.y, wp: 1, kind,
      hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
      reward: stats.reward, r: stats.r, color: stats.color, slowTimer: 0
    });
  }

  document.querySelectorAll('.sb-build').forEach(btn => {
    btn.onclick = () => {
      selectedBuild = btn.dataset.type;
      selectedPad = null;
      document.getElementById('sb-tower-menu').style.display = 'none';
      document.querySelectorAll('.sb-build').forEach(b => b.style.borderWidth = '1.5px');
      btn.style.borderWidth = '2.5px';
    };
  });

  document.getElementById('sb-speed').onclick = (e) => {
    speedMult = speedMult === 1 ? 2 : 1;
    e.target.textContent = speedMult + 'x';
  };

  document.getElementById('sb-meteor').onclick = () => {
    if (!gameOver && enemies.length > 0 && api.spendGems(25)) {
      enemies.forEach(en => {
        en.hp -= 180 + wave * 35;
        spawnParticles(en.x, en.y, '#ef476f', 16);
      });
      addPopup(W / 2, H / 2, '☄️ СОЛНЕЧНЫЙ ЗАЛП!', '#ffd166');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  };

  document.getElementById('sb-chest').onclick = () => {
    if (!gameOver && api.spendGems(15)) {
      gold += 150;
      updateHUD();
      addPopup(W / 2, H * 0.4, '+150 🪙', '#ffd166');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    }
  };

  function openTowerMenu(pad) {
    selectedPad = pad;
    const t = pad.tower;
    const base = TOWERS[t.type];
    const upgCost = Math.round(base.cost * t.lvl * 0.85);
    const sellVal = Math.round(t.spent * 0.7);
    const menu = document.getElementById('sb-tower-menu');
    menu.style.display = 'flex';
    document.getElementById('sb-tm-title').textContent = `${base.name} (LVL ${t.lvl})`;
    document.getElementById('sb-tm-stats').textContent = `Урон: ${t.dmg} | Дальность: ${t.range}`;
    const upgBtn = document.getElementById('sb-tm-upg');
    upgBtn.textContent = t.lvl >= 3 ? 'МАКС' : `⬆ ${upgCost}🪙`;
    upgBtn.onclick = () => {
      if (t.lvl < 3 && gold >= upgCost) {
        gold -= upgCost;
        t.spent += upgCost;
        t.lvl++;
        t.dmg = Math.round(t.dmg * 1.45);
        t.range += 14;
        updateHUD();
        spawnParticles(pad.x, pad.y, '#ffd166', 18);
        openTowerMenu(pad);
      }
    };
    document.getElementById('sb-tm-sell').textContent = `💰 +${sellVal}`;
    document.getElementById('sb-tm-sell').onclick = () => {
      gold += sellVal;
      pad.tower = null;
      selectedPad = null;
      menu.style.display = 'none';
      updateHUD();
    };
    document.getElementById('sb-tm-close').onclick = () => {
      selectedPad = null;
      menu.style.display = 'none';
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    for (let pad of PADS) {
      if (Math.hypot(px - pad.x, py - pad.y) < 26) {
        if (pad.tower) {
          openTowerMenu(pad);
        } else {
          const cfg = TOWERS[selectedBuild];
          if (gold >= cfg.cost) {
            gold -= cfg.cost;
            pad.tower = {
              type: selectedBuild, lvl: 1, spent: cfg.cost,
              dmg: cfg.dmg, range: cfg.range, rate: cfg.rate,
              cd: 0, angle: 0, recoil: 0
            };
            updateHUD();
            spawnParticles(pad.x, pad.y, cfg.color, 14);
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
          } else {
            addPopup(pad.x, pad.y - 15, 'Мало золота!', '#ef476f');
          }
        }
        return;
      }
    }
    selectedPad = null;
    document.getElementById('sb-tower-menu').style.display = 'none';
  });
  function updateStep() {
    if (gameOver) return;

    if (waveQueue.length > 0) {
      spawnTimer--;
      if (spawnTimer <= 0) {
        createEnemy(waveQueue.shift());
        spawnTimer = Math.max(20, 48 - wave * 2);
      }
    } else if (enemies.length === 0) {
      waveCooldown--;
      if (waveCooldown <= 0) {
        wave++;
        waveCooldown = 110;
        gold += 25 + wave * 5;
        api.onScore((wave - 1) * 100);
        if (wave > bestWave) {
          bestWave = wave;
          localStorage.setItem('solis_best_wave', String(bestWave));
          const bEl = document.getElementById('sb-best');
          if (bEl) bEl.textContent = bestWave;
        }
        if (wave % 3 === 0) api.addGems(10);
        updateHUD();
        addPopup(W / 2, H * 0.35, `ВОЛНА ${wave}!`, '#ffd166');
        prepareWave(wave);
      }
    }

    // Движение врагов по тропе к Солнечному Кристаллу
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      if (en.slowTimer > 0) en.slowTimer--;
      const target = PATH[en.wp];
      const dx = target.x - en.x;
      const dy = target.y - en.y;
      const dist = Math.hypot(dx, dy);
      const curSpd = en.speed * (en.slowTimer > 0 ? 0.52 : 1);

      if (dist <= curSpd) {
        en.wp++;
        if (en.wp >= PATH.length) {
          hp -= en.kind === 'boss' ? 5 : 1;
          updateHUD();
          spawnParticles(en.x, en.y, '#ef476f', 18);
          enemies.splice(i, 1);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
          if (hp <= 0) {
            gameOver = true;
            document.getElementById('sb-tower-menu').style.display = 'none';
          }
          continue;
        }
      } else {
        en.x += (dx / dist) * curSpd;
        en.y += (dy / dist) * curSpd;
      }

      if (en.hp <= 0) {
        gold += en.reward;
        updateHUD();
        addPopup(en.x, en.y - 10, `+${en.reward}🪙`, '#ffd166');
        spawnParticles(en.x, en.y, en.color, en.kind === 'boss' ? 30 : 12);
        if (en.kind === 'boss') {
          api.addGems(20);
          addPopup(en.x, en.y - 26, '+20 💎 БОСС!', '#06d6a0');
        }
        enemies.splice(i, 1);
      }
    }

    // Работа и стрельба башен
    for (let pad of PADS) {
      const t = pad.tower;
      if (!t) continue;
      if (t.cd > 0) t.cd--;
      if (t.recoil > 0) t.recoil *= 0.8;

      let target = null;
      let maxProgress = -1;
      for (let en of enemies) {
        const d = Math.hypot(en.x - pad.x, en.y - pad.y);
        if (d <= t.range && en.wp > maxProgress) {
          maxProgress = en.wp;
          target = en;
        }
      }

      if (target) {
        t.angle = Math.atan2(target.y - pad.y, target.x - pad.x);
        if (t.cd <= 0) {
          const cfg = TOWERS[t.type];
          t.cd = t.rate;
          t.recoil = 4;
          bullets.push({
            x: pad.x + Math.cos(t.angle) * 12,
            y: pad.y + Math.sin(t.angle) * 12,
            target, dmg: t.dmg, speed: 6.5,
            color: cfg.color, splash: cfg.splash, slow: cfg.slow
          });
        }
      }
    }

    // Полет снарядов и попадания
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!enemies.includes(b.target)) {
        bullets.splice(i, 1);
        continue;
      }
      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= b.speed) {
        if (b.splash > 0) {
          spawnParticles(b.target.x, b.target.y, b.color, 14);
          enemies.forEach(en => {
            if (Math.hypot(en.x - b.target.x, en.y - b.target.y) <= b.splash) {
              en.hp -= b.dmg;
              if (b.slow > 0) en.slowTimer = 95;
            }
          });
        } else {
          b.target.hp -= b.dmg;
          spawnParticles(b.target.x, b.target.y, b.color, 6);
        }
        bullets.splice(i, 1);
      } else {
        b.x += (dx / dist) * b.speed;
        b.y += (dy / dist) * b.speed;
      }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.035; });
    particles = particles.filter(p => p.life > 0);
    popups.forEach(p => { p.y -= 0.7; p.life -= 0.022; });
    popups = popups.filter(p => p.life > 0);
  }
  function drawIsland() {
    const seaGrad = ctx.createLinearGradient(0, 0, W, H);
    seaGrad.addColorStop(0, '#0077b6');
    seaGrad.addColorStop(0.5, '#0096c7');
    seaGrad.addColorStop(1, '#00b4d8');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, W, H);

    const t = Date.now() * 0.002;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    for (let wy = 25; wy < H; wy += 55) {
      ctx.beginPath();
      ctx.moveTo(8, wy + Math.sin(t + wy) * 3);
      ctx.lineTo(W - 8, wy - Math.sin(t + wy) * 3);
      ctx.stroke();
    }

    ctx.fillStyle = '#f4d58d';
    ctx.beginPath();
    ctx.roundRect(12, 10, W - 24, H - 18, 28);
    ctx.fill();

    const grassGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, 20, W * 0.5, H * 0.5, H * 0.65);
    grassGrad.addColorStop(0, '#52b788');
    grassGrad.addColorStop(1, '#2d6a4f');
    ctx.fillStyle = grassGrad;
    ctx.beginPath();
    ctx.roundRect(22, 20, W - 44, H - 38, 22);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7f5539';
    ctx.lineWidth = 30;
    ctx.beginPath();
    PATH.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    ctx.strokeStyle = '#ddb892';
    ctx.lineWidth = 22;
    ctx.stroke();

    const base = PATH[PATH.length - 1];
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffd166';
    ctx.fillStyle = '#073b3a';
    ctx.beginPath(); ctx.arc(base.x, base.y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y - 12);
    ctx.lineTo(base.x + 10, base.y);
    ctx.lineTo(base.x, base.y + 12);
    ctx.lineTo(base.x - 10, base.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPalms() {
    for (let p of PALMS) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(4, 12, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7f4f24';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(3, 0, 0, -10); ctx.stroke();
      ctx.fillStyle = '#1b4332';
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(0, -10);
        ctx.rotate((Math.PI * 2 * i) / 5 + 0.3);
        ctx.beginPath(); ctx.ellipse(9, 0, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function draw() {
    drawIsland();

    for (let pad of PADS) {
      if (selectedPad === pad && pad.tower) {
        ctx.fillStyle = 'rgba(255, 209, 102, 0.14)';
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pad.x, pad.y, pad.tower.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }

      ctx.fillStyle = '#343a40';
      ctx.beginPath(); ctx.arc(pad.x, pad.y + 3, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6c757d';
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pad.x, pad.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      const t = pad.tower;
      if (t) {
        const cfg = TOWERS[t.type];
        ctx.fillStyle = cfg.roof;
        ctx.beginPath(); ctx.arc(pad.x, pad.y - 2, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cfg.color;
        ctx.beginPath(); ctx.arc(pad.x, pad.y - 4, 10, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(pad.x, pad.y - 4);
        ctx.rotate(t.angle);
        ctx.fillStyle = '#fff';
        ctx.fillRect(2 - t.recoil, -3, 13, 6);
        ctx.restore();

        ctx.fillStyle = '#ffd166';
        for (let s = 0; s < t.lvl; s++) {
          ctx.beginPath();
          ctx.arc(pad.x - (t.lvl - 1) * 4 + s * 8, pad.y + 11, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', pad.x, pad.y + 1);
      }
    }

    for (let en of enemies) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(en.x, en.y + en.r * 0.7, en.r, en.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = en.slowTimer > 0 ? '#4cc9f0' : en.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = en.kind === 'boss' ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      if (en.kind === 'boss') {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', en.x, en.y - en.r - 8);
      }

      const barW = en.r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(en.x - barW / 2, en.y - en.r - 7, barW, 4);
      ctx.fillStyle = '#06d6a0';
      ctx.fillRect(en.x - barW / 2, en.y - en.r - 7, barW * Math.max(0, en.hp / en.maxHp), 4);
    }

    for (let b of bullets) {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let pop of popups) {
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    drawPalms();

    if (gameOver) {
      ctx.fillStyle = 'rgba(7, 42, 39, 0.9)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Кристалл разрушен!', W / 2, H / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`Пройдено волн: ${wave} | Рекорд: ${bestWave}`, W / 2, H / 2 + 10);
      ctx.fillStyle = '#06d6a0';
      ctx.font = '13px sans-serif';
      ctx.fillText('Закрой и открой игру для новой битвы', W / 2, H / 2 + 38);
    }
  }

  function loop() {
    for (let s = 0; s < speedMult; s++) updateStep();
    draw();
    animId = requestAnimationFrame(loop);
  }

  prepareWave(1);
  updateHUD();
  loop();
  return () => cancelAnimationFrame(animId);
}
