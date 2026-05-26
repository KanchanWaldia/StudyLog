# ✦ StudyLog — Daily Habit & Study Tracker

> A digital bullet journal for students. Track habits, visualize progress, and stay focused — all in one place.

![StudyLog](https://img.shields.io/badge/StudyLog-v2.0-c97d4e?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![HTML CSS JS](https://img.shields.io/badge/HTML%20%2B%20CSS%20%2B%20JS-Vanilla-4e7ac9?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-4a8c6a?style=for-the-badge)

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 📓 **Daily Tracker** | Date × Task grid with checkboxes, remarks, and sparklines |
| 🔥 **Heatmap View** | GitHub-style calendar showing daily completion intensity |
| 📊 **Dashboard** | Stats cards + bar, line, and doughnut charts via Chart.js |
| ⏱ **Pomodoro Timer** | Animated ring timer with session logging and task linking |
| 🌙 **Dark Mode** | Full dark theme, persisted across sessions |
| 🎨 **Task Categories** | Color-code tasks as Study, Health, Personal, Creative, Fitness |
| 📄 **PDF Export** | Download your monthly tracker as a formatted PDF |
| 🎉 **Confetti** | Celebration animation when you complete 100% of daily tasks |
| ↩ **Undo Delete** | 6-second undo when you accidentally delete a task |
| 💬 **Daily Quotes** | A fresh motivational quote every day |
| ⌨ **Keyboard Shortcuts** | `T` today · `N` new task · `P` pomodoro · `D` dark mode |
| ☁ **Cloud Sync** | All data saved to Firebase Firestore, syncs across devices |

---

## 🛠 Tech Stack

- **Frontend** — HTML5, CSS3, Vanilla JavaScript 
- **Auth** — Firebase Authentication (Email/Password + Google Sign-In)
- **Database** — Firebase Firestore (NoSQL, real-time sync)
- **Charts** — Chart.js v4
- **PDF** — jsPDF + jsPDF-AutoTable
- **Deployment** — Vercel 

---

## 📁 Project Structure

```
habit-tracker/
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # Full design system (light + dark theme)
└── js/
    ├── firebase-config.js  # 🔧 Your Firebase credentials go here
    ├── auth.js             # Login, signup, Google OAuth, logout
    ├── tracker.js          # Core grid, checkboxes, sparklines, PDF, confetti
    ├── dashboard.js        # Stats cards + Chart.js charts
    ├── heatmap.js          # GitHub-style heatmap with task filter
    ├── pomodoro.js         # Timer, session log, notifications
    ├── extras.js           # Dark mode, quotes, keyboard shortcuts
    └── app.js              # Navigation, sidebar, toast
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/studylog-tracker.git
cd studylog-tracker
```

### 2. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password + Google
4. Create a **Firestore Database** (production mode)
5. Set Firestore **Security Rules** (see below)
6. Register a **Web App** and copy the config

### 3. Add your Firebase config

Open `js/firebase-config.js` and replace the placeholders:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 4. Run locally

Install the **Live Server** extension in VS Code, then right-click `index.html` → **Open with Live Server**.

> ⚠️ Don't open `index.html` directly as a file — Firebase requires an HTTP server.

---

## 🔒 Firestore Security Rules

In Firebase Console → Firestore → **Rules** tab, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only access their own data.

---


## ⌨ Keyboard Shortcuts

| Key | Action |
|---|---|
| `T` | Jump to today's row in the tracker |
| `N` | Focus the new task input |
| `P` | Open Pomodoro timer |
| `D` | Toggle dark / light mode |
| `Esc` | Close remarks panel |

---

## 🗂 Firestore Data Structure

```
users/
  {userId}/
    config/
      tasks: { list: [ { id, name, category }, ... ] }
    months/
      "2026-05": {
        cells: {
          "2026-05-01": { taskId1: true, taskId2: false },
          ...
        },
        remarks: {
          "2026-05-01": "Great study session today!",
          ...
        }
      }
```

---

## 📊 Dashboard Charts

- **Daily Completion Bar Chart** — color-coded green/amber/red by completion %
- **Weekly Progress Line Chart** — smooth curve showing weekly averages
- **Task-wise Doughnut Chart** — how many days each task was completed, colored by category

---

## 🍅 Pomodoro Timer

- 3 modes: **Focus** (25 min), **Short Break** (5 min), **Long Break** (15 min)
- Fully customizable durations
- Animated SVG ring that drains as time passes
- Auto-switches to break after focus, and back to focus after break
- Plays a beep sound and sends a **browser notification** on completion
- Links to a task — auto-checks it in today's tracker when a focus session finishes
- Session log with timestamps shown for the day

---

## 🔥 Heatmap

- GitHub-style grid with 5 intensity levels (0–4)
- Filter by individual task or view all tasks combined
- Hover any cell for a tooltip showing exact date and completion %
- Today's cell has an accent outline
- Shows active days, perfect days (100%), and current streak below the grid

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 👤 Author

Built with ☕ and 🎯 focus sessions.

> *"The secret of getting ahead is getting started." — Mark Twain*
