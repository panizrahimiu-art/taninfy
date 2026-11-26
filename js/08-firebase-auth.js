import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYfNEIpJ_kWOR5XLqgfenBAJOMbmq6Qow",
  authDomain: "taninfy-cc186.firebaseapp.com",
  projectId: "taninfy-cc186",
  storageBucket: "taninfy-cc186.firebasestorage.app",
  messagingSenderId: "209069893864",
  appId: "1:209069893864:web:c78e3bb04cf868e270c15d",
  measurementId: "G-H24NR6WBZE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.taninfyListeningStats = { songCounts: {}, artistCounts: {} };
window.loadTaninfyListeningStats = async function(user) {
  if (!user) {
    window.taninfyListeningStats = { songCounts: {}, artistCounts: {} };
    return;
  }
  try {
    const statsRef = doc(db, "listeningStats", user.uid);
    const statsSnap = await getDoc(statsRef);
    window.taninfyListeningStats = statsSnap.exists()
      ? { songCounts: statsSnap.data().songCounts || {}, artistCounts: statsSnap.data().artistCounts || {} }
      : { songCounts: {}, artistCounts: {} };
    if (typeof window.renderTaninfyExplore === "function") window.renderTaninfyExplore();
  } catch (error) {
    console.warn("Listening history could not be loaded.", error);
  }
};

window.recordTaninfyListen = async function(song) {
  const user = window.taninfyCurrentUser;
  if (!user || !song) return;
  const songKey = encodeURIComponent(String(song.id || `${song.artist}-${song.title}`));
  const artistName = String(song.artist || "Unknown");
  const statsRef = doc(db, "listeningStats", user.uid);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(statsRef);
    const data = snap.exists() ? snap.data() : {};
    const songCounts = { ...(data.songCounts || {}) };
    const artistCounts = { ...(data.artistCounts || {}) };
    songCounts[songKey] = Number(songCounts[songKey] || 0) + 1;
    artistCounts[artistName] = Number(artistCounts[artistName] || 0) + 1;
    transaction.set(statsRef, { songCounts, artistCounts, updatedAt: Date.now() }, { merge: true });
    window.taninfyListeningStats = { songCounts, artistCounts };
  });
  if (typeof window.renderTaninfyExplore === "function") window.renderTaninfyExplore();
};
window.taninfyCurrentUser = null;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, "");
}

window.saveTaninfyProfile = async function(profile) {
  const user = window.taninfyCurrentUser;
  if (!user) throw new Error("not-authenticated");

  const nickname = normalizeUsername(profile.nickname);
  if (!nickname) throw new Error("invalid-username");

  const profileRef = doc(db, "profiles", user.uid);
  const usernameRef = doc(db, "usernames", nickname);

  const currentProfileSnap = await getDoc(profileRef);
  const oldNickname = normalizeUsername(
    currentProfileSnap.exists() ? currentProfileSnap.data().nickname : ""
  );
  const oldUsernameRef = oldNickname ? doc(db, "usernames", oldNickname) : null;

  await runTransaction(db, async (transaction) => {
    const usernameSnap = await transaction.get(usernameRef);

    if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
      const error = new Error("username-already-taken");
      error.code = "username-already-taken";
      throw error;
    }

    if (oldUsernameRef && oldNickname !== nickname) {
      const oldSnap = await transaction.get(oldUsernameRef);
      if (oldSnap.exists() && oldSnap.data().uid === user.uid) {
        transaction.delete(oldUsernameRef);
      }
    }

    transaction.set(usernameRef, {
      uid: user.uid,
      nickname
    });

    transaction.set(profileRef, {
      uid: user.uid,
      name: profile.name,
      nickname,
      avatar: user.photoURL || "",
      updatedAt: Date.now()
    }, { merge: true });
  });

  return { ...profile, nickname };
};

async function loadTaninfyProfile(user) {
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "profiles", user.uid));

    if (snap.exists()) {
      const remoteProfile = snap.data();
      taninfySafeStorageSet(profileKey, JSON.stringify({
        name: remoteProfile.name || user.displayName || "Taninfy User",
        nickname: remoteProfile.nickname || "",
        avatar: remoteProfile.avatar || user.photoURL || ""
      }));
      renderProfile(user);
    }
  } catch (error) {
    console.warn("Taninfy profile could not be loaded from Firestore.", error);
  }
}
window.taninfyAuthReady = new Promise(resolve => {
  onAuthStateChanged(auth, async user => {
    window.taninfyCurrentUser = user || null;
    renderProfile(user || null);
    if (user) {
      await loadTaninfyProfile(user);
      await window.loadTaninfyListeningStats(user);
    } else {
      await window.loadTaninfyListeningStats(null);
    }

    const accountBox = document.getElementById("userAccountBox");
    const loginBtn = document.getElementById("googleLoginBtn");
    const signedAvatar = document.getElementById("signedUserAvatar");
    const signedName = document.getElementById("signedUserName");
    const topLoginLink = document.getElementById("topLoginLink");
    const topAccountLink = document.getElementById("topAccountLink");
    const topAccountAvatar = document.getElementById("topAccountAvatar");
    const topAccountName = document.getElementById("topAccountName");

    if (user) {
      const name = user.displayName || "Taninfy User";
      signedName.textContent = name;
      signedAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=3a1823&color=fff&size=96";
      accountBox.style.display = "flex";
      if (topLoginLink) topLoginLink.style.display = "none";
      if (topAccountLink) topAccountLink.style.display = "inline-flex";
      if (topAccountAvatar) topAccountAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=3a1823&color=fff&size=96";
      if (topAccountName) topAccountName.textContent = name;
      loginBtn.textContent = "Google account connected";
      loginBtn.disabled = true;
      loginBtn.style.opacity = ".65";
    } else {
      accountBox.style.display = "none";
      if (topLoginLink) topLoginLink.style.display = "inline-flex";
      if (topAccountLink) topAccountLink.style.display = "none";
      loginBtn.textContent = "Continue with Google";
      loginBtn.disabled = false;
      loginBtn.style.opacity = "1";
    }
    resolve(user || null);
  });
});

window.showSuccessCheck = function(message) {
  const overlay = document.getElementById("successCheckOverlay");
  const text = document.getElementById("successCheckText");
  if (!overlay) return;
  text.textContent = message || "با موفقیت انجام شد";
  overlay.classList.remove("active", "animate");
  void overlay.offsetWidth;
  overlay.classList.add("active", "animate");
  setTimeout(() => overlay.classList.remove("active", "animate"), 1700);
};

document.getElementById("googleLoginBtn").addEventListener("click", async () => {
  const status = document.getElementById("loginStatus");
  const btn = document.getElementById("googleLoginBtn");
  status.textContent = "در حال اتصال به Google...";
  btn.disabled = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const firstLogin = !taninfySafeStorageGet("taninfy-profile");
    renderProfile(result.user);
    status.textContent = "با موفقیت وارد شدی.";
    showSuccessCheck(firstLogin ? "ثبت‌نام با موفقیت انجام شد" : "ورود با موفقیت انجام شد");
    if (firstLogin && typeof showPage === "function") setTimeout(() => showPage("profile"), 1200);
  } catch (error) {
    console.error(error);
    if (error.code === "auth/popup-closed-by-user") status.textContent = "پنجره Google بسته شد.";
    else if (error.code === "auth/unauthorized-domain") status.textContent = "دامنه سایت هنوز در Firebase مجاز نشده است.";
    else status.textContent = "ورود با Google انجام نشد. دوباره امتحان کن.";
    btn.disabled = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  document.getElementById("loginStatus").textContent = "از حساب خارج شدی.";
});
