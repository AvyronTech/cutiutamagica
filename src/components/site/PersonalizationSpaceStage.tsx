import { ImagePlus, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PersonalizationBoxColor, PersonalizationBoxModel } from "@/lib/personalization";

type Props = {
  boxColor: PersonalizationBoxColor;
  boxModel: PersonalizationBoxModel;
  preview: string;
  engraving: string;
  giftWrap: boolean;
};

function playInterfaceChime() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.8);
  gain.connect(audio.destination);
  [392, 523.25, 659.25].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(audio.currentTime + index * 0.12);
    oscillator.stop(audio.currentTime + 0.75 + index * 0.12);
  });
  window.setTimeout(() => void audio.close(), 1_200);
}

export function PersonalizationSpaceStage({
  boxColor,
  boxModel,
  preview,
  engraving,
  giftWrap,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = stageRef.current;
    if (!canvas || !host) return;
    let disposed = false;
    let frame = 0;
    let renderer: import("three").WebGLRenderer | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const start = async () => {
      const THREE = await import("three");
      if (disposed) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 30);
      camera.position.z = 5.8;

      const stars = new Float32Array(210 * 3);
      for (let index = 0; index < stars.length; index += 3) {
        const radius = 2.2 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        stars[index] = Math.cos(angle) * radius;
        stars[index + 1] = (Math.random() - 0.5) * 6;
        stars[index + 2] = Math.sin(angle) * radius - 1.5;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
      const particles = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: 0xe8c382,
          size: 0.025,
          transparent: true,
          opacity: 0.72,
        }),
      );
      scene.add(particles);

      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(1.7, 0.008, 8, 120),
        new THREE.MeshBasicMaterial({ color: 0xb68bff, transparent: true, opacity: 0.28 }),
      );
      orbit.rotation.x = 1.18;
      orbit.rotation.z = -0.28;
      scene.add(orbit);

      const resize = () => {
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        renderer?.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      const render = (time = 0) => {
        if (disposed || !renderer) return;
        if (!reduced) {
          particles.rotation.y = time * 0.000025;
          orbit.rotation.z = -0.28 + Math.sin(time * 0.00045) * 0.05;
        }
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      renderer?.dispose();
    };
  }, []);

  const tilt = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--stage-tilt-x", `${(-y * 5).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--stage-tilt-y", `${(x * 7).toFixed(2)}deg`);
  };

  return (
    <div
      ref={stageRef}
      className="personalization-product-stage personalization-product-stage--space"
      data-color={boxColor}
      data-model={boxModel}
      data-gift-wrap={giftWrap || undefined}
      onPointerMove={tilt}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--stage-tilt-x", "0deg");
        event.currentTarget.style.setProperty("--stage-tilt-y", "0deg");
      }}
    >
      <canvas ref={canvasRef} className="personalization-space-canvas" aria-hidden />
      <div className="personalization-space-hud" aria-hidden>
        <span>CM / ATELIER</span>
        <i />
        <span>LIVE PREVIEW</span>
      </div>
      <div className="personalization-product-render">
        <img
          src="/scenes/personalization-box-v2.webp"
          alt="Cutiuță muzicală personalizabilă din lemn"
          width={1000}
          height={833}
          decoding="async"
        />
        <div className="personalization-product-artwork" data-empty={!preview || undefined}>
          {preview ? <img src={preview} alt="Imaginea aleasă pentru capac" /> : <ImagePlus />}
          {engraving.trim() && <span>{engraving.trim()}</span>}
        </div>
      </div>
      <div className="personalization-product-wrap" aria-hidden>
        <span />
        <i />
        <b>✦</b>
      </div>
      <button
        type="button"
        className="personalization-sound-toggle"
        aria-pressed={soundEnabled}
        onClick={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          if (next) playInterfaceChime();
        }}
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
        <span>{soundEnabled ? "Sunet activ" : "Sunet ambiental"}</span>
      </button>
    </div>
  );
}
