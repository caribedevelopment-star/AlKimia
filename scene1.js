import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.179.1/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'https://unpkg.com/three@0.179.1/examples/jsm/utils/BufferGeometryUtils.js';

const SCENE_CHUNKS = 12;
const PERSON_CHUNKS = 4;
const MOBILE = matchMedia('(max-width: 820px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const wait = ms => new Promise(r => setTimeout(r, ms));

async function loadChunkedGlb(prefix, count) {
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      fetch(`/assets/scene1/${prefix}.${String(i + 1).padStart(3, '0')}.b64`, { cache: 'force-cache' })
        .then(r => {
          if (!r.ok) throw new Error(`${prefix} chunk ${i + 1} failed`);
          return r.text();
        })
    )
  );
  const raw = atob(parts.join('').replace(/\s+/g, ''));
  const compressed = Uint8Array.from(raw, c => c.charCodeAt(0));
  const bytes = new Uint8Array(
    await new Response(
      new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
    ).arrayBuffer()
  );
  const url = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
  try {
    return await new GLTFLoader().loadAsync(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mergeSceneGeometry(root) {
  root.updateMatrixWorld(true);
  const pieces = [];
  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
    let g = obj.geometry.clone();
    g.applyMatrix4(obj.matrixWorld);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    g.deleteAttribute('color');
    g.deleteAttribute('tangent');
    if (g.index) g = g.toNonIndexed();
    pieces.push(g);
  });
  if (!pieces.length) throw new Error('No mesh geometry found in GLB');
  const merged = mergeGeometries(pieces, false);
  pieces.forEach(g => g.dispose());
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function seeded(seed = 1337) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,245,226,1)');
  g.addColorStop(.08, 'rgba(210,198,255,.95)');
  g.addColorStop(.28, 'rgba(128,108,255,.45)');
  g.addColorStop(1, 'rgba(40,50,120,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function injectUi() {
  if (document.querySelector('#concertUpgrade')) return document.querySelector('#concertUpgrade');
  const shell = document.createElement('section');
  shell.id = 'concertUpgrade';
  shell.innerHTML = `
    <canvas class="concert-upgrade-canvas"></canvas>
    <div class="concert-noise"></div>
    <div class="concert-copy">
      <span>MEMORY 01 · THE ENCOUNTER</span>
      <strong>ENTRE MILES,<br>NOS ENCONTRAMOS.</strong>
    </div>
    <div class="concert-loading"><i></i><span>RECONSTRUYENDO EL RECUERDO</span></div>
    <button class="concert-continue" type="button">CONTINUAR</button>
  `;
  const css = document.createElement('style');
  css.textContent = `
    #concertUpgrade{position:fixed;inset:0;z-index:80;background:#02030a;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .8s ease}
    #concertUpgrade.on{opacity:1;pointer-events:auto}
    #concertUpgrade.out{opacity:0;pointer-events:none}
    .concert-upgrade-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .concert-noise{position:absolute;inset:-40%;pointer-events:none;opacity:.08;mix-blend-mode:screen;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");animation:concertNoise .22s steps(2) infinite}
    @keyframes concertNoise{0%{transform:translate(0)}25%{transform:translate(2%,-1%)}50%{transform:translate(-1%,2%)}75%{transform:translate(1%,1%)}}
    .concert-copy{position:absolute;left:max(24px,5vw);top:max(72px,9vh);color:white;pointer-events:none;text-shadow:0 2px 24px #02030a}
    .concert-copy span{display:block;font:500 10px/1.2 system-ui,sans-serif;letter-spacing:.26em;opacity:.62;margin-bottom:12px}
    .concert-copy strong{display:block;font:650 clamp(26px,4vw,62px)/.92 system-ui,sans-serif;letter-spacing:-.045em;max-width:720px}
    .concert-loading{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;color:#fff;font:500 9px/1 system-ui,sans-serif;letter-spacing:.18em;opacity:.7;white-space:nowrap}
    .concert-loading i{width:7px;height:7px;border-radius:50%;background:#d9ceff;box-shadow:0 0 18px #ab8fff;animation:pulse 1.1s ease-in-out infinite}
    @keyframes pulse{50%{opacity:.25;transform:scale(.7)}}
    .concert-continue{position:absolute;right:max(22px,4vw);bottom:max(24px,4vh);border:1px solid rgba(255,255,255,.35);background:rgba(8,8,18,.32);backdrop-filter:blur(14px);color:#fff;border-radius:999px;padding:13px 19px;font:600 10px/1 system-ui,sans-serif;letter-spacing:.17em;opacity:0;transform:translateY(8px);pointer-events:none;transition:.6s ease;cursor:pointer}
    .concert-continue.ready{opacity:1;transform:none;pointer-events:auto}
    @media(max-width:700px){.concert-copy{top:calc(env(safe-area-inset-top) + 66px);left:22px}.concert-copy strong{font-size:30px}.concert-copy span{font-size:9px}.concert-loading{bottom:calc(env(safe-area-inset-bottom) + 24px)}.concert-continue{right:18px;bottom:calc(env(safe-area-inset-bottom) + 22px)}}
  `;
  document.head.appendChild(css);
  document.body.appendChild(shell);
  return shell;
}

async function buildConcert(shell) {
  const canvas = shell.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.25 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = MOBILE ? 1.02 : 1.12;
  renderer.setClearColor(0x02030a, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x080a20, MOBILE ? 0.0073 : 0.0058);

  const camera = new THREE.PerspectiveCamera(MOBILE ? 64 : 54, 1, .1, 900);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  const [envGltf, personGltf] = await Promise.all([
    loadChunkedGlb('scene', SCENE_CHUNKS),
    loadChunkedGlb('person', PERSON_CHUNKS)
  ]);

  const envGeo = mergeSceneGeometry(envGltf.scene);
  const personGeoRaw = mergeSceneGeometry(personGltf.scene);

  const envBox = envGeo.boundingBox.clone();
  const envCenter = envBox.getCenter(new THREE.Vector3());
  const envSize = envBox.getSize(new THREE.Vector3());

  const originalPersonBox = personGeoRaw.boundingBox.clone();
  const originalPersonCenter = originalPersonBox.getCenter(new THREE.Vector3());
  const personSize = originalPersonBox.getSize(new THREE.Vector3());
  const floorY = originalPersonBox.min.y;

  personGeoRaw.translate(-originalPersonCenter.x, -originalPersonCenter.y, -originalPersonCenter.z);
  personGeoRaw.computeBoundingBox();
  personGeoRaw.computeBoundingSphere();

  const envMat = new THREE.MeshStandardMaterial({ color: 0x17203a, roughness: .78, metalness: .12 });
  const envMesh = new THREE.Mesh(envGeo, envMat);
  scene.add(envMesh);

  const heroMat = new THREE.MeshStandardMaterial({ color: 0xe7e1da, roughness: .68, metalness: .02, emissive: 0x211942, emissiveIntensity: .13 });
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0x8589a2, roughness: .92, metalness: 0, emissive: 0x0d1230, emissiveIntensity: .22 });

  const hero1 = new THREE.Mesh(personGeoRaw, heroMat);
  const hero2 = new THREE.Mesh(personGeoRaw, heroMat.clone());
  const heroScale = Math.max(.85, Math.min(1.35, 1.45 / Math.max(personSize.y, .01)));
  const heroY = floorY + personSize.y * heroScale * .5;
  hero1.scale.setScalar(heroScale);
  hero2.scale.setScalar(heroScale * .98);
  hero1.position.set(originalPersonCenter.x - 1.25, heroY, originalPersonCenter.z + 1.2);
  hero2.position.set(originalPersonCenter.x + 1.25, heroY, originalPersonCenter.z + .5);
  hero1.rotation.y = .22;
  hero2.rotation.y = -.32;
  scene.add(hero1, hero2);

  const rand = seeded(19012026);
  const exactCount = MOBILE ? 12 : 28;
  const exactCrowd = new THREE.InstancedMesh(personGeoRaw, crowdMat, exactCount);
  exactCrowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const exactData = [];
  for (let i = 0; i < exactCount; i++) {
    const side = i % 2 ? 1 : -1;
    const depthT = rand();
    const z = THREE.MathUtils.lerp(originalPersonCenter.z + 28, originalPersonCenter.z - 18, depthT);
    const spread = 7 + depthT * 38;
    const x = originalPersonCenter.x + side * (4.4 + rand() * spread);
    const sc = heroScale * (.72 + rand() * .42);
    const baseY = floorY + personSize.y * sc * .5;
    const rot = (rand() - .5) * .9;
    exactData.push({ x, y: baseY, z, sc, rot, phase: rand() * Math.PI * 2 });
    dummy.position.set(x, baseY, z);
    dummy.scale.setScalar(sc);
    dummy.rotation.y = rot;
    dummy.updateMatrix();
    exactCrowd.setMatrixAt(i, dummy.matrix);
  }
  exactCrowd.instanceMatrix.needsUpdate = true;
  scene.add(exactCrowd);

  const farCount = MOBILE ? 340 : 760;
  const farGeo = new THREE.CapsuleGeometry(.26, .52, 3, 6);
  const farMat = new THREE.MeshStandardMaterial({ color: 0x5e6686, roughness: 1, emissive: 0x080d24, emissiveIntensity: .32 });
  const far = new THREE.InstancedMesh(farGeo, farMat, farCount);
  const farData = [];
  for (let i = 0; i < farCount; i++) {
    const depthT = Math.pow(rand(), .72);
    const z = THREE.MathUtils.lerp(originalPersonCenter.z + 42, envCenter.z + 8, depthT);
    const maxSpread = THREE.MathUtils.lerp(48, Math.min(envSize.x * .44, 105), depthT);
    let x = envCenter.x + (rand() - .5) * maxSpread * 2;
    if (Math.abs(x - originalPersonCenter.x) < 5.2 && z > originalPersonCenter.z - 4) x += x < originalPersonCenter.x ? -7 : 7;
    const sc = .82 + rand() * 1.55;
    const y = floorY + .52 * sc;
    farData.push({ x, y, z, sc, rot: (rand() - .5) * .7 });
    dummy.position.set(x, y, z);
    dummy.scale.set(sc * (.75 + rand() * .25), sc, sc * (.75 + rand() * .25));
    dummy.rotation.y = farData[i].rot;
    dummy.updateMatrix();
    far.setMatrixAt(i, dummy.matrix);
  }
  far.instanceMatrix.needsUpdate = true;
  scene.add(far);

  const ambient = new THREE.HemisphereLight(0x778bff, 0x120d22, MOBILE ? 1.0 : 1.25);
  scene.add(ambient);

  const stageLight = new THREE.PointLight(0xffe7c4, MOBILE ? 28 : 48, envSize.z * .62, 1.7);
  stageLight.position.set(envCenter.x, envCenter.y + envSize.y * .18, envCenter.z - envSize.z * .15);
  scene.add(stageLight);

  const violet = new THREE.PointLight(0x715cff, MOBILE ? 18 : 32, envSize.x * .72, 1.6);
  violet.position.set(envCenter.x - envSize.x * .30, envCenter.y + 18, envCenter.z + 8);
  scene.add(violet);
  const blue = violet.clone();
  blue.color.set(0x5bbcff);
  blue.position.x = envCenter.x + envSize.x * .30;
  scene.add(blue);

  const glowTex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf7edff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .86 }));
  glow.position.copy(stageLight.position);
  glow.scale.setScalar(Math.max(18, envSize.y * .76));
  scene.add(glow);

  const particleCount = MOBILE ? 360 : 900;
  const p = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    p[i * 3] = envCenter.x + (rand() - .5) * envSize.x * .82;
    p[i * 3 + 1] = floorY + rand() * Math.max(28, envSize.y * .9);
    p[i * 3 + 2] = envCenter.z + (rand() - .5) * envSize.z * .82;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xd8d7ff, size: MOBILE ? .09 : .12, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(particles);

  const focus = originalPersonCenter.clone();
  focus.y = heroY + personSize.y * heroScale * .18;
  const start = new THREE.Vector3(originalPersonCenter.x + (MOBILE ? 1.5 : 10), heroY + (MOBILE ? 5.2 : 7.6), originalPersonCenter.z + (MOBILE ? 31 : 43));
  const end = new THREE.Vector3(originalPersonCenter.x + (MOBILE ? .8 : 4.5), heroY + (MOBILE ? 3.8 : 5.2), originalPersonCenter.z + (MOBILE ? 20 : 29));
  camera.position.copy(start);
  camera.lookAt(focus);

  let dragX = 0, dragY = 0, active = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', e => { active = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!active) return;
    dragX = THREE.MathUtils.clamp(dragX + (e.clientX - px) * .0018, -.18, .18);
    dragY = THREE.MathUtils.clamp(dragY + (e.clientY - py) * .0012, -.09, .09);
    px = e.clientX; py = e.clientY;
  });
  const stop = () => active = false;
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  shell.querySelector('.concert-loading').style.display = 'none';
  await wait(2600);
  shell.querySelector('.concert-continue').classList.add('ready');

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    const cinematic = Math.min(1, t / 10.5);
    const ease = 1 - Math.pow(1 - cinematic, 3);
    camera.position.lerpVectors(start, end, ease);
    camera.position.x += Math.sin(t * .38) * .22 + dragX * 9;
    camera.position.y += Math.sin(t * .47) * .08 + dragY * 5;
    const look = focus.clone();
    look.x += dragX * 3.5;
    look.y += dragY * 2.2;
    camera.lookAt(look);

    hero1.position.y = heroY + Math.sin(t * 1.18) * .022;
    hero2.position.y = heroY + Math.sin(t * 1.13 + 1.2) * .022;
    hero1.rotation.z = Math.sin(t * .42) * .012;
    hero2.rotation.z = -Math.sin(t * .39) * .012;

    for (let i = 0; i < exactCount; i++) {
      const d = exactData[i];
      dummy.position.set(d.x, d.y + Math.sin(t * (1.0 + (i % 5) * .08) + d.phase) * .035, d.z);
      dummy.scale.setScalar(d.sc);
      dummy.rotation.y = d.rot + Math.sin(t * .35 + d.phase) * .025;
      dummy.updateMatrix();
      exactCrowd.setMatrixAt(i, dummy.matrix);
    }
    exactCrowd.instanceMatrix.needsUpdate = true;
    far.rotation.y = Math.sin(t * .08) * .0015;
    particles.rotation.y = t * .004;
    glow.material.opacity = .70 + Math.sin(t * 1.8) * .11;
    violet.intensity = (MOBILE ? 18 : 32) * (.86 + Math.sin(t * .72) * .14);
    blue.intensity = (MOBILE ? 18 : 32) * (.86 + Math.sin(t * .67 + 2) * .14);
    renderer.render(scene, camera);
  }
  frame();

  const destroy = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    renderer.dispose();
    envGeo.dispose(); personGeoRaw.dispose(); farGeo.dispose(); pGeo.dispose(); glowTex.dispose();
    envMat.dispose(); heroMat.dispose(); hero2.material.dispose(); crowdMat.dispose(); farMat.dispose(); particles.material.dispose(); glow.material.dispose();
  };
  return destroy;
}

async function launch() {
  const shell = injectUi();
  shell.classList.add('on');
  let destroy = null;
  try {
    destroy = await buildConcert(shell);
  } catch (error) {
    console.error('[AlKimia Scene 1]', error);
    shell.querySelector('.concert-loading span').textContent = 'EL RECUERDO NO PUDO CARGAR';
    shell.querySelector('.concert-continue').classList.add('ready');
  }
  shell.querySelector('.concert-continue').addEventListener('click', async () => {
    shell.classList.add('out');
    await wait(850);
    destroy?.();
    shell.remove();
  }, { once: true });
}

const enter = document.querySelector('#enter');
if (enter) enter.addEventListener('click', () => setTimeout(launch, 140), { once: true });
