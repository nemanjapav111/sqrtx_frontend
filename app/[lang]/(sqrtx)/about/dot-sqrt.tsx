"use client";

import { useEffect, useRef } from "react";

// The About page's opening, the name said as maths: "√x =" drawn with tiny black squares, and, after the equals sign, a small green cube that turns (the answer to the root of x is a
// living square). The black squares start as a drifting cloud and gather into the expression; then the cube grows from a point and starts turning. A pointer (a finger) moving
// over the expression pushes the squares aside and they spring back; pressing on the cube, or dragging sideways across it, spins it faster for a moment. ONE 2D canvas, no library.
// The root sign is drawn as a line (Inter's "latin" subset, the one the site loads, has no √), the x and the = in the site's bold. The dots are found by drawing the expression off screen and
// keeping a jittered grid of the pixels it covers. The cube is hollow: only the outer cells of a lattice. The loop only runs while the canvas is on screen; for "reduce motion"
// everything is simply there, and the cube stands still. Once the squares have settled they are drawn as ONE picture made when they did (a frame then costs the cube and one drawImage,
// not 1,700 rectangles); the squares are only drawn one by one while they gather or while a pointer has pushed them. (dot-cube.tsx and dot-logo.tsx are the earlier versions of this opening.)
const GREEN = "0, 207, 55";
const BEGIN_MS = 250; // the cloud is shown this long before it starts to gather
const GATHER_MS = 1900; // one square's way into place
const SPREAD_MS = 650; // they do not all leave together: each waits up to this long
const CUBE_AT_MS = 2500; // the cube starts to grow
const CUBE_GROW_MS = 900;
const CUBE_SPREAD_MS = 500;
const DOTS_PHONE = 900;
const DOTS_WIDE = 1700;
const MIN_SPACING = 2.2; // px between the squares of the finished expression
const SIDE_PHONE = 8; // cells along an edge of the cube
const SIDE_WIDE = 11;
const PHONE_WIDTH = 520;
const SPIN = 0.8; // radians a second
const REACH_PHONE = 44; // how near a pointer pushes, in px
const REACH_WIDE = 60;
const LEVELS = 8; // steps of paleness of the cube, so the fill colour changes a few times a frame, not once for every square

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const FILLS = Array.from({ length: LEVELS }, (_, i) => `rgba(${GREEN}, ${(0.35 + (0.65 * i) / (LEVELS - 1)).toFixed(2)})`);

interface Dot {
  tx: number; // its place in the expression
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
}
interface Cell {
  x: number; // its place in the cube, from -1 to 1 on each axis
  y: number;
  z: number;
  delay: number;
}
interface Seen {
  x: number;
  y: number;
  depth: number; // 0 (far) to 1 (near)
  size: number;
}

// The expression drawn off screen, and the places of the dots on it. Also where the cube goes (its centre, and how big a cube fits).
function layoutExpression(w: number, h: number, family: string, count: number) {
  const off = document.createElement("canvas");
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const c = off.getContext("2d", { willReadFrequently: true });
  const none = { points: [] as { x: number; y: number }[], size: 2, cubeX: w / 2, cubeY: h / 2, cubeRadius: 30 };
  if (!c) return none;
  const middle = h / 2;
  const widths = (fs: number) => {
    c.font = `700 ${fs}px ${family}`;
    const x = c.measureText("x").width;
    const eq = c.measureText("=").width;
    const expression = 0.62 * fs + x + 0.14 * fs + 0.34 * fs + eq; // the root sign, the x under its bar, a space, the =
    return { x, expression, total: expression + 0.3 * fs + 1.1 * fs };
  };
  let fs = h * 0.56;
  let m = widths(fs);
  if (m.total > w * 0.92) {
    fs *= (w * 0.92) / m.total;
    m = widths(fs);
  }
  const left = (w - m.total) / 2;
  c.strokeStyle = "#000";
  c.fillStyle = "#000";
  c.lineWidth = fs * 0.085;
  c.lineJoin = "miter";
  c.lineCap = "butt";
  // the root sign: a short rise, the long way down, the long way up, and the bar over the x
  c.beginPath();
  c.moveTo(left, middle + 0.08 * fs);
  c.lineTo(left + 0.12 * fs, middle - 0.02 * fs);
  c.lineTo(left + 0.3 * fs, middle + 0.42 * fs);
  c.lineTo(left + 0.52 * fs, middle - 0.4 * fs);
  c.lineTo(left + 0.62 * fs + m.x + 0.14 * fs, middle - 0.4 * fs);
  c.stroke();
  c.font = `700 ${fs}px ${family}`;
  c.textBaseline = "alphabetic";
  c.fillText("x", left + 0.62 * fs, middle + 0.32 * fs);
  c.fillText("=", left + 0.62 * fs + m.x + 0.14 * fs + 0.34 * fs, middle + 0.32 * fs);
  const { data, width, height } = c.getImageData(0, 0, off.width, off.height);
  const covered = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 127;
  let area = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 127) area++;
  const spacing = Math.max(MIN_SPACING, Math.sqrt(area / count));
  const points: { x: number; y: number }[] = [];
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      const px = x + (Math.random() - 0.5) * spacing * 0.3;
      const py = y + (Math.random() - 0.5) * spacing * 0.3;
      if (covered(px, py)) points.push({ x: px, y: py });
    }
  }
  return { points, size: clamp(spacing * 0.7, 1.4, 2.6), cubeX: left + m.expression + 0.3 * fs + 0.55 * fs, cubeY: middle, cubeRadius: fs * 0.31 };
}

export default function DotSqrt() {
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
    let dotSize = 2;
    let cells: Cell[] = [];
    let seen: Seen[] = [];
    let order: number[] = [];
    let cube = { x: 0, y: 0, radius: 30, cell: 3 };
    let reach = REACH_WIDE;
    let ratio = 1; // the canvas's pixels per CSS px
    let sprite: HTMLCanvasElement | null = null; // the settled expression, made once
    let disturbed = false; // some square is away from its place
    let start: number | null = calm ? -1e9 : null; // when the gathering began (null: not on screen yet)
    let last = 0;
    let yaw = 0.6;
    let spin = 0; // the extra turn given by a press or a sideways drag, in radians a second
    let visible = false;
    let ready = false;
    let raf = 0;
    const pointer = { x: 0, y: 0, active: false, down: false, lastX: 0 };

    const frame = (now: number) => {
      raf = 0;
      if (!ready || !visible) return;
      if (start === null) start = now;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const t = now - start;
      if (!calm) {
        yaw += (SPIN + spin) * dt;
        spin *= Math.exp(-dt * 1.6);
      }
      ctx.clearRect(0, 0, w, h);

      // the black squares of the expression
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      const gathered = t > BEGIN_MS + SPREAD_MS + GATHER_MS;
      if (gathered && !pointer.active && !disturbed) {
        if (!sprite) {
          sprite = document.createElement("canvas");
          sprite.width = Math.round(w * ratio);
          sprite.height = Math.round(h * ratio);
          const sc = sprite.getContext("2d");
          if (sc) {
            sc.setTransform(ratio, 0, 0, ratio, 0, 0);
            sc.fillStyle = "rgba(0, 0, 0, 0.92)";
            for (const d of dots) sc.fillRect(d.tx - dotSize / 2, d.ty - dotSize / 2, dotSize, dotSize);
          }
        }
        ctx.drawImage(sprite, 0, 0, w, h);
      } else {
        let moving = false;
        for (const d of dots) {
          const f = clamp((t - BEGIN_MS - d.delay) / GATHER_MS, 0, 1);
          let x = d.tx;
          let y = d.ty;
          if (f < 1) {
            const e = easeInOutCubic(f);
            const a = (t / 1000) * d.speed + d.phase;
            x = (d.cx + Math.sin(a) * d.amp) * (1 - e) + d.tx * e;
            y = (d.cy + Math.cos(a * 0.8) * d.amp) * (1 - e) + d.ty * e;
          }
          if (pointer.active) {
            const dx = x + d.ox - pointer.x;
            const dy = y + d.oy - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < reach && dist > 0.01) {
              const push = (1 - dist / reach) ** 2 * 3.2;
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
          ctx.fillRect(x + d.ox - dotSize / 2, y + d.oy - dotSize / 2, dotSize, dotSize);
        }
        disturbed = moving;
      }

      // the green cube, once its time has come
      const cubeT = t - CUBE_AT_MS;
      if (cubeT > 0) {
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const pitch = calm ? 0.55 : 0.55 + 0.12 * Math.sin(t * 0.0004);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const distance = cube.radius * 4;
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const x1 = c.x * cy + c.z * sy;
          const z1 = -c.x * sy + c.z * cy;
          const y2 = c.y * cp - z1 * sp;
          const z2 = c.y * sp + z1 * cp; // toward the viewer is positive
          const scale = distance / (distance - z2 * cube.radius);
          const e = easeOutCubic(clamp((cubeT - c.delay) / CUBE_GROW_MS, 0, 1)); // grows out of the centre
          const s = seen[i];
          s.x = cube.x + x1 * cube.radius * scale * e;
          s.y = cube.y + y2 * cube.radius * scale * e;
          s.depth = clamp((z2 + 1.74) / 3.48, 0, 1);
          s.size = cube.cell * scale * e;
        }
        order.sort((a, b) => seen[a].depth - seen[b].depth); // far to near
        let level = -1;
        for (const i of order) {
          const s = seen[i];
          if (s.size < 0.2) continue;
          const l = Math.min(LEVELS - 1, Math.floor(s.depth * LEVELS));
          if (l !== level) {
            ctx.fillStyle = FILLS[l];
            level = l;
          }
          ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        }
      }
      if (!calm) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ratio = dpr;
      sprite = null;
      disturbed = false;
      const phone = w < PHONE_WIDTH;
      reach = phone ? REACH_PHONE : REACH_WIDE;
      const shape = layoutExpression(w, h, getComputedStyle(el).fontFamily, phone ? DOTS_PHONE : DOTS_WIDE);
      dotSize = shape.size;
      dots = shape.points.map((p) => ({
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
      }));
      const side = phone ? SIDE_PHONE : SIDE_WIDE;
      cube = { x: shape.cubeX, y: shape.cubeY, radius: shape.cubeRadius, cell: ((2 * shape.cubeRadius) / (side - 1)) * 0.62 };
      cells = [];
      for (let i = 0; i < side; i++) {
        for (let j = 0; j < side; j++) {
          for (let k = 0; k < side; k++) {
            const outer = i === 0 || j === 0 || k === 0 || i === side - 1 || j === side - 1 || k === side - 1;
            if (outer) cells.push({ x: (i / (side - 1)) * 2 - 1, y: (j / (side - 1)) * 2 - 1, z: (k / (side - 1)) * 2 - 1, delay: Math.random() * CUBE_SPREAD_MS });
          }
        }
      }
      seen = cells.map(() => ({ x: 0, y: 0, depth: 0, size: 0 }));
      order = cells.map((_, i) => i);
      ready = true;
      kick();
    };

    let lastWidth = 0;
    const resizer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        if (ready) layout();
      }
    });
    // The font must be loaded before the x and the = are drawn off screen, or the dots would take the shape of a fallback font.
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      lastWidth = el.clientWidth;
      layout();
      resizer.observe(el);
    });

    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) {
        last = 0; // no jump for the time spent off screen
        kick();
      }
    });
    watcher.observe(el);

    const nearCube = () => Math.hypot(pointer.x - cube.x, pointer.y - cube.y) < cube.radius * 1.8;
    const place = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onDown = (e: PointerEvent) => {
      if (calm) return;
      place(e);
      pointer.down = true;
      pointer.lastX = e.clientX;
      if (nearCube()) spin = clamp(spin + 4, -8, 8); // a press on the cube: a quick spin
    };
    const onMove = (e: PointerEvent) => {
      if (calm) return;
      place(e);
      pointer.active = true;
      if (pointer.down && nearCube()) spin = clamp(spin + (e.clientX - pointer.lastX) * 0.03, -8, 8); // dragging across it turns it
      pointer.lastX = e.clientX;
    };
    const onUp = () => {
      pointer.down = false;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.down = false;
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
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("pointercancel", onLeave);
    };
  }, []);

  // Decoration only (the page's heading says what the page is): hidden from screen readers. touch-pan-y: a finger on it still scrolls the page.
  return (
    <div ref={box} aria-hidden className="relative mb-8 h-47.5 w-full md:mb-12 md:h-72">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-pan-y" />
    </div>
  );
}
