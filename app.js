/* =========================================================
   FOCUS — app.js
   Point d'entrée : initialise tout au chargement de la page.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  refreshSoloConfigUI();
  refreshHostConfigUI();
  refreshJoinUI();

  // Reprise automatique si la page a été rafraîchie en pleine partie.
  const lastRoom = localStorage.getItem('focus_last_room');
  if (lastRoom) {
    setTimeout(() => {
      const name = localStorage.getItem('focus_name') || 'Joueur';
      joinRoom(lastRoom, name).then(() => goTo('lobbyScreen')).catch(() => {
        localStorage.removeItem('focus_last_room');
      });
    }, 600); // laisse le temps à l'auth anonyme de s'initialiser
  }
});
