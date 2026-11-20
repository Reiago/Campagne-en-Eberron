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
  const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

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
          <span class="ap-tools">
            <button type="button" class="ap-speed" aria-label="Vitesse de lecture">1×</button>
            <button type="button" class="ap-mute" aria-label="Couper le son">${ICONS.sound}</button>
          </span>
        </div>
      </div>`;
    audio.after(ui);

    const btnPlay = ui.querySelector('.ap-play');
    const seek = ui.querySelector('.ap-seek');
    const cur = ui.querySelector('.ap-cur');
    const dur = ui.querySelector('.ap-dur');
    const btnSpeed = ui.querySelector('.ap-speed');
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

    btnSpeed.addEventListener('click', () => {
      const next = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length] || 1;
      audio.playbackRate = next;
      btnSpeed.textContent = String(next).replace('.', ',') + '×';
    });

    btnMute.addEventListener('click', () => { audio.muted = !audio.muted; });
    audio.addEventListener('volumechange', () => {
      btnMute.innerHTML = audio.muted ? ICONS.muted : ICONS.sound;
      btnMute.setAttribute('aria-label', audio.muted ? 'Rétablir le son' : 'Couper le son');
    });

    paintSeek();
  }

  function init() {
    document.querySelectorAll('.podcast-block audio').forEach(enhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
