(function(){
  const topSearch = document.getElementById("topMusicSearch");
  if (!topSearch) return;

  const searchWrap = topSearch.closest(".top-search");
  const results = document.createElement("div");
  results.className = "top-search-results";
  results.id = "topMusicSearchResults";
  results.setAttribute("role","listbox");
  searchWrap.appendChild(results);

  // Normalize Arabic/Persian letter variants and whitespace before matching.
  const normalize = value => String(value || "")
    .toLocaleLowerCase()
    .replace(/[يى]/g,"ی")
    .replace(/ك/g,"ک")
    .replace(/أ|إ|آ/g,"ا")
    .replace(/\u0640/g,"")
    .replace(/\s+/g," ")
    .trim();

  const makeResult = ({title,subtitle,kind,cover,onSelect}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "top-search-result";
    button.setAttribute("role","option");

    const img = document.createElement("img");
    img.alt = "";
    if (cover) img.src = cover;
    img.onerror = () => { img.style.visibility = "hidden"; };

    const copy = document.createElement("span");
    copy.className = "top-search-result-copy";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("span");
    small.textContent = subtitle || "";
    copy.append(strong,small);

    const type = document.createElement("span");
    type.className = "top-search-result-type";
    type.textContent = kind;
    button.append(img,copy,type);
    button.addEventListener("click", () => {
      results.classList.remove("active");
      onSelect();
    });
    return button;
  };

  function runSearch(){
    const raw = topSearch.value;
    const query = normalize(raw);
    results.innerHTML = "";
    if (!query) {
      results.classList.remove("active");
      return;
    }

    const songs = (Array.isArray(window.songCatalog) ? window.songCatalog :
      (typeof songCatalog !== "undefined" && Array.isArray(songCatalog) ? songCatalog : []))
      .map((song,index)=>({song,index}))
      .filter(({song}) => normalize([
        song?.title,song?.artist,song?.album
      ].join(" ")).includes(query))
      .slice(0,8);

    const playlists = (typeof getTaninfyPlaylists === "function" ? getTaninfyPlaylists() : [])
      .filter(playlist => normalize(playlist?.name).includes(query))
      .slice(0,6);

    if (songs.length) {
      const heading = document.createElement("div");
      heading.className = "top-search-group-title";
      heading.textContent = "آهنگ‌ها";
      results.appendChild(heading);

      songs.forEach(({song,index}) => {
        results.appendChild(makeResult({
          title:song.title || "آهنگ بدون نام",
          subtitle:song.artist || "هنرمند نامشخص",
          kind:"SONG",
          cover:song.cover,
          onSelect:()=>{
            if (typeof setPlayerTrack === "function") setPlayerTrack(index,true);
          }
        }));
      });
    }

    if (playlists.length) {
      const heading = document.createElement("div");
      heading.className = "top-search-group-title";
      heading.textContent = "پلی‌لیست‌ها";
      results.appendChild(heading);

      playlists.forEach(playlist => {
        const refs = Array.isArray(playlist.songs) ? playlist.songs : [];
        const resolved = refs.map(ref => typeof getPlaylistSong === "function" ? getPlaylistSong(ref) : null).filter(Boolean);
        const cover = typeof playlistCover === "function" ? playlistCover(playlist,resolved) : (playlist.cover || "");
        results.appendChild(makeResult({
          title:playlist.name || "Playlist",
          subtitle:`${resolved.length} آهنگ`,
          kind:"PLAYLIST",
          cover,
          onSelect:()=>{
            if (typeof openTaninfyPlaylist === "function") openTaninfyPlaylist(playlist);
          }
        }));
      });
    }

    if (!results.children.length) {
      const empty = document.createElement("div");
      empty.className = "top-search-empty";
      empty.textContent = "نتیجه‌ای پیدا نشد.";
      results.appendChild(empty);
    }
    results.classList.add("active");
  }

  topSearch.addEventListener("input",runSearch);
  topSearch.addEventListener("focus",()=>{if(topSearch.value.trim()) runSearch();});
  topSearch.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
      results.classList.remove("active");
      topSearch.blur();
    }
    if(event.key==="Enter"){
      const first = results.querySelector(".top-search-result");
      if(first){event.preventDefault();first.click();}
    }
  });

  document.addEventListener("click",event=>{
    if(!searchWrap.contains(event.target)) results.classList.remove("active");
  });

  document.querySelectorAll(".sidebar-nav a").forEach(link=>{
    link.addEventListener("click",()=>{
      document.querySelectorAll(".sidebar-nav a").forEach(item=>item.classList.remove("active"));
      link.classList.add("active");
    });
  });
})();
