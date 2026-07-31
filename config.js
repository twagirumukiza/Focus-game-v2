/* =========================================================
   FOCUS — config.js
   Constantes partagées par le mode Solo et le mode En ligne.
   ========================================================= */

const COUNT_OPTIONS = [8, 12, 16, 20, 24, 30];

const SPEED_OPTIONS = [
  { label: 'Très lente', px: 35 },
  { label: 'Lente',      px: 65 },
  { label: 'Normale',    px: 105 },
  { label: 'Rapide',     px: 155 },
  { label: 'Extrême',    px: 220 },
];

const TIME_OPTIONS = [1, 2, 3]; // secondes avant que le jaune redevienne blanc

// Progression de difficulté en mode "Survie" multijoueur :
// à chaque manche, le nombre de points et la vitesse augmentent
// jusqu'à ce qu'il ne reste qu'un seul joueur.
const SURVIVAL_STEP_COUNT = 2;     // + points par manche
const SURVIVAL_STEP_SPEED = 18;    // + px/s par manche
const SURVIVAL_MAX_COUNT  = 30;
const SURVIVAL_MAX_SPEED  = 260;

// Durée maximale d'une manche en ligne avant qu'un joueur encore
// indécis ne soit automatiquement considéré comme éliminé.
const ROUND_TIMEOUT_MS = 45000;

const STAGE_SIZE = 560;
const CENTER = STAGE_SIZE / 2;
const BOUNDARY_R = 250;

function pointRadiusFor(n) {
  if (n <= 8) return 26;
  if (n <= 12) return 23;
  if (n <= 16) return 20;
  if (n <= 20) return 18;
  if (n <= 24) return 16;
  return 14;
}
