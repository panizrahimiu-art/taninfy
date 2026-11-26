(function(){
  "use strict";
  if(window.__txLayer||!document.body) return;
  window.__txLayer=true;

  var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine=window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ambient background */
  var amb=document.createElement("div");
  amb.id="txAmbient";amb.setAttribute("aria-hidden","true");
  amb.innerHTML="<i></i><i></i><i></i>";
  var grain=document.createElement("div");
  grain.id="txGrain";grain.setAttribute("aria-hidden","true");
  document.body.insertBefore(grain,document.body.firstChild);
  document.body.insertBefore(amb,document.body.firstChild);

  /* playback state -> body.tx-playing (read-only listener, player code untouched) */
  var audio=document.getElementById("audioPlayer");
  if(audio){
    var on=function(){document.body.classList.add("tx-playing")};
    var off=function(){document.body.classList.remove("tx-playing")};
    audio.addEventListener("play",on);
    audio.addEventListener("playing",on);
    audio.addEventListener("pause",off);
    audio.addEventListener("ended",off);
    if(!audio.paused) on();
  }

  /* 3D tilt + glare on playlist / track covers */
  if(fine&&!reduce){
    var COVER=".curated-cover,#trackList .track-cover-wrap";
    var raf=0;
    document.addEventListener("pointermove",function(e){
      var el=e.target.closest&&e.target.closest(COVER);
      if(!el||raf) return;
      var cx=e.clientX,cy=e.clientY;
      raf=requestAnimationFrame(function(){
        raf=0;
        var r=el.getBoundingClientRect();
        if(!r.width||!r.height) return;
        var x=(cx-r.left)/r.width,y=(cy-r.top)/r.height;
        if(!el.querySelector(":scope>.tx-glare")){
          var g=document.createElement("i");g.className="tx-glare";g.setAttribute("aria-hidden","true");
          el.appendChild(g);
        }
        el.style.setProperty("--rx",((.5-y)*9).toFixed(2)+"deg");
        el.style.setProperty("--ry",((x-.5)*11).toFixed(2)+"deg");
        el.style.setProperty("--mx",(x*100).toFixed(1)+"%");
        el.style.setProperty("--my",(y*100).toFixed(1)+"%");
        el.classList.add("tx-tilt");
      });
    },{passive:true});
    document.addEventListener("pointerout",function(e){
      var el=e.target.closest&&e.target.closest(COVER);
      if(!el||el.contains(e.relatedTarget)) return;
      el.classList.remove("tx-tilt");
      el.style.removeProperty("--rx");el.style.removeProperty("--ry");
    });
  }

  /* staggered reveal for cards (hidden state is only ever set here, so no-JS = fully visible) */
  if(!reduce&&"IntersectionObserver" in window){
    var SEL=".curated-card,#trackList .track";
    var io=new IntersectionObserver(function(entries){
      var n=0;
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        en.target.style.setProperty("--i",Math.min(n++,8));
        en.target.classList.add("tx-in");
        io.unobserve(en.target);
      });
    },{threshold:.08,rootMargin:"0px 0px -4% 0px"});
    var watch=function(el){
      if(el.__tx) return;
      el.__tx=1;el.classList.add("tx-pre");io.observe(el);
    };
    var scan=function(root){
      if(root.matches&&root.matches(SEL)) watch(root);
      if(root.querySelectorAll) root.querySelectorAll(SEL).forEach(watch);
    };
    scan(document);
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(nd){if(nd.nodeType===1) scan(nd)});
      });
    }).observe(document.body,{childList:true,subtree:true});
  }
})();
