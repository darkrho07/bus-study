/* ==========================================================================
   Bus Study — app.js
   A Pomodoro desk on a night bus: timer, tasks, scenes, ambience, radio.
   Vanilla JS, no build step, everything stored in localStorage.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ setup */
  const DATA = window.BUS_STUDY_DATA || [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const PAGE = document.body.dataset.page || 'home';
  const NS = 'busstudy.v1.';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    },
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const DEFAULTS = {
    focus: 25, short: 5, long: 15,
    buddy: 'Chhotu', pose: 'sit',
    scene: 'night', ambience: [], volume: 35,
    shuffle: false, muted: false,
    playlist: (DATA[0] && DATA[0].slug) || '90s-bus-driver-playlist',
    trackIndex: 0,
  };
  const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  if (!Array.isArray(settings.ambience)) settings.ambience = [];
  const stats = Object.assign(
    { totalRounds: 0, days: {}, first: todayKey() },
    store.get('stats', {})
  );
  if (!stats.days || typeof stats.days !== 'object') stats.days = {};

  const saveSettings = () => store.set('settings', settings);
  const saveStats = () => store.set('stats', stats);

  const findPlaylist = (slug) => DATA.find((p) => p.slug === slug) || DATA[0];

  /* ------------------------------------------------------------------ toast */
  const toastWrap = $('#toasts');
  function toast(message, icon = 'bus') {
    if (!toastWrap) return;
    const icons = {
      bus: '<path d="M4 6h13v9H4zM4 11h13M7 18v-3M14 18v-3"></path><circle cx="7" cy="15" r="0.5"></circle>',
      check: '<path d="m5 12 5 5L20 7"></path>',
      music: '<path d="M9 18V5l11-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="17" cy="16" r="3"></circle>',
      heart: '<path d="M12 20s-7-4.6-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5C19 15.4 12 20 12 20Z"></path>',
      warn: '<path d="M12 4 3 20h18L12 4Z"></path><path d="M12 10v5M12 18h.01"></path>',
    };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon] || icons.bus}</svg><span></span>`;
    el.querySelector('span').textContent = message;
    toastWrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  /* ------------------------------------------------------------------ clock */
  const clock = { h: $('#clockH'), m: $('#clockM'), s: $('#clockS') };
  function tickClock() {
    if (!clock.h) return;
    const d = new Date();
    clock.h.textContent = pad(d.getHours());
    clock.m.textContent = pad(d.getMinutes());
    clock.s.textContent = pad(d.getSeconds());
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ------------------------------------------------------------------ rain */
  (function rain() {
    const canvas = $('#rain');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let drops = [];
    const make = (n) => Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 8 + Math.random() * 22,
      vy: 5 + Math.random() * 9,
      vx: -0.6 - Math.random() * 0.9,
      a: 0.05 + Math.random() * 0.16,
    }));
    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = make(w < 700 ? 55 : 120);
    }
    resize();
    window.addEventListener('resize', resize);
    let last = 0;
    function frame(t) {
      if (t - last > 33) {
        last = t;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#cfd8e3';
        for (const d of drops) {
          ctx.globalAlpha = d.a;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.vx * 3, d.y + d.len);
          ctx.stroke();
          d.x += d.vx;
          d.y += d.vy;
          if (d.y > h + 30 || d.x < -30) {
            d.x = Math.random() * (w + 60);
            d.y = -20 - Math.random() * h * 0.4;
          }
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------ scenes */
  const SCENES = {
    night: { label: 'NH 48 at night', still: 'assets/road.jpg', video: true },
    monsoon: { label: 'Monsoon ghat', still: 'assets/scenes/monsoon.jpg', video: false },
    sunrise: { label: 'Sunrise fields', still: 'assets/scenes/sunrise.jpg', video: false },
    city: { label: 'City flyover', still: 'assets/scenes/city.jpg', video: false },
  };
  const sceneVideo = $('#sceneVideo');
  const sceneStill = $('#sceneStill');

  function setScene(key, announce) {
    const scene = SCENES[key] || SCENES.night;
    if (reduceMotion) scene.video = false;
    settings.scene = SCENES[key] ? key : 'night';
    saveSettings();

    if (sceneStill) sceneStill.style.backgroundImage = `url('${scene.still}')`;

    if (sceneVideo) {
      if (scene.video) {
        sceneVideo.style.display = '';
        sceneVideo.classList.add('is-active');
        const p = sceneVideo.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        sceneVideo.classList.remove('is-active');
        setTimeout(() => { if (!scene.video) sceneVideo.style.display = 'none'; }, 900);
      }
    }
    if (sceneStill) sceneStill.classList.toggle('is-active', true);

    $$('.scene-thumb').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === settings.scene)));
    if (announce) toast(`${scene.label} — window seat ready`, 'bus');
  }

  /* ------------------------------------------------------------------ audio */
  const AudioEngine = (() => {
    let ctx = null;
    let master = null;
    let layers = {};
    let noiseBuffer = null;

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = settings.volume / 100 * 0.55;
      master.connect(ctx.destination);
      return ctx;
    }

    function buffer(kind) {
      const c = ensure();
      if (!c) return null;
      const len = c.sampleRate * 4;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      if (kind === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        }
      } else {
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      return buf;
    }

    function makeRain() {
      const c = ensure();
      const src = c.createBufferSource();
      src.buffer = buffer('white');
      src.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7200;
      const g = c.createGain();
      g.gain.value = 0.16;
      src.connect(hp).connect(lp).connect(g).connect(master);
      src.start();
      return { nodes: [src], gain: g, target: 0.16 };
    }

    function makeRoad() {
      const c = ensure();
      const src = c.createBufferSource();
      src.buffer = buffer('brown');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      const g = c.createGain();
      g.gain.value = 0.3;
      const trem = c.createOscillator();
      trem.frequency.value = 0.18;
      const tremGain = c.createGain();
      tremGain.gain.value = 0.06;
      trem.connect(tremGain).connect(g.gain);
      trem.start();
      const hum = c.createOscillator();
      hum.type = 'sine';
      hum.frequency.value = 58;
      const humGain = c.createGain();
      humGain.gain.value = 0.035;
      hum.connect(humGain).connect(master);
      hum.start();
      src.connect(lp).connect(g).connect(master);
      src.start();
      return { nodes: [src, trem, hum], gain: g, target: 0.3, extra: humGain };
    }

    function makeBrown() {
      const c = ensure();
      const src = c.createBufferSource();
      src.buffer = buffer('brown');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const g = c.createGain();
      g.gain.value = 0.3;
      src.connect(lp).connect(g).connect(master);
      src.start();
      return { nodes: [src], gain: g, target: 0.3 };
    }

    const builders = { rain: makeRain, road: makeRoad, brown: makeBrown };

    return {
      get ctx() { ensure(); return ctx; },
      setVolume(v) {
        settings.volume = v;
        if (master) master.gain.setTargetAtTime(clamp(v / 100, 0, 1) * 0.55, ctx.currentTime, 0.08);
      },
      toggle(name, on) {
        const c = ensure();
        if (!c || !builders[name]) return false;
        if (on) {
          if (!layers[name]) {
            const l = builders[name]();
            l.gain.gain.value = 0;
            l.gain.gain.setTargetAtTime(l.target, c.currentTime, 0.4);
            layers[name] = l;
          }
        } else if (layers[name]) {
          const l = layers[name];
          l.gain.gain.setTargetAtTime(0, c.currentTime, 0.15);
          setTimeout(() => {
            l.nodes.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
            try { l.gain.disconnect(); } catch (e) {}
          }, 450);
          delete layers[name];
        }
        return true;
      },
      allOff() {
        Object.keys(layers).forEach((k) => this.toggle(k, false));
      },
      horn() {
        const c = ensure();
        if (!c) return;
        const t = c.currentTime;
        const out = c.createGain();
        out.gain.value = 0.0001;
        out.gain.exponentialRampToValueAtTime(0.20, t + 0.05);
        out.gain.setValueAtTime(0.20, t + 0.55);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 760;
        bp.Q.value = 0.9;
        out.connect(bp).connect(c.destination);
        [392, 466].forEach((f, i) => {
          const o = c.createOscillator();
          o.type = i ? 'square' : 'sawtooth';
          o.frequency.setValueAtTime(f * 0.98, t);
          o.frequency.linearRampToValueAtTime(f, t + 0.08);
          const g = c.createGain();
          g.gain.value = i ? 0.35 : 0.5;
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 1.1);
        });
        const noise = c.createBufferSource();
        noise.buffer = buffer('white');
        const ng = c.createGain();
        ng.gain.value = 0.05;
        const nf = c.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = 1400;
        noise.connect(nf).connect(ng).connect(out);
        noise.start(t);
        noise.stop(t + 0.35);
      },
      chime() {
        const c = ensure();
        if (!c) return;
        const t = c.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = c.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t + i * 0.13);
          g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.13 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.13 + 1.5);
          o.connect(g).connect(c.destination);
          o.start(t + i * 0.13);
          o.stop(t + i * 0.13 + 1.6);
        });
      },
      purr() {
        const c = ensure();
        if (!c) return;
        const t = c.currentTime;
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 82;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
        const lfo = c.createOscillator();
        lfo.frequency.value = 26;
        const lg = c.createGain();
        lg.gain.value = 0.03;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(c.destination);
        o.start(t); lfo.start(t);
        o.stop(t + 0.8); lfo.stop(t + 0.8);
      },
      tick() {
        const c = ensure();
        if (!c) return;
        const t = c.currentTime;
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = 1180;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 0.1);
      },
    };
  })();

  /* ------------------------------------------------------------------ horn */
  function honk() {
    const wrap = $('#hornWrap');
    if (wrap) {
      wrap.classList.remove('beep');
      void wrap.offsetWidth;
      wrap.classList.add('beep');
    }
    AudioEngine.horn();
  }
  $('#hornBtn')?.addEventListener('click', honk);

  /* ------------------------------------------------------------------ timer */
  const MODE_LABELS = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const timer = {
    mode: 'focus',
    running: false,
    round: 1,
    remaining: settings.focus * 60,
    total: settings.focus * 60,
    endsAt: 0,
    intId: 0,
  };

  const els = {
    card: $('#timerCard'),
    digits: $('#timerDigits'),
    meta: $('#timerMeta'),
    progress: $('#timerProgress'),
    start: $('#startBtn'),
    reset: $('#resetBtn'),
    rounds: $('#rounds'),
  };

  function modeSeconds(mode) {
    return (mode === 'focus' ? settings.focus : mode === 'short' ? settings.short : settings.long) * 60;
  }

  function paintTimer() {
    const secs = Math.max(0, Math.ceil(timer.remaining));
    const mm = Math.floor(secs / 60);
    const ss = secs % 60;
    const text = `${mm}:${pad(ss)}`;
    if (els.digits) els.digits.textContent = text;
    if ($('#focusDigits')) $('#focusDigits').textContent = text;

    const done = timer.total - timer.remaining;
    const pct = timer.total ? clamp((done / timer.total) * 100, 0, 100) : 0;
    if (els.progress) els.progress.style.width = `${pct}%`;
    if ($('#focusProgress')) $('#focusProgress').style.width = `${pct}%`;

    document.title = timer.running
      ? `${text} · ${MODE_LABELS[timer.mode]} — Bus Study`
      : 'Bus Study — A Night-Bus Pomodoro Room & 90s Hindi Playlist';

    if (els.start) {
      const label = els.start.querySelector('span');
      if (label) label.textContent = timer.running ? 'Pause' : timer.remaining < timer.total ? 'Keep focusing' : 'Start focusing';
      els.start.querySelector('svg').innerHTML = timer.running
        ? '<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/>'
        : '<path d="M8 5.1v13.8c0 .8.9 1.3 1.6.8l10-6.9c.6-.4.6-1.2 0-1.6l-10-6.9c-.7-.5-1.6 0-1.6.8Z"/>';
    }
    if ($('#focusStart')) $('#focusStart').textContent = timer.running ? 'Pause' : 'Start';
  }

  function paintRounds() {
    if (!els.rounds) return;
    const dots = $$('i', els.rounds);
    const inCycle = (timer.round - 1) % 4;
    dots.forEach((dot, i) => {
      dot.classList.toggle('done', i < inCycle);
      dot.classList.toggle('now', i === inCycle);
    });
    if ($('#focusLabel')) {
      $('#focusLabel').textContent = `${MODE_LABELS[timer.mode].toUpperCase()} · ROUND ${((timer.round - 1) % 4) + 1} OF 4`;
    }
  }

  function paintMode() {
    $$('.timer-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === timer.mode)));
    if (els.card) els.card.classList.toggle('is-break', timer.mode !== 'focus');
    if (els.meta) {
      const messages = {
        focus: 'A small start is still a start.',
        short: 'Chai break. Look out of the window.',
        long: 'Long stop. Stretch your legs.',
      };
      els.meta.textContent = timer.running ? (timer.mode === 'focus' ? 'The bus is moving. Stay with the page.' : 'The bus has stopped. Breathe.') : messages[timer.mode];
    }
    paintRounds();
  }

  function startTick() {
    clearInterval(timer.intId);
    timer.intId = setInterval(() => {
      if (!timer.running) return;
      timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
      paintTimer();
      if (timer.remaining <= 0) completeSession();
    }, 250);
  }

  function setMode(mode, { reset = true } = {}) {
    timer.mode = mode;
    if (reset) {
      timer.total = modeSeconds(mode);
      timer.remaining = timer.total;
    }
    paintMode();
    paintTimer();
  }

  function startTimer() {
    if (timer.running) return pauseTimer();
    if (timer.remaining <= 0) timer.remaining = modeSeconds(timer.mode);
    timer.total = timer.total || modeSeconds(timer.mode);
    timer.running = true;
    timer.endsAt = Date.now() + timer.remaining * 1000;
    startTick();
    paintTimer();
    paintMode();
    setBuddyMood(timer.mode === 'focus' ? 'study' : 'break');
    toast(timer.mode === 'focus' ? 'Doors closing. Focus round started.' : 'Break started. Stretch a little.', 'bus');
  }

  function pauseTimer() {
    if (!timer.running) return;
    timer.running = false;
    timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
    clearInterval(timer.intId);
    paintTimer();
    paintMode();
    setBuddyMood('idle');
  }

  function resetTimer() {
    timer.running = false;
    clearInterval(timer.intId);
    timer.total = modeSeconds(timer.mode);
    timer.remaining = timer.total;
    paintTimer();
    paintMode();
    setBuddyMood('idle');
  }

  function completeSession() {
    timer.running = false;
    clearInterval(timer.intId);
    AudioEngine.chime();

    if (timer.mode === 'focus') {
      const mins = Math.round(settings.focus);
      stats.totalRounds += 1;
      stats.days[todayKey()] = (stats.days[todayKey()] || 0) + mins;
      saveStats();
      paintStats();
      timer.round += 1;
      const long = (timer.round - 1) % 4 === 0;
      setMode(long ? 'long' : 'short');
      setBuddyMood('break');
      toast(long ? `Four rounds done · ${mins} min. Long break earned.` : `Round complete · ${mins} min focused. Short break.`, 'check');
      blinkTitle();
    } else {
      timer.round = Math.max(1, timer.round);
      setMode('focus');
      setBuddyMood('idle');
      toast('Break over. The bus is ready to move again.', 'bus');
    }
    paintTimer();
    paintMode();
  }

  let titleBlink = 0;
  function blinkTitle() {
    clearInterval(titleBlink);
    let on = false;
    titleBlink = setInterval(() => {
      if (!timer.running && document.hidden) {
        document.title = on ? 'Break time — Bus Study' : 'Session complete — Bus Study';
        on = !on;
      } else {
        clearInterval(titleBlink);
      }
    }, 1400);
  }

  els.start?.addEventListener('click', startTimer);
  els.reset?.addEventListener('click', resetTimer);
  $$('.timer-tab').forEach((tab) => tab.addEventListener('click', () => {
    if (timer.mode === tab.dataset.mode && !timer.running) return;
    timer.running = false;
    clearInterval(timer.intId);
    setMode(tab.dataset.mode);
    setBuddyMood('idle');
  }));

  /* rhythm dialog */
  const rhythmInputs = { focus: $('#focusLen'), short: $('#shortLen'), long: $('#longLen') };
  function paintRhythmLabels() {
    if (!rhythmInputs.focus) return;
    $('#focusLenVal').textContent = rhythmInputs.focus.value;
    $('#shortLenVal').textContent = rhythmInputs.short.value;
    $('#longLenVal').textContent = rhythmInputs.long.value;
    Object.values(rhythmInputs).forEach((inp) => {
      const pct = ((inp.value - inp.min) / (inp.max - inp.min)) * 100;
      inp.style.setProperty('--fill', `${pct}%`);
    });
  }
  Object.values(rhythmInputs).forEach((inp) => inp?.addEventListener('input', paintRhythmLabels));
  $('#saveRhythm')?.addEventListener('click', () => {
    settings.focus = clamp(parseInt(rhythmInputs.focus.value, 10) || 25, 1, 180);
    settings.short = clamp(parseInt(rhythmInputs.short.value, 10) || 5, 1, 60);
    settings.long = clamp(parseInt(rhythmInputs.long.value, 10) || 15, 1, 60);
    saveSettings();
    timer.running = false;
    clearInterval(timer.intId);
    setMode(timer.mode);
    closeOverlay();
    toast(`Rhythm saved · ${settings.focus}/${settings.short}/${settings.long}`, 'check');
  });

  function fillRhythmInputs() {
    if (!rhythmInputs.focus) return;
    rhythmInputs.focus.value = settings.focus;
    rhythmInputs.short.value = settings.short;
    rhythmInputs.long.value = settings.long;
    paintRhythmLabels();
  }

  /* ------------------------------------------------------------------ stats */
  function focusMinutesToday() { return stats.days[todayKey()] || 0; }
  function totalMinutes() { return Object.values(stats.days).reduce((a, b) => a + (Number(b) || 0), 0); }
  function tasksDoneToday() { return tasks.filter((t) => t.done).length; }

  function paintStats() {
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('#statFocus', focusMinutesToday());
    set('#statTasks', tasksDoneToday());
    set('#statRounds', stats.totalRounds);
    set('#chipStreak', `${focusMinutesToday()} focus min`);
    set('#logFocus', totalMinutes());
    set('#logRounds', stats.totalRounds);
    const days = Object.keys(stats.days).filter((d) => stats.days[d] > 0);
    set('#logDays', days.length);
    set('#ticketNo', `TICKET ${String(stats.totalRounds).padStart(4, '0')}`);

    const week = $('#logWeek');
    if (week) {
      week.innerHTML = '';
      const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const values = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        values.push({ key, value: stats.days[key] || 0, label: labels[d.getDay()] });
      }
      const max = Math.max(30, ...values.map((v) => v.value));
      values.forEach((v) => {
        const col = document.createElement('div');
        const bar = document.createElement('i');
        bar.style.height = `${Math.max(4, (v.value / max) * 100)}%`;
        bar.title = `${v.value} min`;
        const lab = document.createElement('small');
        lab.textContent = v.label;
        col.append(bar, lab);
        week.appendChild(col);
      });
    }
  }

  $('#printTicket')?.addEventListener('click', () => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) return toast('Allow pop-ups to print your ticket', 'warn');
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    win.document.write(`<!DOCTYPE html><html><head><title>Bus Study ticket</title>
      <style>
        @page{margin:16mm}
        body{font-family:Georgia,serif;color:#2a1105;background:#fff8ee;padding:24px}
        .t{border:1px dashed #b98a4a;border-radius:14px;padding:22px}
        h1{font-size:20px;margin:0 0 2px;letter-spacing:.08em}
        p{margin:2px 0;font-size:12px}
        .row{display:flex;justify-content:space-between;border-top:1px dashed #d9bfa0;margin-top:14px;padding-top:10px;font-size:12px}
        .big{font-size:34px;margin:16px 0 4px;font-variant-numeric:tabular-nums}
        .small{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8a6a4c}
      </style></head><body>
      <div class="t">
        <p class="small">Bus Study · NH 48 · Seat 26</p>
        <h1>बस स्टडी — BOARDING PASS</h1>
        <p class="small">Delhi → Mumbai · non-stop revision</p>
        <div class="big">${totalMinutes()} min</div>
        <p>focused across ${stats.totalRounds} completed rounds</p>
        <div class="row"><span>${date}</span><span>${focusMinutesToday()} min today</span></div>
        <div class="row"><span>${$('#buddyName') ? $('#buddyName').textContent : 'Chhotu'} · study buddy</span><span>#${String(stats.totalRounds).padStart(4, '0')}</span></div>
        <p style="margin-top:14px;font-size:10px;color:#8a6a4c">One chapter at a time. Keep the window open.</p>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script>
      </body></html>`);
    win.document.close();
  });

  /* ------------------------------------------------------------------ tasks */
  let tasks = store.get('tasks', []);
  if (!Array.isArray(tasks)) tasks = [];
  let newSubject = '';

  function saveTasks() { store.set('tasks', tasks); }

  function renderTasks() {
    const list = $('#taskList');
    if (!list) return;
    list.innerHTML = '';
    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');

      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'task__check';
      check.setAttribute('aria-label', task.done ? 'Mark not done' : 'Mark done');
      check.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6"></path></svg>';
      check.addEventListener('click', () => {
        task.done = !task.done;
        saveTasks();
        renderTasks();
        paintStats();
        if (task.done) {
          AudioEngine.tick();
          toast('One little thing done', 'check');
          setBuddyBubble('See? One line at a time.');
          if (timer.mode === 'focus') timer.remaining += 0;
        }
      });

      const body = document.createElement('div');
      body.className = 'task__body';
      const text = document.createElement('p');
      text.className = 'task__text';
      text.textContent = task.text;
      body.appendChild(text);
      if (task.subject) {
        const tag = document.createElement('span');
        tag.className = 'task__tag';
        tag.textContent = task.subject;
        body.appendChild(tag);
      }

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'task__del';
      del.setAttribute('aria-label', 'Delete task');
      del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        tasks = tasks.filter((t) => t !== task);
        saveTasks();
        renderTasks();
        paintStats();
      });

      li.append(check, body, del);
      list.appendChild(li);
    });

    const done = tasks.filter((t) => t.done).length;
    if ($('#taskTotal')) $('#taskTotal').textContent = `${done} / ${tasks.length}`;
    if ($('#taskEmpty')) $('#taskEmpty').style.display = tasks.length ? 'none' : '';
    if ($('#focusTask')) {
      const current = tasks.find((t) => !t.done);
      $('#focusTask').textContent = current ? current.text : 'One chapter. That’s all.';
    }
    paintStats();
  }

  $('#taskForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#taskInput');
    const value = (input.value || '').trim();
    if (!value) return;
    tasks.push({ text: value, done: false, subject: newSubject });
    input.value = '';
    saveTasks();
    renderTasks();
    setBuddyBubble('Added. We start with that one?');
    toast('Added to little intentions', 'check');
  });

  $$('#subjectRow button').forEach((btn) => btn.addEventListener('click', () => {
    newSubject = btn.dataset.subject || '';
    $$('#subjectRow button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    $('#taskInput')?.focus();
  }));

  /* ------------------------------------------------------------------ buddy */
  const buddyAvatar = $('#buddyAvatar');
  let buddyMood = 'idle';

  function setBuddyName(name) {
    settings.buddy = name || 'Chhotu';
    saveSettings();
    if ($('#buddyName')) $('#buddyName').textContent = settings.buddy;
    if ($('#buddyInput')) $('#buddyInput').value = settings.buddy;
  }

  function setBuddyPose(pose) {
    settings.pose = pose || 'sit';
    saveSettings();
    if (buddyAvatar) {
      buddyAvatar.classList.toggle('is-pose-side', settings.pose === 'side');
      buddyAvatar.classList.toggle('is-pose-sleep', settings.pose === 'sleep');
    }
    $$('#poseRow button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pose === settings.pose)));
  }

  function setBuddyMood(mood) {
    buddyMood = mood;
    if (!buddyAvatar) return;
    if (mood === 'study') setBuddyBubble('Ek page. Bas ek page. I’m reading too.');
    if (mood === 'break') setBuddyBubble('Break. Look out of the window for me.');
  }

  const bubbles = [
    'Ek chapter khatam karein? I’ll sit with you.',
    'The bus is quiet. Your notes can be loud.',
    'Small steps still count on a long road.',
    'Water break? The driver won’t mind.',
    'You packed your bag. You can do one page.',
  ];
  function setBuddyBubble(text) {
    const bubble = $('#buddyBubble');
    if (!bubble) return;
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(4px)';
    setTimeout(() => {
      bubble.textContent = text;
      bubble.style.opacity = '1';
      bubble.style.transform = 'none';
    }, 180);
  }

  function petBuddy() {
    if (!buddyAvatar) return;
    AudioEngine.purr();
    const host = $('#buddyPets');
    if (!host) return;
    for (let i = 0; i < 6; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.textContent = ['♡', '♥', '♡'][i % 3];
      heart.style.left = `${20 + Math.random() * 60}%`;
      heart.style.bottom = `${10 + Math.random() * 30}%`;
      heart.style.color = i % 2 ? '#ffd0e2' : '#ff9a45';
      heart.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
      heart.style.animationDelay = `${i * 60}ms`;
      host.appendChild(heart);
      setTimeout(() => heart.remove(), 1800);
    }
    setBuddyBubble('Purrrr. Okay, back to the page.');
    if (settings.pose === 'sleep') setBuddyPose('sit');
  }

  const catVideo = $('#catVideo');
  $('#petBtn')?.addEventListener('click', petBuddy);
  buddyAvatar?.addEventListener('click', petBuddy);
  $('#playBtn')?.addEventListener('click', () => {
    if (!catVideo) return;
    if (catVideo.paused) {
      buddyAvatar?.classList.add('is-video');
      catVideo.play().catch(() => {});
      setBuddyBubble('Ball? Ball! After one paragraph, promise.');
      setTimeout(() => {
        catVideo.pause();
        buddyAvatar?.classList.remove('is-video');
      }, 4200);
    } else {
      catVideo.pause();
      buddyAvatar?.classList.remove('is-video');
    }
    toast('Chhotu is having a tiny break', 'heart');
  });

  $('#saveBuddy')?.addEventListener('click', () => {
    const val = ($('#buddyInput')?.value || '').trim();
    setBuddyName(val || settings.buddy);
    const active = $('#poseRow button[aria-pressed="true"]');
    setBuddyPose(active ? active.dataset.pose : settings.pose);
    closeOverlay();
    toast(`${settings.buddy} is ready to study`, 'heart');
  });
  $$('#poseRow button').forEach((b) => b.addEventListener('click', () => {
    $$('#poseRow button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  /* ------------------------------------------------------------------ sounds */
  const soundState = $('#soundState');
  function paintSounds() {
    $$('.mood').forEach((btn) => btn.setAttribute('aria-pressed', String(settings.ambience.includes(btn.dataset.amb))));
    if (soundState) soundState.textContent = settings.ambience.length ? 'SOUND ON' : 'SOUND OFF';
  }
  $$('.mood').forEach((btn) => btn.addEventListener('click', () => {
    const name = btn.dataset.amb;
    const on = !settings.ambience.includes(name);
    if (on) settings.ambience.push(name); else settings.ambience = settings.ambience.filter((n) => n !== name);
    AudioEngine.toggle(name, on);
    saveSettings();
    paintSounds();
    const labels = { rain: 'Rainfall', road: 'Bus hum', brown: 'Brown noise' };
    if (on) toast(`${labels[name]} on`, 'music');
  }));

  const ambVolume = $('#ambVolume');
  function paintVolume() {
    if (!ambVolume) return;
    ambVolume.value = settings.volume;
    ambVolume.style.setProperty('--fill', `${settings.volume}%`);
    if ($('#ambVolVal')) $('#ambVolVal').textContent = `${settings.volume}%`;
  }
  ambVolume?.addEventListener('input', () => {
    settings.volume = parseInt(ambVolume.value, 10) || 0;
    AudioEngine.setVolume(settings.volume);
    saveSettings();
    paintVolume();
  });

  /* own music */
  const ownMusicBtn = $('#ownMusicBtn');
  const ownMusicInput = $('#ownMusicInput');
  const ownAudio = new Audio();
  ownAudio.loop = true;
  ownAudio.volume = 0.5;
  let ownName = '';
  ownMusicBtn?.addEventListener('click', () => {
    if (ownAudio.src && !ownAudio.paused) {
      ownAudio.pause();
      ownMusicBtn.classList.remove('is-playing');
      $('#ownMusicLabel').textContent = 'Your own music';
      toast('Own music paused', 'music');
      return;
    }
    if (ownAudio.src) {
      ownAudio.play().catch(() => {});
      ownMusicBtn.classList.add('is-playing');
      $('#ownMusicLabel').textContent = ownName;
      return;
    }
    ownMusicInput?.click();
  });
  ownMusicInput?.addEventListener('change', () => {
    const file = ownMusicInput.files && ownMusicInput.files[0];
    if (!file) return;
    if (ownAudio.src) URL.revokeObjectURL(ownAudio.src);
    ownAudio.src = URL.createObjectURL(file);
    ownName = file.name.replace(/\.[^.]+$/, '').slice(0, 34);
    ownAudio.play().catch(() => toast('Press the button again to play your file', 'warn'));
    ownMusicBtn?.classList.add('is-playing');
    if ($('#ownMusicLabel')) $('#ownMusicLabel').textContent = ownName;
    toast(`Playing ${ownName} from your device`, 'music');
  });

  /* ------------------------------------------------------------------ scenes UI */
  $$('.scene-thumb').forEach((btn) => btn.addEventListener('click', () => setScene(btn.dataset.scene, true)));

  /* ------------------------------------------------------------------ modals */
  const overlayStack = [];
  function openOverlay(name) {
    const el = $(`#overlay-${name}`);
    if (!el) return;
    el.classList.add('is-open');
    document.body.classList.add('modal-open');
    overlayStack.push(name);
    if (name === 'rhythm') fillRhythmInputs();
    if (name === 'buddy') {
      if ($('#buddyInput')) $('#buddyInput').value = settings.buddy;
      $$('#poseRow button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pose === settings.pose)));
    }
    if (name === 'queue') {
      renderQueueTabs();
      renderQueueRows();
    }
    if (name === 'logbook') paintStats();
    const focusTarget = el.querySelector('input, button:not([data-close])');
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 120);
  }
  function closeOverlay() {
    const el = $('.overlay.is-open');
    if (el) el.classList.remove('is-open');
    overlayStack.pop();
    if (!$('.overlay.is-open')) document.body.classList.remove('modal-open');
    $('#queueBtn')?.setAttribute('aria-expanded', 'false');
  }
  $$('[data-open]').forEach((btn) => btn.addEventListener('click', () => openOverlay(btn.dataset.open)));
  $$('.overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeOverlay();
    });
  });

  /* ------------------------------------------------------------------ radio */
  const Radio = (() => {
    let player = null;
    let ready = false;
    let apiRequested = false;
    let pending = null;
    let poll = 0;
    let duration = 0;

    const state = {
      playlist: findPlaylist(settings.playlist),
      index: clamp(settings.trackIndex || 0, 0, ((findPlaylist(settings.playlist).tracks || []).length - 1)),
      playing: false,
      muted: !!settings.muted,
    };

    const art = $('#dockImg');
    const title = $('#dockTitle');
    const artist = $('#dockArtist');
    const seekNow = $('#seekNow');
    const seekDur = $('#seekDur');
    const fill = $('#seekFill');
    const bar = $('#seekBar');
    const dock = $('#dock');
    const playBtn = $('#playPause');
    const playIcon = $('#playIcon');
    const pauseIcon = $('#pauseIcon');

    const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    function current() {
      return state.playlist.tracks[state.index] || { id: '', title: 'No track', artist: '' };
    }

    function paint() {
      const t = current();
      if (art) { art.src = thumb(t.id); art.alt = t.title; }
      if (title) title.textContent = t.title;
      if (artist) artist.textContent = t.artist;
      if ($('#focusArt')) { $('#focusArt').src = thumb(t.id); $('#focusArt').alt = t.title; }
      if ($('#focusSong')) $('#focusSong').textContent = t.title;
      if ($('#focusArtist')) $('#focusArtist').textContent = t.artist;
      if (dock) dock.classList.toggle('is-playing', state.playing);
      if (playIcon) playIcon.style.display = state.playing ? 'none' : '';
      if (pauseIcon) pauseIcon.style.display = state.playing ? '' : 'none';
      if (playBtn) playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
      if (state.playlist.road && $('#brandRoute') && PAGE === 'playlist') $('#brandRoute').textContent = state.playlist.road;
      document.querySelectorAll('.queue-row').forEach((row) => {
        row.classList.toggle('is-current', row.dataset.id === t.id);
      });
      if ($('#queueCount')) $('#queueCount').textContent = state.playlist.tracks.length;
      const mBtn = $('#muteBtn');
      if (mBtn) mBtn.setAttribute('aria-pressed', String(state.muted));
      if ($('#volIcon')) $('#volIcon').style.display = state.muted ? 'none' : '';
      if ($('#muteIcon')) $('#muteIcon').style.display = state.muted ? '' : 'none';
      if ($('#heroCount')) $('#heroCount').textContent = `${state.playlist.tracks.length} TRACKS`;
      if ($('#heroRoute')) $('#heroRoute').textContent = (state.playlist.road || '').split('·')[0].trim();
      if ($('#shuffleBtn')) $('#shuffleBtn').setAttribute('aria-pressed', String(!!settings.shuffle));
    }

    function paintProgress(sec, dur) {
      if (typeof sec === 'number' && isFinite(sec)) {
        if (seekNow) seekNow.textContent = `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
        const pct = dur ? clamp((sec / dur) * 100, 0, 100) : 0;
        if (fill) fill.style.width = `${pct}%`;
        if (bar) bar.setAttribute('aria-valuenow', String(Math.round(pct)));
      }
      if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
        duration = dur;
        if (seekDur) seekDur.textContent = `${Math.floor(dur / 60)}:${pad(Math.floor(dur % 60))}`;
      }
    }

    function loadApi(cb) {
      pending = cb;
      if (window.YT && window.YT.Player) return cb();
      if (apiRequested) return;
      apiRequested = true;
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        if (pending) { const fn = pending; pending = null; fn(); }
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        toast('YouTube did not load — the timer and sounds still work.', 'warn');
      };
      document.head.appendChild(tag);
    }

    let errorRun = 0;

    function createPlayer(done) {
      if (player) return done();
      loadApi(() => {
        if (!window.YT || !window.YT.Player) return;
        player = new window.YT.Player('ytPlayer', {
          height: '180',
          width: '320',
          videoId: current().id,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: location.protocol.indexOf('http') === 0 ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              ready = true;
              player.setVolume(state.muted ? 0 : 80);
              if (settings.shuffle) player.setShuffle(true);
              if (pendingPlay) { pendingPlay = false; playCurrent(); }
              done();
            },
            onStateChange: (e) => {
              const YT = window.YT;
              if (e.data === YT.PlayerState.PLAYING) errorRun = 0;
              state.playing = e.data === YT.PlayerState.PLAYING;
              paint();
              if (e.data === YT.PlayerState.ENDED) next(true);
              if (e.data === YT.PlayerState.PLAYING) {
                duration = player.getDuration();
                paintProgress(player.getCurrentTime(), duration);
                clearInterval(poll);
                poll = setInterval(() => {
                  if (!player || typeof player.getCurrentTime !== 'function') return;
                  paintProgress(player.getCurrentTime(), player.getDuration());
                }, 500);
              } else {
                clearInterval(poll);
              }
            },
            onError: () => {
              errorRun += 1;
              if (errorRun >= 4) {
                toast('YouTube is not answering. The timer and sounds still work.', 'warn');
                errorRun = 0;
                return;
              }
              toast('That upload is blocked here. Trying the next song.', 'warn');
              setTimeout(() => next(true), 700);
            },
          },
        });
      });
    }

    let pendingPlay = false;

    function playCurrent() {
      const track = current();
      if (!track.id) return;
      paint();
      if (!ready) {
        pendingPlay = true;
        createPlayer(() => {});
        return;
      }
      player.loadVideoById(track.id);
      player.playVideo();
      state.playing = true;
      paint();
    }

    function toggle() {
      if (!player || !ready) { playCurrent(); return; }
      const YT = window.YT;
      const s = player.getPlayerState();
      if (s === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }

    function go(delta) {
      const len = state.playlist.tracks.length;
      if (!len) return;
      if (settings.shuffle) {
        state.index = Math.floor(Math.random() * len);
      } else {
        state.index = (state.index + delta + len) % len;
      }
      settings.trackIndex = state.index;
      saveSettings();
      playCurrent();
    }
    function next(auto) { go(1); if (auto) toast('Next on the bus', 'music'); }
    function prev() { go(-1); }

    function select(slug, index = 0) {
      state.playlist = findPlaylist(slug);
      state.index = clamp(index, 0, state.playlist.tracks.length - 1);
      settings.playlist = state.playlist.slug;
      settings.trackIndex = state.index;
      saveSettings();
      playCurrent();
    }

    function setPlaylist(slug) {
      state.playlist = findPlaylist(slug);
      state.index = 0;
      settings.playlist = state.playlist.slug;
      settings.trackIndex = 0;
      saveSettings();
      paint();
      renderQueueTabs();
      renderQueueRows();
    }

    function seek(ratio) {
      if (!player || !ready || !duration) return;
      player.seekTo(clamp(ratio, 0, 1) * duration, true);
      paintProgress(clamp(ratio, 0, 1) * duration, duration);
    }

    function mute(force) {
      state.muted = typeof force === 'boolean' ? force : !state.muted;
      settings.muted = state.muted;
      saveSettings();
      if (player && ready) player.setVolume(state.muted ? 0 : 80);
      paint();
    }

    return {
      state, paint, paintProgress, toggle, next, prev, select, setPlaylist, seek, mute,
      get playlist() { return state.playlist; },
      get index() { return state.index; },
      get ready() { return ready; },
      setVolume(v) { if (player && ready) player.setVolume(v); },
    };
  })();

  /* dock wiring */
  $('#playPause')?.addEventListener('click', () => { Radio.toggle(); });
  $('#nextBtn')?.addEventListener('click', () => Radio.next());
  $('#prevBtn')?.addEventListener('click', () => Radio.prev());
  $('#muteBtn')?.addEventListener('click', () => Radio.mute());
  $('#shuffleBtn')?.addEventListener('click', () => {
    settings.shuffle = !settings.shuffle;
    saveSettings();
    Radio.paint();
    toast(settings.shuffle ? 'Shuffle on — the driver picks' : 'Shuffle off — in order', 'music');
  });
  $('#seekBar')?.addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    Radio.seek((e.clientX - r.left) / r.width);
  });
  $('#seekBar')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      const cur = parseFloat($('#seekBar').getAttribute('aria-valuenow') || '0') / 100;
      Radio.seek(cur + (e.key === 'ArrowRight' ? 0.05 : -0.05));
    }
  });

  /* video sheet */
  const ytShell = $('#ytShell');
  $('#videoBtn')?.addEventListener('click', () => {
    const on = !ytShell.classList.contains('is-open');
    ytShell.classList.toggle('is-open', on);
    $('#videoBtn').setAttribute('aria-pressed', String(on));
    if (on) {
      if (!Radio.state.playing) Radio.toggle();
      toast('Video on — press again to hide', 'music');
    }
  });
  $('#dockArt')?.addEventListener('click', () => $('#videoBtn')?.click());

  /* ------------------------------------------------------------------ queue */
  function renderQueueTabs() {
    const host = $('#queueTabs');
    if (!host) return;
    host.innerHTML = '';
    DATA.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'queue-tab';
      b.setAttribute('aria-selected', String(p.slug === Radio.playlist.slug));
      b.textContent = `${p.short} · ${p.count}`;
      b.addEventListener('click', () => {
        if (PAGE === 'playlist') {
          window.location.href = `playlist.html?route=${encodeURIComponent(p.slug)}`;
          return;
        }
        Radio.setPlaylist(p.slug);
        toast(`${p.title} · ${p.count} tracks`, 'music');
      });
      host.appendChild(b);
    });
    if ($('#queueCount')) $('#queueCount').textContent = Radio.playlist.tracks.length;
  }

  function renderQueueRows() {
    const host = $('#queueRows');
    if (!host) return;
    host.innerHTML = '';
    const frag = document.createDocumentFragment();
    Radio.playlist.tracks.forEach((track, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'queue-row' + (track.id === (Radio.playlist.tracks[Radio.index] || {}).id ? ' is-current' : '');
      row.dataset.id = track.id;
      row.innerHTML = `
        <span class="queue-row__no">${i + 1}</span>
        <span class="queue-row__img"><img loading="lazy" src="https://i.ytimg.com/vi/${track.id}/mqdefault.jpg" alt=""></span>
        <span class="queue-row__t">
          <span class="queue-row__title"></span>
          <span class="queue-row__artist"></span>
        </span>`;
      row.querySelector('.queue-row__title').textContent = track.title;
      row.querySelector('.queue-row__artist').textContent = track.artist;
      row.addEventListener('click', () => {
        Radio.select(Radio.playlist.slug, i);
        closeOverlay();
        toast(`Now boarding: ${track.title}`, 'music');
      });
      frag.appendChild(row);
    });
    host.appendChild(frag);
  }

  $('#queueBtn')?.addEventListener('click', () => {
    const isOpen = $('#overlay-queue').classList.contains('is-open');
    if (isOpen) closeOverlay(); else openOverlay('queue');
    $('#queueBtn').setAttribute('aria-expanded', String(!isOpen));
  });
  $('#queueShuffle')?.addEventListener('click', () => {
    settings.shuffle = true;
    saveSettings();
    Radio.paint();
    const len = Radio.playlist.tracks.length;
    const idx = Math.floor(Math.random() * len);
    Radio.select(Radio.playlist.slug, idx);
    closeOverlay();
    toast('Shuffling the bus', 'music');
  });

  /* ------------------------------------------------------------------ routes */
  function renderRoutes() {
    const host = $('#routeGrid');
    if (!host || !DATA.length) return;
    const scenes = {
      night: 'assets/road.jpg', monsoon: 'assets/scenes/monsoon.jpg',
      sunrise: 'assets/scenes/sunrise.jpg', city: 'assets/scenes/city.jpg',
    };
    host.innerHTML = '';
    DATA.forEach((p) => {
      const a = document.createElement('a');
      a.className = 'route-card';
      a.href = `playlist.html?route=${encodeURIComponent(p.slug)}`;
      a.innerHTML = `
        <img src="${scenes[p.scene] || scenes.night}" alt="" loading="lazy">
        <span class="route-card__short">${p.short}</span>
        <span class="route-card__play" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.1v13.8c0 .8.9 1.3 1.6.8l10-6.9c.6-.4.6-1.2 0-1.6l-10-6.9c-.7-.5-1.6 0-1.6.8Z"/></svg>
        </span>
        <span class="route-card__name"></span>
        <span class="route-card__meta">${p.count} tracks · ${p.road}</span>`;
      a.querySelector('.route-card__name').textContent = p.title;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        window.location.href = a.href;
      });
      host.appendChild(a);
    });
  }

  /* ------------------------------------------------------------------ focus mode */
  const focusMode = $('#focusMode');
  function openFocus() {
    if (!focusMode) return;
    focusMode.classList.add('is-open');
    document.body.classList.add('modal-open');
    paintTimer(); paintRounds();
    if ($('#focusStart')) $('#focusStart').textContent = timer.running ? 'Pause' : 'Start';
  }
  function closeFocus() {
    focusMode?.classList.remove('is-open');
    if (!timer.running) document.body.classList.remove('modal-open');
    else document.body.classList.remove('modal-open');
  }
  $('#focusModeBtn')?.addEventListener('click', openFocus);
  $('#focusExit')?.addEventListener('click', closeFocus);
  $('#focusStart')?.addEventListener('click', () => startTimer());
  $('#focusReset')?.addEventListener('click', () => resetTimer());
  $('#focusSkip')?.addEventListener('click', () => {
    timer.running = false;
    clearInterval(timer.intId);
    setMode(timer.mode === 'focus' ? 'short' : 'focus');
    toast(timer.mode === 'short' ? 'Short break started' : 'Back to focus', 'bus');
  });

  /* ------------------------------------------------------------------ keyboard */
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    const inFocus = focusMode && focusMode.classList.contains('is-open');
    const overlayOpen = !!$('.overlay.is-open');

    if (e.key === 'Escape') {
      if (overlayOpen) return closeOverlay();
      if (inFocus) return closeFocus();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (inFocus) return startTimer();
      return Radio.toggle();
    }
    const key = e.key.toLowerCase();
    if (key === 'arrowright') { e.preventDefault(); return Radio.seek((parseFloat($('#seekBar')?.getAttribute('aria-valuenow') || '0') / 100) + 0.05); }
    if (key === 'arrowleft') { e.preventDefault(); return Radio.seek((parseFloat($('#seekBar')?.getAttribute('aria-valuenow') || '0') / 100) - 0.05); }
    if (key === 'n') return Radio.next();
    if (key === 'p') return Radio.prev();
    if (key === 'q') { e.preventDefault(); return $('#queueBtn')?.click(); }
    if (key === 'h') { e.preventDefault(); return honk(); }
    if (key === 'f') { e.preventDefault(); return inFocus ? closeFocus() : openFocus(); }
    if (key === 's') {
      e.preventDefault();
      if (timer.running) pauseTimer(); else startTimer();
      return;
    }
    if (key === 'l') { e.preventDefault(); return openOverlay('logbook'); }
  });

  /* ------------------------------------------------------------------ playlist page */
  function initPlaylistPage() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('route') || settings.playlist;
    const playlist = findPlaylist(slug);
    Radio.setPlaylist(playlist.slug);

    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText('#plEyebrow', `${playlist.count} tracks · non-stop`);
    setText('#plTitle', playlist.title);
    setText('#plRoad', playlist.road);
    setText('#plBlurb', playlist.blurb);
    setText('#plCount', `${playlist.count} tracks`);
    setText('#brandRoute', playlist.road);
    setText('#openQueueCount', `${playlist.count} songs`);
    document.title = `${playlist.title} — Bus Study`;

    const rows = $('#trackRows');
    const search = $('#trackSearch');
    let filter = '';

    function paintRows() {
      if (!rows) return;
      rows.innerHTML = '';
      const currentId = (Radio.playlist.tracks[Radio.index] || {}).id;
      const list = playlist.tracks
        .map((t, i) => ({ ...t, i }))
        .filter((t) => {
          if (!filter) return true;
          const q = filter.toLowerCase();
          return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
        });
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'queue-empty';
        empty.textContent = 'No song on this bus matches that. Try another word.';
        rows.appendChild(empty);
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach((t) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'queue-row' + (t.id === currentId ? ' is-current' : '');
        row.innerHTML = `
          <span class="queue-row__no">${t.i + 1}</span>
          <span class="queue-row__img"><img loading="lazy" src="https://i.ytimg.com/vi/${t.id}/mqdefault.jpg" alt=""></span>
          <span class="queue-row__t"><span class="queue-row__title"></span><span class="queue-row__artist"></span></span>
          <span class="queue-row__eq" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.1v13.8c0 .8.9 1.3 1.6.8l10-6.9c.6-.4.6-1.2 0-1.6l-10-6.9c-.7-.5-1.6 0-1.6.8Z"/></svg>
          </span>`;
        row.querySelector('.queue-row__title').textContent = t.title;
        row.querySelector('.queue-row__artist').textContent = t.artist;
        row.addEventListener('click', () => {
          Radio.select(playlist.slug, t.i);
          toast(`Now boarding: ${t.title}`, 'music');
          paintRows();
        });
        frag.appendChild(row);
      });
      rows.appendChild(frag);
    }

    search?.addEventListener('input', () => { filter = search.value.trim(); paintRows(); });
    paintRows();

    $('#plPlayAll')?.addEventListener('click', () => {
      Radio.select(playlist.slug, 0);
      toast('The whole route is boarding', 'music');
    });
    $('#plShuffle')?.addEventListener('click', () => {
      const idx = Math.floor(Math.random() * playlist.tracks.length);
      Radio.select(playlist.slug, idx);
      toast('Shuffling this route', 'music');
    });
    $('#openQueueBtn')?.addEventListener('click', () => openOverlay('queue'));
    $('#sidePlay')?.addEventListener('click', () => Radio.toggle());
    $('#miniStart')?.addEventListener('click', () => {
      if (timer.running) { pauseTimer(); return; }
      startTimer();
    });

    // mini player in the side card
    const sideTitle = $('#sideTitle');
    const sideArtist = $('#sideArtist');
    const sideArt = $('#sideArt');
    const syncSide = () => {
      const t = Radio.playlist.tracks[Radio.index] || {};
      if (sideTitle) sideTitle.textContent = t.title || '—';
      if (sideArtist) sideArtist.textContent = t.artist || '';
      if (sideArt) sideArt.src = `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`;
      $$('.queue-row').forEach((row) => row.classList.toggle('is-current', row.dataset.id === t.id));
    };
    setInterval(syncSide, 1200);
    syncSide();
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    paintStats();
    renderTasks();
    paintSounds();
    paintVolume();
    setBuddyName(settings.buddy);
    setBuddyPose(settings.pose);
    setScene(settings.scene, false);
    fillRhythmInputs();
    renderQueueTabs();
    Radio.paint();
    setMode('focus');
    setBuddyBubble(bubbles[0]);
    if (PAGE === 'playlist') initPlaylistPage();
    renderRoutes();
    paintStats();

    // restore ambience (only after a gesture is possible)
    if (settings.ambience.length) {
      const resume = () => {
        settings.ambience.forEach((n) => AudioEngine.toggle(n, true));
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('pointerdown', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }

    setInterval(() => {
      if (!timer.running) return;
      // safety: if the tab was asleep, recompute on wake
      timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
      paintTimer();
      if (timer.remaining <= 0) completeSession();
    }, 1000);
  }

  boot();
})();
