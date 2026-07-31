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

const FIREBASE_CONFIG = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI.firebaseapp.com",
  databaseURL: "https://REMPLACE_MOI-default-rtdb.firebaseio.com",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI.appspot.com",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI"
};
