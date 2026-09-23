import * as THREE from "three";
export interface FooterDepthScene {
  setActive(active: boolean): void;
  dispose(): void;
}
/** A small actual 3D layer: light filaments and brass dust, never a second product photograph. */
export function mountFooterDepthScene(host: HTMLElement, footer: HTMLElement): FooterDepthScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.z = 8;
  const group = new THREE.Group();
  scene.add(group);
  const curves: THREE.Mesh[] = [];
  // Keep the luminous melody around the edge, away from headings and navigation.
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 48 }, (_, i) => {
      const t = i / 47;
      return new THREE.Vector3(
        side * (3.7 + Math.sin(t * Math.PI * 2) * 0.5),
        3 - t * 6,
        Math.cos(t * Math.PI * 2) * 0.65,
      );
    });
    const curve = new THREE.CatmullRomCurve3(points);
    const ribbon = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.009, 4, false),
      new THREE.MeshBasicMaterial({
        color: side === -1 ? 0xe4b572 : 0x85b6b4,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    curves.push(ribbon);
    group.add(ribbon);
  }
  const positions = new Float32Array(84 * 3);
  for (let i = 0; i < 84; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    positions[i * 3] = side * (1.5 + (((i * 37) % 100) / 100) * 3);
    positions[i * 3 + 1] = (((i * 53) % 100) / 100) * 7 - 3.5;
    positions[i * 3 + 2] = (((i * 29) % 100) / 100) * 4 - 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dustMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying float brightness; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(12.0/-p.z,1.0,3.0);brightness=clamp((position.z+3.0)/5.0,.15,.65);}`,
    fragmentShader: `varying float brightness; void main(){float r=length(gl_PointCoord-vec2(.5));float a=(1.0-smoothstep(.05,.5,r))*brightness;gl_FragColor=vec4(1.0,.76,.43,a);}`,
  });
  const dust = new THREE.Points(geometry, dustMaterial);
  group.add(dust);
  let running = false,
    disposed = false,
    frame = 0,
    last = 0,
    elapsed = 0;
  let aimX = 0,
    aimY = 0;
  const finePointer = matchMedia("(pointer: fine)");
  const pointer = (e: PointerEvent) => {
    if (!running || !finePointer.matches) return;
    const rect = footer.getBoundingClientRect();
    aimX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.13;
    aimY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.08;
  };
  const leave = () => {
    aimX = 0;
    aimY = 0;
  };
  footer.addEventListener("pointermove", pointer, { passive: true });
  footer.addEventListener("pointerleave", leave);
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Portrait composition keeps both filaments near the sides of the mobile screen.
    const viewWidth =
      2 * Math.tan(THREE.MathUtils.degToRad(21)) * camera.position.z * camera.aspect;
    group.scale.x = Math.min(1.7, viewWidth / 9);
    if (!running) renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const tick = (now: number) => {
    if (!running || disposed) return;
    frame = requestAnimationFrame(tick);
    if (now - last < 1000 / 24) return;
    elapsed += Math.min((now - last) / 1000, 0.08);
    last = now;
    group.rotation.y += (aimX - group.rotation.y) * 0.065;
    group.rotation.x += (aimY - group.rotation.x) * 0.065;
    dust.position.y = Math.sin(elapsed * 0.12) * 0.16;
    dust.rotation.y = Math.sin(elapsed * 0.07) * 0.06;
    curves.forEach((ribbon, i) => {
      ribbon.position.z = Math.sin(elapsed * 0.18 + i * 2) * 0.15;
    });
    renderer.render(scene, camera);
  };
  return {
    setActive(active) {
      if (disposed || running === active) return;
      running = active;
      if (active) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      } else cancelAnimationFrame(frame);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      footer.removeEventListener("pointermove", pointer);
      footer.removeEventListener("pointerleave", leave);
      geometry.dispose();
      dustMaterial.dispose();
      curves.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
