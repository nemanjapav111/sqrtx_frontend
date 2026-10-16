"use client";

import { useEffect, useRef } from "react";

// The About page's opening: a cube made of many very small black squares (each one cell of a lattice; the cube is hollow, only its outer cells are drawn), drifting in as a loose cloud,
// gathering into a cube and turning slowly. Seen with a little perspective: the near squares are larger and darker, the far ones smaller and paler, drawn far to near so they overlap the
// right way. The pointer is a magnifying glass: the squares inside its circle are drawn larger and spread apart a little, and the ones that carry the sqrtx green (a third of them, chosen
// once) turn green under it, so the green is found, not shown. ONE 2D canvas, no library, up to about 2,600 squares. The loop only runs while the canvas is on screen; for "reduce motion"
// the cube stands still and there is no glass. (dot-logo.tsx is the first version of this opening: the dots gather into the sqrtx logo.)
const GREEN = [0, 207, 55];
const GREEN_SHARE = 0.34; // the part of the squares that turn green under the glass
const BEGIN_MS = 250; // the cloud is shown this long before it starts to gather
const GATHER_MS = 1900; // one square's way into place
const SPREAD_MS = 650; // they do not all leave together: each waits up to this long
const SIDE_PHONE = 15; // cells along an edge
const SIDE_WIDE = 22;
const PHONE_WIDTH = 520;
const SPIN = 0.35; // radians a second
const GLASS_PHONE = 56; // radius of the glass, in px
const GLASS_WIDE = 78;
const GLASS_SPREAD = 0.7; // how much farther from the glass's centre the squares are drawn, at its centre
const GLASS_GROW = 1.1; // how much larger a square is drawn, at the glass's centre
const LEVELS = 8; // steps of paleness, so the fill colour changes a few times a frame, not once for every square

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const alphaAt = (i: number) => (0.22 + (0.78 * i) / (LEVELS - 1)).toFixed(2);
const BLACKS = Array.from({ length: LEVELS }, (_, i) => `rgba(0, 0, 0, ${alphaAt(i)})`);
// A square on its way to green: the mix of black and green, at the paleness of its depth.
const mixed = (green: number, level: number) => `rgba(${Math.round(GREEN[0] * green)}, ${Math.round(GREEN[1] * green)}, ${Math.round(GREEN[2] * green)}, ${alphaAt(level)})`;

interface Cell {
  x: number; // its place in the cube, from -1 to 1 on each axis
  y: number;
  z: number;
  green: boolean; // turns green under the glass
  cx: number; // its place in the cloud
  cy: number;
  amp: number; // how far, and how fast, it drifts in the cloud
  speed: number;
  phase: number;
  delay: number;
}
interface Seen {
  x: number;
  y: number;
  depth: number; // 0 (far) to 1 (near)
  scale: number;
  glass: number; // 0 (outside the glass) to 1 (at its centre)
}

export default function DotCube() {
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
    let radius = 50; // half an edge of the cube, in px
    let cell = 4; // a square's size, in px, before perspective
    let glassRadius = GLASS_WIDE;
    let cells: Cell[] = [];
    let seen: Seen[] = [];
    let order: number[] = [];
    let start: number | null = calm ? -1e9 : null; // when the gathering began (null: not on screen yet)
    let last = 0;
    let yaw = 0.6;
    let visible = false;
    let ready = false;
    let raf = 0;
    // The glass: where the pointer is, and how much of it is "on" (it fades in and out, 0 to 1).
    const pointer = { x: 0, y: 0, active: false, strength: 0 };

    const frame = (now: number) => {
      raf = 0;
      if (!ready || !visible) return;
      if (start === null) start = now;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const t = now - start;
      if (!calm) {
        yaw += SPIN * dt;
        pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * Math.min(1, dt * 12);
      }
      const pitch = calm ? 0.55 : 0.55 + 0.12 * Math.sin(t * 0.0004);
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const distance = radius * 4;
      const mx = w / 2;
      const my = h / 2;
      const glassOn = pointer.strength > 0.01;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const x1 = c.x * cy + c.z * sy;
        const z1 = -c.x * sy + c.z * cy;
        const y2 = c.y * cp - z1 * sp;
        const z2 = c.y * sp + z1 * cp; // toward the viewer is positive
        const scale = distance / (distance - z2 * radius);
        let x = mx + x1 * radius * scale;
        let y = my + y2 * radius * scale;
        const f = clamp((t - BEGIN_MS - c.delay) / GATHER_MS, 0, 1);
        if (f < 1) {
          const e = easeInOutCubic(f);
          const a = (t / 1000) * c.speed + c.phase;
          x = (c.cx + Math.sin(a) * c.amp) * (1 - e) + x * e;
          y = (c.cy + Math.cos(a * 0.8) * c.amp) * (1 - e) + y * e;
        }
        let glass = 0;
        if (glassOn) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < glassRadius) {
            glass = smooth(1 - dist / glassRadius) * pointer.strength;
            const spread = 1 + GLASS_SPREAD * glass;
            x = pointer.x + dx * spread;
            y = pointer.y + dy * spread;
          }
        }
        const s = seen[i];
        s.x = x;
        s.y = y;
        s.depth = clamp((z2 + 1.74) / 3.48, 0, 1);
        s.scale = scale;
        s.glass = glass;
      }
      order.sort((a, b) => seen[a].depth - seen[b].depth); // far to near
      ctx.clearRect(0, 0, w, h);
      let level = -1;
      let plain = false; // the fill is the plain black of `level`
      for (const i of order) {
        const s = seen[i];
        const l = Math.min(LEVELS - 1, Math.floor(s.depth * LEVELS));
        const green = s.glass > 0.02 && cells[i].green ? s.glass : 0;
        if (green > 0) {
          ctx.fillStyle = mixed(green, l);
          plain = false;
        } else if (!plain || l !== level) {
          ctx.fillStyle = BLACKS[l];
          plain = true;
        }
        level = l;
        const size = cell * s.scale * (1 + GLASS_GROW * s.glass);
        ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
      }
      if (glassOn) {
        // the rim of the glass: a thin line that fades in and out with it
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.28 * pointer.strength).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, glassRadius, 0, Math.PI * 2);
        ctx.stroke();
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
      const phone = w < PHONE_WIDTH;
      const side = phone ? SIDE_PHONE : SIDE_WIDE;
      radius = Math.min(h * 0.28, w * 0.3); // a turning cube is up to about 3.2 radii tall (more with perspective): this keeps it inside the box
      cell = ((2 * radius) / (side - 1)) * 0.5;
      glassRadius = phone ? GLASS_PHONE : GLASS_WIDE;
      cells = [];
      for (let i = 0; i < side; i++) {
        for (let j = 0; j < side; j++) {
          for (let k = 0; k < side; k++) {
            const outer = i === 0 || j === 0 || k === 0 || i === side - 1 || j === side - 1 || k === side - 1;
            if (!outer) continue;
            cells.push({
              x: (i / (side - 1)) * 2 - 1,
              y: (j / (side - 1)) * 2 - 1,
              z: (k / (side - 1)) * 2 - 1,
              green: Math.random() < GREEN_SHARE,
              cx: Math.random() * w,
              cy: Math.random() * h,
              amp: 10 + Math.random() * 22,
              speed: 0.5 + Math.random() * 0.9,
              phase: Math.random() * Math.PI * 2,
              delay: Math.random() * SPREAD_MS,
            });
          }
        }
      }
      seen = cells.map(() => ({ x: 0, y: 0, depth: 0, scale: 1, glass: 0 }));
      order = cells.map((_, i) => i);
      ready = true;
      kick();
    };

    let lastWidth = el.clientWidth;
    const resizer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        layout();
      }
    });
    layout();
    resizer.observe(el);

    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) {
        last = 0; // no jump for the time spent off screen
        kick();
      }
    });
    watcher.observe(el);

    const onMove = (e: PointerEvent) => {
      if (calm) return;
      const rect = cv.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointercancel", onLeave);
    cv.addEventListener("pointerup", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      resizer.disconnect();
      watcher.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("pointercancel", onLeave);
      cv.removeEventListener("pointerup", onLeave);
    };
  }, []);

  // Decoration only (the page's heading says what the page is): hidden from screen readers. touch-pan-y: a finger on it still scrolls the page.
  return (
    <div ref={box} aria-hidden className="relative mb-8 h-47.5 w-full md:mb-12 md:h-72">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-pan-y" />
    </div>
  );
}
