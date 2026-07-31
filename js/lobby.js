/* =========================================================
   FOCUS — lobby.js
   Écrans "Jouer en ligne" : création/salon d'attente/classement.
   ========================================================= */

let hostConfig = { startCount: 12, startSpeedIdx: 2, observeSec: 5, answerSec: 4 };
let pendingName = localStorage.getItem('focus_name') || '';

function refreshHostConfigUI() {
  buildOptionGroup('hcCount', COUNT_OPTIONS, v => v, COUNT_OPTIONS.indexOf(hostConfig.startCount),
    i => { hostConfig.startCount = COUNT_OPTIONS[i]; refreshHostConfigUI(); });
  buildOptionGroup('hcSpeed', SPEED_OPTIONS, v => v.label, hostConfig.startSpeedIdx,
    i => { hostConfig.startSpeedIdx = i; refreshHostConfigUI(); });
  buildSlider('hcObserve', 2, 10, 1, hostConfig.observeSec, ' s', v => hostConfig.observeSec = v);
  buildSlider('hcAnswer', 3, 5, 1, hostConfig.answerSec, ' s', v => hostConfig.answerSec = v);
  document.getElementById('hcName').value = pendingName;
}

async function onCreateRoomClick() {
  const name = document.getElementById('hcName').value.trim() || 'Hôte';
  pendingName = name; localStorage.setItem('focus_name', name);
  const btn = document.getElementById('hcCreateBtn');
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    const code = await createRoom(hostConfig, name);
    goTo('lobbyScreen');
  } catch (e) {
    alert("Impossible de créer le salon : " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Créer la salle';
  }
}

function refreshJoinUI() {
  document.getElementById('jName').value = pendingName;
}

async function onJoinRoomClick() {
  const code = document.getElementById('jCode').value.trim();
  const name = document.getElementById('jName').value.trim() || 'Joueur';
  pendingName = name; localStorage.setItem('focus_name', name);
  if (!code) { alert('Entre le code du salon.'); return; }
  const btn = document.getElementById('jJoinBtn');
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    await joinRoom(code, name);
    goTo('lobbyScreen');
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Rejoindre';
  }
}

/* ---------- Rendu dynamique salon / partie ---------- */

function renderLobbyOrGame(room) {
  if (room.status === 'lobby') renderLobby(room);
  renderPlayerList(room, room.status === 'lobby' ? 'lobbyPlayerList' : 'gamePlayerList');
  renderChat(room);
}

function renderLobby(room) {
  document.getElementById('lobbyCode').textContent = currentRoomCode;
  const isHost = room.hostUid === myUid;
  document.getElementById('lobbyStartBtn').style.display = isHost ? 'inline-block' : 'none';
  document.getElementById('lobbyWaitHint').style.display = isHost ? 'none' : 'block';
  const c = room.config || {};
  document.getElementById('lobbyConfigSummary').textContent =
    `${c.startCount} points · ${SPEED_OPTIONS[c.startSpeedIdx]?.label || ''} · ${c.observeSec}s d'observation · ${c.answerSec}s pour répondre`;
}

function renderPlayerList(room, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const players = room.players || {};
  const sorted = Object.entries(players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  el.innerHTML = '';
  sorted.forEach(([uid, p]) => {
    const row = document.createElement('div');
    row.className = 'player-row' + (p.alive === false ? ' eliminated' : '');
    row.innerHTML = `<span>${escapeHtml(p.name || 'Joueur')}${p.isHost ? '<span class="tag">HÔTE</span>' : ''}</span>
      <span>${p.alive === false ? '💀 éliminé' : (uid === myUid ? '(toi)' : '')}</span>`;
    el.appendChild(row);
  });
}

function renderChat(room) {
  const log = document.getElementById('chatLog');
  if (!log || !room.chat) return;
  const msgs = Object.values(room.chat).sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(-30);
  log.innerHTML = msgs.map(m => `<div><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function onChatSend() {
  const input = document.getElementById('chatInput');
  sendChatMessage(input.value);
  input.value = '';
}

function copyRoomCode() {
  navigator.clipboard?.writeText(currentRoomCode);
  const btn = document.getElementById('copyCodeBtn');
  const old = btn.textContent;
  btn.textContent = '✔ Copié';
  setTimeout(() => btn.textContent = old, 1200);
}

/* ---------- Fin de partie : classement ---------- */

function showGameOverScreen(room) {
  const players = room.players || {};
  const ranked = Object.entries(players).sort((a, b) => {
    const ea = a[1].alive !== false ? 999 : (a[1].eliminatedAtRound || 0);
    const eb = b[1].alive !== false ? 999 : (b[1].eliminatedAtRound || 0);
    return eb - ea;
  });

  const list = document.getElementById('classementList');
  list.innerHTML = '';
  ranked.forEach(([uid, p], i) => {
    const row = document.createElement('div');
    row.className = 'classement-row' + (uid === room.winnerUid ? ' winner' : '');
    const posLabel = uid === room.winnerUid ? '🏆' : '#' + (i + 1);
    row.innerHTML = `<span class="pos">${posLabel}</span><span>${escapeHtml(p.name)}${uid === myUid ? ' (toi)' : ''}</span>`;
    list.appendChild(row);
  });

  document.getElementById('gameOverTitle').textContent = room.winnerUid
    ? (room.winnerUid === myUid ? 'VICTOIRE 🏆' : players[room.winnerUid]?.name + ' remporte la partie')
    : 'Aucun survivant';

  document.getElementById('gameOverRestartBtn').style.display = (room.hostUid === myUid) ? 'inline-block' : 'none';

  goTo('gameOverScreen');
}
