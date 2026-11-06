/* PPW scroll story: scrubs a frame sequence and reveals copy as the visitor scrolls. */
(() => {
  const story = document.querySelector('.scroll-story');
  if (!story) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const FRAME_COUNT = Number(story.dataset.frames || 78);
  const FRAME_PATH = story.dataset.framePath || 'assets/scroll/f';
  const pad = (n) => String(n).padStart(3, '0');

  const before = story.querySelector('.scroll-story-before');
  const video = story.querySelector('.scroll-story-video');
  const after = story.querySelector('.scroll-story-after');
  const wipe = story.querySelector('.scroll-story-wipe');
  const lines = [...story.querySelectorAll('.scroll-story-line')];
  const bar = story.querySelector('.scroll-story-progress span');
  const hint = story.querySelector('.scroll-story-hint');
  const panelCanvas = story.querySelector('.scroll-story-panel canvas');
  const backCanvas = story.querySelector('.scroll-story-backdrop');
  const pctx = panelCanvas.getContext('2d');
  const bctx = backCanvas.getContext('2d');

  // Timeline (0..1 across the pinned scroll)
  const T = {
    beforeOut: [0.16, 0.26],   // dirty still fades into the video
    video: [0.20, 0.70],       // frames scrub across this range
    wipe: [0.70, 0.86],        // clean result wipes in
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, [a, b]) => clamp((p - a) / (b - a));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // ---- Frames: load a coarse pass first, then fill in the rest ----
  const frames = new Array(FRAME_COUNT);
  let started = false;
  const load = (i) => new Promise((resolve) => {
    if (frames[i]) return resolve();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { frames[i] = img; resolve(); };
    img.onerror = resolve;
    img.src = `${FRAME_PATH}${pad(i + 1)}.webp`;
  });
  const startLoading = async () => {
    if (started) return;
    started = true;
    const coarse = [], fine = [];
    for (let i = 0; i < FRAME_COUNT; i++) (i % 4 === 0 ? coarse : fine).push(i);
    await Promise.all(coarse.map(load));
    requestTick();
    for (let i = 0; i < fine.length; i += 8) {
      await Promise.all(fine.slice(i, i + 8).map(load));
    }
    requestTick();
  };
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { startLoading(); obs.disconnect(); }
  }, { rootMargin: '150% 0px' }).observe(story);

  const nearestFrame = (i) => {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };

  const sizeCanvas = (canvas) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };

  const drawCover = (ctx, img) => {
    const { width: cw, height: ch } = ctx.canvas;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  let lastFrame = -1;
  const drawFrame = (i) => {
    const img = nearestFrame(i);
    if (!img) return;
    if (i === lastFrame && img === frames[lastFrame]) return;
    lastFrame = i;
    sizeCanvas(panelCanvas);
    drawCover(pctx, img);
    // Backdrop only needs low resolution — it is blurred.
    if (backCanvas.width !== 96) { backCanvas.width = 96; backCanvas.height = 54; }
    drawCover(bctx, img);
  };

  // ---- Copy timing: each line has data-in / data-out (0..1) ----
  const showLine = (el, p) => {
    const a = Number(el.dataset.in), b = Number(el.dataset.out ?? 2);
    const fade = 0.04;
    let o = clamp((p - a) / fade) * (b > 1 ? 1 : clamp((b - p) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - ease(clamp((p - a) / (fade * 2)))) * 28).toFixed(1)}px)`;
    el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  };

  const update = () => {
    ticking = false;
    const rect = story.getBoundingClientRect();
    const total = story.offsetHeight - window.innerHeight;
    const p = clamp(-rect.top / total);

    before.style.opacity = (1 - range(p, T.beforeOut)).toFixed(3);
    video.style.opacity = range(p, [T.beforeOut[0], T.beforeOut[0] + 0.06]).toFixed(3);

    const vp = range(p, T.video);
    drawFrame(Math.round(vp * (FRAME_COUNT - 1)));

    const wp = ease(range(p, T.wipe));
    after.style.clipPath = `inset(0 ${(100 - wp * 100).toFixed(2)}% 0 0)`;
    wipe.style.left = `${(wp * 100).toFixed(2)}%`;
    wipe.style.opacity = wp > 0 && wp < 1 ? '1' : '0';

    lines.forEach((el) => showLine(el, p));
    if (bar) bar.style.height = `${(p * 100).toFixed(1)}%`;
    if (hint) hint.style.opacity = (1 - clamp(p / 0.05)).toFixed(3);
  };

  let ticking = false;
  const requestTick = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', () => { lastFrame = -1; requestTick(); });
  requestTick();
})();
