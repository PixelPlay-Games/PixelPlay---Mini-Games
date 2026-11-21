const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#070913');
  tg.setBackgroundColor?.('#070913');
}

const BOT_USERNAME = 'PixelPlay_Mini_Games_bot';

const CYBER_AVATARS = [
  {
    id: 'cyber-cat',
    svg: `<svg viewBox="0 0 80 80"><defs><linearGradient id="a1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00f0ff"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><rect width="80" height="80" fill="#101935"/><polygon points="18,32 24,12 36,26" fill="url(#a1)"/><polygon points="62,32 56,12 44,26" fill="url(#a1)"/><circle cx="40" cy="44" r="22" fill="#1e293b" stroke="#00f0ff" stroke-width="2.5"/><rect x="25" y="37" width="30" height="10" rx="5" fill="#00f0ff"/><circle cx="32" cy="42" r="2.5" fill="#070913"/><circle cx="48" cy="42" r="2.5" fill="#070913"/><path d="M35 54 Q40 58 45 54" stroke="#00f0ff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  },
  {
    id: 'neon-fox',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#241029"/><polygon points="16,38 22,12 38,28" fill="#ff007f"/><polygon points="64,38 58,12 42,28" fill="#ff007f"/><polygon points="40,66 18,38 40,26 62,38" fill="#fb7185"/><polygon points="40,66 25,44 40,48 55,44" fill="#fff1f2"/><circle cx="31" cy="40" r="3" fill="#070913"/><circle cx="49" cy="40" r="3" fill="#070913"/><circle cx="40" cy="54" r="3" fill="#070913"/></svg>`
  },
  {
    id: 'astro-bot',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#18122b"/><rect x="37" y="10" width="6" height="10" rx="3" fill="#a855f7"/><circle cx="40" cy="10" r="4" fill="#00f0ff"/><rect x="20" y="20" width="40" height="38" rx="12" fill="#2e1065" stroke="#a855f7" stroke-width="2.5"/><rect x="26" y="30" width="28" height="14" rx="7" fill="#090d16"/><circle cx="33" cy="37" r="3.5" fill="#00f0ff"/><circle cx="47" cy="37" r="3.5" fill="#00f0ff"/><rect x="32" y="49" width="16" height="3" rx="1.5" fill="#a855f7"/></svg>`
  },
  {
    id: 'cyber-ninja',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#0d2122"/><circle cx="40" cy="42" r="23" fill="#111827" stroke="#10b981" stroke-width="2.5"/><path d="M17 36 H63 V46 H17 Z" fill="#10b981"/><rect x="24" y="37" width="32" height="8" rx="4" fill="#070913"/><circle cx="32" cy="41" r="2.5" fill="#34d399"/><circle cx="48" cy="41" r="2.5" fill="#34d399"/><path d="M58 36 L70 30 L66 40 Z" fill="#10b981"/></svg>`
  },
  {
    id: 'gold-crown',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#231a0d"/><circle cx="40" cy="44" r="21" fill="#1f2937" stroke="#f59e0b" stroke-width="2.5"/><polygon points="22,28 28,15 40,24 52,15 58,28" fill="#f59e0b"/><circle cx="33" cy="43" r="3" fill="#fbbf24"/><circle cx="47" cy="43" r="3" fill="#fbbf24"/><path d="M33 52 Q40 57 47 52" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  },
  {
    id: 'void-skull',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#171726"/><path d="M22 38 A18 18 0 1 1 58 38 V50 H50 V58 H30 V50 H22 Z" fill="#e2e8f0"/><circle cx="33" cy="39" r="4.5" fill="#ff007f"/><circle cx="47" cy="39" r="4.5" fill="#00f0ff"/><rect x="35" y="50" width="3" height="8" fill="#171726"/><rect x="42" y="50" width="3" height="8" fill="#171726"/></svg>`
  },
  {
    id: 'pixel-dragon',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#1f1018"/><polygon points="22,22 14,12 28,16" fill="#f43f5e"/><polygon points="58,22 66,12 52,16" fill="#f43f5e"/><rect x="22" y="20" width="36" height="38" rx="14" fill="#be123c"/><circle cx="32" cy="36" r="4" fill="#fde047"/><circle cx="48" cy="36" r="4" fill="#fde047"/><circle cx="32" cy="36" r="1.5" fill="#000"/><circle cx="48" cy="36" r="1.5" fill="#000"/><path d="M30 49 L35 46 L40 49 L45 46 L50 49" stroke="#fff" stroke-width="2.5" fill="none"/></svg>`
  },
  {
    id: 'crystal-spirit',
    svg: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#0c1e2c"/><polygon points="40,12 60,38 40,68 20,38" fill="#06b6d4"/><polygon points="40,12 50,38 40,68 30,38" fill="#67e8f9"/><circle cx="34" cy="38" r="2.5" fill="#082f49"/><circle cx="46" cy="38" r="2.5" fill="#082f49"/></svg>`
  }
];

let state = {
  gems: 100,
  xp: 20,
  lastDaily: 0,
  subClaimed: false,
  firstPlayClaimed: false,
  playedOnce: false,
  avatarId: 'tg'
};

const haptic = (type = 'light') => tg?.HapticFeedback?.impactOccurred?.(type);
let toastTimer;
function showToast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

const user = tg?.initDataUnsafe?.user;
if (user) {
  document.getElementById('user-name').textContent = user.first_name || 'Игрок';
}

function renderAvatar() {
  const container = document.getElementById('user-avatar');
  if (state.avatarId === 'tg' && user?.photo_url) {
    container.innerHTML = `<img src="${user.photo_url}" alt="Avatar">`;
    return;
  }
  const found = CYBER_AVATARS.find(a => a.id === state.avatarId) || CYBER_AVATARS;
  container.innerHTML = found.svg;
}

function openAvatarModal() {
  haptic('light');
  const grid = document.getElementById('avatar-options');
  grid.innerHTML = '';

  if (user?.photo_url) {
    const tgOpt = document.createElement('div');
    tgOpt.className = `avatar-option ${state.avatarId === 'tg' ? 'selected' : ''}`;
    tgOpt.innerHTML = `<img src="${user.photo_url}" alt="TG">`;
    tgOpt.onclick = () => {
      state.avatarId = 'tg';
      saveState();
      renderAvatar();
      document.getElementById('avatar-modal').classList.add('hidden');
      showToast('Установлен аватар Telegram');
    };
    grid.appendChild(tgOpt);
  }

  CYBER_AVATARS.forEach(av => {
    const opt = document.createElement('div');
    opt.className = `avatar-option ${state.avatarId === av.id ? 'selected' : ''}`;
    opt.innerHTML = av.svg;
    opt.onclick = () => {
      haptic('medium');
      state.avatarId = av.id;
      saveState();
      renderAvatar();
      document.getElementById('avatar-modal').classList.add('hidden');
      showToast('Новый кибер-аватар установлен!');
    };
    grid.appendChild(opt);
  });

  document.getElementById('avatar-modal').classList.remove('hidden');
}

document.getElementById('open-avatar-modal').addEventListener('click', openAvatarModal);
document.getElementById('close-avatar-modal').addEventListener('click', () => {
  document.getElementById('avatar-modal').classList.add('hidden');
});
function loadState() {
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem('pixelplay_v1', (err, val) => {
      if (!err && val) {
        try { state = { ...state, ...JSON.parse(val) }; } catch {}
      }
      if (!user?.photo_url && state.avatarId === 'tg') state.avatarId = CYBER_AVATARS[0].id;
      renderAvatar();
      updateUI();
    });
  } else {
    const saved = localStorage.getItem('pixelplay_v1');
    if (saved) state = { ...state, ...JSON.parse(saved) };
    if (!user?.photo_url && state.avatarId === 'tg') state.avatarId = CYBER_AVATARS[0].id;
    renderAvatar();
    updateUI();
  }
}

function saveState() {
  const raw = JSON.stringify(state);
  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem('pixelplay_v1', raw);
  } else {
    localStorage.setItem('pixelplay_v1', raw);
  }
  updateUI();
}

function addRewards(gems, xp = 10) {
  state.gems += gems;
  state.xp += xp;
  saveState();
  tg?.HapticFeedback?.notificationOccurred?.('success');
}

function updateUI() {
  document.getElementById('user-gems').textContent = state.gems;

  const level = Math.floor(state.xp / 100) + 1;
  const progress = state.xp % 100;
  document.getElementById('user-lvl').textContent = `LVL ${level}`;
  document.getElementById('xp-fill').style.width = `${progress}%`;

  const canClaimDaily = Date.now() - state.lastDaily > 24 * 60 * 60 * 1000;
  const dailyBtn = document.getElementById('claim-daily-btn');
  dailyBtn.disabled = !canClaimDaily;
  dailyBtn.textContent = canClaimDaily ? '+50 💎' : 'Получено ✓';

  const subBtn = document.getElementById('sub-task-btn');
  if (state.subClaimed) {
    subBtn.textContent = 'Готово ✓';
    subBtn.disabled = true;
  }

  const playBtn = document.getElementById('first-play-btn');
  if (state.firstPlayClaimed) {
    playBtn.textContent = 'Готово ✓';
    playBtn.disabled = true;
  } else if (state.playedOnce) {
    playBtn.textContent = 'Забрать +30 💎';
  }
}

function switchTab(targetId) {
  haptic('light');
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
  document.getElementById(targetId).classList.add('active');
}

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.target));
});
document.getElementById('header-shop-btn').addEventListener('click', () => switchTab('tab-shop'));

document.getElementById('claim-daily-btn').addEventListener('click', () => {
  state.lastDaily = Date.now();
  addRewards(50, 25);
  showToast('Получено +50 💎 и +25 XP!');
});

document.getElementById('invite-friend-btn').addEventListener('click', () => {
  haptic('medium');
  const refLink = `https://t.me{BOT_USERNAME}?start=ref_${user?.id || 'player'}`;
  const text = encodeURIComponent('Залетай в PixelPlay — крутые мини-игры прямо в Telegram! 🎮');
  const shareUrl = `https://t.me{encodeURIComponent(refLink)}&text=${text}`;
  tg?.openTelegramLink ? tg.openTelegramLink(shareUrl) : window.open(shareUrl, '_blank');
});

document.getElementById('sub-task-btn').addEventListener('click', () => {
  if (state.subClaimed) return;
  state.subClaimed = true;
  addRewards(50, 20);
  showToast('Награда +50 💎 зачислена!');
});

document.getElementById('first-play-btn').addEventListener('click', () => {
  if (state.firstPlayClaimed) return;
  if (!state.playedOnce) {
    showToast('Сначала запусти любую игру во вкладке «Игры»');
    switchTab('tab-games');
    return;
  }
  state.firstPlayClaimed = true;
  addRewards(30, 20);
  showToast('Награда +30 💎 зачислена!');
});

document.querySelectorAll('.btn-star').forEach(btn => {
  btn.addEventListener('click', () => {
    haptic('medium');
    showToast(`Счет на ${btn.dataset.stars} ⭐ за ${btn.dataset.gems} 💎 (подключим далее)`);
  });
});

let activeGameCleanup = null;

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', async () => {
    haptic('medium');
    const gameId = card.dataset.game;
    try {
      const startFn = (typeof BUILTIN_GAMES !== 'undefined' && BUILTIN_GAMES[gameId])
        ? BUILTIN_GAMES[gameId]
        : (await import(`./games/${gameId}.js?v=4`)).startGame;

      state.playedOnce = true;
      saveState();

      document.getElementById('game-screen').classList.remove('hidden');
      document.getElementById('current-game-title').textContent = card.dataset.title || 'Игра';
      document.getElementById('game-score').textContent = '0';

      const container = document.getElementById('game-container');
      container.innerHTML = '';

      activeGameCleanup = startFn(container, {
        onScore: (score) => { document.getElementById('game-score').textContent = score; },
        spendGems: (cost) => {
          if (state.gems >= cost) {
            state.gems -= cost;
            saveState();
            return true;
          }
          showToast('Не хватает кристаллов 💎');
          return false;
        },
        addGems: (reward) => {
          addRewards(reward, 15);
          showToast(`+${reward} 💎 за отличный результат!`);
        }
      });
       } catch (err) {
      alert('Ошибка: ' + (err?.message || err));
    }

  });
});


document.getElementById('back-to-lobby').addEventListener('click', () => {
  haptic('light');
  if (activeGameCleanup) activeGameCleanup();
  document.getElementById('game-screen').classList.add('hidden');
});

loadState();
