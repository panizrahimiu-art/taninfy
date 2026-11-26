/* TANINFY SETTINGS — saved locally on this device */
(function () {
  const storageKey = "taninfy-settings";
  const defaults = {
    theme: "dark", accent: "#d5a0ad", textScale: "1",
    publicProfile: true, showPlaylists: true
  };
  const storedSettings = taninfyReadJSON(
    storageKey,
    null,
    value => value && typeof value === "object" && !Array.isArray(value)
  );
  const settings = { ...defaults, ...(storedSettings || {}) };
  if (!["dark", "light"].includes(settings.theme)) settings.theme = defaults.theme;
  if (typeof settings.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(settings.accent)) settings.accent = defaults.accent;
  if (!["0.95", "1", "1.08"].includes(String(settings.textScale))) settings.textScale = defaults.textScale;
  settings.publicProfile = settings.publicProfile !== false;
  settings.showPlaylists = settings.showPlaylists !== false;
  // Remove obsolete settings left by older versions of the page.
  ["autoplay", "shuffle", "repeat", "volume", "newMusic", "artistNews"].forEach(key => delete settings[key]);
  window.taninfySettings = settings;

  const $ = id => document.getElementById(id);
  function save() {
    const saved = taninfySafeStorageSet(storageKey, JSON.stringify(settings));
    const status = $("settingsStatus");
    if (status) status.textContent = saved ? "تنظیمات ذخیره شد." : "ذخیره‌سازی مرورگر در دسترس نیست.";
  }
  function applyTheme() {
    document.body.classList.toggle("light-theme", settings.theme === "light");
    document.documentElement.style.setProperty("--pink", settings.accent);
    document.documentElement.style.setProperty("--wine2", settings.accent);
    document.documentElement.style.setProperty("--wine", settings.accent);
    // Apply the selected accent to components that previously used hard-coded burgundy colors.
    let accentStyle = document.getElementById("taninfyAccentOverrides");
    if (!accentStyle) {
      accentStyle = document.createElement("style");
      accentStyle.id = "taninfyAccentOverrides";
      document.head.appendChild(accentStyle);
    }
    accentStyle.textContent = `
      /* Self-contained theme overrides — no undefined template variables. */
      body.light-theme {
        --bg:#f4eff1;
        --panel:#ffffff;
        --text:#111111;
        --muted:#5f555a;
        --line:rgba(40,28,33,.14);
      }
      body.light-theme .curated-card,
      body.light-theme .playlist-picker,
      body.light-theme .panel,
      body.light-theme .settings-card {
        color:#111 !important;
      }
      body.light-theme .playlist-detail-song-info strong,
      body.light-theme .playlist-detail-meta h2,
      body.light-theme .playlist-detail-list-head,
      body.light-theme .playlist-detail-kicker,
      body.light-theme .playlist-detail-back,
      body.light-theme .playlist-detail-actions button {
        color:#111 !important;
      }
      body.light-theme .playlist-detail-song-info span,
      body.light-theme .playlist-detail-list-head span:last-child {
        color:#2b2528 !important;
      }
      .btn-primary, .top-login, .segmented-control button.active { background:linear-gradient(135deg, ${settings.accent}, color-mix(in srgb, ${settings.accent} 62%, #171017)) !important; border-color:${settings.accent} !important; }
      /* Keep the navigation bar and its selected state in sync with the chosen accent. */
      .app-sidebar { background:color-mix(in srgb, ${settings.accent} 13%, #100c0f) !important; border-color:color-mix(in srgb, ${settings.accent} 35%, transparent) !important; }
      body.light-theme .app-sidebar { background:color-mix(in srgb, ${settings.accent} 12%, #ffffff) !important; border-color:color-mix(in srgb, ${settings.accent} 32%, #ffffff) !important; }
      .sidebar-nav a.active, .sidebar-nav a:hover, .sidebar-bottom a:hover { background:color-mix(in srgb, ${settings.accent} 25%, transparent) !important; }
      .sidebar-nav a.active, .sidebar-brand strong, .sidebar-logo, .topbar-arrow, .top-search > span { color:${settings.accent} !important; }
      .sidebar-logo { border-color:${settings.accent} !important; }
      .mix, .mix:nth-child(2), .mix:nth-child(3) { background:linear-gradient(135deg, color-mix(in srgb, ${settings.accent} 38%, #171017), #171017) !important; }
      .mix small, .mix::after, .hero h1 em, .profile-kicker, .profile-main p, .custom-accent { color:${settings.accent} !important; }
      .mix::after { background:color-mix(in srgb, ${settings.accent} 20%, transparent) !important; }
      .switch input:checked+span { background:${settings.accent} !important; }
      /* Keep full-player play/pause icon transparent; accent applies only to compact play controls. */
      .play-btn, .track-play { background:${settings.accent} !important; border-color:${settings.accent} !important; color:color-mix(in srgb, ${settings.accent} 35%, #171017) !important; }
      .full-play-btn svg, .play-btn svg, .track-play svg { fill:currentColor !important; }
      .track:hover { background:color-mix(in srgb, ${settings.accent} 10%, transparent) !important; }
      .settings-symbol { color:${settings.accent} !important; background:color-mix(in srgb, ${settings.accent} 13%, transparent) !important; }
      .btn-primary:hover { filter:brightness(1.12); }
    `;
    document.documentElement.style.setProperty("--text-scale", String(Number(settings.textScale) || 1));
    /* body.zoom breaks fixed player/sidebar positioning; keep layout at 1:1. */
    document.body.style.zoom = "1";
    document.body.style.fontSize = `calc(16px * ${Number(settings.textScale) || 1})`;
    document.querySelectorAll("[data-theme-mode]").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.themeMode === settings.theme));
    document.querySelectorAll(".accent-swatch").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.accent.toLowerCase() === settings.accent.toLowerCase()));
    if ($("customAccent")) $("customAccent").value = settings.accent;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = settings.theme === "light" ? "#f4eff1" : "#090809";
  }
  function syncControls() {
    const map = {
      settingPublicProfile:"publicProfile", settingShowPlaylists:"showPlaylists"
    };
    Object.entries(map).forEach(([id,key]) => { if ($(id)) $(id).checked = !!settings[key]; });
    if ($("textScale")) $("textScale").value = settings.textScale;
  }
  document.querySelectorAll("[data-theme-mode]").forEach(btn => btn.addEventListener("click", () => {
    settings.theme = btn.dataset.themeMode; applyTheme(); save();
  }));
  document.querySelectorAll(".accent-swatch").forEach(btn => btn.addEventListener("click", () => {
    settings.accent = btn.dataset.accent; applyTheme(); save();
  }));
  $("customAccent")?.addEventListener("input", e => { settings.accent = e.target.value; applyTheme(); save(); });
  $("textScale")?.addEventListener("change", e => { settings.textScale = e.target.value; applyTheme(); save(); });
  const toggles = {
    settingPublicProfile:"publicProfile", settingShowPlaylists:"showPlaylists"
  };
  Object.entries(toggles).forEach(([id,key]) => $(id)?.addEventListener("change", e => {
    settings[key] = e.target.checked;
    save();
  }));
  $("resetSettings")?.addEventListener("click", () => {
    Object.assign(settings, defaults); Object.keys(settings).forEach(key => { if (!(key in defaults)) delete settings[key]; }); window.taninfySettings = settings;
    applyTheme(); syncControls(); save();
    if ($("settingsStatus")) $("settingsStatus").textContent = "تنظیمات به حالت پیش‌فرض برگشت.";
  });
  applyTheme();
  syncControls();
})();

/* Keep the dedicated playlist view synchronized with the global player. */
if (typeof audioPlayer !== "undefined") {
  audioPlayer.addEventListener("play", updatePlaylistDetailPlaying);
  audioPlayer.addEventListener("pause", updatePlaylistDetailPlaying);
  audioPlayer.addEventListener("ended", updatePlaylistDetailPlaying);
}
