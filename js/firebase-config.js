// ══════════════════════════════════════════════════
// js/firebase-config.js
// ──────────────────────────────────────────────────
// 🔧 STEP 1: Replace the values below with YOUR
//    Firebase project credentials.
//    (Firebase Console → Project Settings → Your apps → SDK config)
// ══════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyCGIXGq8Ym1bgihGmmNOLGM8fxE1E0XP3E",
  authDomain:        "studylog-tracker.firebaseapp.com",
  projectId:         "studylog-tracker",
  storageBucket:     "studylog-tracker.firebasestorage.app",
  messagingSenderId: "1054480330553",
  appId:             "1:1054480330553:web:756abc1644f68863aac2e8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Shortcuts used throughout the app
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Google Auth Provider ──────────────────────────
const googleProvider = new firebase.auth.GoogleAuthProvider();
