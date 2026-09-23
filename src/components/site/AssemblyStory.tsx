import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Pause, Play, RotateCw, Loader2 } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useStoryPlayback } from "./useStoryPlayback";

const steps = [
  {
    title: "Un loc pentru amintiri.",
    detail:
      "Baza și pereții din lemn formează o lume mică. Muchii, textură, îmbinări: detaliile pe care le simți înainte de prima notă.",
    label: "Lemnul",
  },
  {
    title: "O melodie ascunsă înăuntru.",
    detail:
      "Pinii cilindrului ating lamelele pieptenelui metalic. Vibrația lor transformă mișcarea într-o melodie familiară.",
    label: "Mecanismul",
  },
  {
    title: "O poveste pe capac.",
    detail:
      "Capacul se așază pe balamale și se deschide spre tine. Gravura și ilustrația dau fiecărui model propria poveste.",
    label: "Capacul",
  },
  {
    title: "Tu îi dai prima notă.",
    detail:
      "Ultima piesă își găsește locul. Apasă manivela și privește cum prinde viață mecanismul. Un gest mic, o lume întreagă.",
    label: "Manivela",
  },
  {
    title: "Micuță. Memorabilă. A ta.",
    detail:
      "Lemnul, capacul, mecanismul: fiecare detaliu are locul lui. Acum povestea poate ajunge în colecția ta sau în mâinile cuiva drag.",
    label: "Emoția",
  },
];

export default function AssemblyStory() {
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const hotspot = useRef<HTMLButtonElement>(null);
  const playback = useStoryPlayback();
  const { moving, wake, stop, visibleStage } = playback;
  const [assembled, setAssembled] = useState(false);
  const [stage, setStage] = useState(0),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (stage < 3) stop();
  }, [stage, stop]);
  useEffect(() => {
    const holder = canvas.current,
      section = root.current;
    if (!holder || !section || reduced || failed) return;
    let disposed = false,
      cleanup: (() => void) | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(section);
    async function start() {
      try {
        const T = await import("three");
        if (disposed || !holder || !section) return;
        const renderer = new T.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x17120f, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        holder.appendChild(renderer.domElement);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(11, 8, 13);
        camera.lookAt(0, 0, 0);
        scene.add(new T.HemisphereLight(0xffe9c5, 0x302622, 2.6));
        const key = new T.DirectionalLight(0xffcc87, 4.5);
        key.position.set(-6, 9, 7);
        scene.add(key);
        const rim = new T.DirectionalLight(0x9bc3da, 2.8);
        rim.position.set(5, 4, -6);
        scene.add(rim);
        const textures: import("three").Texture[] = [];
        const woodCanvas = document.createElement("canvas");
        woodCanvas.width = 512;
        woodCanvas.height = 512;
        const ctx = woodCanvas.getContext("2d")!;
        ctx.fillStyle = "#53341f";
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 210; i++) {
          const y = i * 2.45;
          ctx.strokeStyle = `rgba(${i % 3 === 0 ? "215,167,103" : "22,12,7"},${0.07 + (i % 7) * 0.013})`;
          ctx.lineWidth = 0.6 + (i % 4) * 0.4;
          ctx.beginPath();
          for (let x = 0; x <= 512; x += 8) {
            const yy = y + Math.sin(x * 0.021 + i) * 2.2 + Math.sin(x * 0.05 + i * 0.31) * 0.7;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        const texture = new T.CanvasTexture(woodCanvas);
        texture.colorSpace = T.SRGBColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        textures.push(texture);
        const wood = new T.MeshStandardMaterial({ map: texture, roughness: 0.57, color: 0xbda484 });
        const darkWood = new T.MeshStandardMaterial({
          map: texture,
          roughness: 0.6,
          color: 0x674127,
        });
        const brass = new T.MeshStandardMaterial({
          color: 0xc09a58,
          metalness: 0.78,
          roughness: 0.28,
        });
        const steel = new T.MeshStandardMaterial({
          color: 0xc7c6b1,
          metalness: 0.85,
          roughness: 0.26,
        });
        const shadow = new T.MeshStandardMaterial({ color: 0x20170f, roughness: 0.8 });
        const model = new T.Group();
        scene.add(model);
        const parts: {
          group: import("three").Group;
          from: import("three").Vector3;
          to: import("three").Vector3;
          at: number;
        }[] = [];
        function part(at: number, from: number[], to: number[]) {
          const group = new T.Group();
          model.add(group);
          parts.push({ group, from: new T.Vector3(...from), to: new T.Vector3(...to), at });
          return group;
        }
        function block(
          group: import("three").Group,
          w: number,
          h: number,
          d: number,
          x: number,
          y: number,
          z: number,
          mat: import("three").Material = wood,
        ) {
          const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
          mesh.position.set(x, y, z);
          group.add(mesh);
          return mesh;
        }
        const body = part(0, [0, -4, 0], [0, 0, 0]);
        block(body, 6.4, 0.28, 4.8, 0, -1.65, 0);
        block(body, 6.4, 2.8, 0.25, 0, -0.15, 2.27);
        block(body, 6.4, 2.8, 0.25, 0, -0.15, -2.27);
        block(body, 0.25, 2.8, 4.55, -3.07, -0.15, 0);
        block(body, 0.25, 2.8, 4.55, 3.07, -0.15, 0);
        block(body, 5.8, 0.06, 4.1, 0, -1.46, 0, shadow);
        for (const side of [-1, 1])
          for (let y = 0; y < 5; y++)
            block(body, 0.3, 0.24, 0.025, side * 2.8, -1.25 + y * 0.52, 2.411, darkWood);
        // A restrained engraved diamond makes the schematic independent of licensed artwork.
        const ornament = new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(-1.6, -0.2, 2.411),
            new T.Vector3(0, 0.8, 2.411),
            new T.Vector3(1.6, -0.2, 2.411),
            new T.Vector3(0, -1.15, 2.411),
            new T.Vector3(-1.6, -0.2, 2.411),
          ]),
          new T.LineBasicMaterial({ color: 0xd4ac6d }),
        );
        body.add(ornament);
        const mechanism = part(0.2, [0, 6, 0], [0, -0.75, 0]);
        block(mechanism, 4.65, 0.16, 2.9, 0, 0, 0, steel);
        const cylinder = new T.Mesh(new T.CylinderGeometry(0.43, 0.43, 3.8, 32), brass);
        cylinder.rotation.z = Math.PI / 2;
        cylinder.position.set(0, 0.62, -0.45);
        mechanism.add(cylinder);
        for (let i = 0; i < 18; i++) {
          const tine = block(mechanism, 0.13, 0.055, 1.42, -1.75 + i * 0.205, 0.28, 0.78, steel);
          tine.rotation.x = -0.1;
        }
        for (let i = 0; i < 42; i++) {
          const pin = new T.Mesh(new T.SphereGeometry(0.036, 5, 4), steel);
          const a = i * 2.399;
          pin.position.set(Math.sin(a) * 0.448, -1.72 + (i % 18) * 0.2, Math.cos(a) * 0.448);
          cylinder.add(pin);
        }
        for (const x of [-2.15, 2.15])
          for (const z of [-1.2, 1.2]) {
            const screw = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.09, 12), brass);
            screw.position.set(x, 0.14, z);
            mechanism.add(screw);
          }
        const lid = part(0.4, [0, 6, -4], [0, 1.28, -2.27]);
        const lidPivot = new T.Group();
        lid.add(lidPivot);
        block(lidPivot, 6.4, 0.25, 4.8, 0, 0, 2.27);
        block(lidPivot, 5.7, 0.025, 4.1, 0, -0.14, 2.27, darkWood);
        const badge = block(lidPivot, 3.7, 0.035, 2.3, 0, -0.165, 2.27, wood);
        badge.rotation.y = 0.02;
        for (const x of [-1.85, 1.85]) block(lidPivot, 0.6, 0.16, 0.45, x, 0.04, 0, brass);
        const crank = part(0.6, [7, 0, 0], [3.28, 0, -0.45]);
        const axle = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.75, 14), steel);
        axle.rotation.z = Math.PI / 2;
        axle.position.x = 0.25;
        crank.add(axle);
        const crankPivot = new T.Group();
        crankPivot.position.x = 0.6;
        crank.add(crankPivot);
        block(crankPivot, 0.13, 0.8, 0.13, 0, 0.35, 0, steel);
        const grip = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.55, 16), brass);
        grip.rotation.z = Math.PI / 2;
        grip.position.set(0.22, 0.72, 0);
        crankPivot.add(grip);
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(-7, -3, 3),
          new T.Vector3(-4, -2, 2),
          new T.Vector3(0, -2.3, 3.6),
          new T.Vector3(4, -1.4, 2.5),
          new T.Vector3(3, 0.4, -3.3),
          new T.Vector3(-3, 2, -3),
          new T.Vector3(-4, 3.5, 0),
          new T.Vector3(0, 4.8, 1),
          new T.Vector3(4.7, 2.8, 1.5),
          new T.Vector3(5, 0.4, 1.5),
          new T.Vector3(2, -0.3, 4),
          new T.Vector3(-2, -0.6, 4.7),
        ]);
        const thread = new T.Mesh(
          new T.TubeGeometry(curve, 240, 0.014, 5, false),
          new T.MeshBasicMaterial({ color: 0xffd492 }),
        );
        scene.add(thread);
        const spark = new T.Mesh(
          new T.SphereGeometry(0.05, 10, 8),
          new T.MeshBasicMaterial({ color: 0xffe2a6 }),
        );
        scene.add(spark);
        let raf = 0,
          last = -1,
          inView = true;
        let lastFrame = 0,
          angle = 0,
          wasAssembled = false;
        const crankPosition = new T.Vector3();
        function render(time: number) {
          raf = 0;
          if (disposed || !inView || document.hidden) return;
          if (moving.current && time - lastFrame < 1000 / 30) {
            raf = requestAnimationFrame(render);
            return;
          }
          const elapsed = Math.min(0.08, Math.max(0, (time - lastFrame) / 1000));
          lastFrame = time;
          const rect = section!.getBoundingClientRect();
          const p = Math.max(
            0,
            Math.min(1, -rect.top / Math.max(1, section!.offsetHeight - innerHeight)),
          );
          const next = Math.min(4, Math.floor(p * 5));
          if (next !== last) {
            last = next;
            setStage(next);
          }
          for (const item of parts) {
            const t = Math.max(0, Math.min(1, (p - item.at) / 0.17));
            const eased = t * t * (3 - 2 * t);
            item.group.position.lerpVectors(item.from, item.to, eased);
            item.group.visible = p >= item.at - 0.025;
          }
          lidPivot.rotation.x = -Math.min(1, Math.max(0, (p - 0.48) / 0.22)) * 1.85;
          const complete = p >= 0.77;
          if (complete !== wasAssembled) {
            wasAssembled = complete;
            setAssembled(complete);
            if (!complete) stop();
          }
          if (complete && moving.current) angle += elapsed * Math.PI * 0.7;
          crankPivot.rotation.x = angle;
          cylinder.rotation.y = -angle;
          model.rotation.y = -0.15 + p * 0.38;
          thread.geometry.setDrawRange(
            0,
            Math.floor(((thread.geometry.index?.count ?? 0) * p) / 3) * 3,
          );
          spark.position.copy(curve.getPoint(p));
          const w = holder!.clientWidth,
            h = holder!.clientHeight;
          if (
            renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) ||
            renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())
          ) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.position.set(w < 500 ? 14 : 11, 9, w < 500 ? 18 : 13);
            camera.lookAt(0, 0.5, 0);
            camera.updateProjectionMatrix();
          }
          renderer.render(scene, camera);
          if (hotspot.current) {
            grip.getWorldPosition(crankPosition).project(camera);
            hotspot.current.style.left = `${(crankPosition.x * 0.5 + 0.5) * w}px`;
            hotspot.current.style.top = `${(-crankPosition.y * 0.5 + 0.5) * h}px`;
            hotspot.current.style.visibility = complete ? "visible" : "hidden";
          }
          if (moving.current && complete && !raf) raf = requestAnimationFrame(render);
        }
        const request = () => {
          if (!raf) raf = requestAnimationFrame(render);
        };
        wake.current = request;
        const ro = new ResizeObserver(request);
        ro.observe(holder);
        const io = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          if (inView) request();
        });
        io.observe(holder);
        const lost = (event: Event) => {
          event.preventDefault();
          stop();
          setFailed(true);
        };
        renderer.domElement.addEventListener("webglcontextlost", lost);
        window.addEventListener("scroll", request, { passive: true });
        document.addEventListener("visibilitychange", request);
        setReady(true);
        request();
        cleanup = () => {
          cancelAnimationFrame(raf);
          wake.current = () => {};
          ro.disconnect();
          io.disconnect();
          window.removeEventListener("scroll", request);
          document.removeEventListener("visibilitychange", request);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          scene.traverse((obj) => {
            const m = obj as import("three").Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
              for (const material of Array.isArray(m.material) ? m.material : [m.material])
                material.dispose();
            }
          });
          textures.forEach((t) => t.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    }
    return () => {
      disposed = true;
      observer.disconnect();
      cleanup?.();
    };
  }, [reduced, failed, moving, wake, stop]);
  const fallback = failed || reduced;
  const interactive = fallback ? stage >= 3 : assembled;
  const active = playback.phase !== "idle";
  const action = active
    ? "Oprește manivela"
    : playback.track
      ? "Învârte și ascultă"
      : "Învârte manivela";
  return (
    <section
      ref={root}
      id="constructie"
      className={`assembly-story ${fallback ? "assembly-story--static" : ""} ${interactive ? "assembly-story--interactive" : ""}`}
      aria-label="Cum se construiește o cutiuță muzicală"
    >
      <div className="assembly-sticky">
        <div className="assembly-stage" ref={visibleStage}>
          <div
            ref={canvas}
            className="assembly-canvas"
            aria-hidden
            style={{ visibility: fallback ? "hidden" : "visible" }}
          />
          {(!ready || fallback) && <BrandMark className="assembly-fallback" />}
          {!fallback && (
            <button
              type="button"
              ref={hotspot}
              className={`assembly-crank-target ${active ? "is-playing" : ""}`}
              style={{ visibility: "hidden" }}
              onClick={playback.toggle}
              aria-label={action}
              aria-pressed={active}
              aria-describedby="assembly-hint"
              title={action}
            >
              <span className="sr-only">{action}</span>
            </button>
          )}
          <p className="assembly-caption">
            Ilustrație a mecanismului · detaliile diferă între modele
          </p>
        </div>
        <div className="assembly-copy">
          <p className="scene-eyebrow">
            {String(stage + 1).padStart(2, "0")} / 05 · {steps[stage].label}
          </p>
          <h2>{steps[stage].title}</h2>
          <p>{steps[stage].detail}</p>
          {interactive && (
            <div className="assembly-interaction">
              <p id="assembly-hint">
                {playback.track
                  ? "Apasă manivela. Ascultă povestea."
                  : "Apasă manivela. Dă viață mecanismului."}
              </p>
              <button
                type="button"
                className="assembly-play"
                onClick={playback.toggle}
                aria-pressed={active}
              >
                {playback.phase === "loading" ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : active ? (
                  <Pause size={17} />
                ) : playback.track ? (
                  <Play size={17} />
                ) : (
                  <RotateCw size={17} />
                )}
                {playback.phase === "loading" ? "Se pregătește melodia…" : action}
              </button>
              <span className="assembly-track">
                {playback.track
                  ? `${playback.track.title} · ${Math.round(playback.track.duration)} sec`
                  : "Descoperă ritmul manivelei"}
              </span>
              <span role="status" className="assembly-audio-status">
                {playback.error ||
                  (playback.phase === "playing" && playback.track
                    ? "Melodia se aude. Apasă din nou pentru oprire."
                    : "")}
              </span>
            </div>
          )}
          <div className="assembly-chapters">
            {steps.map((s, i) => (
              <button
                key={s.label}
                aria-label={`Etapa ${i + 1}: ${s.label}`}
                aria-current={i === stage ? "step" : undefined}
                onClick={() => {
                  if (fallback) setStage(i);
                  else if (root.current)
                    window.scrollTo({
                      top:
                        scrollY +
                        root.current.getBoundingClientRect().top +
                        (root.current.offsetHeight - innerHeight) * ((i + 0.82) / 5),
                      behavior: reduced ? "instant" : "smooth",
                    });
                }}
              >
                <span />
              </button>
            ))}
          </div>
          {stage === 4 && (
            <Link to="/produse" className="magic-button">
              Alege-ți cutiuța
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
      <audio
        ref={playback.audio}
        src={playback.track?.url}
        preload="none"
        onPlaying={playback.playing}
        onWaiting={playback.waiting}
        onPause={playback.stop}
        onEnded={playback.stop}
        onError={playback.failed}
      />
    </section>
  );
}
