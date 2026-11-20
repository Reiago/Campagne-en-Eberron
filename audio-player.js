/* ── Lecteur audio aux couleurs du site ──────────────────────────────────────
   Remplace les contrôles natifs (blancs, hors charte) des <audio> placés dans
   un .podcast-block par un lecteur stylé via les variables de style.css, donc
   compatible avec les trois thèmes. Sans JavaScript, le lecteur natif reste
   affiché en repli. */
(function () {
  const ICONS = {
    play:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const VOLUME_KEY = 'eberron-audio-volume';

  // iOS impose le volume matériel : audio.volume y est en lecture seule
  const VOLUME_SUPPORTED = (() => {
    try { const t = new Audio(); t.volume = 0.5; return t.volume === 0.5; } catch { return false; }
  })();

  function loadVolume() {
    try {
      const v = parseFloat(localStorage.getItem(VOLUME_KEY));
      return v >= 0 && v <= 1 ? v : 1;
    } catch { return 1; }
  }
  function saveVolume(v) {
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* stockage indisponible */ }
  }

  /* ── Équaliseur visuel ───────────────────────────────────────────────────
     Barres dessinées sur un <canvas> à partir du spectre réel du son
     (Web Audio API). Un seul AudioContext, créé au premier clic sur lecture
     (les navigateurs l'exigent). Sans Web Audio, animation simulée. */
  let audioCtx = null;

  function createAnalyser(audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = audioCtx || new Ctx();
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      return analyser;
    } catch { return null; }
  }

  function makeEqualizer(canvas, audio, ui) {
    const BAR = 3, GAP = 3, MIN = 2;
    const ctx = canvas.getContext('2d');
    let analyser = null, data = null, levels = [], raf = 0, color = '', idleColor = '', frame = 0;

    function readColors() {
      const cs = getComputedStyle(ui);
      color = cs.getPropertyValue('--gold').trim() || '#C9A86C';
      idleColor = cs.getPropertyValue('--text-dim').trim() || '#9E9080';
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function barCount() { return Math.max(0, Math.floor((canvas.clientWidth + GAP) / (BAR + GAP))); }

    function targetLevels(n) {
      const out = new Array(n).fill(0);
      if (audio.paused) return out;
      if (analyser) {
        // Le signal analysé est déjà atténué par le volume : on décale la plage
        // en décibels pour que l'amplitude des barres n'en dépende pas.
        const db = 20 * Math.log10(Math.max(audio.volume, 0.01));
        const min = -90 + db, max = -12 + db;
        if (min < analyser.maxDecibels) { analyser.minDecibels = min; analyser.maxDecibels = max; }
        else { analyser.maxDecibels = max; analyser.minDecibels = min; }
        analyser.getByteFrequencyData(data);
        // Répartition logarithmique des barres sur les fréquences utiles
        const lo = 1, hi = Math.min(data.length - 1, 64);
        for (let i = 0; i < n; i++) {
          const a = Math.floor(lo * Math.pow(hi / lo, i / n));
          const b = Math.max(a + 1, Math.floor(lo * Math.pow(hi / lo, (i + 1) / n)));
          let sum = 0;
          for (let k = a; k < b; k++) sum += data[k];
          // Léger relèvement des aigus, naturellement plus faibles
          out[i] = Math.min(1, Math.pow(sum / (b - a) / 255, 1.8) * (1 + 0.9 * i / n));
        }
      } else {
        const t = performance.now() / 1000;
        for (let i = 0; i < n; i++) out[i] = 0.25 + 0.35 * Math.abs(Math.sin(t * (2 + i % 5) + i * 1.7));
      }
      return out;
    }

    function draw() {
      const w = canvas.clientWidth, h = canvas.clientHeight, n = barCount();
      ctx.clearRect(0, 0, w, h);
      if (!n) return;
      if (levels.length !== n) levels = new Array(n).fill(0);
      const offset = (w - (n * BAR + (n - 1) * GAP)) / 2;
      for (let i = 0; i < n; i++) {
        const bh = Math.max(MIN, Math.round(levels[i] * h));
        ctx.globalAlpha = levels[i] > 0.02 ? 0.55 + 0.45 * levels[i] : 0.35;
        ctx.fillStyle = levels[i] > 0.02 ? color : idleColor;
        ctx.fillRect(offset + i * (BAR + GAP), h - bh, BAR, bh);
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (++frame % 60 === 0) readColors();
      const target = targetLevels(barCount());
      let moving = false;
      levels = target.map((v, i) => {
        const prev = levels[i] || 0;
        // Montée rapide, retombée douce
        const next = v > prev ? v : prev * 0.88 + v * 0.12;
        if (next > 0.005) moving = true;
        return next < 0.005 ? 0 : next;
      });
      draw();
      raf = moving || !audio.paused ? requestAnimationFrame(loop) : 0;
    }

    function start() {
      if (!analyser && !audio.dataset.eqTried) {
        audio.dataset.eqTried = '1';
        analyser = createAnalyser(audio);
        if (analyser) data = new Uint8Array(analyser.frequencyBinCount);
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      readColors();
      if (!raf) raf = requestAnimationFrame(loop);
    }

    audio.addEventListener('play', start);
    audio.addEventListener('pause', () => { if (!raf) raf = requestAnimationFrame(loop); });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    // Changement de thème : redessiner avec les nouvelles couleurs
    new MutationObserver(() => { readColors(); draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    readColors();
    resize();
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) return '--:--';
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  }

  function enhance(audio) {
    if (audio.dataset.enhanced) return;
    audio.dataset.enhanced = '1';
    audio.controls = false;
    audio.style.display = 'none';

    const title = audio.closest('.podcast-block')?.querySelector('.podcast-title')?.textContent.trim() || 'audio';

    const ui = document.createElement('div');
    ui.className = 'audio-player';
    ui.innerHTML = `
      <button type="button" class="ap-play" aria-label="Lire « ${title} »">${ICONS.play}</button>
      <div class="ap-body">
        <input type="range" class="ap-seek" min="0" max="1000" step="1" value="0" aria-label="Position de lecture">
        <div class="ap-meta">
          <span class="ap-time"><span class="ap-cur">0:00</span> / <span class="ap-dur">--:--</span></span>
          <canvas class="ap-eq" aria-hidden="true"></canvas>
          <span class="ap-tools">
            <button type="button" class="ap-mute" aria-label="Couper le son">${ICONS.sound}</button>
            <input type="range" class="ap-seek ap-vol" min="0" max="100" step="1" value="100" aria-label="Volume">
          </span>
        </div>
      </div>`;
    audio.after(ui);

    const btnPlay = ui.querySelector('.ap-play');
    const seek = ui.querySelector('.ap-seek');
    const cur = ui.querySelector('.ap-cur');
    const dur = ui.querySelector('.ap-dur');
    const btnMute = ui.querySelector('.ap-mute');
    let dragging = false;

    const paintSeek = () => seek.style.setProperty('--pct', (seek.value / 10) + '%');

    function sync() {
      if (!dragging && audio.duration) {
        seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
        paintSeek();
      }
      cur.textContent = fmt(audio.currentTime);
    }

    btnPlay.addEventListener('click', () => {
      if (audio.paused) audio.play(); else audio.pause();
    });
    audio.addEventListener('play', () => {
      // Un seul son à la fois sur la page
      document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
      btnPlay.innerHTML = ICONS.pause;
      btnPlay.setAttribute('aria-label', `Mettre « ${title} » en pause`);
      ui.classList.add('is-playing');
    });
    audio.addEventListener('pause', () => {
      btnPlay.innerHTML = ICONS.play;
      btnPlay.setAttribute('aria-label', `Lire « ${title} »`);
      ui.classList.remove('is-playing');
    });
    audio.addEventListener('waiting', () => ui.classList.add('is-loading'));
    audio.addEventListener('playing', () => ui.classList.remove('is-loading'));
    audio.addEventListener('loadedmetadata', () => { dur.textContent = fmt(audio.duration); sync(); });
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('ended', () => { audio.currentTime = 0; sync(); });

    seek.addEventListener('input', () => {
      dragging = true;
      paintSeek();
      if (audio.duration) cur.textContent = fmt((seek.value / 1000) * audio.duration);
    });
    seek.addEventListener('change', () => {
      dragging = false;
      if (audio.duration) {
        audio.currentTime = (seek.value / 1000) * audio.duration;
      } else {
        // Durée pas encore connue (preload="none") : on charge puis on se positionne
        const ratio = seek.value / 1000;
        audio.addEventListener('loadedmetadata', () => { audio.currentTime = ratio * audio.duration; }, { once: true });
        audio.load();
      }
    });

    const vol = ui.querySelector('.ap-vol');
    let lastVolume = 1;

    function syncVolume() {
      const silent = audio.muted || audio.volume === 0;
      btnMute.innerHTML = silent ? ICONS.muted : ICONS.sound;
      btnMute.setAttribute('aria-label', silent ? 'Rétablir le son' : 'Couper le son');
      vol.value = silent ? 0 : Math.round(audio.volume * 100);
      vol.style.setProperty('--pct', vol.value + '%');
    }

    btnMute.addEventListener('click', () => {
      if (audio.muted || audio.volume === 0) {
        if (audio.volume === 0) audio.volume = lastVolume || 1;
        audio.muted = false;
      } else {
        audio.muted = true;
      }
    });

    vol.addEventListener('input', () => {
      const v = vol.value / 100;
      audio.volume = v;
      audio.muted = v === 0;
      if (v > 0) { lastVolume = v; saveVolume(v); }
    });

    audio.addEventListener('volumechange', syncVolume);

    if (VOLUME_SUPPORTED) {
      audio.volume = loadVolume();
      if (audio.volume > 0) lastVolume = audio.volume;
    } else {
      ui.classList.add('no-volume');
    }
    syncVolume();
    paintSeek();
    makeEqualizer(ui.querySelector('.ap-eq'), audio, ui);
  }

  function init() {
    document.querySelectorAll('.podcast-block audio').forEach(enhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
