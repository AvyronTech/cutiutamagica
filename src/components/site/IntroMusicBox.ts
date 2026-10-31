import * as THREE from "three";
import { gsap } from "gsap";
/** Imported only for the first visit, while the hard two-second deadline is still open. */
export function mountIntroMusicBox(host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(300, 240);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 300 / 240, 0.1, 30);
  camera.position.set(4, 3.4, 5.8);
  camera.lookAt(0, 0.1, 0);
  scene.add(new THREE.HemisphereLight(0xffe6b8, 0x402818, 3));
  const light = new THREE.DirectionalLight(0xffe0a0, 4);
  light.position.set(-2, 4, 3);
  scene.add(light);
  const rim = new THREE.PointLight(0xffbc61, 12);
  rim.position.set(2, 1, -2);
  scene.add(rim);
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a5128, roughness: 0.5, metalness: 0.08 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xe1ac62, roughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd6bc75,
    metalness: 0.78,
    roughness: 0.25,
  });
  const box = new THREE.Group();
  scene.add(box);
  function block(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = box,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  block(2, 0.13, 1.5, 0, -0.46, 0, wood);
  block(2, 0.8, 0.09, 0, -0.02, 0.7, wood);
  block(2, 0.8, 0.09, 0, -0.02, -0.7, wood);
  block(0.09, 0.8, 1.4, -0.95, -0.02, 0, wood);
  block(0.09, 0.8, 1.4, 0.95, -0.02, 0, wood);
  for (let i = 0; i < 12; i++) block(0.035, 0.015, 0.38, -0.39 + i * 0.071, 0.07, 0.2, gold);
  block(1, 0.07, 0.6, 0, -0.1, 0, gold);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.88, 24), gold);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.position.set(0, 0.05, -0.17);
  box.add(cylinder);
  for (let i = 0; i < 15; i++)
    block(0.016, 0.035, 0.022, -0.38 + i * 0.053, 0.2, -0.14 + (i % 3) * 0.04, edge);
  const lid = new THREE.Group();
  lid.position.set(0, 0.39, -0.7);
  box.add(lid);
  block(2.08, 0.11, 1.54, 0, 0, 0.71, wood, lid);
  block(1.88, 0.025, 1.34, 0, 0.06, 0.71, edge, lid);
  // Lid engraving remains geometric and legible at a small size.
  const engraving = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.011, 5, 40), gold);
  engraving.rotation.x = Math.PI / 2;
  engraving.position.set(0, 0.08, 0.72);
  lid.add(engraving);
  const crank = new THREE.Group();
  crank.position.set(1.04, 0, 0);
  box.add(crank);
  block(0.36, 0.055, 0.055, 0.14, 0, 0, gold, crank);
  block(0.055, 0.38, 0.055, 0.3, 0.17, 0, gold, crank);
  block(0.24, 0.085, 0.085, 0.4, 0.35, 0, wood, crank);
  const dust = new THREE.Group();
  box.add(dust);
  for (let i = 0; i < 10; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), gold);
    star.position.set(Math.sin(i * 2.4) * 0.8, 0.5 + i * 0.07, Math.cos(i * 2.4) * 0.5);
    dust.add(star);
  }
  box.rotation.y = -0.25;
  box.scale.setScalar(0.85);
  dust.scale.setScalar(0);
  const render = () => renderer.render(scene, camera);
  const timeline = gsap.timeline({ onUpdate: render });
  timeline
    .to(box.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "power2.out" }, 0)
    .to(box.rotation, { y: 0.15, duration: 1.3, ease: "sine.inOut" }, 0)
    .to(lid.rotation, { x: -1.25, duration: 1, ease: "power2.inOut" }, 0.05)
    .to(crank.rotation, { x: Math.PI * 2, duration: 1.2, ease: "sine.inOut" }, 0)
    .to(dust.scale, { x: 1, y: 1, z: 1, duration: 0.7 }, 0.35);
  render();
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    timeline.kill();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    wood.dispose();
    edge.dispose();
    gold.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
