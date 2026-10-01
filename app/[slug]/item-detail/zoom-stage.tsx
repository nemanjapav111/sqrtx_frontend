"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The zoomable area of the photo viewer (photo-viewer.tsx): the photo is shown whole, and can be zoomed and moved.
//  - Mouse wheel / trackpad pinch: zoom around the pointer (the point under it stays where it is).
//  - Two fingers: pinch to zoom around the fingers, and move them to move the photo.
//  - A click on the photo (mouse) zooms in on that spot, and the next click goes back to the whole photo. With a finger it is a double tap
//    (a single tap must not zoom by accident). The cursor says which: a magnifier (+) on the photo, (-) when zoomed, an arrow elsewhere.
//  - Drag (mouse or one finger) to move a zoomed photo; it keeps gliding a little after the release. It cannot be moved off the screen.
//  - "+" "-" "0" and the buttons at the bottom; with the photo zoomed the arrow keys move it (otherwise they change the photo).
//  - A click on the dark ground around the photo (not zoomed) closes the viewer.
// Zooming never goes past 2 pixels of screen per pixel of the picture (beyond that there is nothing more to see), nor below the whole
// photo. Changes made with the buttons, the keys and the click glide (see GLIDE); wheel, pinch and drag follow the hand at once.
// Everything is the photo's box moved with a CSS transform: the browser draws the 1920px picture at the zoomed size, so it stays sharp.
// Reduced motion: no gliding.

const GLIDE = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
const STEP = 1.6; // one press of "+" or "-"
const KEY_PAN = 90; // px, one press of an arrow key while zoomed
const TAP_MS = 300; // a second tap within this is a double tap
const TAP_PX = 28;

interface View {
  x: number; // where the photo's box starts, in px from the area's top left
  y: number;
  z: number; // 1 = the whole photo
}

export default function ZoomStage({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 }); // the picture's own size (known once it has loaded)
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const [glide, setGlide] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [overPhoto, setOverPhoto] = useState(false); // the mouse is on the photo itself (not on the dark ground around it)
  const viewRef = useRef(view); // the latest view, for event handlers
  useEffect(() => {
    viewRef.current = view;
  });

  // What the box, the picture and the limits are, from the area's size and the picture's shape.
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const fit = natural.w ? Math.min(size.w / natural.w, size.h / natural.h) : 1; // screen px per picture px when the whole photo is shown
  const shown = natural.w ? { w: natural.w * fit, h: natural.h * fit } : { w: size.w, h: size.h }; // the photo as drawn, whole
  const maxZ = Math.min(8, Math.max(2, 2 / dpr / fit));

  // Keeps the photo on screen: smaller than the area on one side, it is centred on that side; bigger, it cannot leave a gap.
  const limit = useCallback(
    (v: View): View => {
      const z = Math.min(maxZ, Math.max(1, v.z));
      const axis = (t: number, area: number, photo: number) => {
        if (photo * z <= area) return (area - z * area) / 2;
        return Math.min(-(z * (area - photo)) / 2, Math.max(area - (z * (area + photo)) / 2, t));
      };
      return { z, x: axis(v.x, size.w, shown.w), y: axis(v.y, size.h, shown.h) };
    },
    [maxZ, size.w, size.h, shown.w, shown.h],
  );

  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const move = useCallback(
    (next: View | ((v: View) => View), animate: boolean) => {
      setGlide(animate && !reducedMotion.current);
      setView((v) => limit(typeof next === "function" ? next(v) : next));
    },
    [limit],
  );
  // Zoom to `to(current zoom)`, keeping the point (cx, cy) of the area where it is.
  const zoomAt = useCallback(
    (to: (z: number) => number, cx: number, cy: number, animate: boolean) => {
      move((v) => {
        const z = Math.min(maxZ, Math.max(1, to(v.z)));
        const k = z / v.z;
        return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      }, animate);
    },
    [maxZ, move],
  );
  const centre = useCallback(() => ({ x: size.w / 2, y: size.h / 2 }), [size.w, size.h]);

  // The area's size, and the picture's size (the poster is smaller than the full picture but has the same shape).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const read = () => {
      for (const img of el.querySelectorAll("img")) {
        if (img.complete && img.naturalWidth > 0) setNatural((n) => (img.naturalWidth > n.w ? { w: img.naturalWidth, h: img.naturalHeight } : n));
      }
    };
    read();
    return () => observer.disconnect();
  }, []);
  const readLoaded = (e: React.SyntheticEvent) => {
    const img = e.target as HTMLElement;
    if (img instanceof HTMLImageElement && img.naturalWidth > 0) setNatural((n) => (img.naturalWidth > n.w ? { w: img.naturalWidth, h: img.naturalHeight } : n));
  };

  // Wheel and trackpad pinch (a pinch arrives as a wheel with ctrl held). Needs a listener that may cancel the page's own zoom.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const k = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0018));
      zoomAt((z) => z * k, e.clientX - r.left, e.clientY - r.top, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keys: + - 0, and the arrows to move a zoomed photo. Listens in the CAPTURE phase, so it always comes before the viewer's own key
  // listener (which would change the photo), whatever order they were registered in: when zoomed the arrows are taken here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = centre();
      const v = viewRef.current;
      if (e.key === "+" || e.key === "=") zoomAt((z) => z * STEP, c.x, c.y, true);
      else if (e.key === "-" || e.key === "_") zoomAt((z) => z / STEP, c.x, c.y, true);
      else if (e.key === "0") move({ x: 0, y: 0, z: 1 }, true);
      else if (v.z > 1 && e.key.startsWith("Arrow")) {
        const dx = e.key === "ArrowLeft" ? KEY_PAN : e.key === "ArrowRight" ? -KEY_PAN : 0;
        const dy = e.key === "ArrowUp" ? KEY_PAN : e.key === "ArrowDown" ? -KEY_PAN : 0;
        move((now) => ({ ...now, x: now.x + dx, y: now.y + dy }), true);
      } else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [centre, move, zoomAt]);

  // Fingers, mouse and the glide after a drag.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ view: View; x: number; y: number; dist: number; moved: boolean; at: number } | null>(null);
  const lastTap = useRef({ at: 0, x: 0, y: 0 });
  const samples = useRef<{ t: number; x: number; y: number }[]>([]);
  const glideFrame = useRef(0);
  const stopGlide = () => cancelAnimationFrame(glideFrame.current);

  const local = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const centreOf = () => {
    const pts = [...pointers.current.values()];
    return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
  };
  const distOf = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const begin = () => {
    const c = centreOf();
    start.current = { view: viewRef.current, x: c.x, y: c.y, dist: pointers.current.size === 2 ? distOf() : 0, moved: start.current?.moved ?? false, at: start.current?.at ?? performance.now() };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopGlide();
    area.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) start.current = null;
    begin();
    samples.current = [];
    setGlide(false);
    setDragging(true);
  };
  // Is the point (in the area's coordinates) on the photo as drawn?
  const onPhoto = (p: { x: number; y: number }, v: View) => {
    const left = v.x + (v.z * (size.w - shown.w)) / 2;
    const top = v.y + (v.z * (size.h - shown.h)) / 2;
    return p.x >= left && p.x <= left + v.z * shown.w && p.y >= top && p.y <= top + v.z * shown.h;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && !pointers.current.size) setOverPhoto(onPhoto(local(e), viewRef.current));
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, local(e));
    const c = centreOf();
    const s = start.current;
    if (Math.hypot(c.x - s.x, c.y - s.y) > 5 || pointers.current.size === 2) s.moved = true;
    if (!s.moved) return;
    const base = s.view;
    const z = pointers.current.size === 2 && s.dist > 0 ? Math.min(maxZ, Math.max(1, base.z * (distOf() / s.dist))) : base.z;
    const k = z / base.z;
    // the point that was under the fingers' start stays under the fingers
    setView(limit({ z, x: c.x - (s.x - base.x) * k, y: c.y - (s.y - base.y) * k }));
    samples.current.push({ t: performance.now(), x: c.x, y: c.y });
    if (samples.current.length > 6) samples.current.shift();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    area.current?.releasePointerCapture(e.pointerId);
    const s = start.current;
    if (pointers.current.size > 0) return begin(); // one finger of two lifted: carry on with the other from here
    setDragging(false);
    start.current = null;
    if (!s) return;
    const v = viewRef.current;

    if (!s.moved && e.type === "pointerup") {
      // A tap or a click: zoomed it goes back to the whole photo, otherwise it zooms in on the spot. A mouse needs one click, a finger two.
      const toggle = () => {
        if (v.z > 1.05) move({ x: 0, y: 0, z: 1 }, true);
        else zoomAt(() => Math.min(maxZ, Math.max(2.5, 1 / (fit * dpr))), p.x, p.y, true);
      };
      // Not zoomed: a click outside the photo (on the dark ground) closes the viewer.
      if (v.z <= 1.05 && !onPhoto(p, v)) return onClose();
      if (e.pointerType === "mouse") return toggle();
      const now = performance.now();
      const last = lastTap.current;
      if (now - last.at < TAP_MS && Math.hypot(p.x - last.x, p.y - last.y) < TAP_PX) {
        lastTap.current = { at: 0, x: 0, y: 0 };
        toggle();
      } else lastTap.current = { at: now, x: p.x, y: p.y };
      return;
    }

    // After a drag the photo keeps gliding, slower and slower.
    const pts = samples.current;
    if (v.z > 1 && pts.length >= 2 && !reducedMotion.current) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      const dt = Math.max(1, b.t - a.t);
      if (performance.now() - b.t < 80) {
        let vx = ((b.x - a.x) / dt) * 16;
        let vy = ((b.y - a.y) / dt) * 16;
        const step = () => {
          vx *= 0.94;
          vy *= 0.94;
          if (Math.hypot(vx, vy) < 0.3) return;
          setView((now) => limit({ ...now, x: now.x + vx, y: now.y + vy }));
          glideFrame.current = requestAnimationFrame(step);
        };
        glideFrame.current = requestAnimationFrame(step);
      }
    }
  };
  useEffect(() => stopGlide, []);

  // A new size (the window was resized) keeps the photo where it can be: the limits are applied when it is drawn, too.
  const shownView = limit(view);
  const zoomed = shownView.z > 1.05;
  const cursor = dragging && zoomed ? "grabbing" : zoomed ? "zoom-out" : overPhoto ? "zoom-in" : "default";
  const percent = Math.round(fit * shownView.z * 100);
  const control = "flex h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-white hover:bg-white/15 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <>
      <div
        ref={area}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLoadCapture={readLoaded}
        // The browser starts dragging the PICTURE (a ghost copy of it) when the mouse is pulled over an image, which cancels the pointer
        // (pointercancel) and ends our drag after its first move: that has to be refused here.
        onDragStart={(e) => e.preventDefault()}
        // touch-action none: the browser must not scroll or zoom the page itself, the fingers are ours.
        style={{ touchAction: "none", cursor }}
        className="absolute inset-0 overflow-hidden select-none"
      >
        <div
          style={{
            transform: `translate(${shownView.x}px, ${shownView.y}px) scale(${shownView.z})`,
            transformOrigin: "0 0",
            transition: glide ? GLIDE : "none",
          }}
          className="size-full"
        >
          {children}
        </div>
      </div>

      {/* Not part of the zoomed area: its own clicks never reach it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center bg-black/55 md:bottom-5"
      >
        <button type="button" onClick={() => zoomAt((z) => z / STEP, centre().x, centre().y, true)} disabled={shownView.z <= 1.001} aria-label="Zoom out" className={control}>
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 8h10" />
          </svg>
        </button>
        <button type="button" onClick={() => move({ x: 0, y: 0, z: 1 }, true)} disabled={!zoomed} aria-label="Show the whole photo" className={`${control} w-16 text-[13px] tabular-nums`}>
          {percent}%
        </button>
        <button type="button" onClick={() => zoomAt((z) => z * STEP, centre().x, centre().y, true)} disabled={shownView.z >= maxZ - 0.001} aria-label="Zoom in" className={control}>
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 8h10M8 3v10" />
          </svg>
        </button>
      </div>
    </>
  );
}
