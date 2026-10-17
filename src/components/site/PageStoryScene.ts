import { gsap } from "gsap";
import * as THREE from "three";
import type { PageStoryScene } from "@/lib/page-loading";

type MountedPageStoryScene = { dispose(): void };

/**
 * A tiny, texture-free scene rendered only while a route is changing.
 * It uses no permanent animation loop and releases its WebGL context on exit.
 */
export function mountPageStoryScene(
  host: HTMLDivElement,
  variant: PageStoryScene,
  accent: string,
): MountedPageStoryScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 30);
  camera.position.set(4.2, 3.25, 6.4);
  camera.lookAt(0, 0.08, 0);

  scene.add(new THREE.HemisphereLight(0xffefd2, 0x20150f, 2.7));
  const key = new THREE.DirectionalLight(0xffd89c, 4.2);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.PointLight(new THREE.Color(accent), 8.5, 12);
  rim.position.set(2.8, 1.2, -2.6);
  scene.add(rim);

  const wood = new THREE.MeshStandardMaterial({
    color: 0x794224,
    roughness: 0.58,
    metalness: 0.03,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x2d1c15,
    roughness: 0.7,
    metalness: 0.02,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accent),
    roughness: 0.27,
    metalness: 0.72,
  });
  const paper = new THREE.MeshStandardMaterial({
    color: 0xf2dec0,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });

  const world = new THREE.Group();
  const box = new THREE.Group();
  const motif = new THREE.Group();
  scene.add(world);
  world.add(box, motif);

  const block = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = box,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  block(2.35, 0.72, 1.55, 0, -0.25, 0, wood);
  block(2.1, 0.06, 1.3, 0, 0.135, 0, darkWood);
  block(1.12, 0.06, 0.62, -0.05, 0.19, 0.05, brass);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.94, 16), brass);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.position.set(-0.12, 0.27, -0.08);
  box.add(cylinder);
  for (let index = 0; index < 10; index++)
    block(0.025, 0.035, 0.34, -0.44 + index * 0.09, 0.27, 0.31, paper);

  const lid = new THREE.Group();
  lid.position.set(0, 0.1, -0.72);
  box.add(lid);
  block(2.42, 0.11, 1.62, 0, 0.04, 0.78, wood, lid);
  block(2.16, 0.026, 1.36, 0, 0.105, 0.78, brass, lid);
  const engraving = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.013, 5, 32), darkWood);
  engraving.rotation.x = Math.PI / 2;
  engraving.position.set(0, 0.13, 0.79);
  lid.add(engraving);

  const crank = new THREE.Group();
  crank.position.set(1.18, -0.12, 0.02);
  box.add(crank);
  block(0.38, 0.055, 0.055, 0.17, 0, 0, brass, crank);
  block(0.055, 0.42, 0.055, 0.33, 0.18, 0, brass, crank);
  block(0.22, 0.09, 0.09, 0.43, 0.38, 0, darkWood, crank);

  const float = (geometry: THREE.BufferGeometry, material = brass) => {
    const mesh = new THREE.Mesh(geometry, material);
    motif.add(mesh);
    return mesh;
  };

  if (variant === "catalog") {
    for (const [index, x] of [-1, 0, 1].entries()) {
      const miniature = float(new THREE.BoxGeometry(0.55, 0.38, 0.42), index === 1 ? brass : wood);
      miniature.position.set(x * 0.72, 1.04 + Math.abs(x) * 0.09, -0.18);
      miniature.rotation.y = x * -0.22;
    }
  } else if (variant === "product") {
    const halo = float(new THREE.TorusGeometry(0.68, 0.018, 6, 48));
    halo.position.set(0, 0.95, -0.22);
    halo.rotation.x = Math.PI / 2;
  } else if (variant === "checkout") {
    const ribbon = float(new THREE.BoxGeometry(0.18, 0.035, 1.48));
    ribbon.position.set(0, 0.59, 0.04);
    const seal = float(new THREE.CylinderGeometry(0.26, 0.26, 0.055, 20));
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0, 0.68, 0.78);
  } else if (variant === "personalize") {
    const frame = float(new THREE.BoxGeometry(1.12, 0.055, 0.82));
    frame.position.set(0, 1.03, 0.02);
    frame.rotation.x = -0.18;
    const image = float(new THREE.BoxGeometry(0.84, 0.04, 0.57), paper);
    image.position.copy(frame.position);
    image.position.y += 0.045;
    image.rotation.copy(frame.rotation);
  } else if (variant === "delivery") {
    const route = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, 0.78, 0),
      new THREE.Vector3(-0.35, 1.2, -0.2),
      new THREE.Vector3(0.5, 0.92, 0.15),
      new THREE.Vector3(1.35, 1.28, -0.1),
    ]);
    float(new THREE.TubeGeometry(route, 30, 0.018, 5, false));
    const parcel = float(new THREE.BoxGeometry(0.42, 0.34, 0.36), wood);
    parcel.position.set(1.35, 1.3, -0.1);
  } else if (variant === "workshop") {
    for (const [index, x] of [-0.48, 0.4].entries()) {
      const gear = float(new THREE.TorusGeometry(index ? 0.33 : 0.43, 0.075, 7, 12));
      gear.position.set(x, 0.93 + index * 0.22, -0.05);
      gear.rotation.x = Math.PI / 2;
    }
  } else if (variant === "gifts") {
    const left = float(new THREE.TorusGeometry(0.31, 0.075, 8, 24, Math.PI * 1.45));
    left.position.set(-0.28, 1.04, 0);
    left.rotation.set(Math.PI / 2, 0.25, 0.25);
    const right = left.clone();
    right.position.x = 0.28;
    right.rotation.z = -0.25;
    motif.add(right);
  } else if (variant === "account") {
    const lock = float(new THREE.TorusGeometry(0.28, 0.065, 8, 28, Math.PI));
    lock.position.set(0, 1.15, 0);
    lock.rotation.z = Math.PI;
    const keyhole = float(new THREE.ConeGeometry(0.15, 0.42, 16));
    keyhole.position.set(0, 0.76, 0);
    keyhole.rotation.x = Math.PI;
  } else if (variant === "care") {
    const returnArc = float(new THREE.TorusGeometry(0.52, 0.04, 7, 36, Math.PI * 1.55));
    returnArc.position.set(0, 1.02, 0);
    returnArc.rotation.x = Math.PI / 2;
    const arrow = float(new THREE.ConeGeometry(0.13, 0.32, 12));
    arrow.position.set(-0.47, 0.77, 0);
    arrow.rotation.z = -0.8;
  } else if (variant === "legal") {
    for (const x of [-0.32, 0.32]) {
      const page = float(new THREE.BoxGeometry(0.54, 0.035, 0.78), paper);
      page.position.set(x, 0.96, 0);
      page.rotation.set(-0.18, x * 0.24, x * -0.18);
    }
  } else {
    const noteStem = float(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8));
    noteStem.position.set(0.16, 1.1, 0);
    const note = float(new THREE.SphereGeometry(0.14, 12, 8));
    note.scale.set(1.25, 0.78, 0.72);
    note.position.set(-0.02, 0.76, 0);
  }

  const dust = new THREE.Group();
  world.add(dust);
  for (let index = 0; index < 9; index++) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.022 + (index % 3) * 0.006), brass);
    spark.position.set(
      Math.sin(index * 2.3) * (0.85 + (index % 2) * 0.38),
      0.4 + (index % 5) * 0.28,
      Math.cos(index * 1.7) * 0.55,
    );
    dust.add(spark);
  }

  world.scale.setScalar(0.78);
  world.rotation.y = -0.32;
  lid.rotation.x = -0.08;
  motif.scale.setScalar(0.01);
  dust.scale.setScalar(0.01);

  const render = () => renderer.render(scene, camera);
  const entrance = gsap.timeline({ onUpdate: render });
  entrance
    .to(world.scale, { x: 1, y: 1, z: 1, duration: 0.62, ease: "power3.out" }, 0)
    .to(world.rotation, { y: 0.12, duration: 1.35, ease: "sine.inOut" }, 0)
    .to(lid.rotation, { x: -1.08, duration: 0.92, ease: "power2.inOut" }, 0.08)
    .to(crank.rotation, { x: Math.PI * 2, duration: 1.25, ease: "sine.inOut" }, 0.02)
    .to(motif.scale, { x: 1, y: 1, z: 1, duration: 0.66, ease: "back.out(1.3)" }, 0.34)
    .to(dust.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: "power2.out" }, 0.28);
  const ambient = gsap.timeline({ repeat: -1, yoyo: true, onUpdate: render });
  ambient
    .to(motif.position, { y: 0.08, duration: 1.1, ease: "sine.inOut" }, 0)
    .to(dust.rotation, { y: 0.4, duration: 1.45, ease: "sine.inOut" }, 0)
    .to(rim.position, { x: 1.8, duration: 1.35, ease: "sine.inOut" }, 0);

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      entrance.kill();
      ambient.kill();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((material) => materials.add(material));
      });
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
