/* =========================================================
   FOCUS — audio.js
   Sons synthétisés (WebAudio), aucune dépendance à des
   fichiers audio externes. Vibration + plein écran + réglages.
   ========================================================= */

let settings = {
  music: false,
  sfx: true,
  vibration: true,
  fullscreen: false,
};

// Persistance locale (ce projet est un dépôt GitHub réel, pas un
// artefact Claude.ai : localStorage est donc utilisé sans restriction).
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('focus_settings') || 'null');
    if (saved) settings = { ...settings, ...saved };
  } catch (e) {}
}
function saveSettings() {
  try { localStorage.setItem('focus_settings', JSON.stringify(settings)); } catch (e) {}
}

function toggleSetting(key) {
  settings[key] = !settings[key];
  saveSettings();
  refreshSettingsUI();
  if (key === 'music') settings.music ? startAmbientMusic() : stopAmbientMusic();
  if (key === 'sfx' && settings.sfx) playTone(660, 0.06, 'sine', 0.15);
}

function refreshSettingsUI() {
  ['music', 'sfx', 'vibration', 'fullscreen'].forEach(k => {
    const el = document.getElementById('sw' + k[0].toUpperCase() + k.slice(1));
    if (el) el.classList.toggle('on', settings[k]);
  });
}

let audioCtx = null;
let ambientNodes = null;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
document.addEventListener('pointerdown', () => { ensureAudioCtx(); }, { once: true });

function playTone(freq, duration, type = 'sine', volume = 0.2) {
  if (!settings.sfx) return;
  const ac = ensureAudioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

function playSfxReveal() { playTone(880, 0.18, 'triangle', 0.18); }
function playSfxFade()   { playTone(440, 0.15, 'sine', 0.12); }
function playSfxStop()   { playTone(220, 0.12, 'square', 0.15); }
function playSfxTick()   { playTone(1200, 0.04, 'square', 0.05); }
function playSfxFreeze() { playTone(300, 0.16, 'square', 0.16); }
function playSfxWin()    { playTone(660, 0.12, 'sine', 0.18); setTimeout(() => playTone(990, 0.2, 'sine', 0.18), 120); }
function playSfxLose()   { playTone(200, 0.28, 'sawtooth', 0.15); }

function startAmbientMusic() {
  if (ambientNodes) return;
  const ac = ensureAudioCtx();
  const osc1 = ac.createOscillator(), osc2 = ac.createOscillator(), gain = ac.createGain();
  osc1.type = 'sine'; osc1.frequency.value = 110;
  osc2.type = 'sine'; osc2.frequency.value = 165;
  gain.gain.value = 0.035;
  osc1.connect(gain); osc2.connect(gain); gain.connect(ac.destination);
  osc1.start(); osc2.start();
  ambientNodes = { osc1, osc2, gain };
}
function stopAmbientMusic() {
  if (!ambientNodes) return;
  ambientNodes.gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
  ambientNodes.osc1.stop(audioCtx.currentTime + 0.45);
  ambientNodes.osc2.stop(audioCtx.currentTime + 0.45);
  ambientNodes = null;
}

function vibrate(pattern) {
  if (settings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
      .then(() => { settings.fullscreen = true; saveSettings(); refreshSettingsUI(); })
      .catch(() => { settings.fullscreen = false; refreshSettingsUI(); });
  } else {
    document.exitFullscreen?.();
    settings.fullscreen = false; saveSettings(); refreshSettingsUI();
  }
}
document.addEventListener('fullscreenchange', () => {
  settings.fullscreen = !!document.fullscreenElement;
  saveSettings();
  refreshSettingsUI();
});
