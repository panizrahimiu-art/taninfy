/* AUDIO PLAYER */
const audioPlayer = document.getElementById("audioPlayer");
const player = document.querySelector(".player");
const nowTitle = document.getElementById("nowTitle");
const nowArtist = document.getElementById("nowArtist");
const miniPlayerCover = document.getElementById("miniPlayerCover");
const mainPlay = document.getElementById("mainPlay");
const playIcon = document.getElementById("playIcon");
const bufferRingProgress = document.getElementById("bufferRingProgress");
const previousTrack = document.getElementById("previousTrack");
const nextTrack = document.getElementById("nextTrack");

let currentTrackIndex = -1;
let isLoadingTrack = false;
let trackedPlayIndex = -1;
let trackedPlayRecorded = false;

/* Active playback context: null = global library, array = current playlist. */
let activePlaybackIndices = null;

function getActivePlaybackIndices() {
  if (Array.isArray(activePlaybackIndices) && activePlaybackIndices.length) {
    return activePlaybackIndices.filter(index =>
      Number.isInteger(index) && index >= 0 && index < songCatalog.length
    );
  }
  return songCatalog.map((_, index) => index);
}

function maybeRecordMeaningfulListen() {
  if (currentTrackIndex < 0 || audioPlayer.paused || trackedPlayRecorded) return;
  const duration = Number(audioPlayer.duration);
  const threshold = Number.isFinite(duration) && duration > 0 ? Math.min(30, duration * 0.5) : 30;
  if (audioPlayer.currentTime >= threshold) {
    trackedPlayRecorded = true;
    const song = songCatalog[currentTrackIndex];
    if (song && typeof window.recordTaninfyListen === "function") {
      window.recordTaninfyListen(song).catch(error => console.warn("Listen stats could not be saved.", error));
    }
  }
}
let bufferAnimationFrame = null;

function setBufferProgress(percent) {
  if (!bufferRingProgress) return;
  const circumference = 106.81;
  const safePercent = Math.max(0, Math.min(100, percent));
  bufferRingProgress.style.strokeDashoffset =
    circumference - (circumference * safePercent / 100);
}

function updateBufferProgress() {
  if (!audioPlayer.duration || !audioPlayer.buffered.length) {
    setBufferProgress(0);
    return;
  }

  let bufferedEnd = 0;
  for (let i = 0; i < audioPlayer.buffered.length; i++) {
    if (audioPlayer.buffered.end(i) > bufferedEnd) {
      bufferedEnd = audioPlayer.buffered.end(i);
    }
  }

  const percent = (bufferedEnd / audioPlayer.duration) * 100;
  setBufferProgress(percent);
}

function startBufferProgress() {
  stopBufferProgress();

  const loop = () => {
    updateBufferProgress();
    if (isLoadingTrack) {
      bufferAnimationFrame = requestAnimationFrame(loop);
    }
  };

  bufferAnimationFrame = requestAnimationFrame(loop);
}

function stopBufferProgress() {
  if (bufferAnimationFrame) {
    cancelAnimationFrame(bufferAnimationFrame);
    bufferAnimationFrame = null;
  }
}

function setLoadingState(loading) {
  isLoadingTrack = loading;

  if (loading) {
    player.classList.add("is-buffering");
    mainPlay.disabled = false;
    playIcon.textContent = "▶";
    startBufferProgress();
  } else {
    player.classList.remove("is-buffering");
    mainPlay.disabled = false;
    stopBufferProgress();
    updateBufferProgress();
    playIcon.textContent = audioPlayer.paused ? "▶" : "Ⅱ";
  }
}

// Android Chrome lock-screen / notification media controls (Media Session API)
function updateTaninfyMediaSession(track) {
  if (!('mediaSession' in navigator) || !track) return;
  try {
    const artwork = String(track.cover || '').trim();
    const metadata = {
      title: track.title || 'بدون نام',
      artist: track.artist || 'هنرمند نامشخص',
      album: track.album || 'طنین‌فای',
      artwork: artwork ? [
        { src: artwork, sizes: '96x96' },
        { src: artwork, sizes: '192x192' },
        { src: artwork, sizes: '512x512' }
      ] : []
    };
    navigator.mediaSession.metadata = new MediaMetadata(metadata);
  } catch (error) {
    console.warn('Media Session metadata could not be updated:', error);
  }
}

function updateTaninfyPlaybackState() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = audioPlayer.paused ? 'paused' : 'playing';
  } catch (error) {}
}

if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('play', () => {
      if (currentTrackIndex >= 0) audioPlayer.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => advanceMediaSessionTrack(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => advanceMediaSessionTrack(1));
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (Number.isFinite(audioPlayer.duration)) {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + (details.seekOffset || 10));
      }
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (Number.isFinite(audioPlayer.duration) && Number.isFinite(details.seekTime)) {
        audioPlayer.currentTime = Math.max(0, Math.min(audioPlayer.duration, details.seekTime));
      }
    });
  } catch (error) {
    console.warn('Some media session actions are not supported:', error);
  }
}

// Prevent a delayed image load from the previous track replacing the current cover.
function updateTrackCoverImage(image, source, visibleClass = null, opacity = "1") {
  if (!image) return;
  const url = String(source || "").trim();
  const requestId = String((Number(image.dataset.coverRequestId) || 0) + 1);
  image.dataset.coverRequestId = requestId;
  image.style.opacity = "0";
  if (visibleClass) image.classList.remove(visibleClass);

  if (!url || url.includes("DIRECT-COVER-IMAGE-URL")) {
    image.removeAttribute("src");
    return;
  }

  image.onload = function () {
    if (image.dataset.coverRequestId !== requestId) return;
    image.style.opacity = opacity;
    if (visibleClass) image.classList.add(visibleClass);
  };
  image.onerror = function () {
    if (image.dataset.coverRequestId !== requestId) return;
    image.style.opacity = "0";
    if (visibleClass) image.classList.remove(visibleClass);
  };
  image.src = url;
}

function setPlayerTrack(index, autoplay = true, playbackContext = null) {
  if (!songCatalog.length || !songCatalog[index]) return;

  activePlaybackIndices = Array.isArray(playbackContext) && playbackContext.length
    ? [...new Set(playbackContext.filter(i => Number.isInteger(i) && i >= 0 && i < songCatalog.length))]
    : null;

  if (Array.isArray(activePlaybackIndices) && !activePlaybackIndices.includes(index)) {
    activePlaybackIndices = null;
  }

  currentTrackIndex = index;
  trackedPlayIndex = index;
  trackedPlayRecorded = false;
  const track = songCatalog[index];
  updateTaninfyMediaSession(track);

  nowTitle.textContent = track.title || "بدون نام";
  nowArtist.textContent = track.artist || "هنرمند نامشخص";

  updateTrackCoverImage(miniPlayerCover, track.cover, "has-cover");

  player.classList.add("visible");

  // If the large player is already open, refresh its song information
  // immediately when the track changes.
  if (typeof fullPlayer !== "undefined" && fullPlayer.classList.contains("active")) {
    openFullPlayer(track);
  }

  setBufferProgress(0);
  fullProgress.value = 0;
  fullCurrentTime.textContent = "0:00";
  fullDuration.textContent = "0:00";
  setLoadingState(true);

  audioPlayer.pause();
  audioPlayer.preload = "auto";
  audioPlayer.src = track.src || "";
  audioPlayer.load();
  preloadAdjacentTrack();

  updateTrackButtons();

  if (autoplay) {
    audioPlayer.play().catch(() => {
      setLoadingState(false);
      nowArtist.textContent = "برای پخش، لینک مستقیم فایل صوتی را بررسی کن";
    });
  }
}

let preloadedAudio = null;
let preloadedTrackIndex = -1;

function preloadAdjacentTrack() {
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length || currentTrackIndex < 0) return;

  const position = playbackIndices.indexOf(currentTrackIndex);
  if (position < 0) return;

  const nextIndex = playbackIndices[(position + 1) % playbackIndices.length];
  const nextTrack = songCatalog[nextIndex];
  if (!nextTrack || !nextTrack.src || nextIndex === currentTrackIndex) return;

  if (preloadedTrackIndex === nextIndex && preloadedAudio) return;
  try {
    preloadedAudio = new Audio();
    preloadedAudio.preload = "auto";
    preloadedAudio.src = nextTrack.src;
    preloadedAudio.load();
    preloadedTrackIndex = nextIndex;
  } catch (e) {}
}

function updateTrackButtons() {
  document.querySelectorAll("#trackList .track").forEach(row => {
    const index = Number(row.dataset.songIndex);
    const active = index === currentTrackIndex && !audioPlayer.paused;
    const sideButton = row.querySelector(".track-play");
    const coverIcon = row.querySelector(".track-cover-play");
    if (sideButton) sideButton.textContent = active ? "Ⅱ" : "▶";
    if (coverIcon) {
      coverIcon.textContent = active ? "Ⅱ" : "▶";
      coverIcon.classList.toggle("active", active);
    }
    row.classList.toggle("is-playing", active);
  });
}

trackList.addEventListener("click", function(event) {
  const heartButton = event.target.closest(".heart-btn");
  if (heartButton) return;

  const row = event.target.closest(".track");
  if (!row) return;

  const index = Number(row.dataset.songIndex);
  if (!Number.isInteger(index) || !songCatalog[index]) return;

  setPlayerTrack(index, true);
});

mainPlay.addEventListener("click", async function(event) {
  event.stopPropagation();
  if (currentTrackIndex < 0) return;

  if (audioPlayer.paused) {
    try {
      await audioPlayer.play();
    } catch (error) {
      nowArtist.textContent = "لینک مستقیم فایل صوتی معتبر نیست";
    }
  } else {
    audioPlayer.pause();
  }
});

previousTrack.addEventListener("click", function() {
  if (shuffleEnabled) { playPreviousShuffleTrack(); return; }
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length) return;

  const position = playbackIndices.indexOf(currentTrackIndex);
  const previousPosition = position <= 0 ? playbackIndices.length - 1 : position - 1;
  setPlayerTrack(playbackIndices[previousPosition], true, activePlaybackIndices);
});

nextTrack.addEventListener("click", function() {
  const playbackIndices = getActivePlaybackIndices();
  if (!playbackIndices.length) return;

  const position = playbackIndices.indexOf(currentTrackIndex);
  const nextPosition = position < 0 || position >= playbackIndices.length - 1 ? 0 : position + 1;
  setPlayerTrack(playbackIndices[nextPosition], true, activePlaybackIndices);
});

audioPlayer.addEventListener("loadstart", function() {
  if (currentTrackIndex >= 0) setLoadingState(true);
});

audioPlayer.addEventListener("progress", updateBufferProgress);

audioPlayer.addEventListener("loadedmetadata", updateBufferProgress);
audioPlayer.addEventListener("timeupdate", maybeRecordMeaningfulListen);

audioPlayer.addEventListener("canplay", function() {
  setLoadingState(false);
});

audioPlayer.addEventListener("play", function() {
  updateTaninfyPlaybackState();
  setLoadingState(false);
  playIcon.textContent = "Ⅱ";
  updateTrackButtons();
  updateFullPlayButton();
});

audioPlayer.addEventListener("pause", function() {
  updateTaninfyPlaybackState();
  if (!audioPlayer.ended) {
    player.classList.remove("is-buffering");
  }
  playIcon.textContent = "▶";
  updateTrackButtons();
  updateFullPlayButton();
});

audioPlayer.addEventListener("ended", function() {
  updateTaninfyPlaybackState();
  if (repeatEnabled) {
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {});
    return;
  }

  if (shuffleEnabled) {
    playRandomTrack();
    return;
  }

  if (window.taninfySettings && window.taninfySettings.autoplay === false) {
    setLoadingState(false);
    playIcon.textContent = "▶";
    updateTrackButtons();
    updateFullPlayButton();
    return;
  }

  const playbackIndices = getActivePlaybackIndices();
  const position = playbackIndices.indexOf(currentTrackIndex);

  if (position >= 0 && position < playbackIndices.length - 1) {
    setPlayerTrack(playbackIndices[position + 1], true, activePlaybackIndices);
  } else if (position === playbackIndices.length - 1 && Array.isArray(activePlaybackIndices)) {
    // Playlist playback stays inside the playlist and loops to its first song.
    setPlayerTrack(playbackIndices[0], true, activePlaybackIndices);
  } else {
    setLoadingState(false);
    playIcon.textContent = "▶";
    updateTrackButtons();
  }
});

audioPlayer.addEventListener("error", function() {
  setLoadingState(false);
  if (currentTrackIndex >= 0) {
    nowArtist.textContent = "خطا در دسترسی به فایل صوتی؛ لینک را بررسی کن";
  }
});
