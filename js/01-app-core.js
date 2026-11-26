/* SAFE LOCAL STORAGE — malformed or blocked storage must not stop the app. */
function taninfySafeStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}
function taninfySafeStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function taninfySafeStorageRemove(key) {
  try { window.localStorage.removeItem(key); return true; } catch (_) { return false; }
}
function taninfyReadJSON(key, fallback, validate) {
  try {
    const raw = taninfySafeStorageGet(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return typeof validate === "function" && !validate(parsed) ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

/* PAGE NAVIGATION */
const pages = document.querySelectorAll(".page");

const availablePages = ["home", "search", "profile", "favorites", "artists", "playlist", "settings", "login", "contact"];

function showPage(name, addHistory = true) {
  const target = document.getElementById("page-" + name);
  if (!target) return;

  pages.forEach(page => page.classList.toggle("active", page === target));
  closeMenu();
  window.scrollTo({ top: 0, behavior: "auto" });

  if (addHistory) {
    history.pushState({ taninfy: true, page: name }, "", "#" + name);
  }
}

document.querySelectorAll("[data-page]").forEach(link => {
  link.addEventListener("click", function(event) {
    event.preventDefault();
    // Entering Playlists from navigation must always return to the collection,
    // never leave the previously opened playlist detail on screen.
    if (this.dataset.page === "playlist" && typeof closeTaninfyPlaylist === "function") {
      closeTaninfyPlaylist();
    }
    showPage(this.dataset.page, true);
  });
});

/* Search navigation opens its own dedicated page. */
document.querySelector('[data-action="open-search"]')?.addEventListener("click", function(event) {
  event.preventDefault();
  showPage("search", true);
  const searchInput = document.getElementById("topMusicSearch");
  if (searchInput) {
    setTimeout(() => searchInput.focus({ preventScroll: true }), 80);
  }
});

/* ACCOUNT DROPDOWN — profile and settings live under the avatar */
const accountTrigger = document.getElementById("topAccountLink");
const accountDropdown = document.getElementById("accountDropdown");
const accountLogoutBtn = document.getElementById("accountLogoutBtn");

function closeAccountDropdown() {
  if (!accountDropdown || !accountTrigger) return;
  accountDropdown.classList.remove("open");
  accountDropdown.setAttribute("aria-hidden", "true");
  accountTrigger.setAttribute("aria-expanded", "false");
}

accountTrigger?.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  const opening = !accountDropdown?.classList.contains("open");
  closeAccountDropdown();
  if (opening && accountDropdown) {
    accountDropdown.classList.add("open");
    accountDropdown.setAttribute("aria-hidden", "false");
    accountTrigger.setAttribute("aria-expanded", "true");
  }
});

accountDropdown?.querySelectorAll("[data-account-page]").forEach(button => {
  button.addEventListener("click", () => {
    const pageName = button.dataset.accountPage;
    closeAccountDropdown();
    showPage(pageName, true);
  });
});

accountLogoutBtn?.addEventListener("click", () => {
  closeAccountDropdown();
  document.getElementById("logoutBtn")?.click();
});

document.addEventListener("click", event => {
  if (!accountDropdown?.contains(event.target) && !accountTrigger?.contains(event.target)) {
    closeAccountDropdown();
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAccountDropdown();
});

function loadPageFromHash() {
  const name = location.hash.replace("#", "");
  showPage(availablePages.includes(name) ? name : "home", false);
}

window.addEventListener("load", function() {
  const hash = location.hash.replace("#", "");
  const page = availablePages.includes(hash) ? hash : "home";
  // Create a Taninfy guard entry so a normal browser Back does not immediately
  // throw the visitor out of the site.
  history.replaceState({ taninfy: true, page }, "", "#" + page);
  history.pushState({ taninfy: true, page }, "", "#" + page);
  showPage(page, false);
});

window.addEventListener("popstate", function(event) {
  // Browser Back closes an open full player first instead of leaving Taninfy.
  if (document.getElementById("fullPlayer")?.classList.contains("active")) {
    document.getElementById("fullPlayer").classList.remove("active");
    history.pushState({ taninfy: true, page: event.state?.page || "home" }, "", "#" + (event.state?.page || "home"));
    return;
  }

  // Closing an artist profile is the next Back action.
  if (document.getElementById("artistProfile")?.classList.contains("active")) {
    closeArtistProfile(false);
    history.pushState({ taninfy: true, page: event.state?.page || "home" }, "", "#" + (event.state?.page || "home"));
    return;
  }

  if (event.state && event.state.taninfy) {
    showPage(event.state.page || "home", false);
    // Keep one Taninfy guard behind the current page.
    history.pushState({ taninfy: true, page: event.state.page || "home" }, "", "#" + (event.state.page || "home"));
  } else {
    history.pushState({ taninfy: true, page: "home" }, "", "#home");
    showPage("home", false);
  }
});


/* DROPDOWN MENU */
const menuToggle = document.getElementById("menuToggle");
const menuClose = document.getElementById("menuClose");
const menuOverlay = document.getElementById("menuOverlay");

function openMenu() {
  document.body.classList.add("menu-open");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
}

if (menuToggle) menuToggle.addEventListener("click", openMenu);
if (menuClose) menuClose.addEventListener("click", closeMenu);
if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") closeMenu();
});


/* MUSIC CATALOG */
const trackList = document.getElementById("trackList");
const songCatalog = Array.isArray(window.TANINFY_SONGS) ? window.TANINFY_SONGS : [];

/* TANINFY — ARVAN OBJECT STORAGE (single-track test)
   Only the Canozan test track is redirected to Arvan.
   All other song metadata, covers, playlists and UI stay unchanged. */
const TANINFY_ARVAN_BASE = "https://taninfy-music.s3.ir-central1.arvanstorage.ir/";
const TANINFY_ARVAN_CANOZAN_SRC = TANINFY_ARVAN_BASE +
  "A%C4%9Flama%20Ben%20A%C4%9Flar%C4%B1m%20-%20Canozan.mp3";
const taninfyCanozanTrack = songCatalog.find(song => {
  const title = String(song?.title || "").toLocaleLowerCase();
  const artist = String(song?.artist || "").toLocaleLowerCase();
  const src = String(song?.src || "").toLocaleLowerCase();
  return (title.includes("ağlama ben ağlarım") && artist.includes("canozan")) ||
         (title.includes("ağlama ben ağlarım") && src.includes("canozan")) ||
         (title.includes("ağlama") && artist.includes("canozan"));
});
if (taninfyCanozanTrack) {
  taninfyCanozanTrack.src = TANINFY_ARVAN_CANOZAN_SRC;
}


function shuffleItems(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getExploreRecommendations() {
  // همه آهنگ‌های معتبر songs.js را نگه می‌داریم و ترتیبشان را در هر بار بارگذاری تصادفی می‌کنیم.
  const tracks = songCatalog
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => song && typeof song === "object" && song.title);

  // Fisher–Yates shuffle
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }

  // اگر ترتیب تصادفی اتفاقاً دقیقاً مثل بار قبل شد، آن را کمی جابه‌جا می‌کنیم.
  try {
    const key = "taninfy_explore_last_order";
    const currentOrder = tracks.map(item => item.index);
    const previousOrder = taninfyReadJSON(key, null, Array.isArray);

    if (
      Array.isArray(previousOrder) &&
      previousOrder.length === currentOrder.length &&
      currentOrder.length > 1 &&
      currentOrder.every((value, index) => value === previousOrder[index])
    ) {
      tracks.push(tracks.shift());
    }

    taninfySafeStorageSet(key, JSON.stringify(tracks.map(item => item.index)));
  } catch (error) {
    // اگر ذخیره‌سازی مرورگر در دسترس نبود، همان ترتیب تصادفی استفاده می‌شود.
  }

  return tracks;
}

function renderTrackCatalog() {
  trackList.innerHTML = "";
  if (!songCatalog.length) {
    trackList.innerHTML = '<p class="form-note">هنوز آهنگی اضافه نشده. لینک آهنگ‌ها را در فایل songs.js وارد کن.</p>';
    return;
  }

  const recommendations = getExploreRecommendations();
  if (!recommendations.length) {
    trackList.innerHTML = '<p class="form-note">هنوز آهنگ کامل و قابل پخشی برای نمایش وجود ندارد.</p>';
    return;
  }

  recommendations.forEach(({ song, index }) => {
    const row = document.createElement("article");
    row.className = "track music-card";
    row.dataset.songId = song.id || String(index);
    row.dataset.songIndex = String(index);
    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `پخش ${song.title || "آهنگ"}`);

    const coverWrap = document.createElement("div");
    coverWrap.className = "track-cover-wrap";

    const cover = document.createElement("img");
    cover.className = "track-cover-thumb";
    cover.src = song.cover || "";
    cover.alt = `کاور ${song.title || "آهنگ"}`;
    cover.loading = "lazy";

    const coverPlay = document.createElement("span");
    coverPlay.className = "track-cover-play";
    coverPlay.setAttribute("aria-hidden", "true");
    coverPlay.textContent = "▶";

    coverWrap.append(cover, coverPlay);

    const info = document.createElement("div");
    info.className = "track-info";

    const title = document.createElement("strong");
    title.className = "track-title";
    title.textContent = song.title || "بدون نام";

    const artist = document.createElement("span");
    artist.className = "track-artist";
    artist.textContent = song.artist || "هنرمند نامشخص";

    info.append(title, artist);

    const heart = document.createElement("button");
    heart.className = "heart-btn";
    heart.type = "button";
    heart.setAttribute("aria-label", "افزودن به علاقه‌مندی‌ها");
    heart.textContent = "♡";

    row.append(coverWrap, info, heart);
    trackList.appendChild(row);
  });
}

renderTrackCatalog();
window.renderTaninfyExplore = renderTrackCatalog;

/* =========================================
   TANINFY — PLAYLIST.JS CONNECTION
   Playlist entries can contain only song IDs
   or exact song titles. The full song data
   (src, cover, artist, etc.) always comes
   from songs.js / TANINFY_SONGS.
========================================= */

function getPlaylistSong(songRef) {
  if (!songRef) return null;

  const ref = String(
    typeof songRef === "object"
      ? (songRef.id ?? songRef.songId ?? songRef.title ?? "")
      : songRef
  ).trim();

  if (!ref) return null;

  const byId = songCatalog.find(song => String(song?.id ?? "").trim() === ref);
  if (byId) return byId;

  const normalized = ref.toLocaleLowerCase();
  return songCatalog.find(song =>
    String(song?.title ?? "").trim().toLocaleLowerCase() === normalized
  ) || null;
}

function validateTaninfyPlaylists() {
  const playlists = Array.isArray(window.TANINFY_PLAYLISTS) ? window.TANINFY_PLAYLISTS : [];
  const missing = [];
  playlists.forEach(playlist => {
    (Array.isArray(playlist?.songs) ? playlist.songs : []).forEach(ref => {
      if (!getPlaylistSong(ref)) missing.push(`${playlist?.name || "Playlist"}: ${String(ref)}`);
    });
  });
  if (missing.length) {
    console.warn("Taninfy playlist references not found:", missing);
  }
  return missing;
}

function getTaninfyPlaylists() {
  // Only the curated playlists from playlist.js are shown.
  // Personal playlists saved by older versions are intentionally excluded.
  return Array.isArray(window.TANINFY_PLAYLISTS)
    ? window.TANINFY_PLAYLISTS
    : [];
}

validateTaninfyPlaylists();

function playlistCover(playlist, songs) {
  if (playlist?.cover) return playlist.cover;
  const firstSong = songs.find(Boolean);
  return firstSong?.cover || "";
}

let taninfyOpenPlaylist = null;
let taninfyOpenPlaylistIndices = [];

function getPlaylistCoverForDetail(playlist, songs) {
  return playlistCover(playlist, songs) || "";
}

function setPlaylistDetailBackground(imageUrl) {
  const detail = document.getElementById("playlistDetail");
  if (!detail) return;
  if (imageUrl) {
    const safeUrl = String(imageUrl).replace(/"/g, '\\\"');
    detail.style.setProperty("--playlist-bg-image", `url("${safeUrl}")`);
  } else {
    detail.style.setProperty("--playlist-bg-image", "none");
  }
}

function resetPlaylistDetailCover() {
  const cover = document.getElementById("playlistDetailCover");
  if (!cover || !taninfyOpenPlaylist) return;

  const songs = (Array.isArray(taninfyOpenPlaylist.songs) ? taninfyOpenPlaylist.songs : [])
    .map(getPlaylistSong)
    .filter(Boolean);

  const playlistCoverUrl = getPlaylistCoverForDetail(taninfyOpenPlaylist, songs);
  cover.src = playlistCoverUrl || "";
  cover.classList.remove("is-song-cover");
  cover.alt = taninfyOpenPlaylist.name || "Playlist cover";
}

function updatePlaylistDetailPlaying() {
  const detail = document.getElementById("playlistDetail");
  if (!detail || detail.style.display === "none") return;

  const rows = detail.querySelectorAll(".playlist-detail-song");
  let playingSong = null;

  rows.forEach(row => {
    const index = Number(row.dataset.songIndex);
    const active = index === currentTrackIndex && !audioPlayer.paused;
    row.classList.toggle("is-playing", active);

    const playButton = row.querySelector(".playlist-detail-song-play");
    const coverPlay = row.querySelector(".playlist-detail-song-cover-play");

    if (playButton) playButton.textContent = active ? "Ⅱ" : "▶";
    if (coverPlay) coverPlay.textContent = active ? "Ⅱ" : "▶";

    if (active) playingSong = songCatalog[index];
  });

  const cover = document.getElementById("playlistDetailCover");
  if (!cover) return;

  const currentIsInPlaylist =
    Number.isInteger(currentTrackIndex) &&
    taninfyOpenPlaylistIndices.includes(currentTrackIndex);

  const activeSong = currentIsInPlaylist ? songCatalog[currentTrackIndex] : null;

  if (activeSong && activeSong.cover) {
    cover.src = activeSong.cover;
    cover.alt = `کاور ${activeSong.title || "آهنگ"}`;
    cover.classList.add("is-song-cover");
    setPlaylistDetailBackground(activeSong.cover);
  } else {
    resetPlaylistDetailCover();
    const playlistSongs = (Array.isArray(taninfyOpenPlaylist?.songs) ? taninfyOpenPlaylist.songs : [])
      .map(getPlaylistSong)
      .filter(Boolean);
    setPlaylistDetailBackground(getPlaylistCoverForDetail(taninfyOpenPlaylist, playlistSongs));
  }
}

function renderPlaylistDetailSongs(indices) {
  const list = document.getElementById("playlistDetailSongs");
  const count = document.getElementById("playlistDetailListCount");
  if (!list) return;

  list.innerHTML = "";

  if (!indices.length) {
    list.innerHTML = '<div class="playlist-detail-empty">این پلی لیست هنوز آهنگی ندارد.</div>';
    if (count) count.textContent = "0 آهنگ";
    return;
  }

  if (count) count.textContent = `${indices.length} آهنگ`;

  indices.forEach((index, position) => {
    const song = songCatalog[index];
    if (!song) return;

    const row = document.createElement("article");
    row.className = "playlist-detail-song";
    row.dataset.songIndex = String(index);
    row.dataset.songId = song.id || String(index);

    const number = document.createElement("span");
    number.className = "playlist-detail-number";
    number.textContent = String(position + 1).padStart(2, "0");

    const coverWrap = document.createElement("div");
    coverWrap.className = "playlist-detail-song-cover-wrap";

    const cover = document.createElement("img");
    cover.className = "playlist-detail-song-cover";
    cover.src = song.cover || "";
    cover.alt = `کاور ${song.title || "آهنگ"}`;
    cover.loading = "lazy";

    const coverPlay = document.createElement("span");
    coverPlay.className = "playlist-detail-song-cover-play";
    coverPlay.textContent = "▶";
    coverWrap.append(cover, coverPlay);

    const info = document.createElement("div");
    info.className = "playlist-detail-song-info";

    const title = document.createElement("strong");
    title.textContent = song.title || "بدون نام";

    const artist = document.createElement("span");
    artist.textContent = song.artist || "هنرمند نامشخص";

    info.append(title, artist);

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "playlist-detail-song-play";
    playButton.title = "پخش";
    playButton.textContent = "▶";

    playButton.addEventListener("click", event => {
      event.stopPropagation();
      setPlayerTrack(index, true, taninfyOpenPlaylistIndices);
    });


    row.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      setPlayerTrack(index, true, taninfyOpenPlaylistIndices);
    });

    row.append(number, coverWrap, info, playButton);
    list.appendChild(row);
  });

  updatePlaylistDetailPlaying();
}

function syncPlaylistDetailHearts() {
  document.querySelectorAll(".playlist-detail-song").forEach(row => {
    const index = Number(row.dataset.songIndex);
    const song = songCatalog[index];
    const button = row.querySelector(".playlist-detail-song-heart");
    if (!song || !button) return;

    const songId = song.id || String(index);
    const active = favorites.some(item =>
      item.songId === songId ||
      (item.title === song.title && item.artist === song.artist)
    );

    button.classList.toggle("active", active);
    button.textContent = active ? "♥" : "♡";
  });
}

function openTaninfyPlaylist(playlist) {
  const refs = Array.isArray(playlist?.songs) ? playlist.songs : [];
  const resolvedSongs = refs.map(getPlaylistSong).filter(Boolean);

  taninfyOpenPlaylist = playlist;
  taninfyOpenPlaylistIndices = resolvedSongs
    .map(song => songCatalog.indexOf(song))
    .filter(index => index >= 0);

  /* The card can live on the Explore page or the Playlists page.
     Always navigate to the Playlists page before opening its detail view. */
  showPage("playlist", false);

  const grid = document.getElementById("curatedPlaylistGrid");
  const detail = document.getElementById("playlistDetail");
  const intro = document.querySelector(".curated-intro");
  const heading = document.querySelector("#page-playlist .page-heading");

  if (!detail || !grid) return;

  grid.style.display = "none";
  if (intro) intro.style.display = "none";
  if (heading) heading.style.display = "none";

  detail.style.display = "block";

  const title = document.getElementById("playlistDetailTitle");
  const count = document.getElementById("playlistDetailCount");

  if (title) title.textContent = playlist.name || "Playlist";
  if (count) count.textContent = `${resolvedSongs.length} آهنگ`;

  resetPlaylistDetailCover();
  setPlaylistDetailBackground(getPlaylistCoverForDetail(playlist, resolvedSongs));
  renderPlaylistDetailSongs(taninfyOpenPlaylistIndices);

  const playButton = document.getElementById("playlistDetailPlay");
  if (playButton) {
    playButton.onclick = () => {
      const firstIndex = taninfyOpenPlaylistIndices[0];
      if (Number.isInteger(firstIndex)) setPlayerTrack(firstIndex, true, taninfyOpenPlaylistIndices);
    };
  }

  const shuffleButton = document.getElementById("playlistDetailShuffle");
  if (shuffleButton) {
    shuffleButton.onclick = () => {
      if (taninfyOpenPlaylistIndices.length <= 1) {
        const onlyIndex = taninfyOpenPlaylistIndices[0];
        if (Number.isInteger(onlyIndex)) setPlayerTrack(onlyIndex, true, taninfyOpenPlaylistIndices);
        return;
      }

      let randomIndex;
      do {
        randomIndex = taninfyOpenPlaylistIndices[
          Math.floor(Math.random() * taninfyOpenPlaylistIndices.length)
        ];
      } while (randomIndex === currentTrackIndex);

      setPlayerTrack(randomIndex, true, taninfyOpenPlaylistIndices);
    };
  }

  const favoriteButton = document.getElementById("playlistDetailFavorite");
  if (favoriteButton) {
    const favoritePlaylistKey = `taninfy-playlist-favorite-${playlist.name || ""}`;
    const update = () => {
      const active = taninfySafeStorageGet(favoritePlaylistKey) === "1";
      favoriteButton.classList.toggle("active", active);
      favoriteButton.textContent = active ? "♥" : "♡";
    };

    favoriteButton.onclick = () => {
      const active = taninfySafeStorageGet(favoritePlaylistKey) === "1";
      if (active) taninfySafeStorageRemove(favoritePlaylistKey);
      else taninfySafeStorageSet(favoritePlaylistKey, "1");
      update();
    };

    update();
  }

  updatePlaylistDetailPlaying();
  document.getElementById("page-playlist")?.scrollIntoView({behavior:"smooth", block:"start"});
}

function closeTaninfyPlaylist() {
  const grid = document.getElementById("curatedPlaylistGrid");
  const detail = document.getElementById("playlistDetail");
  const intro = document.querySelector(".curated-intro");
  const heading = document.querySelector("#page-playlist .page-heading");

  taninfyOpenPlaylist = null;
  taninfyOpenPlaylistIndices = [];

  if (detail) detail.style.display = "none";
  if (grid) grid.style.display = "";
  if (intro) intro.style.display = "";
  if (heading) heading.style.display = "";

  renderTaninfyPlaylists();
}

document.getElementById("playlistDetailBack")?.addEventListener("click", closeTaninfyPlaylist);

function renderTaninfyPlaylists() {
  const grids = [
    document.getElementById("homePlaylistGrid"),
    document.getElementById("curatedPlaylistGrid")
  ].filter(Boolean);

  const empty = document.getElementById("playlistEmptyState");
  if (!grids.length) return;

  const playlistData = getTaninfyPlaylists();
  grids.forEach(grid => grid.innerHTML = "");

  if (!playlistData.length) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  grids.forEach(grid => {
    playlistData.forEach((playlist, playlistIndex) => {
      const refs = Array.isArray(playlist.songs) ? playlist.songs : [];
      const resolvedSongs = refs.map(getPlaylistSong).filter(Boolean);

      const card = document.createElement("article");
      card.className = "curated-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `باز کردن پلی لیست ${playlist.name || "Playlist"}`);

      const cover = document.createElement("div");
      cover.className = "curated-cover";

      const playlistCoverUrl = playlistCover(playlist, resolvedSongs);

      if (playlistCoverUrl) {
        cover.classList.add("has-image");

        const coverImg = document.createElement("img");
        coverImg.className = "playlist-cover-image";
        coverImg.src = playlistCoverUrl;
        coverImg.alt = playlist.name || "Playlist cover";
        coverImg.loading = "lazy";
        cover.appendChild(coverImg);
      }

      const info = document.createElement("div");
      info.className = "curated-info";

      const title = document.createElement("h2");
      title.textContent = playlist.name || "Playlist";

      const count = document.createElement("div");
      count.className = "playlist-song-count";
      count.textContent = `${resolvedSongs.length} آهنگ`;

      info.append(title, count);
      card.append(cover, info);

      const open = () => openTaninfyPlaylist(playlist);
      card.addEventListener("click", open);
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });

      grid.appendChild(card);
    });
  });
}

window.renderTaninfyPlaylists = renderTaninfyPlaylists;
renderTaninfyPlaylists();



/* SEARCH + ARTIST PROFILES */
const musicSearch = document.getElementById("musicSearch");
const clearMusicSearch = document.getElementById("clearMusicSearch");
const searchSuggestions = document.getElementById("searchSuggestions");
const artistProfile = document.getElementById("artistProfile");
const closeArtistProfileBtn = document.getElementById("closeArtistProfile");
const artistProfileMore = document.getElementById("artistProfileMore");
const artistFavoriteBtn = document.getElementById("artistFavoriteBtn");
const artistProfileAvatar = document.getElementById("artistProfileAvatar");
const artistProfileName = document.getElementById("artistProfileName");
const artistProfileCount = document.getElementById("artistProfileCount");
const artistProfileAlbums = document.getElementById("artistProfileAlbums");
const artistProfileSongs = document.getElementById("artistProfileSongs");

function artistKey(name) {
  return String(name || "هنرمند نامشخص").trim().toLocaleLowerCase();
}

function splitArtistNames(value) {
  const text = String(value || "").trim();
  if (!text) return ["هنرمند نامشخص"];

  // A collaboration is one song credit, but each credited artist gets
  // the same song inside their own profile.
  return text
    .split(/\s*(?:&|×|\+|\bx\b|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\band\b)\s*/i)
    .map(name => name.trim())
    .filter(Boolean);
}

function addSongToArtist(map, name, song, index) {
  const cleanName = String(name || "هنرمند نامشخص").trim() || "هنرمند نامشخص";
  const key = artistKey(cleanName);
  if (!map.has(key)) {
    map.set(key, { name: cleanName, image: "", genre: "", songs: [], albums: new Map() });
  }

  const artist = map.get(key);
  artist.songs.push({ song, index });

  const albumName = String(song.album || "Singles").trim() || "Singles";
  const albumKey = albumName.toLocaleLowerCase();
  if (!artist.albums.has(albumKey)) {
    artist.albums.set(albumKey, { name: albumName, cover: song.cover || "", songs: [] });
  }

  const album = artist.albums.get(albumKey);
  album.songs.push({ song, index });
  if (!album.cover && song.cover) album.cover = song.cover;
}

function getArtists() {
  const map = new Map();
  const profileData = Array.isArray(window.TANINFY_ARTISTS) ? window.TANINFY_ARTISTS : [];

  // Keep artist profiles separate even if an artist-data entry itself contains
  // a collaboration credit such as "Isam & Koorosh".
  profileData.forEach(profile => {
    if (!profile || !profile.name) return;
    splitArtistNames(profile.name).forEach(name => {
      const key = artistKey(name);
      if (!map.has(key)) {
        map.set(key, {
          name, image: profile.image || "", genre: profile.genre || "",
          songs: [], albums: new Map()
        });
      } else if (!map.get(key).image && profile.image) {
        map.get(key).image = profile.image;
      }
    });
  });

  songCatalog.forEach((song, index) => {
    splitArtistNames(song.artist || "هنرمند نامشخص").forEach(name => {
      addSongToArtist(map, name, song, index);
    });
  });

  return [...map.values()].map(artist => ({ ...artist, albums: [...artist.albums.values()] }));
}

function renderArtistDirectory() {
  const box = document.getElementById("artistDirectory");
  if (!box) return;
  const artists = getArtists();
  box.innerHTML = "";

  if (!artists.length) {
    box.innerHTML = '<p class="form-note">هنوز هنرمندی به کتابخانه Taninfy اضافه نشده است.</p>';
    return;
  }

  artists.sort((a, b) => a.name.localeCompare(b.name, "fa")).forEach(artist => {
    const card = document.createElement("div");
    card.className = "artist-directory-card";
    const photoWrap = document.createElement("div");
    photoWrap.className = "artist-directory-photo";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "artist-directory-open";
    open.setAttribute("aria-label", `مشاهده پروفایل ${artist.name}`);
    const img = document.createElement("img");
    if (artist.image) img.src = artist.image;
    img.alt = artist.name;
    img.loading = "lazy";
    open.appendChild(img);
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "artist-directory-favorite";
    const syncFavorite = () => {
      const active = isFavoriteArtist(artist.name);
      favorite.classList.toggle("active", active);
      favorite.textContent = active ? "✓" : "+";
      favorite.setAttribute("aria-label", active ? "حذف از هنرمندان موردعلاقه" : "افزودن به هنرمندان موردعلاقه");
    };
    syncFavorite();
    favorite.addEventListener("click", async event => {
      event.stopPropagation();
      const ok = await toggleFavoriteArtist(artist);
      if (ok) { syncFavorite(); renderArtistDirectory(); }
    });
    open.addEventListener("click", () => openArtistProfile(artist.name, true));
    photoWrap.append(open, favorite);
    const name = document.createElement("strong");
    name.textContent = artist.name;
    const count = document.createElement("span");
    count.textContent = `${artist.songs.length} آهنگ`;
    card.append(photoWrap, name, count);
    box.appendChild(card);
  });
}

function renderSearchSuggestions(query = "") {
  const q = query.trim().toLocaleLowerCase();
  searchSuggestions.innerHTML = "";
  if (!q) { searchSuggestions.classList.remove("active"); return; }

  const artists = getArtists().filter(a => a.name.toLocaleLowerCase().includes(q));
  const songs = songCatalog
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => `${song.title || ""} ${song.artist || ""}`.toLocaleLowerCase().includes(q));

  // Artist profile is intentionally first when the artist name matches.
  artists.slice(0, 5).forEach(artist => {
    const button = document.createElement("button");
    button.className = "search-suggestion";
    button.type = "button";
    button.innerHTML = `
      <img class="search-suggestion-cover" src="${artist.image || ""}" alt="">
      <span class="search-suggestion-info"><strong>${escapeHtml(artist.name)}</strong><span>${artist.songs.length} آهنگ</span></span>
      <span class="search-suggestion-type">ARTIST PROFILE</span>
      <span class="search-artist-heart" aria-hidden="true">${isFavoriteArtist(artist.name) ? "♥" : "♡"}</span>`;
    button.addEventListener("click", (event) => {
      if (event.target.closest(".search-artist-heart")) return;
      openArtistProfile(artist.name, true);
    });
    const suggestionHeart = button.querySelector(".search-artist-heart");
    suggestionHeart.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleFavoriteArtist(artist);
      suggestionHeart.textContent = isFavoriteArtist(artist.name) ? "♥" : "♡";
    });
    searchSuggestions.appendChild(button);
  });

  songs.slice(0, 7).forEach(({ song, index }) => {
    const button = document.createElement("button");
    button.className = "search-suggestion";
    button.type = "button";
    button.innerHTML = `
      <img class="search-suggestion-cover" src="${song.cover || ""}" alt="">
      <span class="search-suggestion-info"><strong>${escapeHtml(song.title || "بدون نام")}</strong><span>${escapeHtml(song.artist || "هنرمند نامشخص")}</span></span>
      <span class="search-suggestion-type">SONG</span>`;
    button.addEventListener("click", () => {
      searchSuggestions.classList.remove("active");
      setPlayerTrack(index, true);
    });
    searchSuggestions.appendChild(button);
  });

  searchSuggestions.classList.toggle("active", searchSuggestions.children.length > 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
}

const favoriteArtistKey = "taninfy-favorite-artists";
let favoriteArtists = taninfyReadJSON(favoriteArtistKey, [], Array.isArray);

function saveFavoriteArtists() {
  taninfySafeStorageSet(favoriteArtistKey, JSON.stringify(favoriteArtists));
}

function isFavoriteArtist(name) {
  return favoriteArtists.some(item => artistKey(item.name) === artistKey(name));
}

async function toggleFavoriteArtist(artist) {
  if (window.taninfyAuthReady) await window.taninfyAuthReady;
  if (!window.taninfyCurrentUser) {
    document.getElementById("loginStatus").textContent = "برای ذخیره هنرمند، اول وارد حساب Taninfy شو.";
    if (typeof showPage === "function") showPage("login");
    return false;
  }

  const index = favoriteArtists.findIndex(item => artistKey(item.name) === artistKey(artist.name));
  if (index >= 0) {
    favoriteArtists.splice(index, 1);
  } else {
    favoriteArtists.push({
      name: artist.name,
      image: artist.image || ""
    });
  }

  saveFavoriteArtists();
  renderFavoriteArtists();
  renderTrackCatalog();
  renderArtistDirectory();
  syncHearts();
  return true;
}

function syncArtistFavoriteButton(name) {
  if (!artistFavoriteBtn) return;
  const active = isFavoriteArtist(name);
  artistFavoriteBtn.classList.toggle("active", active);
  artistFavoriteBtn.textContent = active ? "✓" : "＋";
  artistFavoriteBtn.setAttribute("aria-label", active ? "حذف هنرمند از موردعلاقه‌ها" : "افزودن هنرمند به موردعلاقه‌ها");
}

function renderFavoriteArtists() {
  const box = document.getElementById("favoriteArtistList");
  if (!box) return;
  box.innerHTML = "";

  if (favoriteArtists.length === 0) {
    box.innerHTML = '<p class="form-note">هنوز هنرمندی را ذخیره نکردی.</p>';
    return;
  }

  favoriteArtists.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "favorite-artist-row";

    const img = document.createElement("img");
    if (item.image) img.src = item.image;
    img.alt = item.name;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "favorite-artist-open";
    open.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>ARTIST PROFILE</span>`;
    open.addEventListener("click", () => openArtistProfile(item.name, true));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "favorite-artist-remove";
    remove.textContent = "♥";
    remove.setAttribute("aria-label", "حذف هنرمند از علاقه‌مندی‌ها");
    remove.addEventListener("click", () => {
      favoriteArtists.splice(index, 1);
      saveFavoriteArtists();
      renderFavoriteArtists();
      renderTrackCatalog();
      syncHearts();
      syncArtistFavoriteButton(item.name);
    });

    row.append(img, open, remove);
    box.appendChild(row);
  });
}

renderFavoriteArtists();

function openArtistProfile(name, addHistory = true) {
  const artist = getArtists().find(a => artistKey(a.name) === artistKey(name));
  if (!artist) return;

  artistProfileName.textContent = artist.name;
  artistProfileCount.textContent = `${artist.songs.length} آهنگ · ${artist.albums.length} آلبوم در Taninfy`;
  artistProfileAvatar.removeAttribute("src");
  if (artist.image) artistProfileAvatar.src = artist.image;
  syncArtistFavoriteButton(artist.name);
  artistProfileAlbums.innerHTML = "";
  artistProfileSongs.innerHTML = "";

  const albumDetail = document.getElementById("artistAlbumDetail");
  const albumDetailCover = document.getElementById("artistAlbumDetailCover");
  const albumDetailName = document.getElementById("artistAlbumDetailName");
  const albumDetailCount = document.getElementById("artistAlbumDetailCount");
  const albumDetailSongs = document.getElementById("artistAlbumDetailSongs");
  const albumBack = document.getElementById("artistAlbumBack");

  function showAlbumDetail(album) {
    if (!albumDetail || !albumDetailSongs) return;
    artistProfileAlbums.style.display = "none";
    document.querySelector(".artist-albums-heading")?.style.setProperty("display", "none");
    artistProfileSongs.style.display = "none";
    albumDetail.style.display = "block";
    albumDetail.classList.add("active");
    albumDetail.setAttribute("aria-hidden", "false");
    albumDetailName.textContent = album.name || "آلبوم";
    albumDetailCount.textContent = `${album.songs.length} آهنگ`;
    albumDetailCover.src = album.cover || "";
    albumDetailSongs.innerHTML = "";

    album.songs.forEach(({ song, index }) => {
      const row = document.createElement("div");
      row.className = "artist-profile-song";
      row.innerHTML = `<img src="${song.cover || ""}" alt=""><div><strong>${escapeHtml(song.title || "بدون نام")}</strong><span>${escapeHtml(song.artist || artist.name)}</span></div><button type="button" aria-label="پخش">▶</button>`;
      const play = () => { if (Number.isInteger(index) && songCatalog[index]) setPlayerTrack(index, true, null); };
      row.addEventListener("click", play);
      row.querySelector("button")?.addEventListener("click", e => { e.stopPropagation(); play(); });
      albumDetailSongs.appendChild(row);
    });
    albumDetail.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function showArtistSongs() {
    if (albumDetail) { albumDetail.style.display="none"; albumDetail.classList.remove("active"); albumDetail.setAttribute("aria-hidden","true"); }
    artistProfileAlbums.style.display="";
    document.querySelector(".artist-albums-heading")?.style.removeProperty("display");
    artistProfileSongs.style.display="";
  }
  if (albumBack) albumBack.onclick = showArtistSongs;

  function renderArtistSongs(album) {
    artistProfileSongs.innerHTML = "";
    album.songs.forEach(({song,index}) => {
      const row=document.createElement("div"); row.className="artist-profile-song";
      row.innerHTML=`<img src="${song.cover || ""}" alt=""><div><strong>${escapeHtml(song.title || "بدون نام")}</strong><span>${escapeHtml(song.artist || artist.name)}</span></div><button type="button" aria-label="پخش">▶</button>`;
      const play=()=>{ if(Number.isInteger(index)&&songCatalog[index]) setPlayerTrack(index,true,null); };
      row.addEventListener("click",play);
      row.querySelector("button")?.addEventListener("click",e=>{e.stopPropagation();play();});
      artistProfileSongs.appendChild(row);
    });
  }

  artist.albums.forEach((album, albumIndex) => {
    const card=document.createElement("button"); card.type="button";
    card.className="artist-album-card"+(albumIndex===0?" active":"");
    card.innerHTML=`<img src="${album.cover || ""}" alt=""><strong>${escapeHtml(album.name)}</strong><span>${album.songs.length} آهنگ</span>`;
    card.addEventListener("click",e=>{
      e.preventDefault(); e.stopPropagation();
      document.querySelectorAll(".artist-album-card").forEach(item=>item.classList.remove("active"));
      card.classList.add("active"); showAlbumDetail(album);
    });
    artistProfileAlbums.appendChild(card);
  });

  if (artist.albums.length) renderArtistSongs(artist.albums[0]);
  artistProfile.classList.add("active");
  artistProfile.setAttribute("aria-hidden","false");
  searchSuggestions.classList.remove("active");
  if (addHistory) history.pushState({taninfy:true,artist:artist.name},"","#artist-"+encodeURIComponent(artist.name));
}
function closeArtistProfile(goBack = true) {
  artistProfile.classList.remove("active");
  artistProfile.setAttribute("aria-hidden", "true");
  if (goBack && history.state && history.state.artist) history.back();
}

if (musicSearch) {
  musicSearch.addEventListener("input", function() {
    musicSearch.parentElement.classList.toggle("has-value", !!this.value);
    renderSearchSuggestions(this.value);
  });
}
if (clearMusicSearch) clearMusicSearch.addEventListener("click", function() {
  musicSearch.value = "";
  musicSearch.parentElement.classList.remove("has-value");
  searchSuggestions.classList.remove("active");
  musicSearch.focus();
});
if (closeArtistProfileBtn) closeArtistProfileBtn.addEventListener("click", () => closeArtistProfile(true));
if (artistProfileMore) artistProfileMore.addEventListener("click", () => {});
if (artistFavoriteBtn) {
  artistFavoriteBtn.addEventListener("click", async function(event) {
    event.stopPropagation();
    const artist = getArtists().find(a => artistKey(a.name) === artistKey(artistProfileName.textContent));
    if (!artist) return;
    const changed = await toggleFavoriteArtist(artist);
    if (changed) syncArtistFavoriteButton(artist.name);
  });
}
document.addEventListener("click", function(event) {
  if (!event.target.closest(".music-search-wrap")) searchSuggestions?.classList.remove("active");
});
