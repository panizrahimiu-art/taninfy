/* PROFILE */
const profileKey = "taninfy-profile";

function getLocalProfile() {
  return taninfyReadJSON(profileKey, {}, value => value && typeof value === "object" && !Array.isArray(value));
}

function updateMenuProfile(user, profile = {}) {
  const menuProfile = document.getElementById("menuProfile");
  const menuAvatar = document.getElementById("menuProfileAvatar");
  const menuName = document.getElementById("menuProfileName");
  const menuNickname = document.getElementById("menuProfileNickname");

  if (!menuProfile || !menuAvatar || !menuName || !menuNickname) return;

  if (!user) {
    menuProfile.style.display = "none";
    return;
  }

  const name = profile.name || user.displayName || "Taninfy User";
  const nickname = (profile.nickname || name.toLowerCase().replace(/\s+/g, "").slice(0, 18))
    .replace(/^@/, "");

  menuAvatar.src =
    user.photoURL ||
    profile.avatar ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(name) +
      "&background=3a1823&color=fff&size=128";

  menuName.textContent = name;
  menuNickname.textContent = "@" + nickname;
  menuProfile.style.display = "flex";
}

function renderProfile(user) {
  const guest = document.getElementById("profileGuestPanel");
  const card = document.getElementById("profileCard");
  const edit = document.getElementById("profileEditPanel");
  if (!guest || !card || !edit) return;

  if (!user) {
    guest.style.display = "block";
    card.style.display = "none";
    edit.style.display = "none";
    updateMenuProfile(null);
    return;
  }

  guest.style.display = "none";
  card.style.display = "grid";
  edit.style.display = "block";

  const saved = getLocalProfile();
  const name = saved.name || user.displayName || "Taninfy User";
  const nickname = saved.nickname || name.toLowerCase().replace(/\s+/g, "").slice(0, 18);
  const avatar = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=3a1823&color=fff&size=256";

  document.getElementById("profileAvatar").src = avatar;
  document.getElementById("profileDisplayName").textContent = name;
  document.getElementById("profileNicknameDisplay").textContent = "@" + nickname.replace(/^@/, "");
  document.getElementById("profileNameDisplay").textContent = name;
  document.getElementById("profileNicknameDisplay2").textContent = "@" + nickname.replace(/^@/, "");
  document.getElementById("profileName").value = name;
  document.getElementById("profileNickname").value = nickname.replace(/^@/, "");

  updateMenuProfile(user, {
    name,
    nickname,
    avatar
  });
}

document.getElementById("profileForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!window.taninfyCurrentUser) {
    document.getElementById("profileStatus").textContent = "اول وارد حساب شو.";
    return;
  }

  const profile = {
    name: document.getElementById("profileName").value.trim(),
    nickname: document.getElementById("profileNickname").value.trim().replace(/^@/, "")
  };

  if (!profile.name || !profile.nickname) {
    document.getElementById("profileStatus").textContent = "نام و نام کاربری را وارد کن.";
    return;
  }

  const saveButton = this.querySelector("button[type=\"submit\"]");
  saveButton.disabled = true;
  document.getElementById("profileStatus").textContent = "در حال بررسی نام کاربری...";

  try {
    if (typeof window.saveTaninfyProfile === "function") {
      await window.saveTaninfyProfile(profile);
    } else {
      // Local fallback only if Firebase profile storage is unavailable.
      taninfySafeStorageSet(profileKey, JSON.stringify(profile));
    }

    taninfySafeStorageSet(profileKey, JSON.stringify(profile));
    renderProfile(window.taninfyCurrentUser);
    document.getElementById("profileStatus").textContent = "پروفایل ذخیره شد.";
    showSuccessCheck("پروفایل با موفقیت ذخیره شد");
  } catch (error) {
    console.error(error);
    document.getElementById("profileStatus").textContent =
      error.code === "username-already-taken"
        ? "این نام کاربری قبلاً استفاده شده. یک نام دیگر انتخاب کن."
        : "ذخیره پروفایل انجام نشد. دوباره امتحان کن.";
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById("profileLoginBtn").addEventListener("click", function() {
  if (typeof showPage === "function") showPage("login");
});


/* CONTACT FORM */
document.getElementById("contactForm").addEventListener("submit", function(event) {
  event.preventDefault();
  document.getElementById("contactStatus").textContent = "فرم آماده است؛ برای ارسال واقعی باید به سرویس دریافت پیام متصل شود.";
});
