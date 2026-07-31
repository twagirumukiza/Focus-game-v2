/* =========================================================
   FOCUS — solo.js
   Mode Solo (bouton STOP conservé tel quel).
   ========================================================= */

let soloConfig = { count: 12, speedIdx: 2, timeSec: 2 };
let soloStats = { played: 0, wins: 0, correct: 0, attempts: 0, currentStreak: 0, bestStreak: 0 };

let soloState = null;      // état moteur (points, targetIndex, simTime)
let soloPhase = 'idle';    // reveal | moving | waitingStop | stopped | done
let soloPhaseTimer = 0;
let soloRafId = null;
let soloLastTs = 0;
let soloRoundNum = 1;
let soloStartPerf = 0;

let canvas, ctx, statusLine, stopBtn;

function initSoloDom() {
  canvas = document.getElementById('stage');
  ctx = canvas.getContext('2d');
  statusLine = document.getElementById('statusLine');
  stopBtn = document.getElementById('stopBtn');
}

function refreshSoloConfigUI() {
  buildOptionGroup('optCount', COUNT_OPTIONS, v => v, COUNT_OPTIONS.indexOf(soloConfig.count),
    i => { soloConfig.count = COUNT_OPTIONS[i]; refreshSoloConfigUI(); });
  buildOptionGroup('optSpeed', SPEED_OPTIONS, v => v.label, soloConfig.speedIdx,
    i => { soloConfig.speedIdx = i; refreshSoloConfigUI(); });
  buildOptionGroup('optTime', TIME_OPTIONS, v => v + ' s', TIME_OPTIONS.indexOf(soloConfig.timeSec),
    i => { soloConfig.timeSec = TIME_OPTIONS[i]; refreshSoloConfigUI(); });
}

function startSoloRound() {
  if (!canvas) initSoloDom();
  goTo('gameScreen');
  document.getElementById('modeTag').textContent = 'SOLO';
  document.getElementById('hudCount').textContent = soloConfig.count;
  document.getElementById('hudRound').textContent = soloRoundNum;
  document.getElementById('hudExtra').textContent = 'Précision ' + soloAccuracyLabel();
  document.getElementById('stopWrap').style.display = 'flex';
  document.getElementById('timerWrap').style.display = 'none';

  const seed = Math.floor(Math.random() * 2 ** 31);
  soloState = createRoundState(seed, soloConfig.count, SPEED_OPTIONS[soloConfig.speedIdx].px);
  soloPhase = 'reveal';
  soloPhaseTimer = 0.7;
  statusLine.textContent = 'Regarde bien…';
  statusLine.className = 'status-line watch';
  stopBtn.classList.remove('visible', 'pulsing');
  playSfxReveal();

  stopSoloLoop();
  soloStartPerf = performance.now();
  soloLastTs = soloStartPerf;
  soloRafId = requestAnimationFrame(soloLoop);
}

function soloAccuracyLabel() {
  return soloStats.attempts > 0 ? Math.round(100 * soloStats.correct / soloStats.attempts) + '%' : '–';
}

function soloLoop(ts) {
  const dt = Math.min((ts - soloLastTs) / 1000, 0.05);
  soloLastTs = ts;
  const elapsedTotal = (ts - soloStartPerf) / 1000;

  if (soloPhase === 'reveal') {
    soloPhaseTimer -= dt;
    if (soloPhaseTimer <= 0) { soloPhase = 'moving'; soloPhaseTimer = soloConfig.timeSec; }
  } else if (soloPhase === 'moving') {
    soloPhaseTimer -= dt;
    advanceTo(soloState, elapsedTotal);
    if (soloPhaseTimer <= 0) {
      soloPhase = 'waitingStop';
      statusLine.textContent = 'Suis le point… appuie sur STOP quand tu es prêt';
      statusLine.className = 'status-line';
      stopBtn.classList.add('visible', 'pulsing');
      playSfxFade();
    }
  } else if (soloPhase === 'waitingStop') {
    advanceTo(soloState, elapsedTotal);
  }

  drawState(ctx, soloState, soloPhase === 'reveal' || soloPhase === 'done');

  if (soloPhase !== 'stopped' && soloPhase !== 'done') soloRafId = requestAnimationFrame(soloLoop);
}

function stopSoloLoop() { if (soloRafId) cancelAnimationFrame(soloRafId); soloRafId = null; }

function onSoloStop() {
  if (soloPhase !== 'waitingStop') return;
  soloPhase = 'stopped';
  stopSoloLoop();
  stopBtn.classList.remove('visible', 'pulsing');
  playSfxStop();
  vibrate(30);
  statusLine.textContent = 'Clique sur le bon point';
  statusLine.className = 'status-line go';
  drawState(ctx, soloState, false);
  canvas.addEventListener('pointerdown', onSoloCanvasClick, { once: true });
}

function onSoloCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = STAGE_SIZE / rect.width, scaleY = STAGE_SIZE / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const clickedIndex = hitTest(soloState, x, y);
  finishSoloRound(clickedIndex);
}

function finishSoloRound(clickedIndex) {
  soloPhase = 'done';
  const won = clickedIndex === soloState.targetIndex;

  soloStats.played++; soloStats.attempts++;
  if (won) { soloStats.wins++; soloStats.correct++; soloStats.currentStreak++; soloStats.bestStreak = Math.max(soloStats.bestStreak, soloStats.currentStreak); }
  else { soloStats.currentStreak = 0; }

  if (won) { playSfxWin(); vibrate([20, 40, 20]); } else { playSfxLose(); vibrate(120); }
  drawState(ctx, soloState, true);

  setTimeout(() => {
    document.getElementById('resultWord').textContent = won ? 'VICTOIRE' : 'DÉFAITE';
    document.getElementById('resultWord').className = 'result-word ' + (won ? 'win' : 'lose');
    document.getElementById('resultSub').textContent = won
      ? 'Bien vu — le point a été correctement repéré.'
      : (clickedIndex === -1 ? "Aucun point n'a été touché." : "Ce n'était pas le bon point.");
    document.getElementById('statPlayed').textContent = soloStats.played;
    document.getElementById('statWins').textContent = soloStats.wins;
    document.getElementById('statAcc').textContent = soloAccuracyLabel();
    document.getElementById('statBest').textContent = soloStats.bestStreak;
    soloRoundNum++;
    goTo('resultScreen');
  }, 550);
}
