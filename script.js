  // ======================================
// CHATBOX - COMPLETE JAVASCRIPT
// ======================================

// 1. FIREBASE CONFIGURATION
// Keep your existing Firebase values here.
const firebaseConfig = {
  apiKey: "AIzaSyBP4HM0L7EJvz3Atj2cMocTjWKKzNI_mXY",
  authDomain: "chatbox-e8d52.firebaseapp.com",
  projectId: "chatbox-e8d52",
  storageBucket: "chatbox-e8d52.firebasestorage.app",
  messagingSenderId: "89327564912",
  appId: "1:89327564912:web:eb98e2d77ee674f3931cb5",
  measurementId: "G-459B25YBLT"
};

// 2. INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// 3. GLOBAL VARIABLES
let isRegisterMode = false;
let currentChatUser = null;
let currentChatId = null;
let messagesUnsubscribe = null;
let allUsers = [];

// 4. HTML ELEMENTS
const authSection = document.getElementById("authSection");
const homeSection = document.getElementById("homeSection");
const authForm = document.getElementById("authForm");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const switchText = document.getElementById("switchText");
const message = document.getElementById("message");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

const usersSection = document.getElementById("usersSection");
const searchUsers = document.getElementById("searchUsers");
const usersList = document.getElementById("usersList");

const chatSection = document.getElementById("chatSection");
const backToUsersBtn = document.getElementById("backToUsersBtn");
const chatWithName = document.getElementById("chatWithName");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const editName = document.getElementById("editName");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileMessage = document.getElementById("profileMessage");
// 5. LOGIN / REGISTER SWITCH
switchBtn.addEventListener("click", function() {
  isRegisterMode = !isRegisterMode;

  nameInput.style.display = isRegisterMode ? "block" : "none";
  nameInput.required = isRegisterMode;

  formTitle.textContent = isRegisterMode
    ? "Create Account"
    : "Login";

  submitBtn.textContent = isRegisterMode
    ? "Register"
    : "Login";

  switchText.textContent = isRegisterMode
    ? "Already have an account?"
    : "Don't have an account?";

  switchBtn.textContent = isRegisterMode
    ? "Login"
    : "Register";

  message.textContent = "";
});

// 6. LOGIN AND REGISTRATION
authForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  message.textContent = "Please wait...";

  try {
    if (isRegisterMode) {

      if (!name) {
        message.textContent = "Enter your name.";
        return;
      }

      const result = await auth.createUserWithEmailAndPassword(
        email,
        password
      );

      await result.user.updateProfile({
        displayName: name
      });

      await db.collection("users").doc(result.user.uid).set({
        name: name,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      message.textContent = "Account created successfully!";

    } else {

      await auth.signInWithEmailAndPassword(email, password);

      message.textContent = "Login successful!";
    }

  } catch(error) {
    message.textContent = error.message;
  }
});

// 7. CHECK LOGIN STATUS
auth.onAuthStateChanged(async function(user) {

  if (user) {

    authSection.style.display = "none";
    homeSection.style.display = "block";

    usersSection.style.display = "block";
    chatSection.style.display = "none";

    userName.textContent = user.displayName || "User";
    userEmail.textContent = user.email || "";

    await loadUsers();

  } else {

    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }

    authSection.style.display = "block";
    homeSection.style.display = "none";

    currentChatUser = null;
    currentChatId = null;
  }
});

// 8. LOAD USERS
async function loadUsers() {

  usersList.textContent = "Loading users...";

  try {

    const snapshot = await db.collection("users").get();

    allUsers = [];

    snapshot.forEach(function(doc) {

      if (doc.id !== auth.currentUser.uid) {

        allUsers.push({
          ...doc.data(),
          uid: doc.id
        });

      }

    });

    displayUsers(allUsers);

  } catch(error) {

    usersList.textContent = "Error: " + error.message;

  }
}

// 9. DISPLAY USERS
function displayUsers(users) {

  usersList.innerHTML = "";

  if (users.length === 0) {
    usersList.textContent = "No users found.";
    return;
  }

  users.forEach(function(user) {

    const userItem = document.createElement("div");

    userItem.className = "user-item";

    const userLabel = document.createElement("span");
    userLabel.textContent = user.name || "User";

    userItem.appendChild(userLabel);

    userItem.addEventListener("click", function() {
      openChat(user);
    });

    usersList.appendChild(userItem);

  });
}

// 10. SEARCH USERS
searchUsers.addEventListener("input", function() {

  const searchText = searchUsers.value.toLowerCase().trim();

  const filteredUsers = allUsers.filter(function(user) {

    return (user.name || "")
      .toLowerCase()
      .includes(searchText);

  });

  displayUsers(filteredUsers);

});

// 11. OPEN CHAT
function openChat(user) {

  currentChatUser = user;

  const ids = [
    auth.currentUser.uid,
    user.uid
  ].sort();

  currentChatId = ids.join("_");

  usersSection.style.display = "none";
  chatSection.style.display = "block";

  chatWithName.textContent = user.name || "Chat";

  chatMessages.innerHTML = "";

  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }

  // Listen for messages in this conversation.
  messagesUnsubscribe = db.collection("messages")
    .where("chatId", "==", currentChatId)
    .where("participants", "array-contains", auth.currentUser.uid)
    .orderBy("createdAt", "asc")
    .onSnapshot(function(snapshot) {

      chatMessages.innerHTML = "";

      snapshot.forEach(function(doc) {

        const data = doc.data();
        if (
    data.receiverId === auth.currentUser.uid &&
    (data.status === "sent" || data.status === "delivered")
    ) {
    doc.ref.update({
        status: "read",
        readAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(error) {
        console.error("Read receipt error:", error);
    });
}

        const messageItem = document.createElement("div");

        messageItem.className =
          data.senderId === auth.currentUser.uid
            ? "my-message"
            : "other-message";

        const messageText = document.createElement("p");
messageText.textContent = data.text || "";

const timeText = document.createElement("small");

if (data.createdAt && data.createdAt.toDate) {
    timeText.textContent = data.createdAt.toDate().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
} else {
    timeText.textContent = "Sending...";
}

timeText.className = "message-time";

messageItem.appendChild(messageText);

if (data.senderId === auth.currentUser.uid) {
    const statusText = document.createElement("small");
    statusText.textContent =
    data.status === "read" ? "✓✓" :
    data.status === "delivered" ? "✓✓" : "✓";
    statusText.className =
    data.status === "read"
    ? "message-status read"
    : "message-status";
    messageItem.appendChild(statusText);
}

messageItem.appendChild(timeText);
chatMessages.appendChild(messageItem);

      });

      chatMessages.scrollTop = chatMessages.scrollHeight;

    }, function(error) {

      chatMessages.textContent =
        "Error loading messages: " + error.message;

    });

}

// 12. SEND MESSAGE
sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {

  const text = messageInput.value.trim();

  if (!text || !currentChatUser || !currentChatId) {
    return;
  }

  const currentUserId = auth.currentUser.uid;

  try {

    await db.collection("messages").add({

      chatId: currentChatId,

      senderId: currentUserId,

      receiverId: currentChatUser.uid,

      participants: [auth.currentUser.uid, currentChatUser.uid],

      text: text,
      status: "sent",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()

    });

    messageInput.value = "";

  } catch(error) {

    alert("Message error: " + error.message);

  }

}

// 13. BACK TO USER LIST
backToUsersBtn.addEventListener("click", function() {

  if (messagesUnsubscribe) {
    messagesUnsubscribe();
    messagesUnsubscribe = null;
  }

  currentChatUser = null;
  currentChatId = null;

  chatSection.style.display = "none";
  usersSection.style.display = "block";

});

// 14. LOGOUT
logoutBtn.addEventListener("click", async function() {

  try {

    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }

    await auth.signOut();

  } catch(error) {

    alert("Logout error: " + error.message);

  }

});
// SAVE PROFILE
saveProfileBtn.addEventListener("click", async function() {

  const newName = editName.value.trim();

  if (!newName) {
    profileMessage.textContent = "Please enter your name.";
    return;
  }

  try {

    const user = auth.currentUser;

    await user.updateProfile({
      displayName: newName
    });

    await db.collection("users").doc(user.uid).update({
      name: newName
    });

    userName.textContent = newName;
    editName.value = newName;

    profileMessage.textContent = "Profile updated successfully!";

  } catch(error) {

    profileMessage.textContent = error.message;

  }

});