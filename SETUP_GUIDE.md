# StudyLog — Setup & Deployment Guide

A complete step-by-step guide to get your habit tracker live on the web.

---

## Project File Structure

```
habit-tracker/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js   ← You'll edit this one
    ├── auth.js
    ├── tracker.js
    ├── dashboard.js
    └── app.js
```

---

## STEP 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Enter a project name (e.g. `studylog-tracker`)
4. Disable Google Analytics (optional, not needed)
5. Click **"Create project"** → wait for it to finish → click **"Continue"**

---

## STEP 2 — Enable Authentication

1. In the Firebase Console sidebar, click **"Build" → "Authentication"**
2. Click **"Get started"**
3. Under the **"Sign-in method"** tab:
   - Click **"Email/Password"** → Enable it → Save
   - Click **"Google"** → Enable it → add your support email → Save

---

## STEP 3 — Create Firestore Database

1. In the sidebar, click **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules next)
4. Select a region close to you (e.g. `asia-south1` for India)
5. Click **"Enable"**

---

## STEP 4 — Set Firestore Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Each user can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

This ensures:
- ✅ Logged-in users can read/write only their own data
- ✅ No one can access another user's data
- ✅ Unauthenticated users are blocked completely

---

## STEP 5 — Add Firebase Config to Code

1. In Firebase Console, go to **Project Settings** (gear icon ⚙ near sidebar top)
2. Scroll down to **"Your apps"** section
3. Click the **Web** icon (`</>`) to add a web app
4. Enter a nickname (e.g. `StudyLog Web`) → click **"Register app"**
5. You'll see a config object like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "studylog-abc.firebaseapp.com",
  projectId: "studylog-abc",
  storageBucket: "studylog-abc.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. Open `js/firebase-config.js` in VS Code
7. Replace the placeholder values with your actual config values
8. Save the file

---

## STEP 6 — Run Locally in VS Code

**Option A: Live Server extension (recommended)**

1. Install the **"Live Server"** extension in VS Code
2. Open the `habit-tracker` folder in VS Code
3. Right-click `index.html` → **"Open with Live Server"**
4. The app opens at `http://127.0.0.1:5500`

**Option B: VS Code built-in**

1. Open terminal in VS Code: `Ctrl + \``
2. Run: `npx serve .`
3. Open the URL shown (usually `http://localhost:3000`)

> **Note:** Opening `index.html` directly as a file (`file://...`) won't work because Firebase requires a proper HTTP server.

---

## STEP 7 — Deploy on Vercel (Recommended)

Vercel is the easiest free option for static sites.

### Method A: Via Vercel website (no code needed)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Click **"Upload"** (if not using GitHub) or connect your GitHub repo
4. If uploading: drag and drop your `habit-tracker` folder
5. Click **"Deploy"**
6. Done! You get a URL like `https://studylog.vercel.app`

### Method B: Via Vercel CLI

```bash
npm install -g vercel
cd habit-tracker
vercel
```

Follow the prompts. Your app will be live in ~30 seconds.

---

## STEP 8 — Deploy on Netlify (Alternative)

1. Go to **https://app.netlify.com** → Sign up
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop your `habit-tracker` folder into the deploy area
4. Done! You get a URL like `https://amazing-name.netlify.app`

### Via Netlify CLI:
```bash
npm install -g netlify-cli
cd habit-tracker
netlify deploy --prod
```

---

## STEP 9 — Add Authorized Domain for Google Sign-In

After deployment, you need to tell Firebase your live domain is allowed:

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **"Add domain"**
3. Enter your Vercel/Netlify URL (e.g. `studylog.vercel.app`)
4. Click **"Add"**

Google login will now work on your live site.

---

## Quick Troubleshooting

| Problem | Fix |
|---|---|
| "Firebase not defined" | Make sure `firebase-config.js` is loaded before other JS files |
| Login shows no error but nothing happens | Check browser console for Firebase errors |
| Google login popup blocked | Allow popups for your site in browser settings |
| Checkboxes not saving | Check Firestore rules — user must be authenticated |
| App works locally but not on Vercel | Make sure all files are in the uploaded folder |
| "auth/invalid-credential" | Double-check email/password |

---

## Data Structure in Firestore

Your data is stored like this:

```
users/
  {userId}/
    config/
      tasks: { list: [ {id, name}, ... ] }
    months/
      "2026-05": {
        cells: {
          "2026-05-01": { taskId1: true, taskId2: false, ... },
          "2026-05-02": { ... },
          ...
        },
        remarks: {
          "2026-05-01": "Had a great study session!",
          ...
        }
      }
```

Each user's data is completely isolated by their Firebase Auth UID.

---

## Features Summary

| Feature | Status |
|---|---|
| Email/Password login | ✅ |
| Google Sign-In | ✅ |
| Add / Delete tasks (up to 12) | ✅ |
| Monthly grid (date × task) | ✅ |
| Checkboxes with auto-save | ✅ |
| Per-day remarks/notes | ✅ |
| Daily completion % | ✅ |
| Progress dashboard | ✅ |
| Streak counter | ✅ |
| Best day of month | ✅ |
| Weekly chart (line) | ✅ |
| Daily chart (bar) | ✅ |
| Task-wise chart (doughnut) | ✅ |
| Month navigation | ✅ |
| Cloud sync across devices | ✅ |
| Mobile responsive | ✅ |
