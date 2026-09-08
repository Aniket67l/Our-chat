import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  onValue,
  set,
  update,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBfESDPYSGQKP6gMJ89f1dVQKEjO7MFZOA",
  authDomain: "ourchat-85aa3.firebaseapp.com",
  databaseURL: "https://ourchat-85aa3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ourchat-85aa3",
  storageBucket: "ourchat-85aa3.firebasestorage.app",
  messagingSenderId: "1099352092551",
  appId: "1:1099352092551:web:e5fb057ea955b16fe9ed22"
};


/* =========================================
   FIREBASE
========================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


/* =========================================
   ACCOUNTS
========================================= */

const accounts = {
  aniket: "aniket@ourspace.local",
  pari: "pari@ourspace.local"
};


/* =========================================
   ELEMENTS
========================================= */

const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const messages = document.getElementById("messages");
const emptyState = document.getElementById("emptyState");

const logoutBtn = document.getElementById("logoutBtn");
const statusText = document.getElementById("status");


/* =========================================
   VARIABLES
========================================= */

let currentUser = null;
let currentUsername = null;
let partnerUid = null;

let typingTimer = null;
let chatStarted = false;


/* =========================================
   LOGIN
========================================= */

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  loginError.textContent = "";

  const username =
    usernameInput.value.trim().toLowerCase();

  const password =
    passwordInput.value;

  if (!accounts[username]) {

    loginError.textContent =
      "Username not found.";

    return;
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      accounts[username],
      password
    );

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error.code,
      error.message
    );

    loginError.textContent =
      "Wrong username or password.";
  }

});


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    currentUser = null;
    currentUsername = null;

    chatScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    return;
  }

  currentUser = user;

  currentUsername =
    user.email === accounts.aniket
      ? "aniket"
      : "pari";

  partnerUid = null;

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  if (!chatStarted) {

    chatStarted = true;

    startChat();
    startPresence();
    findPartner();

  }

});


/* =========================================
   FIND PARTNER UID
========================================= */

function findPartner() {

  const presenceRef =
    ref(db, "presence");

  onValue(presenceRef, (snapshot) => {

    const data = snapshot.val();

    if (!data) return;

    const myUid = currentUser.uid;

    const possiblePartner =
      Object.keys(data)
        .find(uid => uid !== myUid);

    if (possiblePartner) {

      partnerUid = possiblePartner;

    }

  });

}


/* =========================================
   PRESENCE
========================================= */

function startPresence() {

  const uid = currentUser.uid;

  const connectedRef =
    ref(db, ".info/connected");

  const userStatusRef =
    ref(db, `presence/${uid}`);

  onValue(connectedRef, async (snapshot) => {

    if (snapshot.val() !== true) {

      return;
    }

    await onDisconnect(userStatusRef)
      .set({
        state: "offline",
        lastSeen: Date.now()
      });

    await set(userStatusRef, {

      state: "online",

      lastSeen: Date.now()

    });

    watchPartnerPresence();

  });

}


/* =========================================
   WATCH PARTNER PRESENCE
========================================= */

function watchPartnerPresence() {

  const presenceRef =
    ref(db, "presence");

  onValue(presenceRef, (snapshot) => {

    const data = snapshot.val();

    if (!data) {

      statusText.textContent =
        "Offline";

      return;
    }

    const myUid =
      currentUser.uid;

    const otherUid =
      Object.keys(data)
        .find(uid => uid !== myUid);

    if (!otherUid) {

      statusText.textContent =
        "Offline";

      return;
    }

    partnerUid = otherUid;

    const partner =
      data[otherUid];

    if (partner.state === "online") {

      statusText.textContent =
        "Online";

    } else {

      statusText.textContent =
        formatLastSeen(partner.lastSeen);

    }

  });

}


/* =========================================
   LAST SEEN
========================================= */

function formatLastSeen(timestamp) {

  if (!timestamp) {

    return "Offline";

  }

  const date =
    new Date(timestamp);

  const time =
    date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  return `Last seen ${time}`;

}


/* =========================================
   SEND MESSAGE
========================================= */

messageForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (!currentUser) return;

  const text =
    messageInput.value.trim();

  if (!text) return;

  try {

    const newMessageRef =
      push(ref(db, "messages"));

    await set(newMessageRef, {

      text: text,

      uid: currentUser.uid,

      timestamp: Date.now(),

      readBy: {
        [currentUser.uid]: true
      }

    });

    messageInput.value = "";

    await set(
      ref(db, `typing/${currentUser.uid}`),
      false
    );

    messageInput.focus();

  } catch (error) {

    console.error(
      "MESSAGE ERROR:",
      error.code,
      error.message
    );

    alert(
      "Message send nahi hua.\n\n" +
      error.code +
      "\n" +
      error.message
    );

  }

});


/* =========================================
   TYPING INDICATOR
========================================= */

messageInput.addEventListener("input", async () => {

  if (!currentUser) return;

  const typingRef =
    ref(db, `typing/${currentUser.uid}`);

  await set(typingRef, true);

  clearTimeout(typingTimer);

  typingTimer =
    setTimeout(async () => {

      await set(
        typingRef,
        false
      );

    }, 1200);

});


/* =========================================
   WATCH PARTNER TYPING
========================================= */

function watchTyping() {

  const typingRef =
    ref(db, "typing");

  onValue(typingRef, (snapshot) => {

    const data = snapshot.val();

    if (!data || !partnerUid) return;

    if (data[partnerUid] === true) {

      statusText.textContent =
        "typing...";

    } else {

      watchPartnerPresence();

    }

  });

}


/* =========================================
   LOAD CHAT
========================================= */

function startChat() {

  const messagesRef =
    ref(db, "messages");

  onValue(messagesRef, async (snapshot) => {

    messages.innerHTML = "";

    const data =
      snapshot.val();

    if (!data) {

      messages.appendChild(emptyState);

      return;
    }

    const list =
      Object.entries(data)
        .map(([id, message]) => ({
          id,
          ...message
        }))
        .sort(
          (a, b) =>
            (a.timestamp || 0) -
            (b.timestamp || 0)
        );


    for (const message of list) {

      renderMessage(message);

      /*
        If this message belongs to the other person,
        mark it as read.
      */

      if (
        currentUser &&
        message.uid !== currentUser.uid
      ) {

        if (
          !message.readBy ||
          !message.readBy[currentUser.uid]
        ) {

          await update(
            ref(
              db,
              `messages/${message.id}/readBy`
            ),
            {
              [currentUser.uid]: true
            }
          );

        }

      }

    }

    messages.scrollTop =
      messages.scrollHeight;

  });

  watchTyping();

}


/* =========================================
   RENDER MESSAGE
========================================= */

function renderMessage(message) {

  const div =
    document.createElement("div");

  const mine =
    currentUser &&
    message.uid === currentUser.uid;

  div.className =
    mine
      ? "message mine"
      : "message theirs";


  const text =
    document.createElement("div");

  text.textContent =
    message.text;


  const meta =
    document.createElement("div");

  meta.className =
    "message-meta";


  const time =
    document.createElement("span");

  time.textContent =
    formatTime(message.timestamp);


  meta.appendChild(time);


  /*
     Read receipt
  */

  if (mine) {

    const tick =
      document.createElement("span");

    tick.className =
      "read-tick";

    const isRead =
      message.readBy &&
      partnerUid &&
      message.readBy[partnerUid];

    tick.textContent =
      isRead
        ? "✓✓"
        : "✓";

    meta.appendChild(tick);

  }


  div.appendChild(text);
  div.appendChild(meta);

  messages.appendChild(div);

}


/* =========================================
   TIME
========================================= */

function formatTime(timestamp) {

  if (!timestamp) return "...";

  return new Date(timestamp)
    .toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


/* =========================================
   LOGOUT
========================================= */

logoutBtn.addEventListener(
  "click",
  async () => {

    if (currentUser) {

      await set(
        ref(
          db,
          `presence/${currentUser.uid}`
        ),
        {
          state: "offline",
          lastSeen: Date.now()
        }
      );

      await set(
        ref(
          db,
          `typing/${currentUser.uid}`
        ),
        false
      );

    }

    chatStarted = false;

    await signOut(auth);

  }
);
