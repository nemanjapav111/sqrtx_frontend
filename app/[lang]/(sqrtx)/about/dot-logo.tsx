"use client";

import { useEffect, useRef } from "react";

// The About page's opening: a cloud of small black squares drifts, then gathers into the sqrtx logo (the square and the word, as in the registration pages' big logo),
// and settles. Drawn on ONE 2D canvas with no library (the idea is the opening of si.gov, which gathers its dots into letters as the page scrolls; this page is too short
// to scroll, so the dots gather by themselves when the page opens). The dots are found by drawing the logo off screen once and keeping a grid of the pixels it covers, so
// the shape always matches the real font and any width. About 4500 dots on a phone; a bigger logo gets more, so the squares stay small.
// A tap or a click on it bursts every dot back out to where it was in the opening cloud (a second canvas, fixed over the page but under the top bar, exists only for those
// moments); a dot over something dark on the page (a black button) is drawn white, one over something light is black, so it always shows. Then they re-form the logo as a ripple
// going out from the tap. Moving the mouse over the logo, or dragging a finger across it, pushes the dots near it aside fast and they spring back (a vertical swipe is the page
// scrolling: touch-pan-y hands it to the browser). The dots are drawn on whole device pixels, so their edges are sharp.
// Light on purpose: once the dots have settled nothing is drawn again until a pointer comes near or the logo is tapped, the loop stops while the canvas is off screen (not
// during a flight), and for "reduce motion" the logo is simply there and a tap does nothing.
const BEGIN_MS = 200; // the cloud is shown this long before it starts to gather
const GATHER_MS = 1000; // one dot's way into place
const SPREAD_MS = 350; // the dots do not all leave together: each waits up to this long
const DOTS = 4500; // for a logo with a 77px word (the size on a phone); a bigger logo gets more dots in proportion, so the squares are the same small size everywhere
const REF_FONT = 76.7;
const MAX_DOTS = 20000;
const PHONE_WIDTH = 520;
const MIN_SPACING = 2.4; // px between the dots of the finished logo
// The flight of a tap, in ms: out to a place somewhere on the screen, a moment there, and back.
const OUT_MS = 380;
const HOLD_MS = 0; // no stay: the return starts as soon as a dot has arrived (and its turn in the ripple has come)
const BACK_MS = 480;
const RIPPLE_MS = 140; // dots farther from the tap leave a little later, so the burst spreads out from where it was tapped
const RETURN_SPREAD_MS = 500; // they come back as a ripple: the dots nearest the tap first, a wave going out from it

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const RIPPLE_PX = 16; // the ring of the return wave pushes the dots it passes this far outward
const TAP_MS = 400; // a touch that lasts longer than this, or moves farther than TAP_PX, is not a tap
const TAP_PX = 10;

// How light a CSS colour is (0 to 1) and how opaque, or null for a colour that is not "rgb()/rgba()" (computed colours always are).
function lightness(css: string): { light: number; alpha: number } | null {
  const m = /rgba?\(([^)]+)\)/.exec(css);
  if (!m) return null;
  const [r, g, b, a] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { light: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, alpha: a === undefined || Number.isNaN(a) ? 1 : a };
}

interface Dot {
  tx: number; // its place in the logo
  ty: number;
  cx: number; // its place in the cloud
  cy: number;
  amp: number; // how far, and how fast, it drifts in the cloud
  speed: number;
  phase: number;
  delay: number;
  ox: number; // pushed aside by the pointer, and its speed
  oy: number;
  vx: number;
  vy: number;
  // a flight, set when the logo is tapped (positions on the screen, not in the logo's box)
  sx: number; // where it was when the tap came (the dots may be mid-way: still gathering, or already on a flight)
  sy: number;
  px: number; // where it is now on the screen during a flight
  py: number;
  fx: number; // where it flies to
  fy: number;
  out: number; // when it leaves, after the tap
  back: number; // how long it stays out before it comes back
  wobble: number; // how far it drifts while out
  wphase: number;
}

// The places of the dots: the logo drawn off screen (a square, then "sqrtx" in bold, 52px next to a 64px square in BigLogo), then a jittered grid over what it covers.
function logoPoints(w: number, h: number, family: string, count: number) {
  const off = document.createElement("canvas");
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const c = off.getContext("2d", { willReadFrequently: true });
  if (!c) return { points: [] as { x: number; y: number }[], size: 2 };
  let fs = h * 0.5;
  const wordWidth = (size: number) => {
    c.font = `700 ${size}px ${family}`;
    return c.measureText("sqrtx").width;
  };
  const total = (size: number) => size * 1.23 + size * 0.27 + wordWidth(size);
  if (total(fs) > w * 0.9) fs *= (w * 0.9) / total(fs);
  const square = fs * 1.23;
  const gap = fs * 0.27;
  const left = (w - total(fs)) / 2;
  const middle = h / 2;
  c.fillStyle = "#000";
  c.fillRect(left, middle - square / 2, square, square);
  c.font = `700 ${fs}px ${family}`;
  c.textBaseline = "alphabetic";
  c.fillText("sqrtx", left + square + gap, middle + fs * 0.27); // the middle of the lower-case letters sits level with the square's middle
  const { data, width, height } = c.getImageData(0, 0, off.width, off.height);
  const covered = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 127;
  let area = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 127) area++;
  const spacing = Math.max(MIN_SPACING, Math.sqrt(area / Math.min(MAX_DOTS, count * (fs / REF_FONT) ** 2)));
  const points: { x: number; y: number }[] = [];
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      const px = x + (Math.random() - 0.5) * spacing * 0.3;
      const py = y + (Math.random() - 0.5) * spacing * 0.3;
      if (covered(px, py)) points.push({ x: px, y: py });
    }
  }
  return { points, size: clamp(spacing * 0.55, 1.2, 2.8) };
}

export default function DotLogo() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dots: Dot[] = [];
    let size = 2;
    let reach = 110; // how near a pointer pushes
    let color = "#000";
    let start: number | null = calm ? -1e9 : null; // when the gathering began (null: not on screen yet)
    let visible = false;
    let raf = 0;
    let ready = false; // the font is loaded and the dots are placed
    const pointer = { x: 0, y: 0, cx: 0, cy: 0, active: false }; // x, y in the logo's box, cx, cy on the screen

    // The flight of a tap: its start time (null: none), when the last dot is home, and the canvas over the screen that shows it.
    let flightAt: number | null = null;
    let flightEnd = 0;
    let sky: HTMLCanvasElement | null = null;
    let skyCtx: CanvasRenderingContext2D | null = null;
    let skyRatio = 1;
    let screenW = 0;
    let screenH = 0;
    let sprite: HTMLCanvasElement | null = null; // the settled logo, made once
    let disturbed = false;
    let ratio = 1;

    // The page's backgrounds that decide a dot's colour during a flight: every element with a mostly opaque background, and whether it is dark. Found once, when the flight starts; their
    // places are read again on every frame (the page may scroll).
    let areas: { el: Element; dark: boolean }[] = [];
    const findAreas = () => {
      areas = [];
      for (const node of document.body.querySelectorAll("*")) {
        if (node === sky || node === cv || node.closest("[aria-hidden='true']") === el) continue;
        const r = node.getBoundingClientRect();
        if (r.width * r.height < 400 || r.bottom < 0 || r.top > window.innerHeight) continue;
        const c = lightness(getComputedStyle(node).backgroundColor);
        if (!c || c.alpha < 0.6) continue;
        areas.push({ el: node, dark: c.light < 0.4 });
      }
    };

    const settledAt = () => BEGIN_MS + GATHER_MS + SPREAD_MS;

    // Where a dot is in the logo's box while it is still gathering (or, once it has gathered, in its place).
    const placeAt = (d: Dot, t: number): [number, number, boolean] => {
      const f = clamp((t - BEGIN_MS - d.delay) / GATHER_MS, 0, 1);
      if (f >= 1) return [d.tx, d.ty, false];
      const e = easeInOutCubic(f);
      const a = (t / 1000) * d.speed + d.phase;
      return [(d.cx + Math.sin(a) * d.amp) * (1 - e) + d.tx * e, (d.cy + Math.cos(a * 0.8) * d.amp) * (1 - e) + d.ty * e, true];
    };

    const frame = (now: number) => {
      raf = 0;
      if (!ready || (!visible && flightAt === null)) return;
      if (start === null) start = now;
      const t = now - start;

      if (flightAt !== null && sky && skyCtx) {
        // ---- a flight: the dots are drawn on the screen-wide canvas, the logo's own canvas is empty meanwhile
        const tf = now - flightAt;
        const home = el.getBoundingClientRect();
        const homeX = Math.round(home.left * skyRatio) / skyRatio; // the canvas sits on whole device pixels
        const homeY = Math.round(home.top * skyRatio) / skyRatio;
        // the backgrounds now, smallest first: a dot takes its colour from the smallest one it is in
        const spots = areas
          .map((a, index) => {
            const r = a.el.getBoundingClientRect();
            return { l: r.left, t: r.top, r: r.right, b: r.bottom, area: r.width * r.height, dark: a.dark, index };
          })
          .filter((r) => r.area > 0)
          .sort((p, q) => p.area - q.area || q.index - p.index); // the same size: the inner one (later in the page) is the one on top
        skyCtx.clearRect(0, 0, screenW, screenH);
        const dark: number[] = [];
        const light: number[] = [];
        let allHome = true;
        for (const d of dots) {
          const rx = homeX + d.tx;
          const ry = homeY + d.ty;
          const t1 = d.out + OUT_MS;
          const t2 = t1 + HOLD_MS + d.back;
          const t3 = t2 + BACK_MS;
          const wob = (tf / 1000) * 1.6 + d.wphase;
          const hx = d.fx + Math.sin(wob) * d.wobble;
          const hy = d.fy + Math.cos(wob * 0.8) * d.wobble;
          let x = rx;
          let y = ry;
          if (tf < d.out) {
            x = d.sx;
            y = d.sy;
            allHome = false;
          } else if (tf < t1) {
            const e = easeOutCubic((tf - d.out) / OUT_MS);
            x = d.sx + (hx - d.sx) * e;
            y = d.sy + (hy - d.sy) * e;
            allHome = false;
          } else if (tf < t2) {
            x = hx;
            y = hy;
            allHome = false;
          } else if (tf < t3) {
            const e = easeInOutCubic((tf - t2) / BACK_MS);
            x = hx + (rx - hx) * e;
            y = hy + (ry - hy) * e;
            // the wave: a dot on its way home is pushed out along the line from the tap, most in the middle of the way
            const away = Math.hypot(d.tx - tap.x, d.ty - tap.y) || 1;
            const bump = Math.sin(Math.PI * e) * RIPPLE_PX;
            x += ((d.tx - tap.x) / away) * bump;
            y += ((d.ty - tap.y) / away) * bump;
            allHome = false;
          }
          // the pointer pushes the dots on a flight too, and they spring back to their way
          if (pointer.active) {
            const dx = x + d.ox - pointer.cx;
            const dy = y + d.oy - pointer.cy;
            const dist = Math.hypot(dx, dy);
            if (dist < reach && dist > 0.01) {
              const push = (1 - dist / reach) ** 2 * 9;
              d.vx += (dx / dist) * push;
              d.vy += (dy / dist) * push;
            }
          }
          d.vx = (d.vx - d.ox * 0.06) * 0.86;
          d.vy = (d.vy - d.oy * 0.06) * 0.86;
          d.ox += d.vx;
          d.oy += d.vy;
          if (Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) > 0.04) allHome = false;
          else {
            d.ox = 0;
            d.oy = 0;
          }
          x += d.ox;
          y += d.oy;
          d.px = x;
          d.py = y;
          let onDark = false;
          for (const sp of spots) {
            if (x >= sp.l && x <= sp.r && y >= sp.t && y <= sp.b) {
              onDark = sp.dark;
              break;
            }
          }
          (onDark ? light : dark).push(Math.round((x - size / 2) * skyRatio) / skyRatio, Math.round((y - size / 2) * skyRatio) / skyRatio);
        }
        const edge = Math.max(1, Math.round(size * skyRatio)) / skyRatio; // whole device pixels
        skyCtx.fillStyle = color;
        for (let i = 0; i < dark.length; i += 2) skyCtx.fillRect(dark[i], dark[i + 1], edge, edge);
        skyCtx.fillStyle = "#fff";
        for (let i = 0; i < light.length; i += 2) skyCtx.fillRect(light[i], light[i + 1], edge, edge);
        if (allHome || tf > flightEnd) {
          // home: the logo's own canvas takes over again, in exactly the same places
          flightAt = null;
          disturbed = false;
          frame(now); // the logo is drawn on its own canvas in the same moment the screen-wide one is hidden, so there is no empty frame between
          sky.style.display = "none";
          return;
        }
        raf = requestAnimationFrame(frame);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const gathered = t > settledAt();
      if (gathered && !pointer.active && !disturbed) {
        // settled: one picture
        if (!sprite) {
          sprite = document.createElement("canvas");
          sprite.width = Math.round(w * ratio);
          sprite.height = Math.round(h * ratio);
          const sc = sprite.getContext("2d");
          if (sc) {
            sc.setTransform(ratio, 0, 0, ratio, 0, 0);
            sc.fillStyle = color;
            const edge = Math.max(1, Math.round(size * ratio)) / ratio; // whole device pixels
            for (const d of dots) sc.fillRect(Math.round((d.tx - size / 2) * ratio) / ratio, Math.round((d.ty - size / 2) * ratio) / ratio, edge, edge);
          }
        }
        ctx.drawImage(sprite, 0, 0, w, h);
        return;
      }
      ctx.fillStyle = color;
      const edge = Math.max(1, Math.round(size * ratio)) / ratio;
      let moving = false;
      for (const d of dots) {
        const [x, y, gathering] = placeAt(d, t);
        if (gathering) moving = true;
        if (pointer.active) {
          const dx = x + d.ox - pointer.x;
          const dy = y + d.oy - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < reach && dist > 0.01) {
            const push = (1 - dist / reach) ** 2 * 9;
            d.vx += (dx / dist) * push;
            d.vy += (dy / dist) * push;
          }
        }
        // spring back to its place
        d.vx = (d.vx - d.ox * 0.06) * 0.86;
        d.vy = (d.vy - d.oy * 0.06) * 0.86;
        d.ox += d.vx;
        d.oy += d.vy;
        if (Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) > 0.04) moving = true;
        else {
          d.ox = 0;
          d.oy = 0;
        }
        ctx.fillRect(Math.round((x + d.ox - size / 2) * ratio) / ratio, Math.round((y + d.oy - size / 2) * ratio) / ratio, edge, edge);
      }
      disturbed = moving;
      if (moving || pointer.active) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // A tap: every dot gets a place on the screen to fly to, and a time to leave (the farther from the tap, the later).
    let tap = { x: 0, y: 0 };
    const launch = (tapX: number, tapY: number, now: number) => {
      if (calm || !ready || start === null) return; // at any moment: while the logo is gathering, or while the dots are already away
      const home = el.getBoundingClientRect();
      screenW = window.innerWidth;
      screenH = window.innerHeight;
      if (!sky) {
        sky = document.createElement("canvas");
        sky.setAttribute("aria-hidden", "true");
        sky.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:25;display:none";
        document.body.appendChild(sky);
        skyCtx = sky.getContext("2d");
      }
      if (!skyCtx) return;
      skyRatio = Math.min(window.devicePixelRatio || 1, 3);
      // the same size in CSS pixels as the bitmap is made for (100vh is taller than the visible screen on a phone while its address bar shows, which stretched the dots and moved the logo when they came home)
      sky.style.width = `${screenW}px`;
      sky.style.height = `${screenH}px`;
      sky.width = Math.round(screenW * skyRatio);
      sky.height = Math.round(screenH * skyRatio);
      skyCtx.setTransform(skyRatio, 0, 0, skyRatio, 0, 0);
      sky.style.display = "block";
      findAreas();
      const farthest = Math.max(1, Math.hypot(Math.max(tapX, w - tapX), Math.max(tapY, h - tapY)));
      let last = 0;
      const onFlight = flightAt !== null;
      const homeLeft = Math.round(home.left * skyRatio) / skyRatio;
      const homeTop = Math.round(home.top * skyRatio) / skyRatio;
      for (const d of dots) {
        // where it starts from: where it is now
        if (onFlight) {
          d.sx = d.px;
          d.sy = d.py;
        } else {
          const [gx, gy] = placeAt(d, now - (start ?? now));
          d.sx = homeLeft + gx + d.ox;
          d.sy = homeTop + gy + d.oy;
        }
        d.px = d.sx;
        d.py = d.sy;
        // only as far as the opening cloud: a place near its spot in it
        d.fx = home.left + d.cx + (Math.random() - 0.5) * d.amp;
        d.fy = home.top + d.cy + (Math.random() - 0.5) * d.amp;
        d.out = (Math.hypot(d.tx - tapX, d.ty - tapY) / farthest) * RIPPLE_MS + Math.random() * 120;
        d.back = (Math.hypot(d.tx - tapX, d.ty - tapY) / farthest) * RETURN_SPREAD_MS + Math.random() * 40;
        d.wobble = 2 + Math.random() * 5;
        d.wphase = Math.random() * Math.PI * 2;
        last = Math.max(last, d.out + OUT_MS + HOLD_MS + d.back + BACK_MS);
        d.ox = 0;
        d.oy = 0;
        d.vx = 0;
        d.vy = 0;
      }
      tap = { x: tapX, y: tapY };
      flightEnd = last + 100;
      flightAt = now;
      ctx.clearRect(0, 0, w, h); // the logo's own canvas is empty while its dots are away
      pointer.active = false;
      kick();
    };

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      w = el.clientWidth;
      h = el.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ratio = dpr;
      sprite = null;
      disturbed = false;
      const style = getComputedStyle(el);
      color = style.color;
      const phone = w < PHONE_WIDTH;
      reach = phone ? 70 : 110;
      const { points, size: s } = logoPoints(w, h, style.fontFamily, DOTS);
      size = s;
      dots = points.map((p) => ({
        tx: p.x,
        ty: p.y,
        cx: Math.random() * w,
        cy: Math.random() * h,
        amp: 10 + Math.random() * 22,
        speed: 0.5 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        delay: Math.random() * SPREAD_MS,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        sx: 0,
        sy: 0,
        px: 0,
        py: 0,
        fx: 0,
        fy: 0,
        out: 0,
        back: 0,
        wobble: 0,
        wphase: 0,
      }));
      ready = true;
      kick();
    };

    let cancelled = false;
    let lastWidth = 0;
    const resizer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        if (ready && flightAt === null) layout();
      }
    });
    // The font must be loaded before the word is drawn off screen, or the dots would take the shape of a fallback font.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      lastWidth = el.clientWidth;
      layout();
      resizer.observe(el);
    });

    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) kick();
    });
    watcher.observe(el);

    const place = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.cx = e.clientX;
      pointer.cy = e.clientY;
    };
    // A mouse: moving over the logo pushes dots away fast, a click sends them flying. A finger does the same: a drag across it pushes dots, a tap (a touch that stays put and is short) sends them flying. (A vertical swipe is the page scrolling; touch-pan-y hands it to the browser.)
    const touch = { x: 0, y: 0, at: 0, down: false };
    const onMove = (e: PointerEvent) => {
      if (calm) return;
      place(e);
      pointer.active = true;
      kick();
    };
    const onDown = (e: PointerEvent) => {
      place(e);
      if (e.pointerType === "touch") {
        touch.x = e.clientX;
        touch.y = e.clientY;
        touch.at = performance.now();
        touch.down = true;
        return;
      }
      launch(pointer.x, pointer.y, performance.now());
    };
    const onUp = (e: PointerEvent) => {
      pointer.active = false;
      if (e.pointerType !== "touch" || !touch.down) return;
      touch.down = false;
      const now = performance.now();
      if (now - touch.at <= TAP_MS && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) <= TAP_PX) launch(pointer.x, pointer.y, now);
    };
    const onLeave = () => {
      pointer.active = false;
      touch.down = false;
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointercancel", onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizer.disconnect();
      watcher.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("pointercancel", onLeave);
      cv.removeEventListener("pointerup", onUp);
      sky?.remove();
    };
  }, []);

  // Decoration only (the page's heading says what the page is): hidden from screen readers. touch-pan-y: a finger on it still scrolls the page.
  return (
    <div ref={box} aria-hidden className="relative mb-8 h-47.5 w-full text-black md:mb-12 md:h-72">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-pan-y" />
    </div>
  );
}
