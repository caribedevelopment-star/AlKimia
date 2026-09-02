import * as THREE from 'three';

// Scene 1 augmentation: preserve the original concert renderer/stadium and only add
// the uploaded Al.Kim.ia entity geometry + a dense instanced crowd.
const MOBILE = matchMedia('(max-width:820px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const PERSON_CHUNKS = 10;
async function loadPackedCharacter(){
  const parts = await Promise.all(Array.from({length:PERSON_CHUNKS},(_,i)=>
    fetch(`/assets/scene1/p.${String(i+1).padStart(3,'0')}.b64?v=20260902d`,{cache:'force-cache'}).then(r=>{if(!r.ok) throw new Error(`character chunk ${i+1}`); return r.text();})
  ));
  return Uint8Array.from(atob(parts.join('').replace(/\s+/g,'')),c=>c.charCodeAt(0));
}

const capture = { renderer:null, scene:null, camera:null, active:false };
const originalRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function(scene,camera){
  if (this.domElement?.id === 'world') {
    if (!capture.renderer) Object.assign(capture,{renderer:this,scene,camera});
    else if (capture.renderer===this) { capture.scene=scene; capture.camera=camera; }
  }
  return originalRender.call(this,scene,camera);
};

function seeded(seed=19012026){ let s=seed>>>0; return ()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296); }
async function loadPersonGeometry(){
  const packed=await loadPackedCharacter();
  const raw=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
  if(String.fromCharCode(...raw.slice(0,4))!=='AKM1') throw new Error('Invalid character mesh');
  const vc=v.getUint32(4,true), fc=v.getUint32(8,true);
  const mn=[v.getFloat32(12,true),v.getFloat32(16,true),v.getFloat32(20,true)];
  const sc=[v.getFloat32(24,true),v.getFloat32(28,true),v.getFloat32(32,true)];
  let off=36;
  const pos=new Float32Array(vc*3);
  for(let i=0;i<vc*3;i++){ const q=v.getInt16(off+i*2,true),a=i%3; pos[i]=mn[a]+((q+32768)/65535)*sc[a]; }
  off+=vc*3*2;
  const idx=new Uint32Array(fc*3); for(let i=0;i<fc*3;i++) idx[i]=v.getUint32(off+i*4,true);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setIndex(new THREE.BufferAttribute(idx,1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  const box=g.boundingBox, center=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
  g.translate(-center.x,-box.min.y,-center.z); // feet on y=0, centered x/z
  g.computeBoundingBox(); g.computeBoundingSphere();
  return {g,size};
}
function worldGround(scene,camera){
  const box=new THREE.Box3().setFromObject(scene);
  const down=new THREE.Vector3(0,-1,0), ray=new THREE.Raycaster();
  const f=new THREE.Vector3(); camera.getWorldDirection(f); f.y=0; if(f.lengthSq()<.001)f.set(0,0,-1); f.normalize();
  const p=camera.getWorldPosition(new THREE.Vector3()).addScaledVector(f,8); p.y=box.max.y+5;
  ray.set(p,down); const hits=ray.intersectObjects(scene.children,true).filter(h=>h.object.visible && !h.object.userData?.alkimiaCrowd);
  return hits.length?hits[0].point.y:camera.position.y-1.65;
}
async function enhance(){
  if(capture.active) return; capture.active=true;
  for(let i=0;i<180 && (!capture.scene||!capture.camera);i++) await new Promise(r=>setTimeout(r,40));
  const {scene,camera}=capture; if(!scene||!camera) return;
  const {g,size}=await loadPersonGeometry();
  const group=new THREE.Group(); group.name='ALKIMIA_UPLOADED_CROWD'; group.userData.alkimiaCrowd=true; scene.add(group);
  const syncVisibility=()=>{ const title=document.querySelector('#chapterTitle')?.textContent||''; group.visible=!title || /ENCOUNTER/i.test(title); };
  syncVisibility();
  new MutationObserver(syncVisibility).observe(document.body,{subtree:true,childList:true,characterData:true});
  const baseH=Math.max(size.y,.001), scaleHero=1.48/baseH;
  const pale=new THREE.MeshStandardMaterial({color:0xd9d4cd,roughness:.78,metalness:.02,emissive:0x221a32,emissiveIntensity:.10});
  const heroA=new THREE.Mesh(g,pale), heroB=new THREE.Mesh(g,pale.clone()); heroA.userData.alkimiaCrowd=heroB.userData.alkimiaCrowd=true;
  const camPos=camera.getWorldPosition(new THREE.Vector3()), forward=new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0; forward.normalize();
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const gy=worldGround(scene,camera);
  const focal=camPos.clone().addScaledVector(forward,7.4); focal.y=gy;
  heroA.scale.setScalar(scaleHero); heroB.scale.setScalar(scaleHero*.98);
  heroA.position.copy(focal).addScaledVector(right,-.72); heroB.position.copy(focal).addScaledVector(right,.72).addScaledVector(forward,.18);
  heroA.rotation.y=Math.atan2(forward.x,forward.z)+.22; heroB.rotation.y=Math.atan2(forward.x,forward.z)-.25;
  group.add(heroA,heroB);
  // Uploaded geometry is used for the near crowd; far crowd uses a cheaper silhouette to protect mobile fps.
  const nearCount=MOBILE?28:60, mat=new THREE.MeshStandardMaterial({color:0x777985,roughness:.95,metalness:0,emissive:0x11121a,emissiveIntensity:.08});
  const near=new THREE.InstancedMesh(g,mat,nearCount); near.userData.alkimiaCrowd=true; near.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(near);
  const rand=seeded(), d=new THREE.Object3D(), data=[];
  for(let i=0;i<nearCount;i++){
    const depth=5.5+Math.pow(rand(),.72)*20, width=3.4+depth*.48, side=(rand()-.5)*2*width;
    let side2=side; if(Math.abs(side2)<1.7 && depth<10) side2+=(side2<0?-1:1)*2.2;
    const s=scaleHero*(.82+rand()*.28), p=camPos.clone().addScaledVector(forward,depth).addScaledVector(right,side2); p.y=gy;
    const rot=Math.atan2(forward.x,forward.z)+(rand()-.5)*.65; data.push({p,s,rot,ph:rand()*6.28}); d.position.copy(p); d.scale.setScalar(s); d.rotation.y=rot; d.updateMatrix(); near.setMatrixAt(i,d.matrix);
  } near.instanceMatrix.needsUpdate=true;
  const farCount=MOBILE?180:420, fg=new THREE.CapsuleGeometry(.20,.58,3,6), fm=new THREE.MeshStandardMaterial({color:0x444651,roughness:1,emissive:0x080910,emissiveIntensity:.08});
  const far=new THREE.InstancedMesh(fg,fm,farCount); far.userData.alkimiaCrowd=true; group.add(far); const fd=[];
  for(let i=0;i<farCount;i++){
    const depth=10+Math.pow(rand(),.62)*43, width=5+depth*.60, side=(rand()-.5)*2*width, s=.85+rand()*.7; const p=camPos.clone().addScaledVector(forward,depth).addScaledVector(right,side); p.y=gy+.43*s; fd.push({p,s,ph:rand()*6.28}); d.position.copy(p); d.scale.setScalar(s); d.rotation.y=(rand()-.5)*.8; d.updateMatrix(); far.setMatrixAt(i,d.matrix);
  } far.instanceMatrix.needsUpdate=true;
  // Keep the original stadium and lighting, only add subtle crowd energy.
  const ptsN=MOBILE?160:380, pa=new Float32Array(ptsN*3); for(let i=0;i<ptsN;i++){const dep=4+rand()*38,side=(rand()-.5)*(10+dep);const p=camPos.clone().addScaledVector(forward,dep).addScaledVector(right,side);pa[i*3]=p.x;pa[i*3+1]=gy+1+rand()*8;pa[i*3+2]=p.z;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pa,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xcabfff,size:MOBILE?.035:.05,transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending}));pts.userData.alkimiaCrowd=true;group.add(pts);
  const t0=performance.now();
  function tick(now){ if(!group.parent)return; const t=(now-t0)/1000; heroA.position.y=gy+Math.sin(t*1.2)*.012; heroB.position.y=gy+Math.sin(t*1.15+1)*.012;
    for(let i=0;i<nearCount;i++){const z=data[i]; d.position.set(z.p.x,z.p.y+Math.sin(t*1.45+z.ph)*.018,z.p.z); d.scale.setScalar(z.s); d.rotation.y=z.rot+Math.sin(t*.55+z.ph)*.025; d.updateMatrix(); near.setMatrixAt(i,d.matrix);} near.instanceMatrix.needsUpdate=true;
    for(let i=0;i<farCount;i++){const z=fd[i]; d.position.set(z.p.x,z.p.y+Math.sin(t*1.65+z.ph)*.025,z.p.z); d.scale.setScalar(z.s); d.rotation.y=Math.sin(z.ph)*.4; d.updateMatrix(); far.setMatrixAt(i,d.matrix);} far.instanceMatrix.needsUpdate=true; pts.rotation.y=Math.sin(t*.08)*.006; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded',()=>document.querySelector('#enter')?.addEventListener('click',()=>setTimeout(enhance,550),{once:true}));
