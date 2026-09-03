import * as THREE from 'three';
import { MarchingCubes } from 'https://unpkg.com/three@0.179.1/examples/jsm/objects/MarchingCubes.js';
import { EffectComposer } from 'https://unpkg.com/three@0.179.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.179.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.179.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://unpkg.com/three@0.179.1/examples/jsm/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#world');
const intro = $('#intro');
const enterButton = $('#enter');
const hud = $('#hud');
const hint = $('#hint');
const proximityBar = $('#proximityBar');
const fallback = $('#fallback');
const veil = $('#transitionVeil');
const chapter = $('#chapter');
const chapterIndex = $('#chapterIndex');
const chapterTitle = $('#chapterTitle');
const joystick = $('#joystick');
const joystickKnob = $('.joystick-knob');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  console.error(error);
  fallback.classList.remove('hidden');
  throw error;
}
const qualityTier = matchMedia('(pointer:coarse)').matches || innerWidth < 820 ? 'mobile' : 'high';
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, qualityTier === 'mobile' ? 1.2 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050403');
scene.fog = new THREE.FogExp2('#0a0706', 0.022);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 260);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), qualityTier === 'high' ? .34 : .18, .55, .86);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const desired = new THREE.Vector3();
const target = new THREE.Vector3();
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const black = new THREE.Color('#050403');
const amber = new THREE.Color('#ffad56');

let started = false;
let phase = 'idle';
let phaseStartedAt = 0;
let cameraYaw = 0;
let cameraPitch = 0.18;
let proximity = 0;
let currentPlayer = null;
let currentKim = null;
let audioSystem = null;
let transitioning = false;
let worldProgress = 0;
let currentHint = '';
let scenePulse = 0;
let ascendMix = 0;
let frame = 0;
let portalCamStart = new THREE.Vector3();
let portalLookStart = new THREE.Vector3();
let lavenderRevealDone = false;
let fallStarted = false;
let returnStarted = false;
let reunionStarted = false;
let genesisStarted = false;
let endingStarted = false;

const keyboard = { forward: false, back: false, left: false, right: false };
const mobileAxis = new THREE.Vector2();
let joyPointer = null;
let joyOrigin = new THREE.Vector2();
let lookPointer = null;
let lastLook = new THREE.Vector2();

function clamp01(v) { return THREE.MathUtils.clamp(v, 0, 1); }
function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
function smoother(v) { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); }
function setPhase(name) { phase = name; phaseStartedAt = clock.elapsedTime; }
function phaseTime() { return clock.elapsedTime - phaseStartedAt; }
function setHint(text) { currentHint = text; hint.textContent = text; }
function showChapter(index, title, duration = 1800) {
  chapterIndex.textContent = index;
  chapterTitle.textContent = title;
  chapter.classList.remove('hidden');
  setTimeout(() => chapter.classList.add('hidden'), duration);
}
function fadeToBlack(on = true) { veil.classList.toggle('on', on); }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

scene.add(new THREE.AmbientLight('#735845', 0.34));
const globalLight = new THREE.DirectionalLight('#ffb46a', 0.7);
globalLight.position.set(-6, 12, 6);
scene.add(globalLight);
const intimateLight = new THREE.PointLight('#ffb98f', 0, 18, 2);
scene.add(intimateLight);

// ---------- TEXTURES ----------
function textTexture(text, { width = 1024, height = 256, color = '#ffb86e', bg = 'transparent', font = '900 120px Inter, Arial, sans-serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
  ctx.clearRect(0, 0, width, height);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function cloudTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  const blobs=[[.28,.58,.26],[.46,.48,.34],[.63,.56,.28],[.78,.62,.20]];
  for(const [x,y,r] of blobs){const g=ctx.createRadialGradient(x*c.width,y*c.height,0,x*c.width,y*c.height,r*c.width);g.addColorStop(0,'rgba(255,248,240,.66)');g.addColorStop(.45,'rgba(245,240,235,.28)');g.addColorStop(1,'rgba(245,240,235,0)');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height)}
  const tex=new THREE.CanvasTexture(c);tex.needsUpdate=true;return tex;
}

// ---------- ROOTS ----------
const concertRoot = new THREE.Group();
const roomRoot = new THREE.Group();
const tunnelRoot = new THREE.Group();
const meadowRoot = new THREE.Group();
const fallRoot = new THREE.Group();
const reunionRoot = new THREE.Group();
const cosmosRoot = new THREE.Group();
scene.add(concertRoot, roomRoot, tunnelRoot, meadowRoot, fallRoot, reunionRoot, cosmosRoot);
roomRoot.visible = tunnelRoot.visible = meadowRoot.visible = fallRoot.visible = reunionRoot.visible = cosmosRoot.visible = false;

// ---------- SHADER ----------
const entityVertex = /* glsl */`
  uniform float uTime;
  uniform float uReaction;
  uniform float uVariant;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vWorld;

  float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 x){
    vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main(){
    vPos=position;
    vec3 p=position;
    float n=noise(position*2.0 + vec3(uTime*.08,-uTime*.05,uTime*.06));
    float ripple=sin((position.y+position.x*.45+position.z*.25)*2.6 + uTime*1.3)*.04;
    float disp=(n-.5)*(.105+uReaction*.11)+ripple*(.24+uReaction*.34);
    p += normal * disp;
    float silhouette = smoothstep(-1.4,2.5,p.y);
    p.x += sin(p.y*1.35 + uVariant*2.4) * .07 * (0.35 + silhouette);
    p.z += cos(p.y*1.05 + uVariant*1.6) * .045;
    vec4 world = modelMatrix * vec4(p,1.);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const entityFragment = /* glsl */`
  uniform float uTime;
  uniform float uReaction;
  uniform vec3 uBase;
  uniform vec3 uCore;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vWorld;

  float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 x){
    vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){float f=0.;float a=.55;for(int i=0;i<4;i++){f+=a*noise(p);p*=2.03;a*=.5;}return f;}
  void main(){
    vec3 n=normalize(vNormal);
    vec3 v=normalize(cameraPosition-vWorld);
    float fres=pow(1.-max(dot(n,v),0.),3.1);
    float mineral=fbm(vPos*2.7+vec3(0.,uTime*.03,0.));
    float fissure=smoothstep(.66,.92,mineral + sin(vPos.y*6.0 + mineral*4.0)*.14);
    float lambert=max(dot(n,normalize(vec3(-.45,.82,.32))),0.);
    vec3 base=uBase*(.54+lambert*.42)+vec3(.012);
    float glow=fissure*(.10+uReaction*.72)+fres*(.018+uReaction*.05);
    vec3 col=mix(base,uCore,clamp(glow,0.,1.));
    col += uCore * fissure * (.12 + uReaction*.56);
    gl_FragColor=vec4(col,1.);
  }
`;

function makeEntityMaterial(base, core, variant=0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uReaction: { value: 0 },
      uVariant: { value: variant },
      uBase: { value: new THREE.Color(base) },
      uCore: { value: new THREE.Color(core) },
    },
    vertexShader: entityVertex,
    fragmentShader: entityFragment,
  });
}

class Entity {
  constructor({ parent, position = [0, 0, 0], core = '#c9b8a3', base = '#0b0a09', variant = 'ale', scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.group.position.set(...position);
    this.group.scale.setScalar(scale);
    parent.add(this.group);
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.reaction = 0; this.meet = 0; this.variant = variant; this.side = variant === 'kim' ? -1 : 1;
    this.material = new THREE.MeshStandardMaterial({ color:new THREE.Color(base), roughness:.985, metalness:0, emissive:new THREE.Color(core), emissiveIntensity:.006, envMapIntensity:.12 });
    this.body = new MarchingCubes(qualityTier === 'high' ? 38 : 30, this.material, true, true, 75000);
    this.body.enableUvs=false; this.body.enableColors=false; this.body.scale.set(1.18,2.0,.92); this.body.position.y=1.42; this.body.rotation.y=variant==='kim'?.22:-.18; this.visual.add(this.body);
    this.inner = new THREE.Mesh(new THREE.IcosahedronGeometry(.34,3),new THREE.MeshBasicMaterial({color:core,transparent:true,opacity:.012,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.inner.position.set(variant==='kim'?-.10:.11,1.42,.13); this.inner.scale.set(.75,1.35,.5); this.visual.add(this.inner);
    this.contactAnchor=new THREE.Object3D(); this.contactAnchor.position.set(this.side*.72,1.48,.03); this.visual.add(this.contactAnchor);
    const pCount=qualityTier==='high'?160:96,pArr=new Float32Array(pCount*3); this.particleBase=[];
    for(let i=0;i<pCount;i++){const a=Math.random()*Math.PI*2,r=.28+Math.random()*.78,p=new THREE.Vector3(Math.cos(a)*r*.42,.1+Math.random()*2.9,Math.sin(a)*r*.26);this.particleBase.push(p);pArr.set([p.x,p.y,p.z],i*3)}
    this.particleGeo=new THREE.BufferGeometry();this.particleGeo.setAttribute('position',new THREE.BufferAttribute(pArr,3));
    this.particleMat=new THREE.PointsMaterial({color:core,size:variant==='ale'?.021:.017,transparent:true,opacity:variant==='ale'?.07:.035,depthWrite:false,blending:THREE.AdditiveBlending});
    this.particles=new THREE.Points(this.particleGeo,this.particleMat);this.visual.add(this.particles); this.rebuildField(0,0,0);
  }
  rebuildField(t,reaction,meet){
    const b=this.body;b.reset();const drift=Math.sin(t*.31+(this.variant==='kim'?1.6:.2))*.012,unstable=this.variant==='ale'?Math.sin(t*.73)*.014*reaction:Math.sin(t*.42)*.006*reaction;
    const add=(x,y,z,str=.86,sub=11.6)=>b.addBall(x,y,z,str,sub);
    add(.50+drift,.24,.50,.96,11.2);add(.45+unstable,.34,.50,.92,11.4);add(.54-unstable*.7,.45,.49,.88,11.6);
    add(this.variant==='kim'?.47:.54,.56,.50,.83,11.7);add(this.variant==='kim'?.44:.56,.66,.50,.76,11.9);add(this.variant==='kim'?.48:.52,.74,.50,.66,12.1);
    add(this.variant==='kim'?.58:.39,.48,.52,.66,12.0);add(this.variant==='kim'?.38:.61,.31,.48,.61,12.2);
    const reach=smoother(meet);if(reach>.002){const n=qualityTier==='high'?8:6;for(let i=0;i<n;i++){const u=(i+1)/n,x=.5+this.side*(.09+u*(.24+reach*.18)),y=.55+Math.sin(u*Math.PI)*.035+Math.sin(t*.8+u*4.)*.006,z=.50+Math.sin(u*Math.PI*2+t*.25)*.012;add(x,y,z,.58+reach*.13*(1-u*.4),12.5)}}
    b.update();this.contactAnchor.position.set(this.side*(.60+reach*1.05),1.47+Math.sin(t*.7)*.025,.02);
  }
  handWorld(){return this.contactAnchor.getWorldPosition(new THREE.Vector3())}
  update(t,reaction=this.reaction,meet=this.meet){
    this.reaction=THREE.MathUtils.lerp(this.reaction,reaction,.05);this.meet=THREE.MathUtils.lerp(this.meet,meet,.055);this.rebuildField(t,this.reaction,this.meet);
    this.visual.position.y=.32+Math.sin(t*.54+(this.variant==='kim'?1.4:.2))*.055;this.visual.rotation.z=Math.sin(t*.27+(this.variant==='kim'?1.1:0))*.028;this.visual.rotation.x=Math.cos(t*.22+(this.variant==='kim'?.4:1.8))*.012;
    const breathe=1+Math.sin(t*.72+(this.variant==='kim'?.7:0))*.012+this.reaction*.008;this.body.scale.set(1.18*breathe,2.0/breathe,.92*breathe);this.material.emissiveIntensity=.005+this.reaction*.016+this.meet*.065;
    this.inner.material.opacity=.008+this.reaction*.032+this.meet*.11;this.inner.scale.set(.75*(1+this.meet*.18),1.35*(1+this.reaction*.09),.5*(1+this.meet*.08));
    const attr=this.particleGeo.attributes.position,escape=this.variant==='ale'?(.025+this.reaction*.09):(.012+this.reaction*.036);
    for(let i=0;i<this.particleBase.length;i++){const p=this.particleBase[i],curlX=Math.sin(t*.47+i*.83+p.y*1.4)+Math.cos(t*.21+i*.18+p.z*3.),curlZ=Math.cos(t*.39+i*.57+p.x*2.6)-Math.sin(t*.18+i*.12+p.y),leak=(this.variant==='ale'&&i%11===0?this.reaction*.42:0);attr.setXYZ(i,p.x+curlX*escape*.22,p.y+Math.sin(t*.33+i*.41)*escape*.4+leak,p.z+curlZ*escape*.18)}
    attr.needsUpdate=true;this.particleMat.opacity=(this.variant==='ale'?.055:.026)+this.reaction*(this.variant==='ale'?.25:.11)+this.meet*.12;
  }
}

// ---------- CONCERT ----------
const concertFloor = new THREE.Mesh(
  new THREE.CircleGeometry(28, 100),
  new THREE.MeshStandardMaterial({ color: '#090706', roughness: 0.98, metalness: 0.03 })
);
concertFloor.rotation.x = -Math.PI / 2;
concertRoot.add(concertFloor);

const arenaShell = new THREE.Mesh(
  new THREE.CylinderGeometry(31, 31, 18, 100, 1, true),
  new THREE.MeshStandardMaterial({ color: '#020202', side: THREE.BackSide, roughness: 1 })
);
arenaShell.position.y = 9;
concertRoot.add(arenaShell);

for (const [r, y, color, opacity] of [[17, 4, '#672314', 0.72], [21, 6.5, '#4b170d', 0.42], [26, 9.2, '#31110c', 0.28]]) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.09, 8, 160),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  concertRoot.add(ring);
}

const stage = new THREE.Group();
stage.position.set(0, 0.45, -18.5); concertRoot.add(stage);
const stageBody = new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 7.5), new THREE.MeshStandardMaterial({ color: '#13100e', roughness: 0.72, metalness: 0.1 }));
stage.add(stageBody);
const stageBack = new THREE.Mesh(new THREE.BoxGeometry(11, 5.8, 0.5), new THREE.MeshStandardMaterial({ color: '#1a1512', roughness: 0.5, metalness: 0.08 }));
stageBack.position.set(0, 3.2, -2.7); stage.add(stageBack);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.65), new THREE.MeshBasicMaterial({ map: textTexture('RAWA', { width: 1024, height: 256, color: '#ffb368', font: '900 170px Inter, Arial, sans-serif' }), transparent: true }));
sign.position.set(0, 3.35, -2.38); stage.add(sign);
const stageBars = [];
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 18; c++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.16), new THREE.MeshBasicMaterial({ color: c % 3 === 0 ? '#ffcb7a' : '#ff6f21', transparent: true, opacity: 0.6 }));
    bar.position.set(-5.4 + c * 0.64, 0.6, -2.05 + r * 1.0);
    stage.add(bar);
    stageBars.push(bar);
  }
}

const concertBeams = [];
for (let i = 0; i < 18; i++) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 22, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff6122' : '#ffbf6a', transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
  );
  cone.position.set((i - 8.5) * 1.6, 10.4, -16.2);
  cone.rotation.z = (i - 8.5) * 0.04;
  concertRoot.add(cone);
  concertBeams.push(cone);
}

const orbRoot = new THREE.Group();
orbRoot.position.set(0, 10.5, -16.5); concertRoot.add(orbRoot);
const orb = new THREE.Mesh(new THREE.SphereGeometry(5.2, 72, 58), new THREE.MeshStandardMaterial({ color: '#ffe6b3', emissive: '#ff9d2e', emissiveIntensity: 18, roughness: 0.28, metalness: 0 }));
orbRoot.add(orb);
const orbHalos = [];
for (const [r, o, c] of [[6.3, 0.16, '#ff9b31'], [8.1, 0.06, '#ff691f'], [10.3, 0.018, '#ffd988']]) {
  const h = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
  orbRoot.add(h); orbHalos.push(h);
}
const orbLight = new THREE.PointLight('#ff9a29', 1150, 88, 2); orbRoot.add(orbLight);

const crowdGeo = new THREE.DodecahedronGeometry(1, 0);
const crowdMat = new THREE.MeshStandardMaterial({ color: '#070606', roughness: 1 });
const crowdData = [];
for (let i = 0; i < 3100; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 4.8 + Math.pow(Math.random(), 0.62) * 24;
  const x = Math.cos(a) * r * 0.98;
  const z = Math.sin(a) * r * 0.82 - 3.8;
  if (z > 17 || z < -24 || Math.abs(x) > 27) continue;
  if (Math.abs(x) < 2.9 && z > -0.5 && z < 14) continue;
  crowdData.push({ x, z, s: 0.34 + Math.random() * 0.92, seed: Math.random() * 20, lean: (Math.random() - 0.5) * 0.22 });
}
const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdData.length);
crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
concertRoot.add(crowd);
const crowdDummy = new THREE.Object3D();
function updateCrowd(t, intimacy = 0) {
  for (let i = 0; i < crowdData.length; i++) {
    const p = crowdData[i];
    const beat = (Math.sin(t * 4.7 + p.seed) + 1) * 0.5;
    const sway = Math.sin(t * 1.3 + p.seed) * 0.09 * (1 - intimacy * 0.76);
    crowdDummy.position.set(p.x + sway, p.s * (0.56 + beat * 0.05), p.z);
    crowdDummy.rotation.set(0, p.seed, p.lean + sway * 0.9);
    crowdDummy.scale.set(0.34 * p.s, 2.18 * p.s * (1 + beat * 0.05), 0.34 * p.s);
    crowdDummy.updateMatrix();
    crowd.setMatrixAt(i, crowdDummy.matrix);
  }
  crowd.instanceMatrix.needsUpdate = true;
}

function ambientPoints(count, area, color, size, opacity, parent) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * area.x;
    arr[i * 3 + 1] = Math.random() * area.y;
    arr[i * 3 + 2] = (Math.random() - 0.5) * area.z;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); parent.add(pts); return pts;
}
const concertDust = ambientPoints(900, { x: 54, y: 16, z: 54 }, '#ff7c26', 0.045, 0.24, concertRoot);

const concertAle = new Entity({ parent: concertRoot, position: [-1.4, 0, 14.2], core: '#b9c1c9', variant: 'ale', scale: 1.1 });
const concertKim = new Entity({ parent: concertRoot, position: [1.6, 0, 2.2], core: '#d59763', variant: 'kim', scale: 1.08 });

const bondGeo = new THREE.BufferGeometry();
const bondArr = new Float32Array(52 * 3); bondGeo.setAttribute('position', new THREE.BufferAttribute(bondArr, 3));
const bondMat = new THREE.LineBasicMaterial({ color: '#ffd2a5', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const bond = new THREE.Line(bondGeo, bondMat); concertRoot.add(bond);
function updateBond(t, meet = 0) {
  const a = concertAle.handWorld(), b = concertKim.handWorld();
  const attr = bondGeo.attributes.position;
  for (let i = 0; i < 52; i++) {
    const u = i / 51;
    tmp.lerpVectors(a, b, u);
    const env = Math.sin(u * Math.PI);
    tmp.y += Math.sin(u * Math.PI * 5 + t * 2.5) * 0.06 * env;
    tmp.x += Math.cos(u * Math.PI * 4 + t * 1.2) * 0.05 * env;
    attr.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  attr.needsUpdate = true;
  bondMat.opacity = Math.max(0, (proximity - 0.52) / 0.48) * 0.52 + meet * 0.48;
}

// ---------- ATMOSPHERE / SKY ----------
function createSkyDome(radius=90) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSeason: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-.35,.65,.25).normalize() },
      uCloud: { value: .45 }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime; uniform float uSeason; uniform vec3 uSunDir; uniform float uCloud;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float f=0.;float a=.52;for(int i=0;i<4;i++){f+=noise(p)*a;p*=2.03;a*=.5;}return f;}
      void main(){
        float h=clamp(vDir.y*.5+.5,0.,1.);
        float s=clamp(uSeason,0.,4.);
        vec3 desertH=vec3(.66,.53,.39), desertZ=vec3(.32,.42,.50);
        vec3 winterH=vec3(.82,.84,.84), winterZ=vec3(.42,.50,.57);
        vec3 springH=vec3(.72,.78,.73), springZ=vec3(.34,.52,.62);
        vec3 lavH=vec3(.93,.67,.52), lavZ=vec3(.32,.43,.61);
        vec3 ascH=vec3(.97,.79,.68), ascZ=vec3(.21,.34,.58);
        vec3 H=mix(desertH,winterH,smoothstep(.55,1.05,s));
        H=mix(H,springH,smoothstep(1.25,2.0,s)); H=mix(H,lavH,smoothstep(2.1,3.0,s)); H=mix(H,ascH,smoothstep(3.1,4.0,s));
        vec3 Z=mix(desertZ,winterZ,smoothstep(.55,1.05,s));
        Z=mix(Z,springZ,smoothstep(1.25,2.0,s)); Z=mix(Z,lavZ,smoothstep(2.1,3.0,s)); Z=mix(Z,ascZ,smoothstep(3.1,4.0,s));
        vec3 col=mix(H,Z,pow(h,.62));
        float cloudNoise=fbm(vDir*3.2+vec3(uTime*.006,0.,uTime*.003));
        float cloud=smoothstep(.54,.74,cloudNoise)*smoothstep(.46,.72,vDir.y)*uCloud;
        col=mix(col,vec3(.93,.91,.87),cloud*.42);
        float sun=pow(max(dot(normalize(vDir),normalize(uSunDir)),0.),180.);
        float glow=pow(max(dot(normalize(vDir),normalize(uSunDir)),0.),16.);
        col += vec3(1.0,.58,.27)*sun*1.4 + vec3(1.0,.55,.28)*glow*.18;
        gl_FragColor=vec4(col,1.);
      }`
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,48,32),mat);
  return {mesh,material:mat};
}

function windField(x,z,t,strength=1){
  const gust=.28+Math.pow(Math.max(0,Math.sin(t*.31)),5)*1.25;
  const a=Math.sin(t*.93+x*.18+z*.095);
  const b=Math.sin(t*.47-x*.07+z*.16+2.4);
  const c=Math.cos(t*.22+x*.025-z*.04);
  return {x:(a*.62+b*.28+c*.1)*.14*gust*strength,z:(b*.35+a*.15)*.09*gust*strength,gust};
}

// ---------- ROOM ----------
const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(34, 46), new THREE.MeshStandardMaterial({ color: '#11100f', roughness: .97, metalness: .015 }));
roomFloor.rotation.x=-Math.PI/2; roomRoot.add(roomFloor);
const roomCeil = new THREE.Mesh(new THREE.PlaneGeometry(34,46), new THREE.MeshStandardMaterial({color:'#050505',roughness:1,side:THREE.DoubleSide}));
roomCeil.position.y=12.5; roomCeil.rotation.x=Math.PI/2; roomRoot.add(roomCeil);
for(const [x,z,ry,w] of [[-17,0,Math.PI/2,46],[17,0,Math.PI/2,46],[0,-18,0,34],[0,18,0,34]]){
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(w,12.5),new THREE.MeshStandardMaterial({color:'#0a0908',roughness:.98,side:THREE.DoubleSide}));
  wall.position.set(x,6.25,z); wall.rotation.y=ry; roomRoot.add(wall);
}
// Architectural monoliths give the void scale without filling it with decoration.
for(const [x,z,sx,sy,sz] of [[-8,-5,2.2,8,3.6],[7,-9,3.4,5.6,2.4],[-5,8,1.6,4.2,2.0]]){
  const slab=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color:'#15120f',roughness:.94}));
  slab.position.set(x,sy/2,z); roomRoot.add(slab);
}
const roomGlow=new THREE.PointLight('#e6c29e',14,28,2); roomGlow.position.set(-7,8,4); roomRoot.add(roomGlow);
const roomBackLight=new THREE.PointLight('#8d7059',7,22,2); roomBackLight.position.set(0,4,-13); roomRoot.add(roomBackLight);

const portalFrame=new THREE.Group(); portalFrame.position.set(0,0,-17.25); roomRoot.add(portalFrame);
const portalFrameMat=new THREE.MeshStandardMaterial({color:'#18140f',roughness:.98,metalness:0});
const portalBars=[
  [new THREE.BoxGeometry(.72,9.7,.95),[-3.65,4.85,0]],
  [new THREE.BoxGeometry(.72,9.7,.95),[3.65,4.85,0]],
  [new THREE.BoxGeometry(8.0,.72,.95),[0,9.34,0]],
  [new THREE.BoxGeometry(8.0,.32,.95),[0,.18,0]]
];
for(const [g,p] of portalBars){const m=new THREE.Mesh(g,portalFrameMat);m.position.set(...p);portalFrame.add(m)}

// Real-time portal: a second scene is rendered into this surface.
const portalTarget=new THREE.WebGLRenderTarget(640,896,{depthBuffer:true});
portalTarget.texture.colorSpace=THREE.SRGBColorSpace;
const portalMat=new THREE.ShaderMaterial({
  uniforms:{tPortal:{value:portalTarget.texture},uTime:{value:0},uIntensity:{value:.15}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    uniform sampler2D tPortal;uniform float uTime;uniform float uIntensity;varying vec2 vUv;
    void main(){
      vec2 uv=vUv;vec2 c=uv-.5;float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float membrane=1.-smoothstep(.02,.18,edge);
      float wave=sin(uv.y*14.+uTime*.55)+cos(uv.x*11.-uTime*.37)+sin((uv.x+uv.y)*9.+uTime*.22);
      vec2 warp=vec2(wave,cos(uv.y*13.+uTime*.31)-sin(uv.x*8.-uTime*.29))*.00085*(1.+uIntensity*3.)*(.28+membrane*.9);
      vec3 col=texture2D(tPortal,uv+warp).rgb;
      float r=texture2D(tPortal,uv+warp*1.65).r;float b=texture2D(tPortal,uv-warp*1.3).b;col=mix(col,vec3(r,col.g,b),.08*uIntensity);
      float rim=pow(membrane,2.)*(.035+.08*uIntensity);col+=vec3(1.,.72,.46)*rim;
      gl_FragColor=vec4(col,1.);
    }`,
  depthWrite:true,
});
const portalPlane=new THREE.Mesh(new THREE.PlaneGeometry(6.45,8.62),portalMat);
portalPlane.position.set(0,4.72,.48); portalFrame.add(portalPlane);
const portalVeil=new THREE.Mesh(new THREE.PlaneGeometry(6.6,8.8),new THREE.MeshBasicMaterial({color:'#f5cf9d',transparent:true,opacity:.055,blending:THREE.AdditiveBlending,depthWrite:false}));
portalVeil.position.set(0,4.72,.52); portalFrame.add(portalVeil);
const portalHalo=new THREE.PointLight('#f3bb78',44,20,2); portalHalo.position.set(0,4.5,1.8); portalFrame.add(portalHalo);

const portalScene=new THREE.Scene(); portalScene.fog=new THREE.FogExp2('#d4c6b5',.025);
const portalCam=new THREE.PerspectiveCamera(44,640/896,.1,80); portalCam.position.set(0,2.6,8); portalCam.lookAt(0,1.5,-12);
const pSky=createSkyDome(55); portalScene.add(pSky.mesh);
const pGroundMat=new THREE.MeshStandardMaterial({color:'#866f59',roughness:1});
const pGroundGeo=new THREE.PlaneGeometry(26,50,28,40); const pPos=pGroundGeo.attributes.position;
for(let i=0;i<pPos.count;i++){const x=pPos.getX(i),y=pPos.getY(i);pPos.setZ(i,Math.sin(x*.42)*.18+Math.sin(y*.21+x*.13)*.22)}pPos.needsUpdate=true;pGroundGeo.computeVertexNormals();
const pGround=new THREE.Mesh(pGroundGeo,pGroundMat); pGround.rotation.x=-Math.PI/2;pGround.position.z=-15;portalScene.add(pGround);
portalScene.add(new THREE.HemisphereLight('#d8dfe0','#685947',1.2));
const pSun=new THREE.DirectionalLight('#ffd1a0',2.1);pSun.position.set(-10,16,8);portalScene.add(pSun);
const pStemMat=new THREE.MeshStandardMaterial({color:'#50634a',roughness:.96,transparent:true,opacity:.72});
const pBudMat=new THREE.MeshStandardMaterial({color:'#76529a',roughness:.92,transparent:true,opacity:.78});
const pStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.024,.8,5),pStemMat,170);
const pBuds=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.09,0),pBudMat,170); portalScene.add(pStems,pBuds);
const pData=[];
for(let i=0;i<170;i++){const x=(Math.random()-.5)*18,z=-2-Math.random()*36,s=.65+Math.random()*.9,rot=Math.random()*6.28;pData.push({x,z,s,rot,seed:Math.random()*9});crowdDummy.position.set(x,.4,z);crowdDummy.scale.set(.7*s,s,.7*s);crowdDummy.rotation.y=rot;crowdDummy.updateMatrix();pStems.setMatrixAt(i,crowdDummy.matrix);crowdDummy.position.set(x,.85*s,z);crowdDummy.scale.set(1.0*s,1.45*s,.86*s);crowdDummy.updateMatrix();pBuds.setMatrixAt(i,crowdDummy.matrix)}
pStems.instanceMatrix.needsUpdate=pBuds.instanceMatrix.needsUpdate=true;
const pDust=ambientPoints(260,{x:22,y:8,z:42},'#f5d9b2',.045,.24,portalScene);

// TouchDesigner-inspired membrane field, subtle enough to remain architectural.
const portalFlowCount=420, portalFlowBase=[], portalFlowArr=new Float32Array(portalFlowCount*3);
for(let i=0;i<portalFlowCount;i++){const edge=Math.random()<.5?-1:1;const x=(Math.random()<.5?edge*(3.4+Math.random()*.5):(Math.random()-.5)*7.2);const y=.4+Math.random()*8.8;const z=-16.4+Math.random()*2.4;const v=new THREE.Vector3(x,y,z);portalFlowBase.push(v);portalFlowArr.set([x,y,z],i*3)}
const portalFlowGeo=new THREE.BufferGeometry();portalFlowGeo.setAttribute('position',new THREE.BufferAttribute(portalFlowArr,3));
const portalFlowMat=new THREE.PointsMaterial({color:'#eac59b',size:.035,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending});
const portalFlow=new THREE.Points(portalFlowGeo,portalFlowMat);roomRoot.add(portalFlow);

const roomAle=new Entity({parent:roomRoot,position:[-.9,0,9.2],core:'#c1c3c5',variant:'ale',scale:1.07});
const roomKim=new Entity({parent:roomRoot,position:[1.5,0,7.0],core:'#c9ad96',variant:'kim',scale:1.03});

// ---------- MEMORY TUNNEL ----------
// No sci-fi torus rings: the crossing is made from fragments, ribbons and memory residue.
const tunnelFragments=[];
const rawTex=textTexture('RAWA',{width:1024,height:256,color:'#ffae61',font:'900 170px Inter, Arial, sans-serif'});
for(let i=0;i<14;i++){
  let mesh;
  if(i%4===0){mesh=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.35),new THREE.MeshBasicMaterial({map:rawTex,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));}
  else if(i%4===1){mesh=new THREE.Mesh(new THREE.SphereGeometry(.65+Math.random()*1.1,20,16),new THREE.MeshBasicMaterial({color:'#ff9f42',wireframe:true,transparent:true,opacity:.13,blending:THREE.AdditiveBlending}));}
  else if(i%4===2){mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.6+Math.random()*.8,1),new THREE.MeshBasicMaterial({color:'#b8a28e',wireframe:true,transparent:true,opacity:.11,blending:THREE.AdditiveBlending}));}
  else {mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,4.2),new THREE.MeshBasicMaterial({color:'#76549b',transparent:true,opacity:.06,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));}
  mesh.position.set((Math.random()-.5)*8,(Math.random()-.5)*7,-5-i*4.6); mesh.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);tunnelRoot.add(mesh);tunnelFragments.push(mesh);
}
const tunnelParticles=ambientPoints(1700,{x:13,y:13,z:120},'#f0cba6',.032,.38,tunnelRoot);
const tunnelLavParticles=ambientPoints(650,{x:11,y:11,z:105},'#8061a7',.04,.22,tunnelRoot);
const tunnelLines=[];
for(let i=0;i<10;i++){
  const pts=[];for(let j=0;j<52;j++){const z=-j*1.8;pts.push(new THREE.Vector3(Math.sin(j*.23+i)*(.8+i*.12),Math.cos(j*.17+i*1.2)*(.5+i*.07),z))}
  const geo=new THREE.BufferGeometry().setFromPoints(pts);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:i%2?'#d9b28e':'#8c6aae',transparent:true,opacity:.08,blending:THREE.AdditiveBlending}));tunnelRoot.add(line);tunnelLines.push(line);
}

// ---------- MEADOW / WEATHER ----------
const meadowFloorMat=new THREE.MeshStandardMaterial({color:'#866f58',roughness:1,metalness:0});
const meadowFloorGeo=new THREE.PlaneGeometry(120,150,90,110); const mf=meadowFloorGeo.attributes.position;
for(let i=0;i<mf.count;i++){const x=mf.getX(i),y=mf.getY(i);const h=Math.sin(x*.075)*.32+Math.sin(y*.052+x*.031)*.54+Math.sin((x+y)*.019)*.65;mf.setZ(i,h)}mf.needsUpdate=true;meadowFloorGeo.computeVertexNormals();
const meadowFloor=new THREE.Mesh(meadowFloorGeo,meadowFloorMat);meadowFloor.rotation.x=-Math.PI/2;meadowFloor.position.z=-28;meadowRoot.add(meadowFloor);
const meadowSky=createSkyDome(105);meadowRoot.add(meadowSky.mesh);
const meadowHemi=new THREE.HemisphereLight('#ced8de','#71604d',1.08);meadowRoot.add(meadowHemi);
const meadowSun=new THREE.DirectionalLight('#ffd5a0',2.2);meadowSun.position.set(-18,22,12);meadowRoot.add(meadowSun);
const ridgeMatA=new THREE.MeshStandardMaterial({color:'#6f765f',roughness:1,transparent:true,opacity:.62});
const ridgeMatB=new THREE.MeshStandardMaterial({color:'#59675b',roughness:1,transparent:true,opacity:.42});
const meadowRidges=[];
for(const [x,y,z,sx,sy,sz,mat] of [[-34,-5,-92,48,12,16,ridgeMatA],[28,-6,-103,58,14,18,ridgeMatB],[0,-7,-116,74,17,22,ridgeMatB]]){
  const hill=new THREE.Mesh(new THREE.SphereGeometry(1,32,18),mat);hill.position.set(x,y,z);hill.scale.set(sx,sy,sz);meadowRoot.add(hill);meadowRidges.push(hill);
}
const cloudTex=cloudTexture();const meadowClouds=[];
for(let i=0;i<(qualityTier==='high'?20:11);i++){
  const mat=new THREE.SpriteMaterial({map:cloudTex,color:'#fffaf4',transparent:true,opacity:.035,depthWrite:false});
  const sp=new THREE.Sprite(mat);sp.position.set((Math.random()-.5)*110,16+Math.random()*16,-28-Math.random()*95);const sc=16+Math.random()*26;sp.scale.set(sc,sc*.42,1);meadowRoot.add(sp);meadowClouds.push(sp);
}

const dryMat=new THREE.MeshStandardMaterial({color:'#8d775e',roughness:1,transparent:true,opacity:.42});
const snowMat=new THREE.MeshStandardMaterial({color:'#dfe2e1',roughness:1,transparent:true,opacity:0});
const grassMat=new THREE.MeshStandardMaterial({color:'#52684a',roughness:.98,transparent:true,opacity:0});
const lavStemMat=new THREE.MeshStandardMaterial({color:'#4e6246',roughness:1,transparent:true,opacity:0});
const lavLeafMat=new THREE.MeshStandardMaterial({color:'#42583d',roughness:1,transparent:true,opacity:0});
const lavBudMatA=new THREE.MeshStandardMaterial({color:'#6d4d8f',roughness:.96,transparent:true,opacity:0});
const lavBudMatB=new THREE.MeshStandardMaterial({color:'#8061a6',roughness:.96,transparent:true,opacity:0});
const lavBudMatC=new THREE.MeshStandardMaterial({color:'#5e437c',roughness:.96,transparent:true,opacity:0});
const lavBudMatD=new THREE.MeshStandardMaterial({color:'#9270b2',roughness:.96,transparent:true,opacity:0});
const lavBudMatE=new THREE.MeshStandardMaterial({color:'#654a83',roughness:.96,transparent:true,opacity:0});
const dryStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.025,.6,4),dryMat,700);
const snowStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.009,.017,.42,4),snowMat,520);
const grass=new THREE.InstancedMesh(new THREE.CylinderGeometry(.006,.014,.55,3),grassMat,1150);
const LAV_COUNT=qualityTier==='high'?980:620;
const lavenderStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.011,.021,.92,6),lavStemMat,LAV_COUNT);
const lavenderLeafL=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.012,.34,5),lavLeafMat,LAV_COUNT);
const lavenderLeafR=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.012,.31,5),lavLeafMat,LAV_COUNT);
const flowerGeoA=new THREE.IcosahedronGeometry(.075,1);
const flowerGeoB=new THREE.IcosahedronGeometry(.062,1);
const lavenderBudA=new THREE.InstancedMesh(flowerGeoA,lavBudMatA,LAV_COUNT);
const lavenderBudB=new THREE.InstancedMesh(flowerGeoA,lavBudMatB,LAV_COUNT);
const lavenderBudC=new THREE.InstancedMesh(flowerGeoB,lavBudMatC,LAV_COUNT);
const lavenderBudD=new THREE.InstancedMesh(flowerGeoB,lavBudMatD,LAV_COUNT);
const lavenderBudE=new THREE.InstancedMesh(flowerGeoB,lavBudMatE,LAV_COUNT);
meadowRoot.add(dryStems,snowStems,grass,lavenderStems,lavenderLeafL,lavenderLeafR,lavenderBudA,lavenderBudB,lavenderBudC,lavenderBudD,lavenderBudE);

const dryData=[],snowData=[],grassData=[],lavenderData=[];
function fillSimple(mesh,count,targetArray,spreadX,zStart,zDepth,baseY,minS,maxS){
  for(let i=0;i<count;i++){const pos=new THREE.Vector3((Math.random()-.5)*spreadX,baseY,zStart-Math.random()*zDepth);const rot=Math.random()*6.28,scl=minS+Math.random()*(maxS-minS);targetArray.push({pos,rot,scl,seed:Math.random()*20,rise:.4+Math.random()*1.3});crowdDummy.position.copy(pos);crowdDummy.rotation.y=rot;crowdDummy.scale.setScalar(scl);crowdDummy.updateMatrix();mesh.setMatrixAt(i,crowdDummy.matrix)}mesh.instanceMatrix.needsUpdate=true;
}
fillSimple(dryStems,700,dryData,68,-6,72,.28,.55,1.3);
fillSimple(snowStems,520,snowData,62,-8,68,.20,.5,1.2);
fillSimple(grass,1150,grassData,76,-7,80,.26,.55,1.4);
for(let i=0;i<LAV_COUNT;i++){
  // density bands create natural lavender masses and corridors instead of uniform noise
  const band=(Math.random()<.66?1:-1);const x=band*(4+Math.pow(Math.random(),.72)*27)+(Math.random()-.5)*5;const z=-16-Math.random()*66;const scl=.68+Math.random()*.95;const rot=Math.random()*6.28;const baseY=.45;lavenderData.push({pos:new THREE.Vector3(x,baseY,z),rot,scl,seed:Math.random()*30,rise:.7+Math.random()*1.8});
}

function updateLavenderInstances(t,windStrength=1,rise=0,disintegrate=0){
  for(let i=0;i<lavenderData.length;i++){
    const d=lavenderData[i],w=windField(d.pos.x,d.pos.z,t+d.seed,windStrength);const leanX=w.x,leanZ=w.z;const y=d.pos.y;
    const stemScale=d.scl*(1-disintegrate*.06);
    crowdDummy.position.set(d.pos.x,y,d.pos.z);crowdDummy.rotation.set(leanZ,d.rot,leanX);crowdDummy.scale.set(.78*stemScale,stemScale,.78*stemScale);crowdDummy.updateMatrix();lavenderStems.setMatrixAt(i,crowdDummy.matrix);

    const setLeaf=(mesh,side,offY,len)=>{
      crowdDummy.position.set(d.pos.x+leanX*offY+side*.065*Math.cos(d.rot),y+offY*d.scl,d.pos.z+leanZ*offY+side*.065*Math.sin(d.rot));
      crowdDummy.rotation.set(leanZ*.8,d.rot,side*.48+leanX*.45);
      crowdDummy.scale.set(.72*d.scl,len*d.scl,.72*d.scl);crowdDummy.updateMatrix();mesh.setMatrixAt(i,crowdDummy.matrix);
    };
    setLeaf(lavenderLeafL,-1,.48,.82);setLeaf(lavenderLeafR,1,.58,.72);

    const setBud=(mesh,offY,angle,scaleMul,rad=.05)=>{
      const twist=d.rot+angle;
      crowdDummy.position.set(
        d.pos.x+leanX*offY+Math.cos(twist)*rad*d.scl,
        y+offY*d.scl+rise*(.22+d.rise),
        d.pos.z+leanZ*offY+Math.sin(twist)*rad*d.scl
      );
      crowdDummy.rotation.set(leanZ*.7,twist,leanX*.7);
      crowdDummy.scale.set(.86*d.scl*scaleMul,1.28*d.scl*scaleMul,.86*d.scl*scaleMul);
      crowdDummy.updateMatrix();mesh.setMatrixAt(i,crowdDummy.matrix);
    };
    setBud(lavenderBudA,.78,.2,1,.025);
    setBud(lavenderBudB,.91,1.9,.93,.055);
    setBud(lavenderBudC,1.03,3.7,.82,.05);
    setBud(lavenderBudD,1.12,5.0,.70,.032);
    setBud(lavenderBudE,.96,4.6,.68,.07);
  }
  [lavenderStems,lavenderLeafL,lavenderLeafR,lavenderBudA,lavenderBudB,lavenderBudC,lavenderBudD,lavenderBudE].forEach(m=>m.instanceMatrix.needsUpdate=true);
}
updateLavenderInstances(0,0);

const meadowDust=ambientPoints(560,{x:74,y:12,z:86},'#bda789',.044,.12,meadowRoot);
const meadowSnow=ambientPoints(460,{x:72,y:14,z:84},'#f0f5f7',.052,0,meadowRoot);
const meadowWarm=ambientPoints(720,{x:70,y:12,z:82},'#ffd8a6',.04,0,meadowRoot);

// Flower fragments for the ascension: thousands of individual points, not whole cones moving upward.
const petalBase=[]; const petalArr=new Float32Array(lavenderData.length*3*3);
for(let i=0;i<lavenderData.length;i++){const d=lavenderData[i];for(let j=0;j<3;j++){const k=i*3+j;const y=.78+j*.16;const v=new THREE.Vector3(d.pos.x+(Math.random()-.5)*.13,d.pos.y+y*d.scl,d.pos.z+(Math.random()-.5)*.13);petalBase.push(v);petalArr.set([v.x,v.y,v.z],k*3)}}
const petalGeo=new THREE.BufferGeometry();petalGeo.setAttribute('position',new THREE.BufferAttribute(petalArr,3));
const petalMat=new THREE.PointsMaterial({color:'#8d6ab2',size:.055,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const lavenderPetals=new THREE.Points(petalGeo,petalMat);meadowRoot.add(lavenderPetals);

const ascensionLines=[];
for(let i=0;i<12;i++){const pts=[];for(let j=0;j<48;j++){const y=j*.48;pts.push(new THREE.Vector3(Math.sin(j*.19+i)*(.3+i*.12),y,Math.cos(j*.13+i)*(.25+i*.09)-28))}const geo=new THREE.BufferGeometry().setFromPoints(pts);const mat=new THREE.LineBasicMaterial({color:i%3===0?'#e7c29f':'#8c6baa',transparent:true,opacity:0,blending:THREE.AdditiveBlending});const l=new THREE.Line(geo,mat);meadowRoot.add(l);ascensionLines.push(l)}

const meadowAle=new Entity({parent:meadowRoot,position:[-1.2,0,14],core:'#c1c3c5',variant:'ale',scale:1.07});
const meadowKim=new Entity({parent:meadowRoot,position:[1.25,0,12],core:'#c9ad96',variant:'kim',scale:1.03});

function updateInstancedRise(mesh,source,amount,bob=0,t=0){
  for(let i=0;i<source.length;i++){const d=source[i];crowdDummy.position.set(d.pos.x,d.pos.y+amount*d.rise+Math.sin(t*.9+i*.17)*bob*amount,d.pos.z);crowdDummy.rotation.y=d.rot+amount*.35;crowdDummy.scale.setScalar(d.scl*(1+amount*.08));crowdDummy.updateMatrix();mesh.setMatrixAt(i,crowdDummy.matrix)}mesh.instanceMatrix.needsUpdate=true;
}

// ---------- FALL / THE STORM ----------
function createLineRain(parent,count,color='#9aa8b5',opacity=.24,height=34,spreadX=54,spreadZ=70){
  const positions=new Float32Array(count*6),drops=[];
  for(let i=0;i<count;i++){
    const d={x:(Math.random()-.5)*spreadX,y:Math.random()*height,z:(Math.random()-.5)*spreadZ-12,speed:13+Math.random()*20,length:.55+Math.random()*1.45,drift:.35+Math.random()*.85};
    drops.push(d);positions.set([d.x,d.y,d.z,d.x+d.length*.22,d.y-d.length,d.z+d.length*.06],i*6);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.LineSegments(geometry,material);parent.add(mesh);
  return {mesh,geometry,material,drops,height,spreadX,spreadZ};
}

function tickLineRain(system,dt,direction=1,speed=1,wind=.18){
  const attr=system.geometry.attributes.position;
  for(let i=0;i<system.drops.length;i++){
    const d=system.drops[i];d.y-=dt*d.speed*direction*speed;d.x-=dt*d.drift*wind*direction;
    if(direction>=0&&d.y<-.8){d.y=system.height+Math.random()*5;d.x=(Math.random()-.5)*system.spreadX;}
    if(direction<0&&d.y>system.height+5){d.y=-1-Math.random()*4;d.x=(Math.random()-.5)*system.spreadX;}
    attr.setXYZ(i*2,d.x,d.y,d.z);attr.setXYZ(i*2+1,d.x+d.length*.22,d.y-d.length*direction,d.z+d.length*.06);
  }
  attr.needsUpdate=true;
}

const fallSkyMat=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  uniforms:{uTime:{value:0},uOpen:{value:0},uFlash:{value:0}},
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    varying vec3 vDir;uniform float uTime;uniform float uOpen;uniform float uFlash;
    float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    void main(){
      float h=clamp(vDir.y*.5+.5,0.,1.);float storm=noise(vDir*5.5+vec3(uTime*.025,0.,uTime*.011));
      vec3 low=vec3(.015,.019,.025),high=vec3(.055,.071,.092);vec3 col=mix(low,high,pow(h,.7));
      col+=vec3(.055,.065,.08)*smoothstep(.46,.72,storm)*(1.-uOpen*.45);
      float aperture=pow(max(vDir.y,0.),5.);col=mix(col,vec3(.39,.47,.55),aperture*uOpen*.72);col+=uFlash*vec3(.42,.48,.58);
      gl_FragColor=vec4(col,1.);
    }`
});
const fallSky=new THREE.Mesh(new THREE.SphereGeometry(115,40,28),fallSkyMat);fallRoot.add(fallSky);
const fallWorld=new THREE.Group();fallRoot.add(fallWorld);fallWorld.visible=false;
const fallDescent=new THREE.Group();fallRoot.add(fallDescent);

const fallFloorGeo=new THREE.PlaneGeometry(96,118,38,44),ffp=fallFloorGeo.attributes.position;
for(let i=0;i<ffp.count;i++){const x=ffp.getX(i),y=ffp.getY(i);ffp.setZ(i,Math.sin(x*.22+y*.11)*.24+Math.cos(y*.075-x*.08)*.62-Math.abs(x)*.006)}
ffp.needsUpdate=true;fallFloorGeo.computeVertexNormals();
const fallFloor=new THREE.Mesh(fallFloorGeo,new THREE.MeshStandardMaterial({color:'#0a0d10',roughness:.9,metalness:.08}));fallFloor.rotation.x=-Math.PI/2;fallFloor.position.z=-20;fallWorld.add(fallFloor);
const fallWater=new THREE.Mesh(new THREE.PlaneGeometry(72,84),new THREE.MeshPhysicalMaterial({color:'#101922',roughness:.18,metalness:.32,transparent:true,opacity:.58}));
fallWater.rotation.x=-Math.PI/2;fallWater.position.set(5,.03,-23);fallWorld.add(fallWater);

const ruinMat=new THREE.MeshStandardMaterial({color:'#111317',roughness:.98,metalness:.02});
const ruinLayout=[[-18,2,-10,3,7,2,.18],[-13,1.2,-24,7,2.5,2,-.34],[15,2.8,-17,2.4,9,2,.27],[21,1.1,-35,9,2.2,2,-.16],[-24,1.8,-44,4,6,3,.46],[7,1.4,-48,12,2.5,2,.08],[27,2.2,-56,3,7,3,-.29]];
for(const [x,y,z,sx,sy,sz,rz] of ruinLayout){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),ruinMat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rz*.4,rz,rz);fallWorld.add(m)}

const brokenDoor=new THREE.Group();brokenDoor.position.set(9,0,-24);brokenDoor.rotation.y=-.34;fallWorld.add(brokenDoor);
for(const [sx,sy,sz,x,y,rz] of [[.48,8,.7,-2.4,4,.08],[.48,7.1,.7,2.4,3.5,-.17],[5.2,.48,.7,0,7.55,.09]]){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),ruinMat);m.position.set(x,y,0);m.rotation.z=rz;brokenDoor.add(m)}
const rawaGhost=new THREE.Mesh(new THREE.PlaneGeometry(8,2),new THREE.MeshBasicMaterial({map:textTexture('RAWA',{color:'#8b817a',font:'900 138px Inter, Arial'}),transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}));
rawaGhost.position.set(-13,3.6,-34);rawaGhost.rotation.set(-.18,.4,.09);fallWorld.add(rawaGhost);

const deadFlowerCount=qualityTier==='high'?320:170;
const deadFlowers=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.02,.75,4),new THREE.MeshStandardMaterial({color:'#282421',roughness:1}),deadFlowerCount);
for(let i=0;i<deadFlowerCount;i++){const x=(Math.random()-.5)*58,z=-5-Math.random()*67,s=.5+Math.random()*1.15;crowdDummy.position.set(x,.26,z);crowdDummy.scale.set(.8*s,s,.8*s);crowdDummy.rotation.set((Math.random()-.5)*.7,Math.random()*6.28,(Math.random()-.5)*.7);crowdDummy.updateMatrix();deadFlowers.setMatrixAt(i,crowdDummy.matrix)}
deadFlowers.instanceMatrix.needsUpdate=true;fallWorld.add(deadFlowers);

const descentFragments=[];
for(let i=0;i<(qualityTier==='high'?72:38);i++){
  const g=i%3===0?new THREE.TetrahedronGeometry(.22+Math.random()*.65,0):new THREE.BoxGeometry(.2+Math.random()*.8,.2+Math.random()*1.6,.12+Math.random()*.55);
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:i%7===0?'#4d3d54':'#17191d',roughness:.9,transparent:true,opacity:.28+Math.random()*.35}));
  m.userData.base=new THREE.Vector3((Math.random()-.5)*24,(Math.random()-.5)*72,(Math.random()-.5)*34-10);m.userData.spin=new THREE.Vector3(Math.random()*.03,Math.random()*.04,Math.random()*.025);m.position.copy(m.userData.base);fallDescent.add(m);descentFragments.push(m);
}

const fallRain=createLineRain(fallRoot,qualityTier==='high'?860:440,'#8292a1',.22,38,64,82);
const fallHemi=new THREE.HemisphereLight('#4b5866','#030405',.58);fallRoot.add(fallHemi);
const fallFill=new THREE.PointLight('#8399ad',7,38,2);fallFill.position.set(-4,7,10);fallRoot.add(fallFill);
const fallLightning=new THREE.DirectionalLight('#b9d6ee',0);fallLightning.position.set(-12,28,9);fallRoot.add(fallLightning);
const returnBeacon=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,2),new THREE.MeshBasicMaterial({color:'#d8c6b4',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));returnBeacon.position.set(0,2,-31);fallWorld.add(returnBeacon);
const returnLight=new THREE.PointLight('#e7cdb4',0,38,2);returnLight.position.copy(returnBeacon.position);fallWorld.add(returnLight);
const fallAle=new Entity({parent:fallWorld,position:[0,0,8],core:'#6d7881',variant:'ale',scale:1.07});
const fallKim=new Entity({parent:fallWorld,position:[0,0,-31],core:'#e1c4a9',variant:'kim',scale:1.04});fallKim.group.visible=false;
fallAle.material.color.set('#192027');fallKim.material.color.set('#1d1815');

// ---------- REUNION / WATER ----------
const reunionSkyMat=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,uniforms:{uTime:{value:0},uWarm:{value:0}},
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vDir;uniform float uTime;uniform float uWarm;void main(){float h=clamp(vDir.y*.5+.5,0.,1.);vec3 a=mix(vec3(.055,.065,.075),vec3(.16,.12,.15),uWarm);vec3 b=mix(vec3(.28,.32,.35),vec3(.48,.31,.31),uWarm);float band=.018*sin(vDir.x*18.+uTime*.035)+.012*sin(vDir.z*27.-uTime*.02);gl_FragColor=vec4(mix(a,b,pow(h,.8))+band,1.);}`
});
const reunionSky=new THREE.Mesh(new THREE.SphereGeometry(105,40,28),reunionSkyMat);reunionRoot.add(reunionSky);
const reunionWater=new THREE.Mesh(new THREE.PlaneGeometry(100,118,30,36),new THREE.MeshPhysicalMaterial({color:'#10171d',roughness:.2,metalness:.36,transparent:true,opacity:.84}));reunionWater.rotation.x=-Math.PI/2;reunionWater.position.z=-20;reunionRoot.add(reunionWater);
const reunionHemi=new THREE.HemisphereLight('#a7b0b6','#111216',.88);reunionRoot.add(reunionHemi);
const reunionKey=new THREE.DirectionalLight('#d8c5b7',1.65);reunionKey.position.set(-12,18,10);reunionRoot.add(reunionKey);
const reunionFill=new THREE.PointLight('#9babb7',7,38,2);reunionFill.position.set(0,7,12);reunionRoot.add(reunionFill);
const reunionGlow=new THREE.PointLight('#efc3a6',0,30,2);reunionGlow.position.set(0,2,-7);reunionRoot.add(reunionGlow);

const reunionRidges=[];
for(const [x,y,z,sx,sy,sz] of [[-34,-7,-68,42,11,16],[28,-8,-78,48,13,18],[0,-10,-96,70,16,20]]){const m=new THREE.Mesh(new THREE.SphereGeometry(1,26,14),new THREE.MeshStandardMaterial({color:'#182025',roughness:1,transparent:true,opacity:.55}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);reunionRoot.add(m);reunionRidges.push(m)}
const reunionRain=createLineRain(reunionRoot,qualityTier==='high'?640:320,'#c5ced4',.18,32,62,74);
const rippleMat=new THREE.MeshBasicMaterial({color:'#aebbc3',transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
const reunionRipples=[];
for(let i=0;i<(qualityTier==='high'?34:18);i++){const r=new THREE.Mesh(new THREE.RingGeometry(.8,1,36),rippleMat.clone());r.rotation.x=-Math.PI/2;r.position.set((Math.random()-.5)*42,.035,-2-Math.random()*50);r.userData.phase=Math.random()*8;r.userData.speed=.35+Math.random()*.6;r.scale.setScalar(.1);reunionRoot.add(r);reunionRipples.push(r)}
const reunionMist=ambientPoints(qualityTier==='high'?520:270,{x:62,y:8,z:74},'#d4d7d5',.038,.08,reunionRoot);
const reunionAle=new Entity({parent:reunionRoot,position:[-1.5,0,9],core:'#82919b',variant:'ale',scale:1.07});
const reunionKim=new Entity({parent:reunionRoot,position:[1.2,0,-8],core:'#e1b99d',variant:'kim',scale:1.04});
reunionAle.material.color.set('#15191c');reunionKim.material.color.set('#1c1715');
const reunionBondGeo=new THREE.BufferGeometry();reunionBondGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(72*3),3));
const reunionBondMat=new THREE.LineBasicMaterial({color:'#efc8ad',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
const reunionBond=new THREE.Line(reunionBondGeo,reunionBondMat);reunionRoot.add(reunionBond);

function updateReunionBond(t,amount){
  const a=reunionAle.handWorld(),b=reunionKim.handWorld(),attr=reunionBondGeo.attributes.position;
  for(let i=0;i<72;i++){const u=i/71;tmp.copy(a).lerp(b,u);const envelope=Math.sin(u*Math.PI);attr.setXYZ(i,tmp.x+Math.sin(t*2.1+u*18)*.045*envelope,tmp.y+Math.sin(t*1.45+u*9)*.08*envelope,tmp.z+Math.cos(t*1.8+u*14)*.04*envelope)}
  attr.needsUpdate=true;reunionBondMat.opacity=amount*.72;
}

// ---------- GENESIS ----------
const starCount=qualityTier==='high'?2100:1050,starArr=new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){const r=32+Math.random()*115,a=Math.random()*Math.PI*2,u=Math.random()*2-1,s=Math.sqrt(1-u*u);starArr.set([Math.cos(a)*s*r,u*r,Math.sin(a)*s*r],i*3)}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starArr,3));
const starMat=new THREE.PointsMaterial({color:'#c9d3df',size:.085,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const cosmosStars=new THREE.Points(starGeo,starMat);cosmosRoot.add(cosmosStars);
const genesisCount=qualityTier==='high'?3200:1500,genesisArr=new Float32Array(genesisCount*3),genesisColorArr=new Float32Array(genesisCount*3),genesisStart=[],genesisTarget=[];
const genesisPalette=['#e9c4a7','#a78ec4','#8fb0c8','#f2dfc8','#c07f86'].map(c=>new THREE.Color(c));
for(let i=0;i<genesisCount;i++){
  const start=new THREE.Vector3().randomDirection().multiplyScalar(Math.random()*.32),arm=i%5,r=Math.pow(Math.random(),.62)*31,angle=arm*Math.PI*2/5+r*.26+(Math.random()-.5)*.7;
  const end=new THREE.Vector3(Math.cos(angle)*r,(Math.random()-.5)*(1.2+r*.075),Math.sin(angle)*r*.68),color=genesisPalette[arm].clone().lerp(new THREE.Color('#fff5e7'),Math.random()*.24);genesisStart.push(start);genesisTarget.push(end);genesisArr.set([start.x,start.y,start.z],i*3);genesisColorArr.set([color.r,color.g,color.b],i*3);
}
const genesisGeo=new THREE.BufferGeometry();genesisGeo.setAttribute('position',new THREE.BufferAttribute(genesisArr,3));genesisGeo.setAttribute('color',new THREE.BufferAttribute(genesisColorArr,3));
const genesisMat=new THREE.PointsMaterial({vertexColors:true,size:.075,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const genesisParticles=new THREE.Points(genesisGeo,genesisMat);cosmosRoot.add(genesisParticles);
const genesisCore=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,4),new THREE.MeshBasicMaterial({color:'#ffe1c6',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));cosmosRoot.add(genesisCore);
const genesisLight=new THREE.PointLight('#ffd0ad',0,70,2);cosmosRoot.add(genesisLight);
const genesisRings=[];
for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.012,5,96),new THREE.MeshBasicMaterial({color:i%2?'#a995c8':'#efc6a7',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);cosmosRoot.add(ring);genesisRings.push(ring)}
cosmosRoot.add(new THREE.AmbientLight('#8c7180',.42));

// ---------- AUDIO ----------
async function createAudio() {
  const externalSource=document.documentElement.dataset.audioSrc;
  if(externalSource){
    const ext=new Audio(externalSource);ext.loop=true;ext.preload='auto';ext.volume=.72;
    try{
      await new Promise((res,rej)=>{const ok=()=>res(),bad=()=>rej();ext.addEventListener('canplaythrough',ok,{once:true});ext.addEventListener('error',bad,{once:true});ext.load();setTimeout(bad,1000)});
      await ext.play();
      return {set(p){ext.volume=.66-p*.32},fade(v){ext.volume=v}};
    }catch(error){console.warn('External score unavailable; using the generative soundscape.',error)}
  }
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  const ctx=new AC();
  const master=ctx.createGain();master.gain.value=.66;master.connect(ctx.destination);
  const crowdGain=ctx.createGain();crowdGain.gain.value=.14;crowdGain.connect(master);
  const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
  const arr=buf.getChannelData(0);for(let i=0;i<arr.length;i++)arr[i]=(Math.random()*2-1)*.32;
  const noise=ctx.createBufferSource();noise.buffer=buf;noise.loop=true;
  const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=880;noise.connect(low).connect(crowdGain);noise.start();
  const bassGain=ctx.createGain();bassGain.gain.value=.08;bassGain.connect(master);
  const bass=ctx.createOscillator();bass.type='sine';bass.frequency.value=52;bass.connect(bassGain);bass.start();
  const pulseGain=ctx.createGain();pulseGain.gain.value=.024;pulseGain.connect(master);
  const pulse=ctx.createOscillator();pulse.type='triangle';pulse.frequency.value=104;pulse.connect(pulseGain);pulse.start();ctx.resume();
  return {
    set(p){crowdGain.gain.setTargetAtTime(.14*(1-p*.92),ctx.currentTime,.08);bassGain.gain.setTargetAtTime(.08*(1-p*.5),ctx.currentTime,.08);pulseGain.gain.setTargetAtTime(.024+p*.045,ctx.currentTime,.08)},
    fade(v){master.gain.setTargetAtTime(v,ctx.currentTime,.15)}
  };
}

// ---------- INPUT ----------
function key(e, v) {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keyboard.forward = v;
  if (k === 's' || k === 'arrowdown') keyboard.back = v;
  if (k === 'a' || k === 'arrowleft') keyboard.left = v;
  if (k === 'd' || k === 'arrowright') keyboard.right = v;
}
addEventListener('keydown', (e) => { key(e, true); if (e.key.startsWith('Arrow')) e.preventDefault(); if (started) hint.style.opacity = '.25'; }, { passive: false });
addEventListener('keyup', (e) => key(e, false));
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.48) {
    joyPointer = e.pointerId; joyOrigin.set(e.clientX, e.clientY);
    joystick.style.left = `${e.clientX - 60}px`; joystick.style.top = `${e.clientY - 60}px`; joystick.style.bottom = 'auto'; joystick.classList.remove('hidden');
    return;
  }
  lookPointer = e.pointerId; lastLook.set(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joyPointer) {
    const dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y;
    const len = Math.min(46, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx);
    mobileAxis.set(Math.cos(a) * len / 46, -Math.sin(a) * len / 46);
    joystickKnob.style.transform = `translate(${Math.cos(a) * len}px,${Math.sin(a) * len}px)`;
  } else if (e.pointerId === lookPointer) {
    const dx = e.clientX - lastLook.x, dy = e.clientY - lastLook.y;
    cameraYaw -= dx * 0.0048;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0035, -0.16, 0.58);
    lastLook.set(e.clientX, e.clientY);
  }
});
function releasePointer(e) {
  if (e.pointerId === joyPointer) {
    joyPointer = null; mobileAxis.set(0, 0); joystickKnob.style.transform = 'translate(0,0)'; joystick.classList.add('hidden');
  }
  if (e.pointerId === lookPointer) lookPointer = null;
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

function movementVector() {
  const x = (keyboard.right ? 1 : 0) - (keyboard.left ? 1 : 0) + mobileAxis.x;
  const z = (keyboard.back ? 1 : 0) - (keyboard.forward ? 1 : 0) - mobileAxis.y;
  tmp.set(x, 0, z);
  if (tmp.lengthSq() > 1) tmp.normalize();
  camForward.set(Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  camRight.set(Math.cos(cameraYaw), 0, Math.sin(cameraYaw));
  return new THREE.Vector3().addScaledVector(camForward, -tmp.z).addScaledVector(camRight, tmp.x);
}
function movePlayer(dt, bounds) {
  if (!currentPlayer || transitioning || phase === 'tunnel' || phase === 'ascension' || phase === 'concert_touch' || phase === 'portal_cinematic' || phase === 'meadow_reveal' || phase === 'lavender_reveal' || phase === 'sky_suspension' || phase === 'fracture' || phase === 'fall_descent' || phase === 'fall_impact' || phase === 'kim_returns' || phase === 'rescue_touch' || phase === 'reunion_reveal' || phase === 'reunion_touch' || phase === 'genesis_transition' || phase === 'genesis' || phase === 'complete') return;
  const v = movementVector();
  if (v.lengthSq() > 0.01) {
    v.normalize();
    currentPlayer.group.position.addScaledVector(v, dt * 3.7);
    currentPlayer.group.rotation.y = THREE.MathUtils.lerp(currentPlayer.group.rotation.y, Math.atan2(v.x, v.z), 0.08);
  }
  currentPlayer.group.position.x = THREE.MathUtils.clamp(currentPlayer.group.position.x, bounds.x0, bounds.x1);
  currentPlayer.group.position.z = THREE.MathUtils.clamp(currentPlayer.group.position.z, bounds.z0, bounds.z1);
}

// ---------- SCENE FLOW ----------
async function startRoom() {
  if (transitioning) return;
  transitioning = true;
  fadeToBlack(true); audioSystem?.fade?.(.13); await wait(760);
  concertRoot.visible=false; roomRoot.visible=true; tunnelRoot.visible=false; meadowRoot.visible=false;
  scene.background.set('#070605'); scene.fog=new THREE.FogExp2('#0a0807',.028);
  currentPlayer=roomAle; currentKim=roomKim; roomAle.group.position.set(-.9,0,9.4); roomKim.group.position.set(1.6,0,7.2);
  cameraYaw=0; cameraPitch=.18; proximity=0; proximityBar.style.transform='scaleX(0)'; setPhase('room');
  fadeToBlack(false); showChapter('MEMORY 02','THE ROOM',2200); setHint('EL PORTAL YA ESTÁ ABIERTO');
  await wait(480); transitioning=false;
}

function beginPortalCinematic(){
  if(phase!=='room'||transitioning)return;
  portalCamStart.copy(camera.position);
  portalLookStart.copy(roomAle.group.position).add(new THREE.Vector3(0,1.35,0));
  setPhase('portal_cinematic'); setHint('');
}

async function startTunnel() {
  if (transitioning) return;
  transitioning=true;
  veil.classList.add('portal'); fadeToBlack(true); await wait(280);
  roomRoot.visible=false; tunnelRoot.visible=true; scene.background.set('#020202'); scene.fog=null; setPhase('tunnel');
  camera.fov=56; camera.updateProjectionMatrix();
  fadeToBlack(false); setTimeout(()=>veil.classList.remove('portal'),420);
  await wait(3450);
  veil.classList.add('portal'); fadeToBlack(true); await wait(320);
  tunnelRoot.visible=false; meadowRoot.visible=true; scene.background.set('#b9c2c8'); scene.fog=new THREE.FogExp2('#aeb8bf',.014);
  currentPlayer=meadowAle; currentKim=meadowKim; meadowAle.group.position.set(-1.2,0,14.8); meadowKim.group.position.set(1.3,0,12.6);
  cameraYaw=0; cameraPitch=.2; worldProgress=0; ascendMix=0; lavenderRevealDone=false; setPhase('meadow_reveal'); proximityBar.style.transform='scaleX(0)';
  camera.fov=50; camera.updateProjectionMatrix(); fadeToBlack(false); setTimeout(()=>veil.classList.remove('portal'),420);
  hud.classList.add('hidden'); showChapter('MEMORY 03','THE MEADOW',2500); setHint('');
  transitioning=false;
  await wait(3900);
  if(phase==='meadow_reveal'){setPhase('meadow');hud.classList.remove('hidden');setHint('CAMINA CON ELLA · EL MUNDO CAMBIA A VUESTRO PASO');}

}

function beginAscension() {
  if (phase==='ascension'||transitioning) return;
  setPhase('ascension'); setHint(''); hud.classList.add('hidden');
  showChapter('MEMORY 04','THE ASCENSION',2200);
}

function beginSkySuspension(){
  if(phase!=='ascension')return;
  setPhase('sky_suspension');
  showChapter('INTERLUDE','ABOVE THE CLOUDS',2200);
  meadowFloor.visible=false;dryStems.visible=false;snowStems.visible=false;grass.visible=false;
  lavenderStems.visible=false;lavenderLeafL.visible=false;lavenderLeafR.visible=false;
  [lavenderBudA,lavenderBudB,lavenderBudC,lavenderBudD,lavenderBudE].forEach(m=>m.visible=false);
  meadowRidges.forEach(r=>r.visible=false);
  meadowClouds.forEach(c=>c.material.opacity=.16);
  scene.fog.density=.0035;
}

function beginFall(){
  if(phase!=='sky_suspension'||fallStarted)return;
  fallStarted=true;meadowRidges.forEach(r=>r.visible=false);meadowClouds.forEach(c=>c.material.opacity=.025);setPhase('fracture');setHint('');hud.classList.add('hidden');audioSystem?.fade?.(.07);
  showChapter('MEMORY 05','THE FALL',2200);
}

async function startFallDescent(){
  if(transitioning||phase!=='fracture')return;
  transitioning=true;fadeToBlack(true);await wait(180);
  meadowRoot.visible=false;fallRoot.visible=true;fallDescent.visible=true;fallWorld.visible=false;reunionRoot.visible=false;cosmosRoot.visible=false;
  scene.background.set('#010203');scene.fog=null;camera.fov=68;camera.updateProjectionMatrix();setPhase('fall_descent');
  fadeToBlack(false);await wait(220);transitioning=false;
}

async function landInFallWorld(){
  if(transitioning||phase!=='fall_descent')return;
  transitioning=true;setPhase('fall_impact');fadeToBlack(true);audioSystem?.fade?.(.025);await wait(240);
  fallDescent.visible=false;fallWorld.visible=true;fallAle.group.visible=true;fallKim.group.visible=false;
  fallAle.group.position.set(0,0,8);fallAle.group.scale.setScalar(1.07);fallKim.group.position.set(0,0,-31);fallKim.group.scale.setScalar(1.04);
  returnBeacon.material.opacity=0;returnLight.intensity=0;scene.background.set('#05070a');scene.fog=new THREE.FogExp2('#080b0f',.026);
  currentPlayer=fallAle;currentKim=fallKim;cameraYaw=0;cameraPitch=.06;setPhase('fall_wasteland');
  fadeToBlack(false);showChapter('AFTER THE FALL','THE STORM',2100);setHint('NO HAY PUERTA AQUÍ');hud.classList.remove('hidden');
  await wait(420);transitioning=false;
}

function beginKimReturn(){
  if(returnStarted||phase!=='fall_wasteland')return;
  returnStarted=true;fallKim.group.visible=true;fallKim.group.position.set(0,0,-31);setPhase('kim_returns');setHint('');hud.classList.add('hidden');
  showChapter('','SHE CAME BACK',1900);
}

function beginRescueTouch(){
  if(phase!=='kim_returns')return;
  setPhase('rescue_touch');setHint('');audioSystem?.fade?.(.012);
}

async function startReunion(){
  if(transitioning||reunionStarted)return;
  reunionStarted=true;transitioning=true;fadeToBlack(true);await wait(680);
  fallRoot.visible=false;reunionRoot.visible=true;cosmosRoot.visible=false;
  reunionAle.group.position.set(-1.5,0,9);reunionKim.group.position.set(1.2,0,-8);reunionAle.group.scale.setScalar(1.07);reunionKim.group.scale.setScalar(1.04);
  reunionAle.group.visible=true;reunionKim.group.visible=true;reunionBondMat.opacity=0;reunionGlow.intensity=0;
  scene.background.set('#151b20');scene.fog=new THREE.FogExp2('#343b40',.017);renderer.toneMappingExposure=.94;
  currentPlayer=reunionAle;currentKim=reunionKim;cameraYaw=0;cameraPitch=.12;setPhase('reunion_reveal');
  fadeToBlack(false);showChapter('MEMORY 06','THE REUNION',2300);setHint('');audioSystem?.fade?.(.10);
  await wait(500);transitioning=false;
}

function beginReunionTouch(){
  if(phase!=='reunion')return;
  setPhase('reunion_touch');setHint('');hud.classList.add('hidden');audioSystem?.fade?.(.045);
}

async function startGenesis(){
  if(transitioning||genesisStarted)return;
  genesisStarted=true;transitioning=true;setPhase('genesis_transition');fadeToBlack(true);await wait(720);
  reunionRoot.visible=false;cosmosRoot.visible=true;cosmosRoot.add(reunionAle.group,reunionKim.group);
  reunionAle.group.position.set(-1.25,-.2,0);reunionKim.group.position.set(1.25,.2,0);reunionAle.group.scale.setScalar(1.02);reunionKim.group.scale.setScalar(1.02);
  genesisCore.material.opacity=0;genesisCore.scale.setScalar(.1);genesisLight.intensity=0;genesisMat.opacity=0;starMat.opacity=0;
  genesisRings.forEach(r=>{r.material.opacity=0;r.scale.setScalar(.1)});
  scene.background.set('#000000');scene.fog=null;renderer.toneMappingExposure=1.0;currentPlayer=null;currentKim=null;setPhase('genesis');
  fadeToBlack(false);showChapter('FINAL MEMORY','GENESIS',2200);audioSystem?.fade?.(.08);await wait(420);transitioning=false;
}

async function finishExperience(){
  if(endingStarted)return;
  endingStarted=true;fadeToBlack(true);audioSystem?.fade?.(0);await wait(1450);
  cosmosRoot.visible=false;setPhase('complete');setHint('');hud.classList.add('hidden');showChapter('','AL.KIM.IA',5200);
}

const localPreviewChapter=(location.hostname==='127.0.0.1'||location.hostname==='localhost')?new URLSearchParams(location.search).get('preview'):null;
function startLocalPreview(name){
  concertRoot.visible=roomRoot.visible=tunnelRoot.visible=meadowRoot.visible=fallRoot.visible=reunionRoot.visible=cosmosRoot.visible=false;
  if(name==='fracture'){
    meadowRoot.visible=true;meadowFloor.visible=false;dryStems.visible=false;snowStems.visible=false;grass.visible=false;lavenderStems.visible=false;lavenderLeafL.visible=false;lavenderLeafR.visible=false;[lavenderBudA,lavenderBudB,lavenderBudC,lavenderBudD,lavenderBudE].forEach(m=>m.visible=false);meadowAle.group.position.set(-.42,17.2,-30);meadowKim.group.position.set(.42,17.5,-30.25);scene.background.set('#6b7691');scene.fog=new THREE.FogExp2('#ead4bd',.0035);currentPlayer=null;currentKim=null;setHint('');hud.classList.add('hidden');setPhase('sky_suspension');fallStarted=false;beginFall();
  }else if(name==='descent'){
    fallStarted=true;fallRoot.visible=true;fallDescent.visible=true;fallWorld.visible=false;scene.background.set('#010203');scene.fog=null;currentPlayer=null;currentKim=null;setHint('');hud.classList.add('hidden');setPhase('fall_descent');
  }else if(name==='fall'){
    fallStarted=true;fallRoot.visible=true;fallDescent.visible=false;fallWorld.visible=true;fallAle.group.visible=true;fallKim.group.visible=false;fallAle.group.position.set(0,0,8);fallKim.group.position.set(0,0,-31);
    scene.background.set('#05070a');scene.fog=new THREE.FogExp2('#080b0f',.026);currentPlayer=fallAle;currentKim=fallKim;cameraYaw=0;cameraPitch=.06;setPhase('fall_wasteland');setHint('NO HAY PUERTA AQUÍ');hud.classList.remove('hidden');
  }else if(name==='return'){
    fallStarted=true;fallRoot.visible=true;fallDescent.visible=false;fallWorld.visible=true;fallAle.group.visible=true;fallKim.group.visible=false;fallAle.group.position.set(0,0,5);scene.background.set('#05070a');scene.fog=new THREE.FogExp2('#080b0f',.026);currentPlayer=fallAle;currentKim=fallKim;setPhase('fall_wasteland');returnStarted=false;beginKimReturn();
  }else if(name==='reunion'){
    reunionStarted=true;reunionRoot.visible=true;reunionAle.group.position.set(-1.5,0,5);reunionKim.group.position.set(1.2,0,-7);scene.background.set('#151b20');scene.fog=new THREE.FogExp2('#343b40',.017);currentPlayer=reunionAle;currentKim=reunionKim;setPhase('reunion');setHint('VUELVE A ELLA');hud.classList.remove('hidden');
  }else if(name==='touch'){
    reunionStarted=true;reunionRoot.visible=true;reunionAle.group.position.set(-.78,0,-5);reunionKim.group.position.set(.78,0,-5);scene.background.set('#151b20');scene.fog=new THREE.FogExp2('#343b40',.017);currentPlayer=reunionAle;currentKim=reunionKim;setPhase('reunion');beginReunionTouch();
  }else if(name==='genesis'){
    genesisStarted=true;cosmosRoot.visible=true;cosmosRoot.add(reunionAle.group,reunionKim.group);reunionAle.group.position.set(-1.25,-.2,0);reunionKim.group.position.set(1.25,.2,0);reunionAle.group.scale.setScalar(1.02);reunionKim.group.scale.setScalar(1.02);scene.background.set('#000');scene.fog=null;currentPlayer=null;currentKim=null;setPhase('genesis');setHint('');hud.classList.add('hidden');
  }
}

enterButton.addEventListener('click', async () => {
  started = true;
  intro.classList.add('hidden'); hud.classList.remove('hidden');
  currentPlayer = concertAle; currentKim = concertKim; setPhase('concert');
  showChapter('MEMORY 01', 'THE ENCOUNTER', 1800);
  setHint('ATRAVIESA LA MULTITUD · ENCUÉNTRALA');
  audioSystem = await createAudio();
  if(localPreviewChapter)startLocalPreview(localPreviewChapter);
});
enterButton.disabled=false;
enterButton.removeAttribute('aria-busy');

// ---------- UPDATES ----------
function updateConcert(t, dt) {
  movePlayer(dt, { x0: -8, x1: 8, z0: -0.5, z1: 15 });
  const d = concertAle.group.position.distanceTo(concertKim.group.position);
  proximity = smooth(1 - clamp01((d - 1.8) / 10.5));
  proximityBar.style.transform = `scaleX(${proximity})`;
  audioSystem?.set?.(proximity);

  const touchMix = phase === 'concert_touch' ? smoother(phaseTime() / 2.9) : 0;
  concertAle.update(t, proximity * 0.4 + touchMix * 0.35, touchMix);
  concertKim.update(t, proximity * 0.95 + touchMix * 0.2, touchMix);
  updateBond(t, touchMix);
  updateCrowd(t, proximity * 0.9 + touchMix * 0.4);

  crowdMat.color.lerp(new THREE.Color(proximity > 0.62 ? '#040404' : '#070606'), 0.04);
  intimateLight.position.lerp(concertAle.group.position.clone().lerp(concertKim.group.position, 0.5).add(new THREE.Vector3(0, 2.2, 0)), 0.07);
  intimateLight.intensity = proximity * 42 + touchMix * 25;

  concertDust.rotation.y = t * 0.012;
  concertDust.position.y = Math.sin(t * 0.14) * 0.24;
  stageBars.forEach((b, i) => { b.material.opacity = 0.28 + Math.max(0, Math.sin(t * 6.0 + i * 0.4)) * 0.7; });
  concertBeams.forEach((b, i) => { b.rotation.y = Math.sin(t * 0.46 + i * 0.2) * 0.55; b.material.opacity = 0.02 + Math.max(0, Math.sin(t * 3.8 + i)) * 0.038; });
  const orbPulse = 1 + Math.sin(t * 1.8) * 0.026 + proximity * 0.04;
  orb.scale.setScalar(orbPulse); orbLight.intensity = 1030 + Math.max(0, Math.sin(t * 2.1)) * 280 + proximity * 150;
  orbHalos.forEach((h, i) => h.scale.setScalar(1 + Math.sin(t * (0.44 + i * 0.06) + i) * (0.05 + i * 0.015)));

  if (phase === 'concert' && d < 2.3) {
    setPhase('concert_touch');
    setHint('');
  }
  if (phase === 'concert_touch') {
    const mid = concertAle.group.position.clone().lerp(concertKim.group.position, 0.5);
    concertAle.group.position.lerp(new THREE.Vector3(mid.x - 0.9, 0, mid.z + 0.04), 0.03);
    concertKim.group.position.lerp(new THREE.Vector3(mid.x + 0.9, 0, mid.z - 0.04), 0.03);
    if (phaseTime() > 3.2) startRoom();
  }
}

function updatePortalPreview(t){
  const season=(Math.sin(t*.24)+1)*1.5;
  pSky.material.uniforms.uTime.value=t;
  pSky.material.uniforms.uSeason.value=season;
  pSky.material.uniforms.uCloud.value=.52;
  pGroundMat.color.lerp(season<.9?new THREE.Color('#8c7359'):season<1.6?new THREE.Color('#d6dadb'):season<2.45?new THREE.Color('#627a55'):new THREE.Color('#78905f'),.035);
  pBudMat.opacity=.08+smooth((season-1.7)/1.3)*.84;
  pStemMat.opacity=.22+smooth((season-1.4)/1.1)*.62;
  pSun.intensity=1.25+season*.42;
  pDust.material.opacity=.08+smooth((season-2.1)/.9)*.28;
  if(frame%2===0){
    for(let i=0;i<pData.length;i++){
      const d=pData[i],w=windField(d.x,d.z,t+d.seed,.85);crowdDummy.position.set(d.x,.4,d.z);crowdDummy.rotation.set(w.z,d.rot,w.x);crowdDummy.scale.set(.7*d.s,d.s,.7*d.s);crowdDummy.updateMatrix();pStems.setMatrixAt(i,crowdDummy.matrix);
      crowdDummy.position.set(d.x+w.x*.65,.86*d.s,d.z+w.z*.65);crowdDummy.rotation.set(w.z*.7,d.rot,w.x*.7);crowdDummy.scale.set(d.s,1.45*d.s,.86*d.s);crowdDummy.updateMatrix();pBuds.setMatrixAt(i,crowdDummy.matrix);
    }
    pStems.instanceMatrix.needsUpdate=pBuds.instanceMatrix.needsUpdate=true;
  }
  portalCam.position.x=THREE.MathUtils.clamp(camera.position.x*.08,-.6,.6);
  portalCam.position.y=2.5+THREE.MathUtils.clamp((camera.position.y-3)*.035,-.18,.22);
  portalCam.lookAt(portalCam.position.x*.08,1.5,-12);
  renderer.setRenderTarget(portalTarget);renderer.render(portalScene,portalCam);renderer.setRenderTarget(null);
}

function updatePortalFlow(t,intensity=1){
  const attr=portalFlowGeo.attributes.position;
  for(let i=0;i<portalFlowBase.length;i++){
    const b=portalFlowBase[i];
    const flow=Math.sin(t*.7+i*.17+b.y*.9)+Math.cos(t*.31+b.x*.8-i*.07);
    attr.setXYZ(i,b.x+flow*.055*intensity,b.y+Math.sin(t*.44+i*.11)*.045*intensity,b.z+Math.cos(t*.52+i*.13)*.12*intensity);
  }
  attr.needsUpdate=true;
  portalFlowMat.opacity=.12+intensity*.18;
}

function updateRoom(t,dt){
  movePlayer(dt,{x0:-10,x1:10,z0:-13.2,z1:11});
  roomAle.update(t,.14,0);roomKim.update(t,.18,0);
  if(phase==='room')roomKim.group.position.lerp(roomAle.group.position.clone().add(new THREE.Vector3(2.1,0,-2.0)),.008);
  const doorDist=roomAle.group.position.distanceTo(new THREE.Vector3(0,0,-13.5));
  const portalLife=.5+Math.sin(t*.62)*.5;
  portalMat.uniforms.uTime.value=t;portalMat.uniforms.uIntensity.value=.14+portalLife*.14+(phase==='portal_cinematic'?smooth(phaseTime()/3.85)*.72:0);
  portalVeil.material.opacity=.035+portalLife*.045;
  portalHalo.intensity=38+portalLife*24+(phase==='portal_cinematic'?phaseTime()*8:0);
  roomBackLight.intensity=6+portalLife*3;
  updatePortalFlow(t,phase==='portal_cinematic'?1.8:1);
  updatePortalPreview(t);
  if(phase==='room'){
    if(doorDist<6.2)setHint('LA PRADERA ESTÁ AL OTRO LADO');
    if(doorDist<3.7)beginPortalCinematic();
  } else if(phase==='portal_cinematic'){
    const p=smoother(phaseTime()/3.85);
    portalVeil.material.opacity=.05+p*.14;
    portalFlowMat.size=.035+p*.035;
    roomGlow.intensity=14*(1-p*.72);
    roomBackLight.intensity=7+p*10;
    if(phaseTime()>3.9)startTunnel();
  }
}

function updateTunnel(t){
  const p=phaseTime();
  camera.position.set(Math.sin(p*.47)*.36,Math.sin(p*.61)*.22,3.4-p*14.2);
  camera.rotation.z=Math.sin(p*.75)*.055;
  camera.fov=56+Math.sin(p*.9)*4;camera.updateProjectionMatrix();
  tunnelParticles.rotation.z=p*.055;tunnelLavParticles.rotation.z=-p*.035;
  tunnelParticles.position.z=(p*5)%8;tunnelLavParticles.position.z=(p*3)%6;
  tunnelLines.forEach((l,i)=>{l.rotation.z=Math.sin(t*.23+i)*.14;l.material.opacity=.045+Math.max(0,Math.sin(t*1.5+i*.7))*.09});
  tunnelFragments.forEach((m,i)=>{
    m.rotation.x+=.002+i*.00004;m.rotation.y+=.003*(i%3+1);m.position.x+=Math.sin(t*.5+i)*.0015;
    if(m.material.opacity!==undefined)m.material.opacity=(i%4===0?.08:.045)+Math.max(0,Math.sin(t*1.1+i))*.11;
  });
}

function updateMeadowSeasons(t){
  const zProg=clamp01((14-meadowAle.group.position.z)/58);
  const together=1-clamp01((meadowAle.group.position.distanceTo(meadowKim.group.position)-1.7)/6.5);
  worldProgress=THREE.MathUtils.lerp(worldProgress,zProg*.82+together*.18,.026);

  const desert=1-smooth(worldProgress*1.18);
  const winter=smooth((worldProgress-.11)/.20)*(1-smooth((worldProgress-.39)/.16));
  const spring=smooth((worldProgress-.34)/.24);
  const lavenderPhase=smooth((worldProgress-.58)/.32);

  dryMat.opacity=.16+desert*.52;
  snowMat.opacity=winter*.72;
  grassMat.opacity=spring*.74;
  lavStemMat.opacity=lavenderPhase*.86;lavLeafMat.opacity=lavenderPhase*.78;
  lavBudMatA.opacity=lavenderPhase*.94;lavBudMatB.opacity=lavenderPhase*.92;lavBudMatC.opacity=lavenderPhase*.88;lavBudMatD.opacity=lavenderPhase*.86;lavBudMatE.opacity=lavenderPhase*.84;
  meadowDust.material.opacity=.04+desert*.24;
  meadowSnow.material.opacity=winter*.42;
  meadowWarm.material.opacity=lavenderPhase*.36;
  meadowSky.material.uniforms.uTime.value=t;meadowSky.material.uniforms.uSeason.value=worldProgress*3.15;meadowSky.material.uniforms.uCloud.value=.34+winter*.46+lavenderPhase*.16;

  meadowFloorMat.color.lerp(worldProgress<.15?new THREE.Color('#8d7258'):worldProgress<.38?new THREE.Color('#d7dad9'):worldProgress<.68?new THREE.Color('#657b56'):new THREE.Color('#748b5b'),.026);
  meadowHemi.intensity=.88+spring*.55+lavenderPhase*.45;
  meadowSun.intensity=1.45+spring*.72+lavenderPhase*1.15;
  meadowSun.color.lerp(worldProgress<.35?new THREE.Color('#e8dfd5'):new THREE.Color('#ffd09a'),.025);
  scene.fog.color.lerp(worldProgress<.18?new THREE.Color('#b6aea4'):worldProgress<.4?new THREE.Color('#d8dfe1'):worldProgress<.72?new THREE.Color('#bfcbbd'):new THREE.Color('#e8c8a5'),.025);
  scene.fog.density=.018-winter*.002-lavenderPhase*.004;

  if(worldProgress<.12)setHint('DESIERTO · EL VIENTO MUEVE EL POLVO');
  else if(worldProgress<.38)setHint('INVIERNO · TODO SE DETIENE');
  else if(worldProgress<.68)setHint('LA VIDA SE PROPAGA A VUESTRO ALREDEDOR');
  else if(worldProgress<.94)setHint('PRIMAVERA · LA LAVANDA DESPIERTA');
  else setHint('ACÉRCATE A ELLA');

  return {desert,winter,spring,lavenderPhase};
}

function updateMeadow(t,dt){
  movePlayer(dt,{x0:-17,x1:17,z0:-60,z1:16});
  meadowAle.update(t,.12+worldProgress*.30,0);meadowKim.update(t,.17+worldProgress*.28,0);
  const desiredKim=meadowAle.group.position.clone().add(new THREE.Vector3(1.9,0,-2.7));meadowKim.group.position.lerp(desiredKim,.0105);
  const seasons=updateMeadowSeasons(t);
  if(frame%2===0)updateLavenderInstances(t,.45+seasons.lavenderPhase*1.35,0,0);

  const gWind=windField(meadowAle.group.position.x,meadowAle.group.position.z,t,.65+seasons.spring*.7);
  grass.rotation.z=gWind.x*.12;dryStems.rotation.z=gWind.x*.08;
  meadowWarm.rotation.y+=.001+gWind.gust*.0008;meadowWarm.position.x=Math.sin(t*.13)*.45;
  meadowSnow.position.y=Math.sin(t*.21)*.18;meadowSnow.rotation.y=t*.008;
  meadowClouds.forEach((c,i)=>{const targetOpacity=.025+seasons.winter*.08+seasons.lavenderPhase*.055;c.material.opacity=THREE.MathUtils.lerp(c.material.opacity,targetOpacity,.025);c.position.x+=Math.sin(t*.035+i*.7)*.0015*(.6+seasons.lavenderPhase);});

  // TouchDesigner-like flow field: particles are nudged by a spatial vector field, not uniform drift.
  const warmAttr=meadowWarm.geometry.attributes.position;
  if(warmAttr&&frame%2===0){for(let i=0;i<warmAttr.count;i++){const x=warmAttr.getX(i),y=warmAttr.getY(i),z=warmAttr.getZ(i);const w=windField(x,z,t+i*.013,.32+seasons.lavenderPhase*.6);warmAttr.setXYZ(i,x+w.x*.025,y+Math.sin(t*.3+i*.09)*.006,z+w.z*.018)}warmAttr.needsUpdate=true;}

  if(worldProgress>.72 && !lavenderRevealDone && phase==='meadow'){
    lavenderRevealDone=true;setPhase('lavender_reveal');hud.classList.add('hidden');setHint('');showChapter('SPRING','THE FIELD',1900);
  }
  if(phase==='lavender_reveal' && phaseTime()>4.4){setPhase('meadow');hud.classList.remove('hidden');setHint('ACÉRCATE A ELLA');}
  const close=meadowAle.group.position.distanceTo(meadowKim.group.position)<2.55;
  if(worldProgress>.975&&close&&phase==='meadow')beginAscension();
}

function updateAscension(t){
  ascendMix=smoother(phaseTime()/10.5);
  const lift=smoother((phaseTime()-2.2)/7.5);
  const disintegrate=smoother((phaseTime()-.7)/5.0);
  meadowAle.group.position.x=THREE.MathUtils.lerp(meadowAle.group.position.x,-.5,.018);
  meadowKim.group.position.x=THREE.MathUtils.lerp(meadowKim.group.position.x,.5,.018);
  meadowAle.group.position.z=THREE.MathUtils.lerp(meadowAle.group.position.z,-30,.018);
  meadowKim.group.position.z=THREE.MathUtils.lerp(meadowKim.group.position.z,-30.25,.018);
  meadowAle.group.position.y=lift*17;meadowKim.group.position.y=lift*17.3;
  meadowAle.update(t,.48+ascendMix*.45,ascendMix);meadowKim.update(t,.58+ascendMix*.4,ascendMix);

  if(frame%2===0)updateLavenderInstances(t,1.45,0,disintegrate);
  lavBudMatA.opacity=(1-disintegrate)*.94;lavBudMatB.opacity=(1-disintegrate)*.92;lavBudMatC.opacity=(1-disintegrate)*.88;lavBudMatD.opacity=(1-disintegrate)*.86;lavBudMatE.opacity=(1-disintegrate)*.84;
  lavStemMat.opacity=.82-disintegrate*.24;lavLeafMat.opacity=.74-disintegrate*.38;

  const attr=petalGeo.attributes.position;
  for(let i=0;i<petalBase.length;i++){
    const b=petalBase[i];const delay=(i%37)/37*.42;const a=smoother((ascendMix-delay)/Math.max(.01,1-delay));
    const swirl=Math.sin(t*.7+i*.17+b.x*.15)*(.3+a*1.6);const swirl2=Math.cos(t*.43+i*.11+b.z*.13)*(.2+a*1.2);
    attr.setXYZ(i,b.x+swirl*a,b.y+a*(5+(i%19)*.42)+Math.sin(t+i*.3)*.12*a,b.z+swirl2*a);
  }
  attr.needsUpdate=true;petalMat.opacity=.08+ascendMix*.82;petalMat.size=.045+ascendMix*.035;

  ascensionLines.forEach((l,i)=>{l.material.opacity=Math.max(0,ascendMix-.18)*(.045+(i%4)*.008);l.rotation.y=t*.018+i*.08;l.position.y=lift*2});
  meadowWarm.material.opacity=.28+ascendMix*.5;meadowWarm.position.y=ascendMix*3.5;meadowWarm.scale.setScalar(1+ascendMix*.5);
  meadowSky.material.uniforms.uTime.value=t;meadowSky.material.uniforms.uSeason.value=3+ascendMix;meadowSky.material.uniforms.uCloud.value=.52+ascendMix*.22;
  scene.fog.color.lerp(new THREE.Color('#ead4bd'),.025);scene.fog.density=.012-ascendMix*.006;
  meadowSun.intensity=2.6+ascendMix*2.8;meadowHemi.intensity=1.35+ascendMix*1.0;
  if(phaseTime()>1.1&&currentHint!=='')setHint('');
  if(phaseTime()>11.2)beginSkySuspension();
}


function updateSkySuspension(t){
  const p=smoother(phaseTime()/6.0);
  meadowAle.update(t,.86,.72);meadowKim.update(t,.92,.76);
  meadowAle.group.position.y=17.2+Math.sin(t*.32)*.16;meadowKim.group.position.y=17.5+Math.sin(t*.32+.8)*.16;
  meadowAle.group.position.x=THREE.MathUtils.lerp(meadowAle.group.position.x,-.42,.018);meadowKim.group.position.x=THREE.MathUtils.lerp(meadowKim.group.position.x,.42,.018);
  const attr=petalGeo.attributes.position;
  for(let i=0;i<petalBase.length;i++){
    const a=i*.071+t*.17;const r=4.2+(i%31)*.12;const y=16+(i%53)*.17+Math.sin(a*1.7)*.45;
    attr.setXYZ(i,Math.cos(a)*r*.72,y, -30+Math.sin(a)*r*.5);
  }
  attr.needsUpdate=true;petalMat.opacity=.34;petalMat.size=.055;
  meadowSky.material.uniforms.uTime.value=t;meadowSky.material.uniforms.uSeason.value=4;meadowSky.material.uniforms.uCloud.value=.72;
  meadowClouds.forEach((c,i)=>{c.material.opacity=.10+.08*Math.sin(t*.12+i*.7)*.5+.04;c.position.x+=Math.sin(t*.03+i)*.0025;});
  renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,1.16,.02);
  if(phaseTime()>7.2)beginFall();
}

function updateFracture(t){
  const pt=phaseTime(),p=smoother(pt/3.55),drop=smoother((pt-.85)/2.55);
  meadowKim.update(t,.74,.46*(1-p));meadowAle.update(t,.94,Math.max(0,.72-p*.8));
  meadowKim.group.position.y=17.5+Math.sin(t*.31)*.12;meadowKim.group.position.x=THREE.MathUtils.lerp(.42,3.2,p);meadowKim.group.position.z=-30.25;
  meadowAle.group.position.y=17.2-drop*27;meadowAle.group.position.x=THREE.MathUtils.lerp(-.42,-4.2,p);meadowAle.group.position.z=THREE.MathUtils.lerp(-30,-27.5,p);meadowAle.group.rotation.z=-drop*.72;
  const attr=petalGeo.attributes.position;
  for(let i=0;i<petalBase.length;i++){
    const a=i*.071+t*.17,r=4.2+(i%31)*.12,tear=drop*(.8+(i%9)*.08);
    attr.setXYZ(i,Math.cos(a)*r*.72+Math.sin(i*.31)*tear*4,16+(i%53)*.17+Math.sin(a*1.7)*.45+tear*(i%2?3:-3),-30+Math.sin(a)*r*.5+Math.cos(i*.19)*tear*3);
  }
  attr.needsUpdate=true;petalMat.opacity=.34*(1-p)+.12;petalMat.size=.055+.035*p;
  meadowSky.material.uniforms.uTime.value=t;meadowSky.material.uniforms.uCloud.value=.72+p*.28;
  meadowClouds.forEach(c=>{c.material.opacity=THREE.MathUtils.lerp(c.material.opacity,.008,.12)});
  meadowSun.intensity=THREE.MathUtils.lerp(5.4,.18,p);meadowHemi.intensity=THREE.MathUtils.lerp(2.2,.25,p);
  scene.fog.color.lerp(new THREE.Color('#202632'),.08);scene.fog.density=THREE.MathUtils.lerp(.0035,.018,p);
  renderer.toneMappingExposure=THREE.MathUtils.lerp(1.16,.34,p);
  if(pt>3.65)startFallDescent();
}

function updateFallDescent(t,dt){
  const pt=phaseTime(),p=smoother(pt/6.7);
  tickLineRain(fallRain,dt,1,1.75,1.05);
  fallRain.material.opacity=.18+p*.28;fallSkyMat.uniforms.uTime.value=t;fallSkyMat.uniforms.uOpen.value=0;
  const flash=Math.pow(Math.max(0,Math.sin(t*2.37)+Math.sin(t*.71)*.45-.92),8);fallSkyMat.uniforms.uFlash.value=flash;fallLightning.intensity=flash*9;
  descentFragments.forEach((m,i)=>{
    const b=m.userData.base;m.position.set(b.x+Math.sin(t*.7+i)*.8,((b.y+pt*(23+i%5*1.7)+38)%76)-38,b.z+Math.cos(t*.45+i*.3)*.55);
    m.rotation.x+=m.userData.spin.x;m.rotation.y+=m.userData.spin.y;m.rotation.z+=m.userData.spin.z;
  });
  renderer.toneMappingExposure=THREE.MathUtils.lerp(.48,.72,flash);
  if(pt>6.75)landInFallWorld();
}

function updateFallWorld(t,dt){
  const pt=phaseTime(),rescue=phase==='rescue_touch'?smoother(pt/5.6):0,reverse=rescue>.72?-1:1;
  tickLineRain(fallRain,dt,reverse,Math.max(.05,1-rescue*.92),1.35*(1-rescue*.7));
  fallRain.material.opacity=.25*(1-rescue*.45);fallSkyMat.uniforms.uTime.value=t;fallSkyMat.uniforms.uOpen.value=rescue;
  const flash=(1-rescue)*Math.pow(Math.max(0,Math.sin(t*1.71)+Math.sin(t*.43)*.48-.9),8);fallSkyMat.uniforms.uFlash.value=flash;fallLightning.intensity=flash*13;
  fallWater.material.roughness=.18+Math.sin(t*.23)*.03+rescue*.24;rawaGhost.material.opacity=.035+.03*Math.max(0,Math.sin(t*.37))*(1-rescue);
  returnBeacon.rotation.y=t*.4;returnBeacon.rotation.x=t*.27;

  if(phase==='fall_wasteland'){
    movePlayer(dt,{x0:-18,x1:18,z0:-27,z1:11});fallAle.update(t,.82,.02);fallKim.update(t,.18,0);
    returnBeacon.material.opacity=smooth((pt-2.5)/5)*.14;returnLight.intensity=smooth((pt-3)/5)*2.8;
    if(pt>9.0||fallAle.group.position.z<-7)beginKimReturn();
  }else if(phase==='kim_returns'){
    const q=smoother(pt/6.0),tx=fallAle.group.position.x+1.35,tz=fallAle.group.position.z-1.15;
    fallKim.group.position.set(THREE.MathUtils.lerp(0,tx,q),0,THREE.MathUtils.lerp(-31,tz,q));
    fallAle.update(t,.78,.03+q*.08);fallKim.update(t,.24+q*.38,q*.18);
    returnBeacon.material.opacity=.14-q*.07;returnBeacon.position.lerp(fallKim.group.position.clone().add(new THREE.Vector3(0,1.55,0)),.08);returnLight.position.copy(returnBeacon.position);returnLight.intensity=3+q*15;
    if(pt>6.05)beginRescueTouch();
  }else if(phase==='rescue_touch'){
    const mid=fallAle.group.position.clone().lerp(fallKim.group.position,.5);
    fallAle.group.position.lerp(new THREE.Vector3(mid.x-.78,0,mid.z),.035);fallKim.group.position.lerp(new THREE.Vector3(mid.x+.78,0,mid.z),.035);
    fallAle.group.rotation.z=THREE.MathUtils.lerp(fallAle.group.rotation.z,0,.04);fallAle.update(t,.82*(1-rescue)+.18,rescue);fallKim.update(t,.42+rescue*.5,rescue);
    returnBeacon.material.opacity=.07*(1-rescue);returnLight.intensity=15+rescue*34;fallHemi.intensity=.58+rescue*1.12;
    renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,.96,.018);
    if(pt>6.15)startReunion();
  }
}

function updateReunion(t,dt){
  const pt=phaseTime(),touch=phase==='reunion_touch'?smoother(pt/5.4):0;
  tickLineRain(reunionRain,dt,1,Math.max(.015,1-touch*.97),.25);
  reunionRain.material.opacity=.18*(1-touch*.72);reunionSkyMat.uniforms.uTime.value=t;reunionSkyMat.uniforms.uWarm.value=touch;
  reunionMist.rotation.y=t*.006;reunionMist.material.opacity=.07+touch*.12;reunionWater.material.color.lerp(new THREE.Color(touch>.3?'#2c1e25':'#10171d'),.025);
  reunionRidges.forEach((r,i)=>{r.position.y+=Math.sin(t*.11+i)*.0007;});
  reunionRipples.forEach((r,i)=>{const q=(t*r.userData.speed+r.userData.phase)%1;r.scale.setScalar(.2+q*3.1);r.material.opacity=(1-q)*(.045+touch*.055);});

  if(phase==='reunion_reveal'){
    reunionAle.update(t,.25,0);reunionKim.update(t,.34,0);updateReunionBond(t,0);
    if(pt>4.0){setPhase('reunion');hud.classList.remove('hidden');setHint('VUELVE A ELLA');}
  }else if(phase==='reunion'){
    movePlayer(dt,{x0:-16,x1:16,z0:-31,z1:12});reunionAle.update(t,.28,0);reunionKim.update(t,.38,0);updateReunionBond(t,0);
    const d=reunionAle.group.position.distanceTo(reunionKim.group.position);proximity=1-clamp01((d-1.7)/8);proximityBar.style.transform=`scaleX(${proximity})`;
    if(d<2.55)beginReunionTouch();
  }else if(phase==='reunion_touch'){
    const mid=reunionAle.group.position.clone().lerp(reunionKim.group.position,.5);
    reunionAle.group.position.lerp(new THREE.Vector3(mid.x-.76,0,mid.z),.035);reunionKim.group.position.lerp(new THREE.Vector3(mid.x+.76,0,mid.z),.035);
    reunionAle.update(t,.36+touch*.6,touch);reunionKim.update(t,.48+touch*.48,touch);updateReunionBond(t,touch);
    reunionGlow.position.copy(mid).add(new THREE.Vector3(0,1.6,0));reunionGlow.intensity=touch*38;reunionKey.intensity=1+touch*1.8;reunionHemi.intensity=.72+touch*.6;
    renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,1.08,.022);
    if(pt>5.8)startGenesis();
  }
}

function updateGenesis(t){
  const pt=phaseTime(),fuse=smoother((pt-.25)/3.25),hush=smooth((pt-3.55)/.65)*(1-smooth((pt-4.75)/.45)),burst=smoother((pt-4.75)/6.15);
  reunionAle.group.position.set(THREE.MathUtils.lerp(-1.25,-.12,fuse),THREE.MathUtils.lerp(-.2,0,fuse),0);
  reunionKim.group.position.set(THREE.MathUtils.lerp(1.25,.12,fuse),THREE.MathUtils.lerp(.2,0,fuse),0);
  reunionAle.group.scale.setScalar(1.02*(1-fuse*.78));reunionKim.group.scale.setScalar(1.02*(1-fuse*.78));
  reunionAle.update(t,.48+fuse*.5,fuse);reunionKim.update(t,.56+fuse*.42,fuse);
  reunionAle.group.visible=burst<.08;reunionKim.group.visible=burst<.08;

  genesisCore.material.opacity=Math.max(0,fuse*(1-hush*.98)*(1-burst*.82));genesisCore.scale.setScalar(.12+fuse*.9+burst*1.8);genesisCore.rotation.y=t*.31;genesisCore.rotation.x=t*.17;
  genesisLight.intensity=fuse*24+Math.pow(Math.max(0,1-Math.abs(burst-.04)*12),3)*85;
  const attr=genesisGeo.attributes.position;
  for(let i=0;i<genesisCount;i++){
    const s=genesisStart[i],e=genesisTarget[i],delay=(i%43)/43*.16,q=smoother((burst-delay)/Math.max(.01,1-delay));
    attr.setXYZ(i,THREE.MathUtils.lerp(s.x,e.x,q),THREE.MathUtils.lerp(s.y,e.y,q),THREE.MathUtils.lerp(s.z,e.z,q));
  }
  attr.needsUpdate=true;genesisMat.opacity=smooth((pt-2.5)/.7)*(1-hush)*(.28+burst*.72);genesisMat.size=.055+burst*.065;
  starMat.opacity=burst*.72;cosmosStars.rotation.y=t*.004;cosmosStars.rotation.x=Math.sin(t*.03)*.05;
  genesisRings.forEach((r,i)=>{const q=smoother((burst-i*.035)/Math.max(.01,1-i*.035));r.scale.setScalar(.1+q*(8+i*4.8));r.material.opacity=q*(1-q)*.44;r.rotation.z+=.001*(i+1);});
  renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,hush>.5?.18:1.04,.05);
  if(pt>13.3)finishExperience();
}

function updateCamera(t){
  if(!started){
    camera.fov=50;camera.updateProjectionMatrix();
    camera.position.set(Math.sin(t*.06)*3.5,13,26);camera.lookAt(0,5.5,-14);return;
  }
  if(phase==='tunnel'||phase==='fall_impact'||phase==='genesis_transition'||phase==='complete')return;

  if(phase==='fracture'){
    const p=smoother(phaseTime()/3.55),mid=meadowAle.group.position.clone().lerp(meadowKim.group.position,.5).add(new THREE.Vector3(0,1.7,0));
    desired.set(mid.x+THREE.MathUtils.lerp(1.2,.4,p),mid.y+THREE.MathUtils.lerp(2.8,2.0,p),mid.z+THREE.MathUtils.lerp(18,21,p));
    target.copy(mid);camera.position.lerp(desired,.09);camera.fov=THREE.MathUtils.lerp(50,61,p);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='fall_descent'){
    const pt=phaseTime();camera.position.set(Math.sin(pt*.73)*.55,3.5+Math.sin(pt*.41)*.4,5+Math.cos(pt*.29)*.35);
    target.set(Math.sin(pt*.37)*1.5,-7,-7);camera.fov=66+Math.sin(pt*.8)*4;camera.updateProjectionMatrix();camera.lookAt(target);camera.rotateZ(Math.sin(pt*.66)*.075);return;
  }

  if(phase==='fall_wasteland'){
    const p=fallAle.group.position;camera.position.lerp(new THREE.Vector3(p.x,p.y+1.62,p.z),.2);
    target.set(p.x+Math.sin(cameraYaw)*7,p.y+1.5+Math.sin(cameraPitch)*4,p.z-Math.cos(cameraYaw)*7);camera.fov=THREE.MathUtils.lerp(camera.fov,57,.07);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='kim_returns'){
    const p=smoother(phaseTime()/6),mid=fallAle.group.position.clone().lerp(fallKim.group.position,.5),a=THREE.MathUtils.lerp(-.7,1.05,p),r=THREE.MathUtils.lerp(12,8.2,p);
    desired.set(mid.x+Math.cos(a)*r,THREE.MathUtils.lerp(5.4,4.0,p),mid.z+Math.sin(a)*r);target.set(mid.x,1.55,mid.z);camera.position.lerp(desired,.055);camera.fov=THREE.MathUtils.lerp(camera.fov,47,.045);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='rescue_touch'){
    const p=smoother(phaseTime()/5.6),mid=fallAle.group.position.clone().lerp(fallKim.group.position,.5),a=.8+p*.65,r=8.2-p*.9;
    desired.set(mid.x+Math.cos(a)*r,4.3+p*.45,mid.z+Math.sin(a)*r);target.set(mid.x,1.55,mid.z);camera.position.lerp(desired,.065);camera.fov=THREE.MathUtils.lerp(camera.fov,43,.05);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='reunion_reveal'){
    const p=smoother(phaseTime()/3.9),rail=new THREE.CatmullRomCurve3([new THREE.Vector3(-10,5,14),new THREE.Vector3(-6,3,6),new THREE.Vector3(3,2,-1),new THREE.Vector3(7,4,-12)]);
    camera.position.copy(rail.getPoint(p));target.set(THREE.MathUtils.lerp(0,.3,p),1.1,THREE.MathUtils.lerp(-5,-9,p));camera.fov=THREE.MathUtils.lerp(52,45,p);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='reunion_touch'){
    const p=smoother(phaseTime()/5.3),mid=reunionAle.group.position.clone().lerp(reunionKim.group.position,.5),a=1.15+p*.72,r=8.6-p*.9;
    desired.set(mid.x+Math.cos(a)*r,4.2+Math.sin(p*Math.PI)*.55,mid.z+Math.sin(a)*r);target.set(mid.x,1.55,mid.z);camera.position.lerp(desired,.07);camera.fov=THREE.MathUtils.lerp(camera.fov,43,.055);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='genesis'){
    const pt=phaseTime(),burst=smoother((pt-4.75)/6.15),a=.35+pt*.075,r=THREE.MathUtils.lerp(6.2,26,burst);
    desired.set(Math.cos(a)*r,THREE.MathUtils.lerp(2.6,12,burst),Math.sin(a)*r+THREE.MathUtils.lerp(5,14,burst));target.set(0,0,0);camera.position.lerp(desired,.07);camera.fov=THREE.MathUtils.lerp(camera.fov,THREE.MathUtils.lerp(40,58,burst),.06);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='concert_touch'){
    const p=smoother(phaseTime()/2.8);const mid=concertAle.group.position.clone().lerp(concertKim.group.position,.5);
    const ang=THREE.MathUtils.lerp(.7,1.55,p);
    desired.set(mid.x+Math.cos(ang)*(4.4-p*1.3),3.7-p*.55,mid.z+Math.sin(ang)*(4.9-p*1.5));
    target.set(mid.x,1.48,mid.z);camera.position.lerp(desired,.07);camera.fov=THREE.MathUtils.lerp(50,42,p);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='portal_cinematic'){
    const p=smoother(phaseTime()/3.85);
    const p0=portalCamStart;
    const p1=new THREE.Vector3(3.1,3.8,-7.6);
    const p2=new THREE.Vector3(1.1,2.85,-12.4);
    const p3=new THREE.Vector3(.15,2.25,-16.2);
    const rail=new THREE.CatmullRomCurve3([p0,p1,p2,p3]);
    camera.position.copy(rail.getPoint(p));
    const look=portalLookStart.clone().lerp(new THREE.Vector3(0,4.25,-17.2),smoother(p*1.18));
    camera.fov=THREE.MathUtils.lerp(50,39,p);camera.updateProjectionMatrix();camera.lookAt(look);return;
  }

  if(phase==='meadow_reveal'){
    const p=smoother(phaseTime()/3.8);
    const rail=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8.5,2.2,16.5),
      new THREE.Vector3(-5.2,3.4,9.5),
      new THREE.Vector3(-2.2,4.8,2.0),
      new THREE.Vector3(3.8,6.1,-5.8)
    ]);
    camera.position.copy(rail.getPoint(p));
    target.set(0,THREE.MathUtils.lerp(1.0,1.8,p),THREE.MathUtils.lerp(-4,-25,p));
    camera.fov=THREE.MathUtils.lerp(54,46,p);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='lavender_reveal'){
    const p=smoother(phaseTime()/4.35);const mid=meadowAle.group.position.clone().lerp(meadowKim.group.position,.5);
    const rail=new THREE.CatmullRomCurve3([
      new THREE.Vector3(mid.x-5.8,1.1,mid.z+5.5),
      new THREE.Vector3(mid.x-2.4,1.55,mid.z+1.2),
      new THREE.Vector3(mid.x+4.5,4.2,mid.z-7.5),
      new THREE.Vector3(mid.x+10.5,8.2,mid.z-18)
    ]);
    camera.position.copy(rail.getPoint(p));target.set(mid.x,THREE.MathUtils.lerp(.8,1.8,p),mid.z-THREE.MathUtils.lerp(2,18,p));camera.fov=THREE.MathUtils.lerp(44,56,p);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='sky_suspension'){
    const p=phaseTime(),mid=meadowAle.group.position.clone().lerp(meadowKim.group.position,.5);const a=.5+p*.085;const r=7.2+Math.sin(p*.14)*1.1;
    desired.set(mid.x+Math.cos(a)*r,mid.y+2.1+Math.sin(p*.12)*1.4,mid.z+Math.sin(a)*r);
    target.set(mid.x,mid.y+.25,mid.z-.3);camera.position.lerp(desired,.035);camera.fov=THREE.MathUtils.lerp(camera.fov,45,.035);camera.updateProjectionMatrix();camera.lookAt(target);return;
  }

  if(phase==='ascension'){
    const pt=phaseTime();const mid=meadowAle.group.position.clone().lerp(meadowKim.group.position,.5);
    let shotPos=new THREE.Vector3(),shotTarget=new THREE.Vector3();let fov=46;
    if(pt<2.4){
      const p=smoother(pt/2.4);shotPos.set(mid.x+THREE.MathUtils.lerp(1.4,2.5,p),THREE.MathUtils.lerp(1.2,2.4,p),mid.z+THREE.MathUtils.lerp(3.8,4.8,p));shotTarget.set(mid.x,1.25,mid.z-.2);fov=THREE.MathUtils.lerp(48,43,p);
    }else if(pt<5.0){
      const p=smoother((pt-2.4)/2.6),a=THREE.MathUtils.lerp(.25,2.5,p),r=THREE.MathUtils.lerp(4.5,6.4,p);shotPos.set(mid.x+Math.cos(a)*r,3.2+Math.sin(p*Math.PI)*1.2,mid.z+Math.sin(a)*r);shotTarget.set(mid.x,1.8,mid.z);fov=44;
    }else if(pt<7.4){
      const p=smoother((pt-5)/2.4);shotPos.set(mid.x+THREE.MathUtils.lerp(12,16,p),THREE.MathUtils.lerp(7,12,p),mid.z+THREE.MathUtils.lerp(15,20,p));shotTarget.set(mid.x,THREE.MathUtils.lerp(2,6,p),mid.z-2);fov=THREE.MathUtils.lerp(50,58,p);
    }else{
      const p=smoother((pt-7.4)/3.1);shotPos.set(mid.x+THREE.MathUtils.lerp(7,3,p),THREE.MathUtils.lerp(13,23,p),mid.z+THREE.MathUtils.lerp(8,1.8,p));shotTarget.set(mid.x,THREE.MathUtils.lerp(8,18,p),mid.z-1);fov=THREE.MathUtils.lerp(52,40,p);
    }
    camera.position.lerp(shotPos,.08);camera.fov=THREE.MathUtils.lerp(camera.fov,fov,.08);camera.updateProjectionMatrix();camera.lookAt(shotTarget);return;
  }

  const player=currentPlayer;if(!player)return;
  const dist=phase==='room'?6.6:phase==='meadow'?8.2:7.4;const height=phase==='room'?3.4:3.9;
  desired.set(player.group.position.x+Math.sin(cameraYaw)*dist,player.group.position.y+height+Math.sin(cameraPitch)*1.5,player.group.position.z+Math.cos(cameraYaw)*dist);
  target.set(player.group.position.x,player.group.position.y+1.38,player.group.position.z);
  camera.position.lerp(desired,.08);camera.fov=THREE.MathUtils.lerp(camera.fov,50,.06);camera.updateProjectionMatrix();camera.lookAt(target);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04), t = clock.elapsedTime;
  frame++;
  scenePulse = Math.sin(t * 0.9) * 0.5 + 0.5;
  if (started) {
    if (phase === 'concert' || phase === 'concert_touch') updateConcert(t, dt);
    else if (phase === 'room' || phase === 'portal_cinematic') updateRoom(t, dt);
    else if (phase === 'tunnel') updateTunnel(t);
    else if (phase === 'meadow' || phase === 'meadow_reveal' || phase === 'lavender_reveal') updateMeadow(t, dt);
    else if (phase === 'ascension') updateAscension(t);
    else if (phase === 'sky_suspension') updateSkySuspension(t);
    else if (phase === 'fracture') updateFracture(t);
    else if (phase === 'fall_descent') updateFallDescent(t, dt);
    else if (phase === 'fall_wasteland' || phase === 'kim_returns' || phase === 'rescue_touch') updateFallWorld(t, dt);
    else if (phase === 'reunion_reveal' || phase === 'reunion' || phase === 'reunion_touch') updateReunion(t, dt);
    else if (phase === 'genesis') updateGenesis(t);
  }
  updateCamera(t);
  const desiredBloom=(phase==='concert'||phase==='concert_touch')?.38:(phase==='portal_cinematic'||phase==='tunnel')?.32:(phase==='ascension'||phase==='sky_suspension'||phase==='fracture')?.28:(phase==='rescue_touch'||phase==='reunion_touch'||phase==='genesis')?.31:(phase==='lavender_reveal'?.22:.16);
  bloomPass.strength=THREE.MathUtils.lerp(bloomPass.strength,qualityTier==='high'?desiredBloom:desiredBloom*.55,.04);
  composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, qualityTier === 'mobile' ? 1.2 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
