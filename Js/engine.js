/* =========================================================
   FOCUS — engine.js
   Moteur physique déterministe à graine partagée (seed).

   Principe de synchronisation multijoueur :
   - Tous les clients partent du même seed, du même nombre de
     points et de la même vitesse.
   - La simulation avance par pas de temps FIXES (fixedDt),
     jamais par le delta-temps réel de chaque appareil.
   - Ainsi, après le même temps écoulé (mesuré via l'horloge
     serveur Firebase), tous les appareils — tablette, téléphone,
     ordinateur — affichent exactement la même trajectoire,
     quel que soit leur taux de rafraîchissement.
   ========================================================= */

const FIXED_DT = 1 / 60;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crée l'état initial d'une manche à partir d'une graine.
 * @param {number} seed
 * @param {number} count - nombre de points
 * @param {number} speedPx - vitesse en pixels/seconde
 */
function createRoundState(seed, count, speedPx) {
  const rand = mulberry32(seed);
  const ringR = BOUNDARY_R * 0.72;
  const pr = pointRadiusFor(count);
  const points = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = CENTER + Math.cos(angle) * ringR;
    const y = CENTER + Math.sin(angle) * ringR;
    const dir = rand() * Math.PI * 2;
    points.push({
      x, y,
      vx: Math.cos(dir) * speedPx,
      vy: Math.sin(dir) * speedPx,
      r: pr,
    });
  }

  const targetIndex = Math.floor(rand() * count);

  return { points, targetIndex, simTime: 0 };
}

/** Un seul pas de physique déterministe (dt fixe). */
function stepPhysics(state, dt) {
  const points = state.points;

  for (const p of points) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const dx = p.x - CENTER, dy = p.y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = BOUNDARY_R - p.r;
    if (dist > maxDist) {
      const nx = dx / dist, ny = dy / dist;
      p.x = CENTER + nx * maxDist;
      p.y = CENTER + ny * maxDist;
      const dot = p.vx * nx + p.vy * ny;
      p.vx -= 2 * dot * nx;
      p.vy -= 2 * dot * ny;
    }
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.r + b.r;
      if (dist > 0 && dist < minDist) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = (minDist - dist) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const relVx = b.vx - a.vx, relVy = b.vy - a.vy;
        const rel = relVx * nx + relVy * ny;
        if (rel < 0) {
          a.vx += rel * nx; a.vy += rel * ny;
          b.vx -= rel * nx; b.vy -= rel * ny;
        }
      }
    }
  }
}

/**
 * Fait avancer l'état jusqu'au temps écoulé cible (en secondes),
 * par pas fixes. Appeler à chaque frame avec le temps écoulé
 * réel (local en solo, synchronisé serveur en ligne).
 */
function advanceTo(state, targetElapsedSeconds) {
  while (state.simTime + FIXED_DT <= targetElapsedSeconds) {
    stepPhysics(state, FIXED_DT);
    state.simTime += FIXED_DT;
  }
}

/** Dessine l'état courant sur un canvas 2D donné. */
function drawState(ctx, state, showTarget) {
  ctx.clearRect(0, 0, STAGE_SIZE, STAGE_SIZE);

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, BOUNDARY_R + 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2d35';
  ctx.lineWidth = 2;
  ctx.stroke();

  state.points.forEach((p, i) => {
    const isYellow = showTarget && i === state.targetIndex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = isYellow ? '#ffcc33' : '#eef0f2';
    ctx.fill();
    if (isYellow) {
      ctx.shadowColor = '#ffcc33';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
}

/** Retrouve l'index du point le plus proche d'un clic (coord. canvas). */
function hitTest(state, x, y) {
  let clickedIndex = -1;
  let bestDist = Infinity;
  state.points.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= p.r + 6 && d < bestDist) { bestDist = d; clickedIndex = i; }
  });
  return clickedIndex;
}
