/* ============================================================
   for Ares — story wiring
   Deliberately no scroll handlers: the beats are picked up by an
   IntersectionObserver and everything else is CSS. Nothing here
   runs per frame, so scrolling stays smooth.
   ============================================================ */

(function () {
  "use strict";

  var stage    = document.getElementById("stage");
  var hero     = document.getElementById("hero");
  var envelope = document.getElementById("envelope");
  var reader   = document.getElementById("reader");
  var letterImg = document.getElementById("letterImg");
  var finaleEnd = document.getElementById("finaleEnd");
  var confetti  = document.getElementById("confetti");

  var caps    = Array.prototype.slice.call(document.querySelectorAll(".cap"));
  var bubbles = Array.prototype.slice.call(document.querySelectorAll(".bubble"));

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");


  /* ── 1. the story beats ─────────────────────────────── */

  var currentBeat = 0;

  function showBeat(n) {
    if (n === currentBeat) return;
    currentBeat = n;
    stage.setAttribute("data-beat", String(n));

    for (var i = 0; i < caps.length; i++) {
      caps[i].classList.toggle("is-on", caps[i].getAttribute("data-cap") === String(n));
    }
    for (var j = 0; j < bubbles.length; j++) {
      bubbles[j].classList.toggle("is-on", bubbles[j].getAttribute("data-bubble") === String(n));
    }

    // John is off-stage from here on, so the letter has time to arrive
    // before anyone reaches the envelope.
    if (n >= 5) loadLetter();
  }

  var beatEls = document.querySelectorAll(".beat");

  if ("IntersectionObserver" in window) {
    // The root is squashed to a single line across the middle of the screen,
    // so a beat becomes active exactly as it passes the centre.
    var beatWatcher = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          showBeat(Number(entries[i].target.getAttribute("data-beat")));
        }
      }
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });

    for (var b = 0; b < beatEls.length; b++) beatWatcher.observe(beatEls[b]);
  } else {
    // Very old browser: skip the choreography, just show the finished scene.
    showBeat(7);
  }


  /* ── 2. the scroll hint steps aside once you've started ─ */

  if ("IntersectionObserver" in window) {
    var heroWatcher = new IntersectionObserver(function (entries) {
      hero.classList.toggle("is-scrolled", entries[0].intersectionRatio < 0.92);
    }, { threshold: [0, 0.92, 1] });
    heroWatcher.observe(hero);
  }


  /* ── 3. the letter image ────────────────────────────── */

  var letterRequested = false;

  function loadLetter() {
    if (letterRequested) return;
    letterRequested = true;
    letterImg.src = letterImg.getAttribute("data-src");
  }

  // Belt and braces: also start it when the envelope comes into view.
  if ("IntersectionObserver" in window) {
    var finaleWatcher = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        loadLetter();
        finaleWatcher.disconnect();
      }
    }, { rootMargin: "150% 0px" });
    finaleWatcher.observe(document.getElementById("finale"));
  }


  /* ── 4. opening the envelope ────────────────────────── */

  var opened = false;
  var lastFocus = null;

  envelope.addEventListener("click", function () {
    loadLetter();

    if (!opened) {
      opened = true;
      envelope.classList.add("is-open");
      envelope.setAttribute("aria-label", "Read the letter from John");
      if (!calm.matches) burst();
      // wait for the flap to swing and the letter to rise, then present it
      window.setTimeout(showReader, calm.matches ? 220 : 1150);
    } else {
      showReader();
    }
  });


  /* ── 5. the popup ───────────────────────────────────── */

  function showReader() {
    if (!reader.hidden) return;
    lastFocus = document.activeElement;
    reader.hidden = false;
    document.body.classList.add("is-locked");
    // one frame so the browser notices the change and animates into it
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { reader.classList.add("is-on"); });
    });
    reader.querySelector(".reader__close").focus({ preventScroll: true });
    finaleEnd.classList.add("is-on");
  }

  function hideReader() {
    if (reader.hidden) return;
    reader.classList.remove("is-on");
    document.body.classList.remove("is-locked");
    window.setTimeout(function () {
      reader.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, calm.matches ? 60 : 340);
  }

  reader.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) hideReader();
  });


  /* ── 5b. reading it on a small screen ───────────────── */

  var zoomBtn = document.getElementById("zoomBtn");
  var readerScroll = document.getElementById("readerScroll");

  function toggleZoom() {
    var on = letterImg.classList.toggle("is-zoomed");
    reader.classList.toggle("has-zoom", on);
    zoomBtn.setAttribute("aria-pressed", on ? "true" : "false");
    zoomBtn.textContent = on ? "fit the whole letter" : "zoom in to read";
    // start at "Hey Ares," rather than wherever the last pan left off
    if (on) { readerScroll.scrollTop = 0; readerScroll.scrollLeft = 0; }
  }

  zoomBtn.addEventListener("click", toggleZoom);
  letterImg.addEventListener("click", toggleZoom);

  document.addEventListener("keydown", function (e) {
    if (reader.hidden) return;

    if (e.key === "Escape") {
      hideReader();
      return;
    }

    // keep the keyboard inside the dialog while it's open
    if (e.key === "Tab") {
      var stops = reader.querySelectorAll("button, a[href]");
      if (!stops.length) return;
      var first = stops[0];
      var last  = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });


  /* ── 6. a small, well-behaved confetti burst ────────── */

  var GLYPHS = ["♥", "✦", "✵", "✿", "♥", "✤"];
  var TINTS  = ["#e88ba4", "#7db3da", "#e3c552", "#6fc09a", "#a88fd4", "#e39f78"];

  function burst() {
    var pieces = document.createDocumentFragment();
    var count = 22;

    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      var life = 2.2 + Math.random() * 1.2;

      s.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      s.style.color = TINTS[(Math.random() * TINTS.length) | 0];
      s.style.left = (Math.random() * 96) + "vw";
      s.style.fontSize = (0.9 + Math.random() * 1.1).toFixed(2) + "rem";
      s.style.setProperty("--dx", ((Math.random() * 120) - 60).toFixed(0) + "px");
      s.style.setProperty("--dr", ((Math.random() * 720) - 360).toFixed(0) + "deg");
      s.style.animationDuration = life.toFixed(2) + "s";
      s.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";

      pieces.appendChild(s);
    }

    confetti.appendChild(pieces);
    // tidy up so the burst never becomes a permanent animation cost
    window.setTimeout(function () { confetti.textContent = ""; }, 4200);
  }
})();
