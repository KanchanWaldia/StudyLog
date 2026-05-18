// ══════════════════════════════════════════════════
// js/auth.js
// Handles Firebase Authentication:
//   - Email/password login & signup
//   - Google Sign-In
//   - Logout
//   - Auth state changes (show/hide screens)
// ══════════════════════════════════════════════════

// ── DOM references ────────────────────────────────
const authScreen   = document.getElementById('auth-screen');
const appScreen    = document.getElementById('app-screen');
const loginEmail   = document.getElementById('login-email');
const loginPass    = document.getElementById('login-password');
const loginBtn     = document.getElementById('login-btn');
const loginError   = document.getElementById('login-error');

const signupName   = document.getElementById('signup-name');
const signupEmail  = document.getElementById('signup-email');
const signupPass   = document.getElementById('signup-password');
const signupBtn    = document.getElementById('signup-btn');
const signupError  = document.getElementById('signup-error');

const googleBtn    = document.getElementById('google-login-btn');
const logoutBtn    = document.getElementById('logout-btn');

const userNameEl   = document.getElementById('user-display-name');
const userEmailEl  = document.getElementById('user-email-display');
const userAvatarEl = document.getElementById('user-avatar');
const mobileAvatar = document.getElementById('mobile-avatar');

// ── Tab switching ────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + '-form').classList.add('active');
    loginError.textContent  = '';
    signupError.textContent = '';
  });
});

// ── Helper: show auth error ──────────────────────
function showAuthError(el, msg) {
  el.textContent = msg;
}

// ── Email/Password Login ─────────────────────────
loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pass  = loginPass.value;
  loginError.textContent = '';

  if (!email || !pass) {
    showAuthError(loginError, 'Please fill in all fields.');
    return;
  }

  loginBtn.textContent = 'Signing in…';
  loginBtn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged below will handle screen switch
  } catch (err) {
    showAuthError(loginError, friendlyAuthError(err.code));
    loginBtn.textContent = 'Sign In →';
    loginBtn.disabled = false;
  }
});

// ── Email/Password Signup ────────────────────────
signupBtn.addEventListener('click', async () => {
  const name  = signupName.value.trim();
  const email = signupEmail.value.trim();
  const pass  = signupPass.value;
  signupError.textContent = '';

  if (!name || !email || !pass) {
    showAuthError(signupError, 'Please fill in all fields.');
    return;
  }
  if (pass.length < 6) {
    showAuthError(signupError, 'Password must be at least 6 characters.');
    return;
  }

  signupBtn.textContent = 'Creating account…';
  signupBtn.disabled = true;

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    // Save display name to Firebase profile
    await cred.user.updateProfile({ displayName: name });
  } catch (err) {
    showAuthError(signupError, friendlyAuthError(err.code));
    signupBtn.textContent = 'Create Account →';
    signupBtn.disabled = false;
  }
});

// ── Google Sign-In ───────────────────────────────
googleBtn.addEventListener('click', async () => {
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (err) {
    showAuthError(loginError, friendlyAuthError(err.code));
  }
});

// ── Logout ───────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
});

// ── Auth state observer ──────────────────────────
// This fires whenever the user logs in or out.
auth.onAuthStateChanged(user => {
  if (user) {
    // User is logged in → show app
    authScreen.classList.remove('active');
    appScreen.classList.add('active');

    // Populate sidebar user info
    const displayName  = user.displayName || user.email.split('@')[0];
    const initial      = displayName.charAt(0).toUpperCase();
    userNameEl.textContent   = displayName;
    userEmailEl.textContent  = user.email;
    userAvatarEl.textContent = initial;
    mobileAvatar.textContent = initial;

    // Reset button states in case they were disabled
    loginBtn.textContent  = 'Sign In →';
    loginBtn.disabled     = false;
    signupBtn.textContent = 'Create Account →';
    signupBtn.disabled    = false;

    // Load tracker for this user
    if (typeof initTracker === 'function') initTracker(user);

  } else {
    // User is logged out → show auth screen
    appScreen.classList.remove('active');
    authScreen.classList.add('active');
  }
});

// ── Friendly error messages ──────────────────────
function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':      'No account found with this email.',
    'auth/wrong-password':      'Incorrect password. Please try again.',
    'auth/email-already-in-use':'This email is already registered.',
    'auth/invalid-email':       'Please enter a valid email address.',
    'auth/weak-password':       'Password must be at least 6 characters.',
    'auth/popup-closed-by-user':'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/too-many-requests':   'Too many attempts. Try again later.',
    'auth/invalid-credential':  'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
