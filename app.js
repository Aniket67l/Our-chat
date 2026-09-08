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
  onValue
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


/* =====================================================
   FIREBASE CONFIG
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBfESDPYSGQKP6gMJ89f1dVQKEjO7MFZOA",
  authDomain: "ourchat-85aa3.firebaseapp.com",
  projectId: "ourchat-85aa3",
  storageBucket: "ourchat-85aa3.firebasestorage.app",
  messagingSenderId: "1099352092551",
  appId: "1:1099352092551:web:e5fb057ea955b16fe9ed22"
};

/* =====================================================
   FIREBASE
   ===================================================== */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);


/* =====================================================
   USERNAME → INTERNAL FIREBASE ACCOUNT
   ===================================================== */

const accounts = {

  aniket:
    "aniket@ourspace.local",

  pari:
    "pari@ourspace.local"

};


/* =====================================================
   ELEMENTS
   ===================================================== */

const loginScreen =
  document.getElementById("loginScreen");

const chatScreen =
  document.getElementById("chatScreen");

const loginForm =
  document.getElementById("loginForm");

const usernameInput =
  document.getElementById("username");

const passwordInput =
  document.getElementById("password");

const loginError =
  document.getElementById("loginError");

const messageForm =
  document.getElementById("messageForm");

const messageInput =
  document.getElementById("messageInput");

const messages =
  document.getElementById("messages");

const emptyState =
  document.getElementById("emptyState");

const logoutBtn =
  document.getElementById("logoutBtn");

const statusText =
  document.getElementById("status");

const partnerName =
  document.getElementById("partnerName");


/* =====================================================
   LOGIN
   ===================================================== */

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  loginError.textContent = "";

  const username =
    usernameInput.value
      .trim()
      .toLowerCase();

  const password =
    passwordInput.value;


  /*
     Only these two usernames are accepted.
  */

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

  }

  catch (error) {

    console.error(
      "Firebase Login Error:",
      error
    );

    loginError.textContent =
      "Wrong username or password.";

  }

});


/* =====================================================
   AUTH STATE
   ===================================================== */

onAuthStateChanged(auth, (user) => {

  if (user) {

    loginScreen.classList.add("hidden");

    chatScreen.classList.remove("hidden");

    statusText.textContent =
      "Online";

    const username =
      getUsernameFromEmail(user.email);

    partnerName.textContent =
      username === "aniket"
        ? "Our Space"
        : "Our Space";

    startChat();

  }

  else {

    chatScreen.classList.add("hidden");

    loginScreen.classList.remove("hidden");

    statusText.textContent =
      "Offline";

  }

});


/* =====================================================
   GET USERNAME
   ===================================================== */

function getUsernameFromEmail(email) {

  if (!email) return "";

  if (email === accounts.aniket) {
    return "aniket";
  }

  if (email === accounts.chulbul) {
    return "chulbul";
  }

  return "";

}


/* =====================================================
   SEND MESSAGE
   ===================================================== */

messageForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    alert("You are not logged in.");
    return;
  }

  const text = messageInput.value.trim();

  if (!text) return;

  try {

    await push(ref(db, "messages"), {

      text: text,

      uid: user.uid,

      timestamp: Date.now()

    });

    messageInput.value = "";

    messageInput.focus();

  } catch (error) {

    console.error("MESSAGE ERROR:", error);

    alert(
      "Message send nahi hua:\n" +
      error.code +
      "\n" +
      error.message
    );

  }

});


    messageInput.value = "";

    messageInput.focus();

  }

  catch (error) {

    console.error(
      "Message Error:",
      error
    );

    alert(
      "Message send nahi hua."
    );

  }

});


/* =====================================================
   REAL-TIME CHAT
   ===================================================== */

function startChat() {

  const messagesRef =
    ref(db, "messages");


  onValue(
    messagesRef,
    (snapshot) => {

      messages.innerHTML = "";


      const data =
        snapshot.val();


      if (!data) {

        messages.appendChild(
          emptyState
        );

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


      list.forEach(
        renderMessage
      );


      messages.scrollTop =
        messages.scrollHeight;

    }
  );

}


/* =====================================================
   DISPLAY MESSAGE
   ===================================================== */

function renderMessage(message) {

  const user =
    auth.currentUser;


  const div =
    document.createElement("div");


  const mine =
    user &&
    message.uid === user.uid;


  div.className =
    mine
      ? "message mine"
      : "message theirs";


  const text =
    document.createElement("div");


  /*
     textContent prevents
     HTML injection.
  */

  text.textContent =
    message.text;


  const time =
    document.createElement("span");


  time.className =
    "message-time";


  time.textContent =
    formatTime(
      message.timestamp
    );


  div.appendChild(text);

  div.appendChild(time);

  messages.appendChild(div);

}


/* =====================================================
   TIME
   ===================================================== */

function formatTime(timestamp) {

  if (!timestamp) {
    return "...";
  }


  return new Date(timestamp)
    .toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


/* =====================================================
   LOGOUT
   ===================================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    await signOut(auth);

  }
);
