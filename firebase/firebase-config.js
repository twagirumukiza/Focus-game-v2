/* =========================================================
   FOCUS — firebase-config.js
   Remplace les valeurs ci-dessous par celles de TON projet
   Firebase (Console Firebase → Paramètres du projet → Général
   → "Vos applications" → configuration SDK).

   Étapes nécessaires côté Firebase :
   1. Créer un projet sur https://console.firebase.google.com
   2. Activer "Authentication" → méthode "Anonyme"
   3. Activer "Realtime Database" (pas Firestore) en mode production
   4. Copier-coller la configuration ci-dessous
   5. Publier les règles de sécurité fournies dans firebase-rules.json
   ========================================================= */

window.FOCUS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBG6oid29bMq8GVvBkNvPtSDZTRO5K09uk",
  authDomain: "focus-game-1c7ee.firebaseapp.com",
  databaseURL: "https://focus-game-1c7ee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "focus-game-1c7ee",
  storageBucket: "focus-game-1c7ee.firebasestorage.app",
  messagingSenderId: "856695121197",
  appId: "1:856695121197:web:cfc0d876ba9d1885499fa4"
};
