/* Visore 3D per un trofeo: ruota trascinando (touch o mouse),
   auto-rotazione lenta quando fermo. Stile "espositore" da trophy room. */
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MODEL_BUILDERS } from "./trophyModels";

export default function Trophy3D({ model, glow = "#39ff88" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 4.4);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // luci "da vetrina"
    scene.add(new THREE.AmbientLight(0x8fb8d8, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x57c8f2, 1.1);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
    const warm = new THREE.PointLight(0xffd76a, 4, 12);
    warm.position.set(0, 3, 2);
    scene.add(warm);

    // modello
    const obj = (MODEL_BUILDERS[model] || MODEL_BUILDERS.recruit)();
    // normalizza dimensioni
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.1 / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(obj);
    const center = box2.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    obj.position.y += 0.15;
    scene.add(obj);

    // piedistallo
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x0e2233, roughness: 0.4, metalness: 0.6 })
    );
    ped.position.y = -1.35;
    scene.add(ped);
    const pedRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.025, 10, 64),
      new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.6 })
    );
    pedRing.rotation.x = Math.PI / 2;
    pedRing.position.y = -1.23;
    scene.add(pedRing);

    // ---- interazione: drag per ruotare, inerzia + auto-spin ----
    let rotY = 0, rotX = 0.15, velY = 0.006, dragging = false, px = 0, py = 0;
    const el = renderer.domElement;
    const down = (x, y) => { dragging = true; px = x; py = y; velY = 0; };
    const move = (x, y) => {
      if (!dragging) return;
      velY = (x - px) * 0.008;
      rotY += velY;
      rotX = Math.max(-0.9, Math.min(0.9, rotX + (y - py) * 0.005));
      px = x; py = y;
    };
    const up = () => { dragging = false; };
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); down(e.clientX, e.clientY); });
    el.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.style.touchAction = "none";
    el.style.cursor = "grab";

    let raf;
    const tick = () => {
      if (!dragging) {
        velY *= 0.94;                       // inerzia
        rotY += velY + 0.004;               // auto-rotazione lenta
      }
      obj.rotation.y = rotY;
      obj.rotation.x = rotX * 0.6;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [model, glow]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
