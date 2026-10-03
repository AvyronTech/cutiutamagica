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
    facts: ["corp din lemn", "îmbinări vizibile", "interior protejat"],
  },
  {
    title: "O melodie ascunsă înăuntru.",
    detail:
      "Pinii cilindrului ating lamelele pieptenelui metalic. Vibrația lor transformă mișcarea într-o melodie familiară.",
    label: "Mecanismul",
    facts: ["cilindru cu pini", "pieptene metalic", "angrenaj manual"],
  },
  {
    title: "O poveste pe capac.",
    detail:
      "Capacul se așază pe balamale și se deschide spre tine. Gravura și ilustrația dau fiecărui model propria poveste.",
    label: "Capacul",
    facts: ["balamale metalice", "placă ilustrată", "ramă din lemn"],
  },
  {
    title: "Tu îi dai prima notă.",
    detail:
      "Ultima piesă își găsește locul. Apasă manivela și privește cum prinde viață mecanismul. Un gest mic, o lume întreagă.",
    label: "Manivela",
    facts: ["ax metalic", "mâner rotativ", "ritm controlat de tine"],
  },
  {
    title: "Micuță. Memorabilă. A ta.",
    detail:
      "Lemnul, capacul, mecanismul: fiecare detaliu are locul lui. Acum povestea poate ajunge în colecția ta sau în mâinile cuiva drag.",
    label: "Emoția",
    facts: ["fără baterii", "sunet mecanic", "cadou cu poveste"],
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
        const [T, roundedGeometryModule] = await Promise.all([
          import("three"),
          import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
        ]);
        const { RoundedBoxGeometry } = roundedGeometryModule;
        if (disposed || !holder || !section) return;
        const renderer = new T.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x17120f, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = innerWidth > 780;
        renderer.shadowMap.type = T.PCFShadowMap;
        holder.appendChild(renderer.domElement);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(11.5, 8.4, 13.8);
        camera.lookAt(0, 0, 0);
        scene.add(new T.HemisphereLight(0xffe9c5, 0x211a18, 2.15));
        const key = new T.DirectionalLight(0xffcc87, 4.8);
        key.position.set(-6, 9, 7);
        key.castShadow = renderer.shadowMap.enabled;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 30;
        key.shadow.camera.left = -8;
        key.shadow.camera.right = 8;
        key.shadow.camera.top = 8;
        key.shadow.camera.bottom = -8;
        scene.add(key);
        const rim = new T.DirectionalLight(0x9bc3da, 2.8);
        rim.position.set(5, 4, -6);
        scene.add(rim);
        const warmFill = new T.PointLight(0xe09a49, 12, 16, 2);
        warmFill.position.set(-4, 1, 5);
        scene.add(warmFill);
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
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        textures.push(texture);
        const wood = new T.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.54,
          color: 0xbda484,
          clearcoat: 0.18,
          clearcoatRoughness: 0.62,
        });
        const darkWood = new T.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.62,
          color: 0x674127,
          clearcoat: 0.12,
          clearcoatRoughness: 0.72,
        });
        const brass = new T.MeshPhysicalMaterial({
          color: 0xc09a58,
          metalness: 0.84,
          roughness: 0.25,
          clearcoat: 0.22,
        });
        const steel = new T.MeshStandardMaterial({
          color: 0xc7c6b1,
          metalness: 0.85,
          roughness: 0.26,
        });
        const shadow = new T.MeshStandardMaterial({ color: 0x20170f, roughness: 0.8 });
        const felt = new T.MeshStandardMaterial({ color: 0x281f19, roughness: 0.96 });
        const model = new T.Group();
        scene.add(model);
        const parts: {
          group: import("three").Group;
          from: import("three").Vector3;
          to: import("three").Vector3;
          rotation: import("three").Vector3;
          at: number;
        }[] = [];
        function part(at: number, from: number[], to: number[], rotation = [0, 0, 0]) {
          const group = new T.Group();
          model.add(group);
          parts.push({
            group,
            from: new T.Vector3(...from),
            to: new T.Vector3(...to),
            rotation: new T.Vector3(...rotation),
            at,
          });
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
          radius = 0.055,
        ) {
          const safeRadius = Math.min(radius, w / 4, h / 4, d / 4);
          const mesh = new T.Mesh(
            safeRadius > 0.015
              ? new RoundedBoxGeometry(w, h, d, 2, safeRadius)
              : new T.BoxGeometry(w, h, d),
            mat,
          );
          mesh.position.set(x, y, z);
          mesh.castShadow = renderer.shadowMap.enabled;
          mesh.receiveShadow = renderer.shadowMap.enabled;
          group.add(mesh);
          return mesh;
        }
        const body = part(0, [0, -4, 0], [0, 0, 0], [-0.08, 0.12, -0.04]);
        block(body, 6.4, 0.28, 4.8, 0, -1.65, 0);
        block(body, 6.4, 2.8, 0.25, 0, -0.15, 2.27);
        block(body, 6.4, 2.8, 0.25, 0, -0.15, -2.27);
        block(body, 0.25, 2.8, 4.55, -3.07, -0.15, 0);
        block(body, 0.25, 2.8, 4.55, 3.07, -0.15, 0);
        block(body, 5.82, 0.075, 4.12, 0, -1.46, 0, felt, 0.025);
        // Inner ledge, feet and visible corner joinery keep the proportions close to the real boxes.
        block(body, 5.98, 0.1, 0.13, 0, 1.14, 2.05, darkWood, 0.025);
        block(body, 5.98, 0.1, 0.13, 0, 1.14, -2.05, darkWood, 0.025);
        block(body, 0.13, 0.1, 4.0, -2.91, 1.14, 0, darkWood, 0.025);
        block(body, 0.13, 0.1, 4.0, 2.91, 1.14, 0, darkWood, 0.025);
        for (const x of [-2.62, 2.62])
          for (const z of [-1.85, 1.85]) {
            const foot = new T.Mesh(new T.CylinderGeometry(0.2, 0.23, 0.18, 18), darkWood);
            foot.position.set(x, -1.82, z);
            foot.castShadow = renderer.shadowMap.enabled;
            body.add(foot);
          }
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
        const latch = block(body, 0.72, 0.5, 0.16, 0, -0.2, 2.47, brass, 0.05);
        latch.rotation.x = 0.03;
        block(body, 0.32, 0.16, 0.08, 0, 0.05, 2.57, shadow, 0.025);

        const mechanism = part(0.2, [0, 6, 0], [0, -0.75, 0], [0.12, -0.18, 0.07]);
        block(mechanism, 4.65, 0.16, 2.9, 0, 0, 0, steel, 0.04);
        block(mechanism, 4.25, 0.065, 2.5, 0, 0.115, 0, shadow, 0.02);
        const cylinder = new T.Mesh(new T.CylinderGeometry(0.43, 0.43, 3.8, 32), brass);
        cylinder.rotation.z = Math.PI / 2;
        cylinder.position.set(0, 0.62, -0.45);
        cylinder.castShadow = renderer.shadowMap.enabled;
        mechanism.add(cylinder);
        for (let i = 0; i < 18; i++) {
          const tineLength = 1.18 + Math.sin((i / 17) * Math.PI) * 0.34;
          const tine = block(
            mechanism,
            0.12,
            0.045,
            tineLength,
            -1.75 + i * 0.205,
            0.28,
            0.73 + (1.5 - tineLength) / 2,
            steel,
            0.012,
          );
          tine.rotation.x = -0.1;
        }
        block(mechanism, 4.12, 0.12, 0.22, 0, 0.31, 0.02, brass, 0.035);
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

        function addGear(x: number, z: number, radius: number, teeth: number) {
          const gear = new T.Group();
          gear.position.set(x, 0.56, z);
          const ring = new T.Mesh(new T.TorusGeometry(radius, 0.075, 8, 28), brass);
          ring.rotation.x = Math.PI / 2;
          ring.castShadow = renderer.shadowMap.enabled;
          gear.add(ring);
          for (let i = 0; i < teeth; i++) {
            const tooth = block(
              gear,
              0.14,
              0.12,
              0.22,
              Math.cos((i / teeth) * Math.PI * 2) * radius,
              0,
              Math.sin((i / teeth) * Math.PI * 2) * radius,
              brass,
              0.018,
            );
            tooth.rotation.y = -(i / teeth) * Math.PI * 2;
          }
          for (let i = 0; i < 4; i++) {
            const spoke = block(gear, radius * 1.55, 0.055, 0.075, 0, 0, 0, brass, 0.015);
            spoke.rotation.y = (i / 4) * Math.PI;
          }
          const hub = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.16, 14), steel);
          hub.position.y = 0.02;
          gear.add(hub);
          mechanism.add(gear);
          return gear;
        }
        const driveGear = addGear(1.72, -0.78, 0.48, 12);
        const transferGear = addGear(2.28, -0.18, 0.3, 9);

        const lid = part(0.4, [0, 6, -4], [0, 1.28, -2.27], [-0.16, 0.1, 0.05]);
        const lidPivot = new T.Group();
        lid.add(lidPivot);
        block(lidPivot, 6.4, 0.25, 4.8, 0, 0, 2.27);
        block(lidPivot, 5.82, 0.055, 4.2, 0, -0.145, 2.27, darkWood, 0.018);
        block(lidPivot, 5.38, 0.025, 3.76, 0, -0.182, 2.27, felt, 0.012);
        const badge = block(lidPivot, 3.85, 0.045, 2.46, 0, -0.205, 2.27, wood, 0.045);
        badge.rotation.y = 0.02;
        for (const x of [-1.85, 1.85]) {
          block(lidPivot, 0.62, 0.15, 0.44, x, 0.04, 0, brass, 0.035);
          const hingePin = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.82, 16), steel);
          hingePin.rotation.z = Math.PI / 2;
          hingePin.position.set(x, 0.1, 0);
          lidPivot.add(hingePin);
        }

        const artCanvas = document.createElement("canvas");
        artCanvas.width = 640;
        artCanvas.height = 400;
        const art = artCanvas.getContext("2d")!;
        const artGradient = art.createRadialGradient(320, 180, 30, 320, 200, 360);
        artGradient.addColorStop(0, "#27494b");
        artGradient.addColorStop(0.52, "#172f35");
        artGradient.addColorStop(1, "#101d24");
        art.fillStyle = artGradient;
        art.fillRect(0, 0, 640, 400);
        art.strokeStyle = "rgba(238,197,123,.76)";
        art.lineWidth = 4;
        art.beginPath();
        art.arc(320, 202, 106, 0, Math.PI * 2);
        art.stroke();
        art.lineWidth = 2;
        for (let i = 0; i < 28; i++) {
          const a = i * 2.399;
          const r = 58 + (i % 6) * 34;
          const x = 320 + Math.cos(a) * r;
          const y = 198 + Math.sin(a) * r * 0.58;
          art.fillStyle = i % 4 === 0 ? "#f5d28a" : "rgba(246,229,194,.64)";
          art.beginPath();
          art.arc(x, y, i % 4 === 0 ? 3.2 : 1.8, 0, Math.PI * 2);
          art.fill();
        }
        art.fillStyle = "#f3d59e";
        art.font = "600 29px serif";
        art.textAlign = "center";
        art.fillText("CUTIUȚA MAGICĂ", 320, 212);
        art.font = "italic 18px serif";
        art.fillStyle = "rgba(246,229,194,.82)";
        art.fillText("o poveste în fiecare notă", 320, 244);
        const artTexture = new T.CanvasTexture(artCanvas);
        artTexture.colorSpace = T.SRGBColorSpace;
        artTexture.anisotropy = texture.anisotropy;
        textures.push(artTexture);
        const artPlate = new T.Mesh(
          new T.PlaneGeometry(3.58, 2.18),
          new T.MeshPhysicalMaterial({
            map: artTexture,
            roughness: 0.36,
            clearcoat: 0.32,
            clearcoatRoughness: 0.42,
            side: T.DoubleSide,
          }),
        );
        artPlate.rotation.x = -Math.PI / 2;
        artPlate.position.set(0, -0.237, 2.27);
        lidPivot.add(artPlate);

        const crank = part(0.6, [7, 0, 0], [3.28, 0, -0.45], [0, 0.45, -0.2]);
        const axle = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.75, 14), steel);
        axle.rotation.z = Math.PI / 2;
        axle.position.x = 0.25;
        crank.add(axle);
        const crankPivot = new T.Group();
        crankPivot.position.x = 0.6;
        crank.add(crankPivot);
        block(crankPivot, 0.13, 0.8, 0.13, 0, 0.35, 0, steel);
        const grip = new T.Mesh(new T.CylinderGeometry(0.17, 0.19, 0.58, 18), darkWood);
        grip.rotation.z = Math.PI / 2;
        grip.position.set(0.22, 0.72, 0);
        grip.castShadow = renderer.shadowMap.enabled;
        crankPivot.add(grip);

        const floor = new T.Mesh(
          new T.CircleGeometry(7.6, 64),
          new T.ShadowMaterial({ color: 0x050403, opacity: 0.32 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.04;
        floor.receiveShadow = renderer.shadowMap.enabled;
        scene.add(floor);

        const dustPositions = new Float32Array(72 * 3);
        for (let i = 0; i < 72; i++) {
          dustPositions[i * 3] = (Math.random() - 0.5) * 12;
          dustPositions[i * 3 + 1] = Math.random() * 8 - 2;
          dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
        const dustGeometry = new T.BufferGeometry();
        dustGeometry.setAttribute("position", new T.BufferAttribute(dustPositions, 3));
        const dust = new T.Points(
          dustGeometry,
          new T.PointsMaterial({
            color: 0xf3c97e,
            size: 0.035,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          }),
        );
        scene.add(dust);
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
          wasAssembled = false,
          pointerX = 0,
          pointerY = 0,
          currentPointerX = 0,
          currentPointerY = 0;
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
            item.group.rotation.set(
              item.rotation.x * (1 - eased),
              item.rotation.y * (1 - eased),
              item.rotation.z * (1 - eased),
            );
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
          driveGear.rotation.y = angle * 0.9;
          transferGear.rotation.y = -angle * 1.35;
          currentPointerX += (pointerX - currentPointerX) * 0.07;
          currentPointerY += (pointerY - currentPointerY) * 0.07;
          model.rotation.y = -0.15 + p * 0.38 + currentPointerX * 0.12;
          model.rotation.x = currentPointerY * 0.045;
          model.position.y = Math.sin(time * 0.0005) * 0.025 * p;
          dust.rotation.y = time * 0.000018;
          dust.position.y = Math.sin(time * 0.00023) * 0.08;
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
            camera.updateProjectionMatrix();
          }
          const compact = w < 500;
          camera.position.set(
            (compact ? 14 : 11.4) - p * (compact ? 0.25 : 0.8) + currentPointerX * 0.22,
            (compact ? 9.6 : 8.7) - p * 0.42 - currentPointerY * 0.18,
            (compact ? 18 : 13.7) - p * (compact ? 0.5 : 1.15),
          );
          camera.lookAt(0, 0.25 + p * 0.34, 0);
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
        const point = (event: PointerEvent) => {
          const bounds = holder!.getBoundingClientRect();
          pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width - 0.5));
          pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height - 0.5));
          request();
        };
        const resetPoint = () => {
          pointerX = 0;
          pointerY = 0;
          request();
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
        holder.addEventListener("pointermove", point, { passive: true });
        holder.addEventListener("pointerleave", resetPoint);
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
          holder.removeEventListener("pointermove", point);
          holder.removeEventListener("pointerleave", resetPoint);
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
          <div className="assembly-stage-grid" aria-hidden />
          <div className="assembly-stage-index" aria-hidden>
            <span>{String(stage + 1).padStart(2, "0")}</span>
            <i />
            <small>{steps[stage].label}</small>
          </div>
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
          <div className="assembly-facts" aria-label={`Detalii: ${steps[stage].label}`}>
            {steps[stage].facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
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
