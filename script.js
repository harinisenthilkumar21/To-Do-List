// 1) Replace the placeholder values below with the config from Firebase Console.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCysGJL6vT0mQNwOkjOLWg4MAl21kyCPyQ",
    authDomain: "my-todo-app-2026-365ab.firebaseapp.com",
    projectId: "my-todo-app-2026-365ab",
    storageBucket: "my-todo-app-2026-365ab.firebasestorage.app",
    messagingSenderId: "1005849813831",
    appId: "1:1005849813831:web:e2f1a7d50259e816d46262"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authCard = document.getElementById("authCard");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signUpButton = document.getElementById("signUpButton");
const authMessage = document.getElementById("authMessage");
const todoSection = document.getElementById("todoSection");
const signedInAs = document.getElementById("signedInAs");
const signOutButton = document.getElementById("signOutButton");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const taskSummary = document.getElementById("taskSummary");
const progressBar = document.getElementById("progressBar");
const clearCompletedButton = document.getElementById("clearCompleted");
const todayDate = document.getElementById("todayDate");

todayDate.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", month: "short", day: "numeric"
});

let unsubscribeTasks = null;
let tasks = [];

function showAuthMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b54458" : "#27835f";
}

function userTasksCollection(user) {
  return collection(db, "users", user.uid, "tasks");
}

async function createAccount() {
  try {
    showAuthMessage("");
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    passwordInput.value = "";
  } catch (error) {
    showAuthMessage(error.message);
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    showAuthMessage("");
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    passwordInput.value = "";
  } catch (error) {
    showAuthMessage(error.message);
  }
});

signUpButton.addEventListener("click", createAccount);

signOutButton.addEventListener("click", async () => {
  if (unsubscribeTasks) unsubscribeTasks();
  await signOut(auth);
});

function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const checkButton = document.createElement("button");
    checkButton.className = "check-button";
    checkButton.type = "button";
    checkButton.setAttribute("aria-label", task.completed ? "Mark task as incomplete" : "Mark task as complete");
    checkButton.textContent = task.completed ? "✓" : "";
    checkButton.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid, "tasks", task.id), {
          completed: !task.completed
        });
      } catch (error) {
        alert("Could not update task: " + error.message);
      }
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.text}`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "tasks", task.id));
      } catch (error) {
        alert("Could not delete task: " + error.message);
      }
    });

    item.append(checkButton, text, deleteButton);
    taskList.appendChild(item);
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  emptyState.hidden = tasks.length > 0;
  taskList.hidden = tasks.length === 0;
  taskSummary.textContent = tasks.length === 0
    ? "You’ve got this!"
    : `${remainingCount} left · ${completedCount} completed`;
  progressBar.style.width = tasks.length ? `${(completedCount / tasks.length) * 100}%` : "0%";
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  const user = auth.currentUser;
  if (!text || !user) return;

  try {
    await addDoc(userTasksCollection(user), {
      text,
      completed: false,
      createdAt: Date.now()
    });
    taskInput.value = "";
    taskInput.focus();
  } catch (error) {
    alert("Could not save task: " + error.message);
  }
});

clearCompletedButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snapshot = await getDocs(query(userTasksCollection(user)));
    const batch = writeBatch(db);
    snapshot.docs.forEach((taskDoc) => {
      if (taskDoc.data().completed) batch.delete(taskDoc.ref);
    });
    await batch.commit();
  } catch (error) {
    alert("Could not clear completed tasks: " + error.message);
  }
});

onAuthStateChanged(auth, (user) => {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }

  if (!user) {
    authCard.hidden = false;
    todoSection.hidden = true;
    signedInAs.textContent = "";
    tasks = [];
    renderTasks();
    return;
  }

  authCard.hidden = true;
  todoSection.hidden = false;
  signedInAs.textContent = `Signed in as ${user.email}`;

  const tasksQuery = query(userTasksCollection(user), orderBy("createdAt", "desc"));
  unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
    tasks = snapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() }));
    renderTasks();
  }, (error) => {
    alert("Could not load tasks: " + error.message);
  });
});
