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


/* =====================================================
   FIREBASE CONFIG
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBfESDPYSGQKP6gMJ89f1dVQKEjO7MFZOA",
  authDomain: "ourchat-85aa3.firebaseapp.com",
  databaseURL: "https://ourchat-85aa3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ourchat-85aa3",
  storageBucket: "ourchat-85aa3.firebasestorage.app",
  messagingSenderId: "1099352092551",
  appId: "1:1099352092551:web:e5fb057ea955b16fe9ed22"
};


/* =====================================================
   INITIALIZE FIREBASE
===================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


/* =====================================================
   ACCOUNTS
===================================================== */

const accounts = {
  aniket: "aniket@ourspace.local",
  pari: "pari@ourspace.local"
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


/* =====================================================
   STATE
===================================================== */

let currentUser = null;
let currentUsername = null;
let partnerUid = null;

let typingTimer = null;

let presenceStarted = false;
let chatStarted = false;
let typingStarted = false;


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


/* =====================================================
   AUTH STATE
===================================================== */

onAuthStateChanged(auth, (user) => {

  if (!user) {

    currentUser = null;
    currentUsername = null;
    partnerUid = null;

    presenceStarted = false;
    chatStarted = false;
    typingStarted = false;

    chatScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    return;
  }


  currentUser = user;


  if (user.email === accounts.aniket) {

    currentUsername = "aniket";

  } else {

    currentUsername = "pari";

  }


  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");


  if (!chatStarted) {

    chatStarted = true;

    startChat();

  }


  if (!presenceStarted) {

    startPresence();

  }


  if (!typingStarted) {

    startTyping();

  }

});


/* =====================================================
   REAL-TIME PRESENCE
===================================================== */

function startPresence() {

  if (!currentUser || presenceStarted) {
    return;
  }

  presenceStarted = true;


  const uid =
    currentUser.uid;


  const connectedRef =
    ref(db, ".info/connected");


  const myPresenceRef =
    ref(db, `presence/${uid}`);


  onValue(
    connectedRef,
    async (snapshot) => {

      const connected =
        snapshot.val() === true;


      console.log(
        "Firebase connected:",
        connected
      );


      if (!connected) {

        statusText.textContent =
          "Connecting...";

        return;
      }


      try {

        /*
          If browser closes,
          Firebase automatically changes
          this user to offline.
        */

        await onDisconnect(
          myPresenceRef
        ).set({

          username:
            currentUsername,

          state:
            "offline",

          lastSeen:
            Date.now()

        });


        /*
          Set ourselves online.
        */

        await set(
          myPresenceRef,
          {

            username:
              currentUsername,

            state:
              "online",

            lastSeen:
              Date.now()

          }
        );


        console.log(
          "Presence updated:",
          currentUsername
        );


        watchPartnerPresence();


      } catch (error) {

        console.error(
          "PRESENCE ERROR:",
          error
        );

        statusText.textContent =
          "Connection error";

      }

    }
  );

}


/* =====================================================
   WATCH PARTNER ONLINE STATUS
===================================================== */

function watchPartnerPresence() {

  const presenceRef =
    ref(db, "presence");


  onValue(
    presenceRef,
    (snapshot) => {

      const data =
        snapshot.val();


      if (!data) {

        statusText.textContent =
          "Offline";

        partnerUid = null;

        return;
      }


      /*
        We already know the two usernames.
        So find the other person's presence.
      */

      const partnerUsername =
        currentUsername === "aniket"
          ? "pari"
          : "aniket";


      const partnerEntry =
        Object.entries(data)
          .find(
            ([uid, person]) => {

              return (
                person &&
                person.username ===
                  partnerUsername
              );

            }
          );


      if (!partnerEntry) {

        statusText.textContent =
          "Offline";

        partnerUid = null;

        return;
      }


      const [uid, partner] =
        partnerEntry;


      partnerUid = uid;


      if (partner.state === "online") {

        statusText.textContent =
          "Online";

      } else {

        statusText.textContent =
          formatLastSeen(
            partner.lastSeen
          );

      }

    },

    (error) => {

      console.error(
        "PRESENCE READ ERROR:",
        error
      );

      statusText.textContent =
        "Connection error";

    }

  );

}


/* =====================================================
   LAST SEEN
===================================================== */

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


/* =====================================================
   SEND MESSAGE
===================================================== */

messageForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!currentUser) {

      alert(
        "You are not logged in."
      );

      return;
    }


    const text =
      messageInput.value.trim();


    if (!text) {

      return;

    }


    try {

      const messageRef =
        push(
          ref(db, "messages")
        );


      await set(
        messageRef,
        {

          text:
            text,

          uid:
            currentUser.uid,

          timestamp:
            Date.now(),

          readBy: {

            [currentUser.uid]:
              true

          }

        }
      );


      messageInput.value = "";


      /*
        Stop typing after sending.
      */

      await set(
        ref(
          db,
          `typing/${currentUser.uid}`
        ),
        false
      );


      clearTimeout(
        typingTimer
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

  }
);


/* =====================================================
   TYPING INDICATOR
===================================================== */

function startTyping() {

  if (typingStarted) {
    return;
  }

  typingStarted = true;


  messageInput.addEventListener(
    "input",
    async () => {

      if (!currentUser) {
        return;
      }


      const typingRef =
        ref(
          db,
          `typing/${currentUser.uid}`
        );


      try {

        await set(
          typingRef,
          true
        );


        clearTimeout(
          typingTimer
        );


        typingTimer =
          setTimeout(
            async () => {

              await set(
                typingRef,
                false
              );

            },
            1200
          );


      } catch (error) {

        console.error(
          "TYPING ERROR:",
          error
        );

      }

    }
  );


  watchPartnerTyping();

}


/* =====================================================
   WATCH PARTNER TYPING
===================================================== */

function watchPartnerTyping() {

  const typingRef =
    ref(db, "typing");


  onValue(
    typingRef,
    (snapshot) => {

      const data =
        snapshot.val();


      if (!data || !partnerUid) {

        return;

      }


      if (
        data[partnerUid] === true
      ) {

        statusText.textContent =
          "typing...";

      } else {

        /*
          Typing stopped.
          Re-check actual online status.
        */

        watchPartnerPresence();

      }

    }
  );

}


/* =====================================================
   LOAD REAL-TIME CHAT
===================================================== */

function startChat() {

  const messagesRef =
    ref(db, "messages");


  onValue(
    messagesRef,
    async (snapshot) => {

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
          .map(
            ([id, message]) => ({

              id,

              ...message

            })
          )
          .sort(
            (a, b) =>
              (a.timestamp || 0) -
              (b.timestamp || 0)
          );


      for (
        const message
        of list
      ) {

        renderMessage(
          message
        );


        /*
          Mark messages from the
          other person as read.
        */

        if (
          currentUser &&
          message.uid !==
            currentUser.uid
        ) {

          const alreadyRead =
            message.readBy &&
            message.readBy[
              currentUser.uid
            ];


          if (!alreadyRead) {

            try {

              await update(
                ref(
                  db,
                  `messages/${message.id}/readBy`
                ),
                {

                  [currentUser.uid]:
                    true

                }
              );

            } catch (error) {

              console.error(
                "READ RECEIPT ERROR:",
                error
              );

            }

          }

        }

      }


      messages.scrollTop =
        messages.scrollHeight;

    },

    (error) => {

      console.error(
        "DATABASE READ ERROR:",
        error
      );

    }

  );

}


/* =====================================================
   RENDER MESSAGE
===================================================== */

function renderMessage(message) {

  const div =
    document.createElement("div");


  const mine =
    currentUser &&
    message.uid ===
      currentUser.uid;


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


  time.className =
    "message-time";


  time.textContent =
    formatTime(
      message.timestamp
    );


  meta.appendChild(
    time
  );


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
      message.readBy[
        partnerUid
      ] === true;


    tick.textContent =
      isRead
        ? "✓✓"
        : "✓";


    meta.appendChild(
      tick
    );

  }


  div.appendChild(
    text
  );


  div.appendChild(
    meta
  );


  messages.appendChild(
    div
  );

}


/* =====================================================
   MESSAGE TIME
===================================================== */

function formatTime(timestamp) {

  if (!timestamp) {

    return "...";

  }


  return new Date(
    timestamp
  ).toLocaleTimeString(
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

    if (currentUser) {

      try {

        await set(
          ref(
            db,
            `presence/${currentUser.uid}`
          ),
          {

            username:
              currentUsername,

            state:
              "offline",

            lastSeen:
              Date.now()

          }
        );


        await set(
          ref(
            db,
            `typing/${currentUser.uid}`
          ),
          false
        );

      } catch (error) {

        console.error(
          "LOGOUT PRESENCE ERROR:",
          error
        );

      }

    }


    clearTimeout(
      typingTimer
    );


    await signOut(
      auth
    );

  }
);
