/* Corpo umano 3D per la libreria esercizi.
   Modello principale: public/models/body-custom.glb (oggetti grp_<Gruppo>).
   Riserva: atlante muscolare Z-Anatomy / BodyParts3D (CC BY-SA 4.0, vedi
   public/models/ANATOMY-ATTRIBUTION.txt), dove ogni muscolo è una mesh con glTF extras
   (userData.group = gruppo di allenamento dell'atlante) che mappiamo sui gruppi
   dell'app (userData.appGroup). Se il GLB non si carica si usa un corpo
   stilizzato fatto di primitive. Si ruota solo trascinando (OrbitControls, niente auto-rotazione), il gruppo
   selezionato si illumina di rosso. Caricato in lazy: three.js solo quando serve. */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { makeAuraMaterial, makeSparks } from "./auraFx";

/* modelli in ordine di preferenza: personale (oggetti grp_<Gruppo>, esportato da
   Blender) → atlante anatomico → corpo stilizzato di primitive */
const CUSTOM_URL = "/models/body-custom.glb";
const ATLAS_URL = "/models/full-body-male-mobile.glb";
/* gruppi dell'atlante → gruppi della libreria (Collo resta neutro, non cliccabile) */
const ATLAS_GROUPS = {
  Chest: "Petto",
  Deltoids: "Spalle", "Rotator cuff": "Spalle",
  Lats: "Dorso", Trapezius: "Dorso", "Upper back": "Dorso", "Teres major": "Dorso",
  "Spinal extensors": "Dorso", "Lower back": "Dorso",
  Biceps: "Bicipiti", "Upper arms": "Bicipiti", Forearms: "Bicipiti",
  Triceps: "Tricipiti",
  Abdominals: "Core", Obliques: "Core", Serratus: "Core",
  Quadriceps: "Gambe", Hamstrings: "Gambe", Sartorius: "Gambe", Adductors: "Gambe", Glutes: "Gambe",
  "Hip flexors": "Gambe", "Hip rotators": "Gambe", Calves: "Gambe", "Lower legs": "Gambe",
};
const BODY_HEIGHT = 2.8; // altezza in unità scena (il GLB è in metri)

const SKIN = 0xe8d5c4;
const MUSCLE = 0xd9a08c;
const HOVER = 0xf0b39e;
const SELECTED = 0xef4444;
/* lato da mostrare quando si seleziona un gruppo: 0 = fronte, PI = schiena */
const FACING = { Petto: 0, Core: 0, Bicipiti: 0, Spalle: 0, Gambe: 0, Dorso: Math.PI, Tricipiti: Math.PI };

/* costruisce il corpo: ritorna il gruppo radice e le mesh muscolari */
function buildBody() {
  const root = new THREE.Group();
  const muscles = [];
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.75, metalness: 0.02 });

  const add = (geo, pos, { scale, rot, group } = {}) => {
    const mat = group
      ? new THREE.MeshStandardMaterial({ color: MUSCLE, roughness: 0.55, metalness: 0.04, emissive: 0x000000 })
      : skinMat;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    if (group) { m.userData.appGroup = group; muscles.push(m); }
    root.add(m);
    return m;
  };
  const sphere = (r = 1) => new THREE.SphereGeometry(r, 32, 24);
  const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);

  const cyl = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 32, 1);

  /* --- struttura (pelle) --- */
  add(sphere(0.2), [0, 1.62, 0], { scale: [0.88, 1.08, 0.95] });            // testa
  add(capsule(0.07, 0.12), [0, 1.4, 0]);                                     // collo
  add(cyl(0.3, 0.22, 0.62), [0, 0.91, 0], { scale: [1, 1, 0.58] });          // busto a V
  add(sphere(0.3), [0, 1.2, 0], { scale: [1.04, 0.32, 0.58] });              // linea spalle
  add(sphere(0.25), [0, 0.54, 0], { scale: [1, 0.55, 0.62] });               // bacino
  for (const s of [-1, 1]) {
    add(capsule(0.065, 0.28), [s * 0.4, 0.88, 0], { rot: [0, 0, s * 0.08] });       // braccio
    add(capsule(0.052, 0.28), [s * 0.43, 0.5, 0.02], { rot: [0, 0, s * 0.04] });    // avambraccio
    add(sphere(0.06), [s * 0.44, 0.27, 0.03], { scale: [0.75, 1.15, 0.55] });       // mano
    add(sphere(0.075), [s * 0.13, -0.29, 0.01]);                                     // ginocchio
    add(capsule(0.06, 0.1), [s * 0.13, -0.93, 0.06], { rot: [Math.PI / 2, 0, 0] }); // piede
  }

  /* --- muscoli (cliccabili) --- */
  for (const s of [-1, 1]) {
    // Petto: pettorali
    add(sphere(1), [s * 0.12, 1.05, 0.14], { scale: [0.15, 0.1, 0.07], rot: [0, s * 0.2, s * -0.12], group: "Petto" });
    // Spalle: deltoidi
    add(sphere(0.105), [s * 0.37, 1.13, 0], { scale: [1, 1.05, 1.05], group: "Spalle" });
    // Bicipiti (davanti al braccio) e tricipiti (dietro)
    add(capsule(0.05, 0.15), [s * 0.405, 0.9, 0.04], { rot: [0, 0, s * 0.08], group: "Bicipiti" });
    add(capsule(0.052, 0.16), [s * 0.405, 0.9, -0.04], { rot: [0, 0, s * 0.08], group: "Tricipiti" });
    // Dorso: dorsali
    add(sphere(1), [s * 0.13, 0.9, -0.12], { scale: [0.13, 0.24, 0.06], rot: [0, s * -0.25, s * 0.15], group: "Dorso" });
    // Gambe: glutei, cosce, polpacci
    add(sphere(0.12), [s * 0.11, 0.45, -0.1], { scale: [1, 0.9, 0.85], group: "Gambe" });
    add(capsule(0.12, 0.36), [s * 0.13, 0.05, 0.01], { group: "Gambe" });
    add(capsule(0.085, 0.3), [s * 0.13, -0.58, -0.01], { scale: [1, 1, 1.1], group: "Gambe" });
    // Core: obliqui
    add(sphere(1), [s * 0.17, 0.74, 0.08], { scale: [0.05, 0.12, 0.07], group: "Core" });
  }
  // Dorso: trapezio
  add(sphere(1), [0, 1.22, -0.07], { scale: [0.17, 0.08, 0.08], group: "Dorso" });
  // Core: addominali (6 blocchi arrotondati)
  for (let r = 0; r < 3; r++)
    for (const s of [-1, 1])
      add(sphere(1), [s * 0.048, 0.86 - r * 0.09, 0.145], { scale: [0.045, 0.04, 0.025], group: "Core" });

  root.position.y = -0.43;
  return { root, muscles };
}

/* carica un GLB e riconosce i muscoli in due formati:
   - atlante: glTF extras (muscleId + group) → ATLAS_GROUPS
   - personale: oggetti chiamati grp_<Gruppo> (es. grp_Petto), con texture propria
   Materiali clonati per mesh (servono per l'evidenziazione); il corpo viene
   scalato/centrato come il modello stilizzato */
function loadModel(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      const model = gltf.scene;
      const muscles = [];
      const auras = []; // oggetto "aura" esportato da Blender: effetto animato in auraFx
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xece3d6, roughness: 0.8 });
      const tissueMat = new THREE.MeshStandardMaterial({ color: 0xd8c9bb, roughness: 0.8 });
      model.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name === "aura" || o.parent?.name === "aura") {
          o.material = makeAuraMaterial(o.geometry);
          o.userData.isAura = true;
          o.raycast = () => {};                      // non deve bloccare i clic sui muscoli
          o.renderOrder = 2;
          auras.push(o);
          return;
        }
        const custom = /^grp_([A-Za-z]+)/.exec(o.name) || /^grp_([A-Za-z]+)/.exec(o.parent?.name || "");
        if (custom) {
          o.material = o.material.clone();           // texture del modello, tinta solo al bisogno
          o.userData.appGroup = custom[1];
          o.userData.textured = true;
          muscles.push(o);
          return;
        }
        if (o.userData.muscleId && ATLAS_GROUPS[o.userData.group]) {
          o.material = new THREE.MeshStandardMaterial({ color: MUSCLE, roughness: 0.55, metalness: 0.03, emissive: 0x000000 });
          o.userData.appGroup = ATLAS_GROUPS[o.userData.group];
          muscles.push(o);
        } else if (o.userData.boneId || o.userData.supportId) {
          o.material = o.userData.boneId ? boneMat : tissueMat;
        }                                             // altrimenti (base del modello personale) resta com'è
      });
      // dimensioni del solo corpo: l'aura è più grande e non deve rimpicciolirlo
      model.updateMatrixWorld(true);
      const box = new THREE.Box3();
      model.traverse((o) => { if (o.isMesh && !o.userData.isAura) box.expandByObject(o); });
      const size = box.getSize(new THREE.Vector3());
      const k = BODY_HEIGHT / size.y;
      model.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x * k, -box.min.y * k - BODY_HEIGHT / 2, -c.z * k);
      const root = new THREE.Group();
      root.add(model);
      if (!muscles.length) return reject(new Error("nessun gruppo muscolare nel modello"));
      resolve({ root, muscles, auras, kind: muscles[0].userData.textured ? "custom" : "atlas" });
    }, undefined, reject);
  });
}

export default function Body3D({ selected, onSelect, onModel }) {
  const mountRef = useRef(null);
  const musclesRef = useRef([]);
  const hoverRef = useRef(null);
  const selRef = useRef(selected);
  const turnRef = useRef(null); // azimut verso cui ruotare il modello
  const fromModelRef = useRef(false); // selezione fatta cliccando il modello: niente rotazione
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState("loading");
  onSelectRef.current = onSelect;
  const onModelRef = useRef(onModel);
  onModelRef.current = onModel;

  /* colori: selezionato rosso acceso, hover più chiaro, altrimenti tono muscolo.
     Sui modelli con texture il colore fa da tinta (bianco = texture originale) */
  const paint = () => {
    for (const m of musclesRef.current) {
      const g = m.userData.appGroup;
      const tex = m.userData.textured;
      if (g === selRef.current) {
        m.material.color.setHex(tex ? 0xff5050 : SELECTED);
        m.material.emissive.setHex(tex ? 0x8a0f0f : 0x7f1d1d);
      } else if (g === hoverRef.current) {
        m.material.color.setHex(tex ? 0xffd2c4 : HOVER);
        m.material.emissive.setHex(tex ? 0x1a0a06 : 0x000000);
      } else {
        m.material.color.setHex(tex ? 0xffffff : MUSCLE);
        m.material.emissive.setHex(0x000000);
      }
    }
  };

  useEffect(() => {
    selRef.current = selected;
    paint();
    if (fromModelRef.current) fromModelRef.current = false;
    else if (selected in FACING) turnRef.current = FACING[selected];
  }, [selected]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let W = mount.clientWidth, H = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
    camera.position.set(0, 0.7, 5.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    // post-processing: il bloom fa "brillare" l'aura (attivo solo se il modello ce l'ha)
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.5, 0.72);
    bloom.enabled = false;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    let auraFx = null; // { mats, sparks }

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6e, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.5, 3, 4);
    scene.add(key);
    const back = new THREE.DirectionalLight(0xffe6d5, 0.9);
    back.position.set(-2, 2, -4);
    scene.add(back);

    const root = new THREE.Group();
    scene.add(root);
    let disposed = false;
    const mountBody = ({ root: body, muscles, auras = [], kind }) => {
      if (disposed) return;
      root.add(body);
      if (auras.length) {
        root.updateMatrixWorld(true);
        const auraBox = new THREE.Box3();
        auras.forEach((a) => auraBox.expandByObject(a));
        const sparks = makeSparks(auraBox);
        scene.add(sparks.points);
        const warm = new THREE.PointLight(0xffc94a, 1.2, 4); // riflesso dorato sul corpo
        warm.position.set(0, 0.3, 0.6);
        scene.add(warm);
        auraFx = { mats: auras.map((a) => a.material), sparks };
        bloom.enabled = true;
      }
      musclesRef.current = muscles;
      paint();
      setStatus("ready");
      onModelRef.current && onModelRef.current(kind);
    };
    loadModel(CUSTOM_URL)
      .catch((err) => { console.warn("Modello personale non disponibile, uso l'atlante", err); return loadModel(ATLAS_URL); })
      .then(mountBody)
      .catch((err) => {
        console.warn("Atlante 3D non disponibile, uso il modello stilizzato", err);
        mountBody({ ...buildBody(), kind: "basic" });
      });

    // sfondo scuro con griglia sul pavimento (stile viewer 3D), sfumata dalla nebbia
    const BG = 0x1b1c21;
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 7, 16);
    const floorY = -1.42;
    const gridMinor = new THREE.GridHelper(40, 160, 0x2b2e36, 0x2b2e36);
    const gridMajor = new THREE.GridHelper(40, 40, 0x3c404b, 0x3c404b);
    gridMinor.position.y = floorY;
    gridMajor.position.y = floorY + 0.001;
    scene.add(gridMinor, gridMajor);
    // ombra morbida sotto i piedi
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = floorY + 0.002;
    scene.add(shadow);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.4;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.update();

    /* picking: click senza trascinamento seleziona il gruppo sotto il puntatore */
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(root.children, true)[0];
      return hit ? hit.object.userData.appGroup || null : null;
    };
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; turnRef.current = null; };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const g = pick(e);
      if (g) { fromModelRef.current = g !== selRef.current; onSelectRef.current && onSelectRef.current(g); }
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const g = pick(e);
      if (g !== hoverRef.current) {
        hoverRef.current = g;
        renderer.domElement.style.cursor = g ? "pointer" : "grab";
        paint();
      }
    };
    const onLeave = () => { hoverRef.current = null; paint(); };
    const el = renderer.domElement;
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const ro = new ResizeObserver(() => {
      W = mount.clientWidth; H = mount.clientHeight;
      if (!W || !H) return;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      composer.setSize(W, H);
    });
    ro.observe(mount);

    let raf;
    const clock = new THREE.Clock();
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (auraFx) {
        const t = clock.elapsedTime;
        auraFx.mats.forEach((m) => { m.uniforms.uTime.value = t; });
        auraFx.sparks.update(dt);
      }
      /* rotazione animata verso il lato del muscolo selezionato */
      if (turnRef.current != null) {
        const cur = controls.getAzimuthalAngle();
        let d = turnRef.current - cur;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) < 0.01) turnRef.current = null;
        else {
          const a = cur + d * 0.12;
          const off = camera.position.clone().sub(controls.target);
          const rXZ = Math.hypot(off.x, off.z);
          camera.position.set(controls.target.x + rXZ * Math.sin(a), camera.position.y, controls.target.z + rXZ * Math.cos(a));
        }
      }
      controls.update();
      composer.render();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      controls.dispose();
      bloom.dispose();
      composer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {status === "loading" && <div className="anat-loading">Caricamento modello…</div>}
    </div>
  );
}
