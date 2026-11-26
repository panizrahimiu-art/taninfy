/* FULL SCREEN MUSIC PLAYER */
const fullPlayer = document.getElementById("fullPlayer");
const closeFullPlayer = document.getElementById("closeFullPlayer");
const fullCover = document.getElementById("fullCover");
const fullTitle = document.getElementById("fullTitle");
const fullArtist = document.getElementById("fullArtist");
const fullPlayBtn = document.getElementById("fullPlayBtn");
const fullPrevBtn = document.getElementById("fullPrevBtn");
const fullNextBtn = document.getElementById("fullNextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const fullPlayerMore = document.getElementById("fullPlayerMore");
const fullFavoriteBtn = document.getElementById("fullFavoriteBtn");
const fullPlaylistBtn = document.getElementById("fullPlaylistBtn");
const fullProgress = document.getElementById("fullProgress");
const fullCurrentTime = document.getElementById("fullCurrentTime");
const fullDuration = document.getElementById("fullDuration");

const fullDownloadBtn = document.getElementById("fullDownloadBtn");

async function downloadCurrentSong() {
  const track = songCatalog[currentTrackIndex];
  if (!track || !track.src) {
    alert("لینک دانلود این آهنگ در دسترس نیست.");
    return;
  }
  if (window.taninfyAuthReady) await window.taninfyAuthReady;
  if (!window.taninfyCurrentUser) {
    const status = document.getElementById("loginStatus");
    if (status) status.textContent = "برای دانلود آهنگ، ابتدا ثبت‌نام یا وارد حساب Taninfy شو؛ سپس دوباره روی دانلود بزن.";
    if (typeof showPage === "function") showPage("login");
    return;
  }

  const safeName = ((track.artist || "Taninfy") + " - " + (track.title || "song"))
    .replace(/[\\/:*?"<>|]/g, "-").trim();
  const link = document.createElement("a");
  link.href = track.src;
  link.download = safeName + (String(track.src).match(/\.(mp3|wav|m4a|ogg)(?:[?#]|$)/i)?.[1] ? "." + String(track.src).match(/\.(mp3|wav|m4a|ogg)(?:[?#]|$)/i)[1] : ".mp3");
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
fullDownloadBtn?.addEventListener("click", downloadCurrentSong);

let shuffleEnabled = false;
let repeatEnabled = false;
let shuffleQueue = [];
let shuffleHistory = [];

function rebuildShuffleQueue() {
  const pool = getActivePlaybackIndices().filter(index => index !== currentTrackIndex);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  shuffleQueue = pool;
}

function playPreviousShuffleTrack() {
  while (shuffleHistory.length) {
    const previousIndex = shuffleHistory.pop();
    if (previousIndex !== currentTrackIndex && songCatalog[previousIndex]) {
      setPlayerTrack(previousIndex, true, activePlaybackIndices);
      return;
    }
  }
  const playbackIndices = getActivePlaybackIndices();
  const position = playbackIndices.indexOf(currentTrackIndex);
  if (position >= 0) {
    setPlayerTrack(playbackIndices[(position - 1 + playbackIndices.length) % playbackIndices.length], true, activePlaybackIndices);
  }
}

function syncFullFavoriteButton(track) {
  if (!fullFavoriteBtn || !track) return;
  const active = favorites.some(item => item.songId === track.id || (item.title === track.title && item.artist === track.artist));
  fullFavoriteBtn.classList.toggle("active", active);
  fullFavoriteBtn.textContent = active ? "♥" : "♡";
}

async function toggleCurrentSongFavorite() {
  const track = songCatalog[currentTrackIndex];
  if (!track) return;

  if (window.taninfyAuthReady) await window.taninfyAuthReady;
  if (!window.taninfyCurrentUser) {
    document.getElementById("loginStatus").textContent = "برای لایک کردن آهنگ، اول باید در Taninfy ثبت‌نام کنی.";
    if (typeof showPage === "function") showPage("login");
    return;
  }

  const index = favorites.findIndex(item => item.songId === track.id || (item.title === track.title && item.artist === track.artist));
  if (index >= 0) favorites.splice(index, 1);
  else favorites.push({ songId: track.id || String(currentTrackIndex), title: track.title || "بدون نام", artist: track.artist || "هنرمند نامشخص" });

  saveFavorites();
  renderFavorites();
  syncHearts();
  syncFullFavoriteButton(track);
}

function openFullPlayer(track) {
  if (!track) return;

  fullTitle.textContent = track.title || "Unknown Song";
  fullArtist.textContent = track.artist || "Unknown Artist";

  const fullPlayerBackdrop = document.getElementById("fullPlayerBackdrop");
  updateTrackCoverImage(fullCover, track.cover);
  updateTrackCoverImage(fullPlayerBackdrop, track.cover, null, ".58");

  fullPlayer.classList.add("active");
  syncFullFavoriteButton(track);
  updateFullPlayButton();
}

function closeFullMusicPlayer() {
  fullPlayer.classList.remove("active");
}

closeFullPlayer?.addEventListener("click", closeFullMusicPlayer);

if (fullFavoriteBtn) {
  fullFavoriteBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    toggleCurrentSongFavorite();
  });
}

if (fullPlaylistBtn) {
  fullPlaylistBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    openPlaylistPicker();
  });
}

fullPlayerMore.addEventListener("click", async function() {
  const track = songCatalog[currentTrackIndex];
  if (!track) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: track.title || "Taninfy",
        text: `${track.title || "Song"} — ${track.artist || "Taninfy"}`
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      fullPlayerMore.title = "Link copied";
      setTimeout(() => fullPlayerMore.title = "More", 1200);
    }
  } catch (error) {}
});

fullPlayer.addEventListener("click", function(event) {
  if (event.target === fullPlayer) closeFullMusicPlayer();
});

fullPlayBtn.addEventListener("click", function() {
  if (audioPlayer.paused) audioPlayer.play().catch(() => {});
  else audioPlayer.pause();
});

function updateFullPlayButton() {
  fullPlayBtn.textContent = audioPlayer.paused ? "▶" : "❚❚";
}

function formatFullTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

audioPlayer.addEventListener("timeupdate", function() {
  if (!audioPlayer.duration) return;

  fullProgress.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  fullCurrentTime.textContent = formatFullTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("loadedmetadata", function() {
  fullDuration.textContent = formatFullTime(audioPlayer.duration);
  fullCurrentTime.textContent = "0:00";
  fullProgress.value = 0;
});

fullProgress.addEventListener("input", function() {
  if (!audioPlayer.duration) return;
  audioPlayer.currentTime = (this.value / 100) * audioPlayer.duration;
});

fullPrevBtn.addEventListener("click", function() {
  if (shuffleEnabled) { playPreviousShuffleTrack(); return; }
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length) return;

  const position = playbackIndices.indexOf(currentTrackIndex);
  const previousPosition = position <= 0 ? playbackIndices.length - 1 : position - 1;
  setPlayerTrack(playbackIndices[previousPosition], true, activePlaybackIndices);
});

fullNextBtn.addEventListener("click", function() {
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length) return;

  if (shuffleEnabled) {
    playRandomTrack();
    return;
  }

  const position = playbackIndices.indexOf(currentTrackIndex);
  const nextPosition = position < 0 || position >= playbackIndices.length - 1 ? 0 : position + 1;
  setPlayerTrack(playbackIndices[nextPosition], true, activePlaybackIndices);
});

shuffleBtn.addEventListener("click", function() {
  shuffleEnabled = !shuffleEnabled;
  shuffleQueue = [];
  shuffleHistory = [];
  if (shuffleEnabled) rebuildShuffleQueue();
  shuffleBtn.classList.toggle("active", shuffleEnabled);
  shuffleBtn.title = shuffleEnabled ? "Shuffle on" : "Shuffle";
});

repeatBtn.addEventListener("click", function() {
  repeatEnabled = !repeatEnabled;
  repeatBtn.classList.toggle("active", repeatEnabled);
  repeatBtn.title = repeatEnabled ? "Repeat song on" : "Repeat";
});

/* Unified mobile/desktop playback mode button:
   normal -> shuffle -> repeat -> normal */
const fullModeBtn = document.getElementById("fullModeBtn");

function syncFullModeButton() {
  if (!fullModeBtn) return;

  if (shuffleEnabled) {
    fullModeBtn.textContent = "⤨";
    fullModeBtn.title = "پخش تصادفی روشن";
    fullModeBtn.setAttribute("aria-label", "پخش تصادفی روشن");
    fullModeBtn.classList.add("active");
  } else if (repeatEnabled) {
    fullModeBtn.textContent = "↻";
    fullModeBtn.title = "تکرار روشن";
    fullModeBtn.setAttribute("aria-label", "تکرار روشن");
    fullModeBtn.classList.add("active");
  } else {
    fullModeBtn.textContent = "⤨";
    fullModeBtn.title = "پخش تصادفی";
    fullModeBtn.setAttribute("aria-label", "پخش تصادفی");
    fullModeBtn.classList.remove("active");
  }
}

fullModeBtn?.addEventListener("click", function(event) {
  event.stopPropagation();

  if (!shuffleEnabled && !repeatEnabled) {
    shuffleEnabled = true;
    repeatEnabled = false;
    shuffleQueue = [];
    shuffleHistory = [];
    rebuildShuffleQueue();
  } else if (shuffleEnabled) {
    shuffleEnabled = false;
    repeatEnabled = true;
    shuffleQueue = [];
    shuffleHistory = [];
  } else {
    shuffleEnabled = false;
    repeatEnabled = false;
    shuffleQueue = [];
    shuffleHistory = [];
  }

  shuffleBtn?.classList.toggle("active", shuffleEnabled);
  repeatBtn?.classList.toggle("active", repeatEnabled);
  syncFullModeButton();
});

syncFullModeButton();

// Change tracks from Android notification/lock-screen controls.
// Wait until the new source is ready before resuming playback; otherwise
// some Android Chrome versions pause the player after a next/previous action.
function playMediaSessionTrack(index) {
  if (!Number.isInteger(index) || !songCatalog[index]) return;

  const expectedIndex = index;
  setPlayerTrack(index, false, activePlaybackIndices);

  const resumeNewTrack = () => {
    if (currentTrackIndex !== expectedIndex) return;
    audioPlayer.play().then(() => {
      updateTaninfyPlaybackState();
      updateTrackButtons();
      updateFullPlayButton();
    }).catch((error) => {
      // Ignore a stale play request if another track was selected meanwhile.
      if (currentTrackIndex === expectedIndex && error && error.name !== 'AbortError') {
        console.warn('Media Session could not resume the next track:', error);
      }
    });
  };

  if (audioPlayer.readyState >= 3) {
    resumeNewTrack();
  } else {
    audioPlayer.addEventListener('canplay', resumeNewTrack, { once: true });
  }
}

function advanceMediaSessionTrack(direction) {
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length) return;

  let targetIndex = -1;
  if (shuffleEnabled) {
    if (direction > 0) {
      if (playbackIndices.length <= 1) return;
      if (!shuffleQueue.length) rebuildShuffleQueue();
      targetIndex = shuffleQueue.shift();
      if (currentTrackIndex >= 0) shuffleHistory.push(currentTrackIndex);
    } else {
      while (shuffleHistory.length) {
        const previousIndex = shuffleHistory.pop();
        if (playbackIndices.includes(previousIndex) && previousIndex !== currentTrackIndex) {
          targetIndex = previousIndex;
          break;
        }
      }
      if (targetIndex < 0) {
        const position = playbackIndices.indexOf(currentTrackIndex);
        targetIndex = playbackIndices[(position <= 0 ? playbackIndices.length - 1 : position - 1)];
      }
    }
  } else {
    const position = playbackIndices.indexOf(currentTrackIndex);
    if (direction > 0) {
      targetIndex = playbackIndices[position < 0 || position >= playbackIndices.length - 1 ? 0 : position + 1];
    } else {
      targetIndex = playbackIndices[position <= 0 ? playbackIndices.length - 1 : position - 1];
    }
  }

  if (Number.isInteger(targetIndex) && targetIndex !== currentTrackIndex) {
    playMediaSessionTrack(targetIndex);
  }
}

function playRandomTrack() {
  const playbackIndices = getActivePlaybackIndices();
  if (playbackIndices.length <= 1) return;

  if (!shuffleQueue.length) rebuildShuffleQueue();
  const nextIndex = shuffleQueue.shift();
  if (!Number.isInteger(nextIndex) || nextIndex === currentTrackIndex) {
    rebuildShuffleQueue();
    return playRandomTrack();
  }
  if (currentTrackIndex >= 0) shuffleHistory.push(currentTrackIndex);
  setPlayerTrack(nextIndex, true, activePlaybackIndices);
}

/* Clicking the mini-player body opens the large player.
   Its buttons keep their own controls. */
player.addEventListener("click", function(event) {
  if (event.target.closest("button") || event.target.closest("input")) return;

  if (currentTrackIndex >= 0 && songCatalog[currentTrackIndex]) {
    openFullPlayer(songCatalog[currentTrackIndex]);
  }
});
