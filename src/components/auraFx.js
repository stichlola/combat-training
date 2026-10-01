/* Aura "Super Saiyan" per il modello 3D: la forma viene da Blender (oggetto
   "aura" nel GLB), l'effetto è tutto qui perché il glTF non esporta shader
   animati. Fiamme dorate che salgono (rumore fbm che scorre verso l'alto),
   nessun bordo visibile (sfuma prima della sagoma), punte tremolanti in cima e scintille che volano su.
   Il bagliore vero e proprio lo dà il bloom in Body3D. */
import * as THREE from "three";

const NOISE = /* glsl */ `
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

export function makeAuraMaterial(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uYMin: { value: bb.min.y },
      uYMax: { value: bb.max.y },
      uGold: { value: new THREE.Color(1.0, 0.72, 0.12) },
      uHot: { value: new THREE.Color(1.0, 0.97, 0.7) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uYMin, uYMax;
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      ${NOISE}
      void main() {
        float h = clamp((position.y - uYMin) / (uYMax - uYMin), 0.0, 1.0);
        // la superficie "respira" e sale: più mossa verso l'alto
        float n = fbm(vec3(position.x * 9.0, position.y * 6.0 - uTime * 2.4, position.z * 9.0));
        vec3 p = position + normal * (n - 0.35) * (0.02 + 0.07 * h * h);
        p.y += (n - 0.4) * 0.06 * h;
        vPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uYMin, uYMax;
      uniform vec3 uGold, uHot;
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      ${NOISE}
      void main() {
        float h = clamp((vPos.y - uYMin) / (uYMax - uYMin), 0.0, 1.0);
        // niente bordo: l'aura svanisce prima della sagoma della forma
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vView)));
        float edgeFade = 1.0 - smoothstep(0.45, 0.9, rim);
        float band = smoothstep(0.05, 0.5, rim);          // più intensa attorno al corpo che al centro
        // lingue di fuoco verticali che scorrono verso l'alto
        float flame = fbm(vec3(vPos.x * 12.0, vPos.y * 3.5 - uTime * 2.8, vPos.z * 12.0));
        float tongues = smoothstep(0.42, 0.8, flame);
        float streak = fbm(vec3(vPos.x * 28.0, vPos.y * 1.4 - uTime * 4.2, vPos.z * 28.0));
        // piedi sfumati, punte in cima che tremolano
        float base = smoothstep(0.0, 0.12, h);
        float tips = 1.0 - smoothstep(0.5, 1.0, h + (flame - 0.5) * 0.8);
        float a = (tongues * (0.25 + 0.75 * band) * 0.75 + smoothstep(0.55, 0.8, streak) * 0.25) * edgeFade * base * tips;
        a = clamp(a, 0.0, 1.0);
        vec3 col = mix(uGold, uHot, tongues * 0.7) * (1.1 + 0.9 * tongues);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/* scintille che salgono dentro il volume dell'aura (coordinate mondo) */
export function makeSparks(box, count = 160) {
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const reset = (i, anywhere) => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    pos[i * 3] = c.x + Math.cos(a) * r * size.x * 0.48;
    pos[i * 3 + 1] = anywhere ? box.min.y + Math.random() * size.y : box.min.y;
    pos[i * 3 + 2] = c.z + Math.sin(a) * r * size.z * 0.48;
    speed[i] = 0.6 + Math.random() * 1.4;
  };
  for (let i = 0; i < count; i++) reset(i, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  // sprite morbido generato al volo (niente file esterni)
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,230,1)");
  grd.addColorStop(0.3, "rgba(255,215,90,0.8)");
  grd.addColorStop(1, "rgba(255,180,40,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({
    size: 0.07, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xffe08a,
  });
  const points = new THREE.Points(geo, mat);
  points.raycast = () => {}; // non deve bloccare i clic sui muscoli

  const update = (dt) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speed[i] * dt;
      pos[i * 3] += Math.sin(pos[i * 3 + 1] * 6 + i) * dt * 0.05;
      if (pos[i * 3 + 1] > box.max.y + 0.15) reset(i, false);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}
