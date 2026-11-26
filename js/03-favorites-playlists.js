/* FAVORITES */
const favoriteKey = "taninfy-favorites";
let favorites = taninfyReadJSON(favoriteKey, [], Array.isArray);

function saveFavorites() {
  taninfySafeStorageSet(favoriteKey, JSON.stringify(favorites));
}

function renderFavorites() {
  const box = document.getElementById("favoriteList");
  box.innerHTML = "";

  if (favorites.length === 0) {
    box.innerHTML = '<p class="form-note">هنوز آهنگی به علاقه‌مندی‌ها اضافه نکردی.</p>';
    return;
  }

  favorites.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "list-item";

    const cover = document.createElement("img");
    cover.className = "favorite-song-cover";
    const favoriteSong = songCatalog.find(song =>
      (item.songId && String(song?.id ?? "") === String(item.songId)) ||
      (song?.title === item.title && song?.artist === item.artist)
    );
    cover.src = favoriteSong?.cover || "";
    cover.alt = `کاور ${item.title || "آهنگ"}`;
    cover.loading = "lazy";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const artist = document.createElement("span");
    artist.textContent = item.artist;
    info.append(title, artist);

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.textContent = "حذف";
    remove.addEventListener("click", function() {
      favorites.splice(index, 1);
      saveFavorites();
      renderFavorites();
      syncHearts();
    });

    row.append(cover, info, remove);
    box.appendChild(row);
  });
}

function syncHearts() {
  document.querySelectorAll(".track").forEach(row => {
    const title = row.querySelector(".track-info strong").textContent;
    const artist = row.querySelector(".track-info span").textContent;
    const button = row.querySelector(".heart-btn");
    const found = favorites.some(item => item.title === title && item.artist === artist);
    button.classList.toggle("active", found);
    button.textContent = found ? "♥" : "♡";
  });
}

trackList.addEventListener("click", async function(event) {
  const button = event.target.closest(".heart-btn");
  if (!button) return;

  event.stopPropagation();

  if (window.taninfyAuthReady) await window.taninfyAuthReady;
  if (!window.taninfyCurrentUser) {
    document.getElementById("loginStatus").textContent = "برای لایک کردن آهنگ، اول باید در Taninfy ثبت‌نام کنی.";
    if (typeof showPage === "function") showPage("login");
    return;
  }

  const row = button.closest(".track");
  const title = row.querySelector(".track-info strong").textContent;
  const artist = row.querySelector(".track-info span").textContent;
  const songId = row.dataset.songId;
  const index = favorites.findIndex(item => item.songId === songId || (item.title === title && item.artist === artist));

  if (index >= 0) favorites.splice(index, 1);
  else favorites.push({ songId, title, artist });

  saveFavorites();
  renderFavorites();
  syncHearts();
});


const playlistPickerOverlay = document.getElementById("playlistPickerOverlay");
const playlistPickerList = document.getElementById("playlistPickerList");
const playlistPickerSong = document.getElementById("playlistPickerSong");
const playlistPickerNew = document.getElementById("playlistPickerNew");
const playlistPickerClose = document.getElementById("playlistPickerClose");

function closePlaylistPicker() {
  playlistPickerOverlay?.classList.remove("active");
  playlistPickerOverlay?.setAttribute("aria-hidden", "true");
}

function addCurrentSongToPlaylist(index) {
  const track = songCatalog[currentTrackIndex];
  if (!track || !playlists[index]) return;

  if (!Array.isArray(playlists[index].songs)) playlists[index].songs = [];
  const songId = track.id || String(currentTrackIndex);
  const exists = playlists[index].songs.some(item => item.songId === songId);
  if (!exists) {
    playlists[index].songs.push({
      songId,
      title: track.title || "بدون نام",
      artist: track.artist || "هنرمند نامشخص",
      cover: track.cover || ""
    });
    taninfySafeStorageSet(playlistKey, JSON.stringify(playlists));
  }

  if (typeof renderTaninfyPlaylists === "function") renderTaninfyPlaylists();
  closePlaylistPicker();
  showSuccessCheck("آهنگ به پلی لیست اضافه شد");
}

function openPlaylistPicker() {
  const track = songCatalog[currentTrackIndex];
  if (!track) return;

  if (window.taninfyAuthReady) {
    window.taninfyAuthReady.then(() => {
      if (!window.taninfyCurrentUser) {
        document.getElementById("loginStatus").textContent = "برای اضافه کردن آهنگ به پلی لیست، اول وارد حساب شو.";
        if (typeof showPage === "function") showPage("login");
        return;
      }
      renderPlaylistPicker(track);
    });
  } else {
    renderPlaylistPicker(track);
  }
}

function renderPlaylistPicker(track) {
  if (!playlistPickerOverlay || !playlistPickerList) return;
  playlistPickerSong.textContent = `${track.title || "بدون نام"} — ${track.artist || "هنرمند نامشخص"}`;
  playlistPickerList.innerHTML = "";

  playlists.forEach((playlist, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playlist-picker-item";
    button.textContent = playlist.name;
    button.addEventListener("click", () => addCurrentSongToPlaylist(index));
    playlistPickerList.appendChild(button);
  });

  playlistPickerOverlay.classList.add("active");
  playlistPickerOverlay.setAttribute("aria-hidden", "false");
}

playlistPickerClose?.addEventListener("click", closePlaylistPicker);
playlistPickerOverlay?.addEventListener("click", function(event) {
  if (event.target === playlistPickerOverlay) closePlaylistPicker();
});
playlistPickerNew?.addEventListener("click", function() {
  const name = window.prompt("نام پلی لیست جدید را وارد کن:");
  if (!name || !name.trim()) return;
  const mood = "My playlist";
  playlists.push({ name: name.trim(), mood, songs: [] });
  taninfySafeStorageSet(playlistKey, JSON.stringify(playlists));
  addCurrentSongToPlaylist(playlists.length - 1);
});

/* TANINFY CURATED PLAYLISTS */
document.querySelectorAll("[data-curated-browse]").forEach(button => {
  button.addEventListener("click", () => {
    showPage("home");
    setTimeout(() => {
      document.getElementById("tracks")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  });
});

/* PLAYLIST STORAGE — retained for the personal add-to-playlist picker */
const playlistKey = "taninfy-playlists";
let playlists = taninfyReadJSON(playlistKey, [], Array.isArray)
  .filter(playlist => playlist && typeof playlist === "object" && !Array.isArray(playlist) && typeof playlist.name === "string")
  .map(playlist => ({
    ...playlist,
    name: playlist.name.trim(),
    songs: Array.isArray(playlist.songs) ? playlist.songs.filter(song => song && typeof song === "object") : []
  }))
  .filter(playlist => playlist.name);
