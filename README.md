# DABubble

A modern Slack‑style chat application built with **Angular 17**, **Tailwind CSS**, and **Firebase**. Real‑time messaging, channels, reactions, and a clean, responsive UI.


## ✨ Features

- 🔥 **Real‑time chat** powered by Firebase (Firestore/RTDB) & Angular
- 👥 **Channels** (public/private) and **direct messages**
- 🧵 **Threads** and in‑context replies
- 😀 **Emoji reactions** (and message editing/deletion)
- 🏷️ **Mentions** `@user` and `#channel`
- 🟢 **Online / offline / last‑seen** presence indicators
- 💬 **Typing indicators** and read receipts (optional)
- 🎨 **Responsive UI/UX** with Tailwind and accessible components
- 🔐 **Auth** with Email/Password and Google Sign‑In (Firebase Authentication)

## 🖼️ Screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/alessandro-arg/assets/main/dashboard.png">
    <img src="https://raw.githubusercontent.com/alessandro-arg/assets/main/dashboard.png" alt="Dashboard" height="300">
  </a>
  <a href="https://raw.githubusercontent.com/alessandro-arg/assets/main/thread.png">
    <img src="https://raw.githubusercontent.com/alessandro-arg/assets/main/thread.png" alt="Channel with thread" height="300">
  </a>
  <br>
  <a href="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile.png">
    <img src="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile.png" alt="Mobile" height="365">
  </a>&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile2.png">
    <img src="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile2.png" alt="Mobile" height="365">
  </a>&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile3.png">
    <img src="https://raw.githubusercontent.com/alessandro-arg/assets/main/mobile3.png" alt="Mobile" height="365">
  </a>
</p>

## 🚀 Demo

**Download** the demo:

[![Watch the demo](https://raw.githubusercontent.com/alessandro-arg/assets/main/dashboard.png)](https://raw.githubusercontent.com/alessandro-arg/assets/main/dabubble-video-16.mp4)

## 🧱 Tech Stack

- **Angular 17** (standalone components)
- **Typescript**
- **Tailwind CSS**
- **Firebase**: Authentication, Firestore, RTDB, Storage
- **AngularFire** for Firebase integration
- **PNPM/NPM** scripts for development and deployment

## 🗂️ Project Structure

```text
.
├─ angular.json
├─ .editorconfig
├─ .gitignore
├─ .htaccess
└─ src/
   ├─ app/
   │  ├─ auth/
   │  │  ├─ auth.service.spec.ts
   │  │  └─ auth.service.ts
   │  ├─ components/
   │  │  ├─ add-members-modal/
   │  │  ├─ chat/
   │  │  ├─ chat-input/
   │  │  ├─ chat-message-edit/
   │  │  ├─ date-separator/
   │  │  ├─ group-chat-empty/
   │  │  ├─ group-header/
   │  │  ├─ group-members-modal/
   │  │  ├─ group-message-bubble/
   │  │  ├─ group-settings-modal/
   │  │  ├─ hover-menu/
   │  │  ├─ impressum/
   │  │  ├─ intro/
   │  │  ├─ landing-page/
   │  │  ├─ login/
   │  │  ├─ new-message-header/
   │  │  ├─ privacy-policy/
   │  │  ├─ private-chat-empty/
   │  │  ├─ private-message-bubble/
   │  │  ├─ profile-modal/
   │  │  ├─ reaction-bar/
   │  │  ├─ searchbar/
   │  │  ├─ thread/
   │  │  ├─ user-list/
   │  │  └─ workspace-toggle-button/
   │  ├─ models/
   │  ├─ services/
   │  ├─ app.component.html
   │  ├─ app.component.scss
   │  ├─ app.component.spec.ts
   │  ├─ app.component.ts
   │  ├─ app.config.server.ts
   │  ├─ app.config.ts
   │  ├─ app.routes.ts
   │  ├─ auth.guard.spec.ts
   │  └─ auth.guard.ts
   ├─ assets/
   ├─ environments/
   ├─ index.html
   ├─ main.server.ts
   ├─ main.ts
   └─ styles.scss
```

## 🛠️ Setup & Development

### 1) Prerequisites

- Node.js 18+
- PNPM or NPM
- Firebase project (console) with Authentication, Firestore/RTDB, Storage, and Hosting enabled

### 2) Clone & install

```bash
git clone https://github.com/alessandro-arg/da-bubble.git
cd da-bubble
# choose one package manager
npm install
# or
pnpm install
```

### 3) Environment variables

Create `src/environments/environment.ts` (and `environment.prod.ts`) with your Firebase config:

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: 'TODO',
    authDomain: 'TODO',
    projectId: 'TODO',
    storageBucket: 'TODO',
    messagingSenderId: 'TODO',
    appId: 'TODO'
  }
};
```

If you're using AngularFire `provideFirebaseApp`, `provideAuth`, etc., ensure they're wired in your `app.config.ts`.

### 4) Run locally

```bash
npm run start    # alias for ng serve
# or
ng serve
```

Open [http://localhost:4200](http://localhost:4200) and the app will auto‑reload on changes.

## 🔐 Authentication

- Email/Password and Google sign‑in via Firebase Auth
- Route guards to protect authenticated views
- Per‑user data isolation (security rules below)

## 🧾 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Users ─────────────────────────────────────────
   match /users/{userId} {
      allow read:   if request.auth != null;
      allow create: if request.auth != null
                    && request.auth.uid == userId;
      allow update: if request.auth != null
                    && request.auth.uid == userId;
      allow delete: if false;
    }

    // ── Private Chats ─────────────────────────────────
    match /chats/{chatId} {
      // create a chat only if you’re one of the participants
      allow create: if request.auth != null
                    && request.resource.data.participants is list
                    && request.auth.uid in request.resource.data.participants;

      // only participants can read/update/delete the chat document
      allow read, update, delete: if request.auth != null
                                  && resource.data.participants is list
                                  && request.auth.uid in resource.data.participants;

      match /messages/{messageId} {
        // only participants can read messages
        allow read:   if request.auth != null
                      && get(/databases/$(database)/documents/chats/$(chatId))
                           .data.participants
                           .hasAny([request.auth.uid]);

        // only participants can post messages, and sender must match
        allow create: if request.auth != null
                      && get(/databases/$(database)/documents/chats/$(chatId))
                           .data.participants
                           .hasAny([request.auth.uid])
                      && request.resource.data.sender == request.auth.uid;

        // allow any participant to update (e.g. for reactions)
        allow update: if request.auth != null
                      && get(/databases/$(database)/documents/chats/$(chatId))
                           .data.participants
                           .hasAny([request.auth.uid]);

        allow delete: if false;
      }
    }

    // ── Groups ────────────────────────────────────────
    match /groups/{groupId} {
      allow read:   if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false;

      match /messages/{messageId} {
        // any authenticated user can read or post group messages
        allow read:   if request.auth != null;
        allow create: if request.auth != null;

        // any authenticated user can update (e.g. reactions)
        allow update: if request.auth != null;

        allow delete: if false;

        // ── Threads under each group message ───────────
        match /threads/{threadId} {
          // allow listing & reading all replies
          allow read: if request.auth != null;

          // allow posting a new reply only if you're signed in
          // and you claim yourself as the sender
          allow create: if request.auth != null
                        && request.resource.data.sender == request.auth.uid;

          allow update: if request.auth != null;
          allow delete: if false;
        }
      }
    }
  }
}

```

## 📦 Scripts

Common Angular scripts (adjust to match your `package.json`):

```json
{
   "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "serve:ssr:da-bubble": "node dist/da-bubble/server/server.mjs"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^17.0.6",
    "@angular/cdk": "^17.3.10",
    "@angular/common": "^17.0.6",
    "@angular/compiler": "^17.0.6",
    "@angular/core": "^17.0.6",
    "@angular/fire": "^17.1.0",
    "@angular/forms": "^17.0.6",
    "@angular/platform-browser": "^17.0.6",
    "@angular/platform-browser-dynamic": "^17.0.6",
    "@angular/platform-server": "^17.0.6",
    "@angular/router": "^17.0.6",
    "@angular/ssr": "^17.0.6",
    "angular-mentions": "^1.5.0",
    "express": "^4.18.2",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.2"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.6",
    "@angular/cli": "^17.0.6",
    "@angular/compiler-cli": "^17.0.6",
    "@angular/language-service": "^17.0.6",
    "@types/express": "^4.17.17",
    "@types/jasmine": "~5.1.0",
    "@types/node": "^18.18.0",
    "autoprefixer": "^10.4.21",
    "emoji-picker-element": "^1.26.3",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.2.2"
  }
}
```

## 🧩 Architecture Notes

- **State**: keep UI state local; derive data from Firestore queries and indexes
- **Performance**: use `onSnapshot`/AngularFire streams, batched writes, and indexes
- **Accessibility**: Tailwind + ARIA roles; ensure keyboard navigation across chat
- **Testing**: unit tests for services/pipes; component tests for chat input and message list

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

I use Conventional Commits and PR templates (optional). Keep components small, typed, and accessible.

## 🧑‍💻 Maintainers

- **Alessandro Argenziano** – [@alessandro-arg](https://github.com/alessandro-arg)

## 📄 License

This project is licensed under the **MIT License** – see `LICENSE` for details.

## 🙏 Acknowledgements

- Angular & AngularFire teams
- Tailwind CSS
- Firebase Emulator Suite
- Emoji assets

## 📬 Contact

For questions, feature requests, or collaboration:

- Open an issue: [https://github.com/alessandro-arg/da-bubble/issues](https://github.com/alessandro-arg/da-bubble/issues)
- Or reach out to **contact@alessandro-argenziano.com**
- Have a look at my [portfolio](https://alessandro-argenziano.com)

