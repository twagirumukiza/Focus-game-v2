/* =========================================================
   FOCUS — ui.js
   Navigation entre écrans + composants de configuration réutilisables.
   ========================================================= */

function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId !== 'gameScreen') stopSoloLoop();
  if (screenId === 'gameScreen' && settings.music) startAmbientMusic();
  else stopAmbientMusic();
}

function buildOptionGroup(containerId, values, formatFn, currentIdx, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  values.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'opt' + (i === currentIdx ? ' selected' : '');
    b.type = 'button';
    b.textContent = formatFn(v);
    b.onclick = () => { onSelect(i); };
    el.appendChild(b);
  });
}

function buildSlider(containerId, min, max, step, value, unit, onChange) {
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <div class="slider-row">
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
      <span class="slider-value">${value}${unit}</span>
    </div>`;
  const input = el.querySelector('input');
  const label = el.querySelector('.slider-value');
  input.addEventListener('input', () => {
    label.textContent = input.value + unit;
    onChange(Number(input.value));
  });
  return input;
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  refreshSettingsUI();
});
