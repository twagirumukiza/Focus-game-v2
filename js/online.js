/* =========================================================
   FOCUS — online.js
   Mode "Survie" en ligne (Firebase Realtime Database).

   Nouveauté v2 : plus de bouton STOP en multijoueur.
   - Le créateur du salon choisit un MINUTEUR d'observation
     (2 à 10 s) : une fois écoulé, les points se figent
     automatiquement pour tout le monde, au même instant
     (synchronisé via l'horloge serveur Firebase).
   - S'ouvre alors une FENÊTRE DE RÉPONSE (3 à 5 s, choisie
     par le créateur) pendant laquelle chaque joueur doit
     cliquer sur le bon point.
   - Tout joueur qui se trompe, ou qui ne répond pas à temps,
     est éliminé. La partie continue avec les survivants.
   - À chaque nouvelle manche, le nombre de points et la
     vitesse augmentent, jusqu'à ce qu'il ne reste plus qu'un
     seul joueur.
   ========================================================= */

let db, auth, myUid, myName = 'Joueur';
let serverOffset = 0;
let currentRoomCode = null;
let roomRef = null;
let roomListener = null;
let onlineState = null;      // état moteur pour la manche en cours
let onlinePhase = 'idle';    // observing | answering | finalizing | done
let onlineRafId = null;
let hasAnsweredThisRound = false;
let lastProcessedRound = -1;
let roundEndTimerArmed = false;

const ROUND_END_GRACE_MS = 600;
const NEXT_ROUND_DELAY_MS = 3000;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK non chargé — vérifie firebase/firebase-config.js');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.database();
  auth = firebase.auth();

  db.ref('.info/serverTimeOffset').on('value', snap => { serverOffset = snap.val() || 0; });

  auth.onAuthStateChanged(user => {
    if (user) { myUid = user.uid; }
    else { auth.signInAnonymously().catch(err => console.error('Auth anonyme échouée', err)); }
  });
  if (!auth.currentUser) auth.signInAnonymously().catch(err => console.error('Auth anonyme échouée', err));
}

function serverNow() { return Date.now() + serverOffset; }

/* ---------- Création / connexion à un salon ---------- */

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createRoom(hostConfig, name) {
  myName = name || 'Hôte';
  const code = makeRoomCode();
  const ref = db.ref('rooms/' + code);
  await ref.set({
    hostUid: myUid,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    status: 'lobby',
    config: hostConfig, // { startCount, startSpeedIdx, observeSec, answerSec }
    round: 0,
    players: {
      [myUid]: { name: myName, isHost: true, joinedAt: firebase.database.ServerValue.TIMESTAMP, alive: true }
    }
  });
  await joinRoomInternal(code);
  return code;
}

async function joinRoom(code, name) {
  code = code.trim().toUpperCase();
  myName = name || 'Joueur';
  const ref = db.ref('rooms/' + code);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error("Ce salon n'existe pas.");
  const room = snap.val();
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé.');
  await ref.child('players/' + myUid).set({
    name: myName, isHost: false, joinedAt: firebase.database.ServerValue.TIMESTAMP, alive: true
  });
  await joinRoomInternal(code);
  return code;
}

async function joinRoomInternal(code) {
  currentRoomCode = code;
  roomRef = db.ref('rooms/' + code);
  roomRef.child('players/' + myUid).onDisconnect().update({ connected: false });
  localStorage.setItem('focus_last_room', code);

  if (roomListener) roomRef.off('value', roomListener);
  roomListener = roomRef.on('value', snap => {
    const room = snap.val();
    if (!room) { goTo('menuScreen'); return; }
    onRoomUpdate(room);
  });
}

function leaveRoom() {
  if (roomRef && myUid) roomRef.child('players/' + myUid).remove();
  if (roomRef && roomListener) roomRef.off('value', roomListener);
  stopOnlineLoop();
  currentRoomCode = null; roomRef = null; roomListener = null;
  localStorage.removeItem('focus_last_room');
  goTo('menuScreen');
}

/* ---------- Démarrage de partie (hôte) ---------- */

async function hostStartGame() {
  const snap = await roomRef.get();
  const room = snap.val();
  const cfg = room.config;
  await roomRef.update({
    status: 'playing',
    round: 1,
    seed: Math.floor(Math.random() * 2 ** 31),
    currentCount: cfg.startCount,
    currentSpeedPx: SPEED_OPTIONS[cfg.startSpeedIdx].px,
    roundStartAt: firebase.database.ServerValue.TIMESTAMP,
    winnerUid: null
  });
  // On repart d'une feuille de route propre à chaque manche.
  await clearAllAnswers(room.players);
}

async function clearAllAnswers(players) {
  if (!players) return;
  const updates = {};
  Object.keys(players).forEach(uid => {
    if (players[uid].alive !== false) {
      updates['players/' + uid + '/clickedIndex'] = null;
      updates['players/' + uid + '/correct'] = null;
      updates['players/' + uid + '/answeredAt'] = null;
    }
  });
  await roomRef.update(updates);
}

/* ---------- Boucle principale d'une manche (tous les clients) ---------- */

function onRoomUpdate(room) {
  renderLobbyOrGame(room); // défini dans lobby.js : met à jour le DOM (liste joueurs, etc.)

  if (room.status === 'playing' && room.round !== lastProcessedRound) {
    lastProcessedRound = room.round;
    beginOnlineRound(room);
  } else if (room.status === 'roundEnd') {
    stopOnlineLoop();
    scheduleNextRoundCheck(room);
  } else if (room.status === 'gameOver') {
    stopOnlineLoop();
    showGameOverScreen(room);
  }
}

function beginOnlineRound(room) {
  goTo('gameScreen');
  document.getElementById('modeTag').textContent = 'EN LIGNE';
  document.getElementById('stopWrap').style.display = 'none';
  document.getElementById('timerWrap').style.display = 'flex';
  document.getElementById('hudCount').textContent = room.currentCount;
  document.getElementById('hudRound').textContent = room.round;
  document.getElementById('hudExtra').textContent = aliveCount(room.players) + ' en jeu';

  if (!canvas) initSoloDom(); // réutilise les mêmes réfs canvas/ctx/statusLine

  onlineState = createRoundState(room.seed, room.currentCount, room.currentSpeedPx);
  onlinePhase = 'observing';
  hasAnsweredThisRound = false;
  roundEndTimerArmed = false;
  canvas.removeEventListener('pointerdown', onOnlineCanvasClick);
  playSfxReveal();

  stopOnlineLoop();
  onlineRafId = requestAnimationFrame(() => onlineLoop(room));
}

function onlineLoop(room) {
  const observeSec = room.config.observeSec;
  const answerSec = room.config.answerSec;
  const elapsed = (serverNow() - room.roundStartAt) / 1000;
  const revealDuration = Math.min(1, observeSec * 0.35);

  if (onlinePhase === 'observing') {
    if (elapsed >= observeSec) {
      onlinePhase = 'answering';
      playSfxFreeze();
      vibrate(40);
      statusLine.textContent = 'RÉPONDS !';
      statusLine.className = 'status-line warn';
      canvas.addEventListener('pointerdown', onOnlineCanvasClick, { once: true });
    } else {
      advanceTo(onlineState, elapsed);
      statusLine.textContent = 'Observe… fige dans ' + Math.max(0, observeSec - elapsed).toFixed(1) + ' s';
      statusLine.className = 'status-line watch';
      updateTimerRing(observeSec - elapsed, observeSec, false);
    }
  }

  if (onlinePhase === 'answering') {
    const answerElapsed = elapsed - observeSec;
    const remaining = answerSec - answerElapsed;
    updateTimerRing(Math.max(0, remaining), answerSec, true);

    if (remaining <= 0 && !hasAnsweredThisRound) {
      hasAnsweredThisRound = true;
      submitAnswer(-1); // temps écoulé = échec
      statusLine.textContent = 'Temps écoulé';
    }
    if (elapsed >= observeSec + answerSec + ROUND_END_GRACE_MS / 1000 && !roundEndTimerArmed) {
      roundEndTimerArmed = true;
      tryFinalizeRound(room.round);
    }
  }

  drawState(ctx, onlineState, onlinePhase === 'observing' && elapsed < revealDuration);

  if (onlinePhase !== 'done') onlineRafId = requestAnimationFrame(() => onlineLoop(room));
}

function stopOnlineLoop() { if (onlineRafId) cancelAnimationFrame(onlineRafId); onlineRafId = null; }

function updateTimerRing(value, max, isAnswerPhase) {
  const num = document.getElementById('timerNum');
  const fg = document.getElementById('timerFg');
  const ring = document.getElementById('timerRing');
  if (!num) return;
  num.textContent = Math.max(0, Math.ceil(value));
  ring.classList.toggle('answer', isAnswerPhase);
  const circumference = 2 * Math.PI * 24;
  const ratio = Math.max(0, Math.min(1, value / max));
  fg.style.strokeDasharray = circumference;
  fg.style.strokeDashoffset = circumference * (1 - ratio);
  document.getElementById('timerLabel').textContent = isAnswerPhase ? 'Réponds' : 'Observe';
}

function onOnlineCanvasClick(e) {
  if (onlinePhase !== 'answering' || hasAnsweredThisRound) return;
  hasAnsweredThisRound = true;
  const rect = canvas.getBoundingClientRect();
  const scaleX = STAGE_SIZE / rect.width, scaleY = STAGE_SIZE / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const clickedIndex = hitTest(onlineState, x, y);
  submitAnswer(clickedIndex);
}

function submitAnswer(clickedIndex) {
  const correct = clickedIndex === onlineState.targetIndex;
  roomRef.child('players/' + myUid).update({
    clickedIndex, correct, answeredAt: firebase.database.ServerValue.TIMESTAMP
  });
  playSfxStop();
  vibrate(correct ? [20, 40, 20] : 120);
}

function aliveCount(players) {
  if (!players) return 0;
  return Object.values(players).filter(p => p.alive !== false).length;
}

/* ---------- Fin de manche : élimination + progression (transaction) ---------- */

async function tryFinalizeRound(round) {
  await roomRef.transaction(room => {
    if (!room || room.status !== 'playing' || room.round !== round) return room; // déjà traité ailleurs
    const players = room.players || {};
    let remaining = 0, remainingUid = null;

    Object.keys(players).forEach(uid => {
      const p = players[uid];
      if (p.alive === false) return;
      const failed = p.correct !== true;
      if (failed) {
        p.alive = false;
        p.eliminatedAtRound = round;
      } else {
        remaining++; remainingUid = uid;
      }
    });

    if (remaining <= 1) {
      room.status = 'gameOver';
      room.winnerUid = remaining === 1 ? remainingUid : null;
    } else {
      room.status = 'roundEnd';
      room.nextRound = round + 1;
      room.nextSeed = Math.floor(Math.random() * 2 ** 31);
      room.nextCount = Math.min(SURVIVAL_MAX_COUNT, room.currentCount + SURVIVAL_STEP_COUNT);
      room.nextSpeedPx = Math.min(SURVIVAL_MAX_SPEED, room.currentSpeedPx + SURVIVAL_STEP_SPEED);
      room.nextRoundStartAt = serverNow() + NEXT_ROUND_DELAY_MS;
    }
    return room;
  });
}

function scheduleNextRoundCheck(room) {
  if (!room.nextRoundStartAt) return;
  const wait = Math.max(0, room.nextRoundStartAt - serverNow());
  setTimeout(() => advanceToNextRound(room.round, room.nextRound), wait + 50);
}

async function advanceToNextRound(prevRound, nextRound) {
  await roomRef.transaction(room => {
    if (!room || room.status !== 'roundEnd' || room.round !== prevRound) return room;
    room.status = 'playing';
    room.round = nextRound;
    room.seed = room.nextSeed;
    room.currentCount = room.nextCount;
    room.currentSpeedPx = room.nextSpeedPx;
    room.roundStartAt = firebase.database.ServerValue.TIMESTAMP;
    room.nextRound = null; room.nextSeed = null; room.nextCount = null;
    room.nextSpeedPx = null; room.nextRoundStartAt = null;
    if (room.players) {
      Object.keys(room.players).forEach(uid => {
        if (room.players[uid].alive !== false) {
          room.players[uid].clickedIndex = null;
          room.players[uid].correct = null;
          room.players[uid].answeredAt = null;
        }
      });
    }
    return room;
  });
}

/* ---------- Chat minimal ---------- */

function sendChatMessage(text) {
  if (!text.trim() || !roomRef) return;
  roomRef.child('chat').push({ uid: myUid, name: myName, text: text.trim(), ts: firebase.database.ServerValue.TIMESTAMP });
}
// Initialisation Firebase au chargement
window.addEventListener("load", () => {
    initFirebase();
});
