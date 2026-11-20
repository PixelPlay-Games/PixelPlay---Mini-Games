const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0b0d17');
  tg.setBackgroundColor?.('#0b0d17');
}

const BOT_USERNAME = 'PixelPlay_Mini_Games_bot';

let state = {
  gems: 100,
  xp: 20,
  lastDaily: 0,
  subClaimed: false,
  firstPlayClaimed: false,
  playedOnce: false
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
  if (user.photo_url) {
    document.getElementById('user-avatar').innerHTML = `<img src="${user.photo_url}" alt="">`;
  }
}

function loadState() {
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem('pixelplay_v1', (err, val) => {
      if (!err && val) {
        try { state = { ...state, ...JSON.parse(val) }; } catch {}
      }
      updateUI();
    });
  } else {
    const saved = localStorage.getItem('pixelplay_v1');
    if (saved) state = { ...state, ...JSON.parse(saved) };
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
  const text = encodeURIComponent('Залетай в PixelPlay — классные мини-игры прямо в Telegram! 🎮');
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
    if (card.classList.contains('locked')) {
      showToast('Эта игра выйдет в следующем обновлении 🚀');
      return;
    }

    const gameId = card.dataset.game;
    try {
      const gameModule = await import(`./games/${gameId}.js`);
      state.playedOnce = true;
      saveState();

      document.getElementById('game-screen').classList.remove('hidden');
      document.getElementById('current-game-title').textContent = card.dataset.title || 'Игра';
      document.getElementById('game-score').textContent = '0';

      const container = document.getElementById('game-container');
      container.innerHTML = '';

      activeGameCleanup = gameModule.startGame(container, {
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
      showToast('Модуль игры еще загружается...');
    }
  });
});

document.getElementById('back-to-lobby').addEventListener('click', () => {
  haptic('light');
  if (activeGameCleanup) activeGameCleanup();
  document.getElementById('game-screen').classList.add('hidden');
});

loadState();
