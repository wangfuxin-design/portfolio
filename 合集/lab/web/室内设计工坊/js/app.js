/* 灵感家 · 全屋设计工坊
   纯前端 Three.js 交互 Demo：一室一厅全屋模型，材质与家具均可替换。
   所有贴图均由 Canvas 程序化生成，无外部资源，可完全离线运行。 */
'use strict';

/* ================= 小工具 ================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const el = (tag, cls) => { const d = document.createElement(tag); if (cls) d.className = cls; return d; };

function shade(hex, amt) { // 颜色明度微调，供 Canvas 绘制使用
  const n = parseInt(hex.slice(1), 16);
  const f = v => clamp(Math.round(v + amt * 255), 0, 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

/* ================= 程序化贴图 ================= */
function canvasOf(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function addNoise(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${rand(a * 0.4, a)})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1.4, 1.4);
  }
}
const woodDraw = (base, plank) => (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += plank) {
    g.fillStyle = shade(base, rand(-0.07, 0.07)); g.fillRect(0, y, s, plank);
    for (let k = 0; k < 6; k++) { // 木纹
      g.strokeStyle = `rgba(70,45,20,${rand(0.05, 0.12).toFixed(3)})`; g.lineWidth = 1;
      g.beginPath();
      const gy = y + 3 + Math.random() * (plank - 6); g.moveTo(0, gy);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, gy + Math.sin((x + y * 3) * 0.028) * 2 + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(50,30,15,0.35)'; g.fillRect(0, y, s, 1.5);       // 板缝
    g.fillRect(Math.floor(rand(0, 4)) * s / 4, y, 1.5, plank);           // 端缝错开
  }
  addNoise(g, s, 700, 0.05);
};
const herrDraw = base => (g, s) => { // 人字拼
  g.fillStyle = shade(base, -0.04); g.fillRect(0, 0, s, s);
  const L = s / 4.2, W = L / 4.3, cell = L * 0.74;
  for (let iy = -1; iy * cell < s + cell; iy++) for (let ix = -1; ix * cell < s + cell; ix++) {
    g.save();
    g.translate(ix * cell + cell / 2, iy * cell + cell / 2);
    g.rotate(((ix + iy) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4);
    g.fillStyle = shade(base, rand(-0.08, 0.08));
    g.fillRect(-L / 2, -W / 2, L, W);
    g.strokeStyle = 'rgba(55,32,16,0.4)'; g.lineWidth = 1; g.strokeRect(-L / 2, -W / 2, L, W);
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.beginPath(); g.moveTo(-L / 2, -W / 6); g.lineTo(L / 2, -W / 6); g.moveTo(-L / 2, W / 6); g.lineTo(L / 2, W / 6); g.stroke();
    g.restore();
  }
};
const marbleDraw = (bg, veinFn) => (g, s) => {
  g.fillStyle = bg; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) { // 云雾
    const r = rand(s * 0.2, s * 0.5), x = rand(0, s), y = rand(0, s);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(140,140,150,0.06)'); gr.addColorStop(1, 'rgba(140,140,150,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let v = 0; v < 8; v++) { // 石纹
    g.lineWidth = rand(0.6, 1.6); g.strokeStyle = veinFn();
    let x = rand(-s * 0.2, s * 1.1), y = -10;
    g.beginPath(); g.moveTo(x, y);
    while (y < s + 10) { x += rand(-26, 26); y += rand(12, 30); g.lineTo(x, y); }
    g.stroke();
  }
};
const tileDraw = (base, grout) => (g, s) => {
  const n = 4, t = s / n;
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    g.fillStyle = shade(base, rand(-0.05, 0.05)); g.fillRect(ix * t, iy * t, t, t);
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(80,50,30,${rand(0.02, 0.06)})`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  g.strokeStyle = grout; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke();
  }
};
const terraDraw = (g, s) => { // 水磨石
  g.fillStyle = '#e9e7e0'; g.fillRect(0, 0, s, s);
  const cols = ['#c9beac', '#b5a48f', '#8f9aa3', '#c98f6f', '#7d8a6f', '#ffffff', '#6f6a62'];
  for (let i = 0; i < 420; i++) {
    g.fillStyle = pick(cols); g.globalAlpha = rand(0.5, 0.9);
    g.beginPath(); g.arc(Math.random() * s, Math.random() * s, rand(1.5, 6), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
const weaveDraw = (g, s) => { // 布艺织纹（灰度，供染色）
  g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, s, s);
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < s; y += 3) g.fillRect(0, y, s, 1);
  for (let x = 0; x < s; x += 3) g.fillRect(x, 0, 1, s);
  addNoise(g, s, 1500, 0.08);
};
const stripeDraw = base => (g, s) => {
  const w = s / 10;
  for (let i = 0; i < 10; i++) {
    g.fillStyle = shade(base, i % 2 ? -0.04 : 0.05); g.fillRect(i * w, 0, w, s);
    g.fillStyle = 'rgba(80,60,40,0.12)'; g.fillRect(i * w, 0, 1, s);
  }
};
const gridDraw = (base, lineC) => (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.strokeStyle = lineC; g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const p = i * s / 8;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
  }
};
const dotDraw = (base, dot) => (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.fillStyle = dot;
  const st = s / 9, r = s / 56;
  for (let iy = 0; iy < 10; iy++) for (let ix = 0; ix < 10; ix++) {
    g.beginPath(); g.arc(ix * st + (iy % 2 ? st / 2 : 0), iy * st, r, 0, 7); g.fill();
  }
};
const rugGeoDraw = (base, accent) => (g, s) => { // 菱形格地毯
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  const n = 5, st = s / n;
  g.strokeStyle = accent; g.lineWidth = s / 128;
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const cx = ix * st + st / 2, cy = iy * st + st / 2, r = st / 2;
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath();
    if ((ix + iy) % 2 === 0) { g.fillStyle = hexA(accent, 0.18); g.fill(); }
    g.stroke();
  }
  addNoise(g, s, 1200, 0.05);
};
const rugStripeDraw = (base, accent) => (g, s) => {
  let y = 0;
  [[0.14, 0], [0.05, 1], [0.2, 0], [0.05, 1], [0.16, 0], [0.05, 1], [0.2, 0], [0.05, 1], [0.1, 0]]
    .forEach(([f, c]) => { g.fillStyle = c ? accent : base; g.fillRect(0, y * s, s, f * s + 1); y += f; });
  addNoise(g, s, 1200, 0.05);
};
const rugBorderDraw = (base, accent) => (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.strokeStyle = accent; g.lineWidth = s / 26; g.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
  g.lineWidth = s / 90; g.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
  g.save(); g.translate(s / 2, s / 2); g.rotate(Math.PI / 4);
  g.fillStyle = hexA(accent, 0.3); g.fillRect(-s * 0.09, -s * 0.09, s * 0.18, s * 0.18);
  g.strokeStyle = accent; g.strokeRect(-s * 0.09, -s * 0.09, s * 0.18, s * 0.18);
  g.restore();
  addNoise(g, s, 1200, 0.05);
};
const rugPlainDraw = (base, accent) => (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  addNoise(g, s, 1600, 0.06);
  g.strokeStyle = accent; g.lineWidth = s / 80; g.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
};

const TEXDEFS = {
  woodFloorL: { s: 512, d: woodDraw('#c9a26f', 32) },
  woodFloorD: { s: 512, d: woodDraw('#7a543a', 32) },
  woodFloorG: { s: 512, d: woodDraw('#a89a8a', 32) },
  herrL: { s: 512, d: herrDraw('#c9a26f') },
  herrD: { s: 512, d: herrDraw('#7a543a') },
  marbleFloor: { s: 512, d: marbleDraw('#eceae3', () => `rgba(112,116,128,${rand(0.15, 0.3).toFixed(2)})`) },
  marbleB: { s: 512, d: marbleDraw('#2e2d31', () => `rgba(216,196,166,${rand(0.12, 0.26).toFixed(2)})`) },
  tileT: { s: 512, d: tileDraw('#b57a55', 'rgba(70,40,22,0.5)') },
  terra: { s: 512, d: terraDraw },
  weave: { s: 256, d: weaveDraw },
  wallStripe: { s: 512, d: stripeDraw('#e9dec8') },
  wallGrid: { s: 512, d: gridDraw('#edf0ec', 'rgba(122,144,152,0.55)') },
  wallDot: { s: 512, d: dotDraw('#ecddc9', 'rgba(185,138,104,0.75)') },
  woodL: { s: 512, d: woodDraw('#c9a26f', 64) },
  woodXL: { s: 512, d: woodDraw('#e2d6bd', 64) },
  woodD: { s: 512, d: woodDraw('#7a543a', 64) },
  woodX: { s: 512, d: woodDraw('#3b332c', 64) },
  rug1: { s: 512, d: rugGeoDraw('#a8b8c2', '#52708a') },
  rug2: { s: 512, d: rugStripeDraw('#b5674f', '#d9c3a3') },
  rug3: { s: 512, d: rugBorderDraw('#e3dac6', '#8a6f4d') },
  rug4: { s: 512, d: rugGeoDraw('#54655a', '#d8cdb0') },
  rug5: { s: 512, d: rugPlainDraw('#6b6b70', '#4a4a4f') },
};
const TEX = {};
function getTex(key) {
  if (!TEX[key]) {
    const def = TEXDEFS[key];
    const canvas = canvasOf(def.s, def.d);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    TEX[key] = { canvas, tex, thumb: null };
  }
  return TEX[key];
}
function getThumb(key) {
  const e = getTex(key);
  if (!e.thumb) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    c.getContext('2d').drawImage(e.canvas, 0, 0, 96, 96);
    e.thumb = c.toDataURL('image/png');
  }
  return e.thumb;
}
function skyTex(top, bottom) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return t;
}

/* ================= 材质与色板数据 ================= */
const FLOORS = [
  { id: 'f1', name: '浅橡木地板', tex: 'woodFloorL', scale: 2.4, rough: 0.62 },
  { id: 'f2', name: '深胡桃地板', tex: 'woodFloorD', scale: 2.4, rough: 0.6 },
  { id: 'f3', name: '灰橡木地板', tex: 'woodFloorG', scale: 2.4, rough: 0.65 },
  { id: 'f4', name: '人字拼橡木', tex: 'herrL', scale: 2.0, rough: 0.55 },
  { id: 'f5', name: '人字拼胡桃', tex: 'herrD', scale: 2.0, rough: 0.55 },
  { id: 'f6', name: '米白大理石', tex: 'marbleFloor', scale: 3.2, rough: 0.22, metal: 0.05 },
  { id: 'f7', name: '仿古砖', tex: 'tileT', scale: 2.6, rough: 0.5 },
  { id: 'f8', name: '灰白水磨石', tex: 'terra', scale: 2.2, rough: 0.35 },
];
const WALLS = [
  { id: 'w1', name: '奶油白', color: '#f2ede3' },
  { id: 'w2', name: '暖沙色', color: '#e3d5bd' },
  { id: 'w3', name: '雾霭蓝', color: '#c6d3da' },
  { id: 'w4', name: '鼠尾草绿', color: '#c9d2ba' },
  { id: 'w5', name: '陶土粉', color: '#dfb298' },
  { id: 'w6', name: '墨灰', color: '#54585c' },
  { id: 'w7', name: '条纹墙布', tex: 'wallStripe', scale: 1.6 },
  { id: 'w8', name: '格纹墙布', tex: 'wallGrid', scale: 1.4 },
  { id: 'w9', name: '波点奶咖', tex: 'wallDot', scale: 1.4 },
];
const PALETTES = {
  fabric: { rough: 0.95, metal: 0, baseMap: 'weave', items: [
    { name: '燕麦米', color: '#d9cec0' }, { name: '象牙白', color: '#efe9dd' },
    { name: '雾霾蓝', color: '#7e97ab' }, { name: '鼠尾草', color: '#8ba07e' },
    { name: '焦糖棕', color: '#b5804f' }, { name: '勃艮第', color: '#9c5257' },
    { name: '炭灰', color: '#56565c' }, { name: '芥末黄', color: '#d2a94e' }] },
  wood: { rough: 0.5, metal: 0.03, items: [
    { name: '原木橡木', tex: 'woodL' }, { name: '浅白蜡', tex: 'woodXL' },
    { name: '深胡桃', tex: 'woodD' }, { name: '烟熏黑檀', tex: 'woodX' }] },
  metal: { rough: 0.4, metal: 0.7, items: [
    { name: '哑光黑', color: '#33343a', rough: 0.45, metal: 0.55 }, { name: '香槟金', color: '#c8a26b', metal: 0.75, rough: 0.3 },
    { name: '拉丝银', color: '#b9bdc2', metal: 0.85, rough: 0.28 }, { name: '古铜', color: '#8a6a4a', metal: 0.6, rough: 0.4 }] },
  top: { rough: 0.4, metal: 0.05, items: [
    { name: '原木橡木', tex: 'woodL' }, { name: '深胡桃', tex: 'woodD' },
    { name: '雪白大理石', tex: 'marbleFloor', rough: 0.18 }, { name: '黑金花大理石', tex: 'marbleB', rough: 0.18 },
    { name: '清玻璃', color: '#cfe4ea', opacity: 0.42, rough: 0.08, metal: 0.1 }] },
  rug: { rough: 0.98, metal: 0, items: [
    { name: '雾蓝几何', tex: 'rug1', color: '#a8b8c2' }, { name: '赭红条纹', tex: 'rug2', color: '#b5674f' },
    { name: '米白边框', tex: 'rug3', color: '#e3dac6' }, { name: '墨绿菱形', tex: 'rug4', color: '#54655a' },
    { name: '素色炭灰', tex: 'rug5', color: '#6b6b70' }] },
  pot: { rough: 0.55, metal: 0.05, items: [
    { name: '陶土', color: '#b06a4a' }, { name: '奶白釉', color: '#eee6da' },
    { name: '石墨灰', color: '#5a5a5e' }, { name: '雾蓝釉', color: '#9db4bd' }] },
};

/* ================= 渲染器 / 场景 ================= */
const stage = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  stage.innerHTML = '<p style="padding:40px;color:#8a5a3a">当前浏览器不支持 WebGL，请使用新版 Chrome / Edge 打开。</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe6e2d6, 26, 60);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(8.8, 6.4, 9.2);

const hemi = new THREE.HemisphereLight(0xffffff, 0xb7a893, 0.62); scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.22); scene.add(amb);
const dir = new THREE.DirectionalLight(0xfff2dd, 1.15);   // 从北窗方向射入的“阳光”
dir.position.set(2.5, 8.5, -5);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
const sc = dir.shadow.camera;
sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 2; sc.far = 26;
dir.shadow.bias = -0.0002; dir.shadow.normalBias = 0.02;
scene.add(dir); scene.add(dir.target);

const fillLights = [new THREE.PointLight(0xffd9b0, 0, 14, 2), new THREE.PointLight(0xffd9b0, 0, 14, 2)];
fillLights[0].position.set(1.6, 2.55, -0.6);
fillLights[1].position.set(-3.4, 2.55, 0.3);
fillLights.forEach(l => scene.add(l));
const lampLights = [];   // 各落地灯的点光源
const shadeMats = [];    // 灯罩材质（夜晚自发光）
const tvMats = [];       // 电视屏幕材质

/* 交互监听要抢在 OrbitControls 之前注册，才能在点到家具时禁用相机 */
renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 2.2; controls.maxDistance = 24;
controls.minPolarAngle = 0.05; controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.target.set(0, 0.75, 0);
controls.autoRotateSpeed = 0.9;

/* ================= 房间 ================= */
const ROOM = { minX: -5.2, maxX: 5.2, minZ: -3.2, maxZ: 3.2, H: 2.8, partX: -1.6, T: 0.12 };
const walls = [];
const wallBase = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

function addWall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallBase.clone());
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  walls.push({ mesh, w: Math.max(w, d), h });
  return mesh;
}
addWall(10.64, 2.8, 0.12, 0, 1.4, -3.26);          // 北墙
addWall(10.64, 2.8, 0.12, 0, 1.4, 3.26);           // 南墙
addWall(0.12, 2.8, 6.4, -5.26, 1.4, 0);            // 西墙
addWall(0.12, 2.8, 6.4, 5.26, 1.4, 0);             // 东墙
addWall(0.12, 2.8, 4.7, -1.6, 1.4, -0.85);         // 隔墙（卧室段）
addWall(0.12, 2.8, 0.7, -1.6, 1.4, 2.85);          // 隔墙（门垛）
addWall(0.12, 0.7, 1.0, -1.6, 2.45, 2.0);          // 门洞过梁

const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.maxX - ROOM.minX, ROOM.maxZ - ROOM.minZ), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const ground = new THREE.Mesh(new THREE.CircleGeometry(34, 48),
  new THREE.MeshStandardMaterial({ color: 0xccd0bd, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; ground.receiveShadow = true; scene.add(ground);

const skirtMat = new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: 0.8 });
function skirt(w, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, d), skirtMat);
  m.position.set(x, 0.045, z); scene.add(m);
}
skirt(10.4, 0.03, 0, -3.185); skirt(0.03, 6.4, -5.185, 0); skirt(0.03, 6.4, 5.185, 0);
skirt(8.7, 0.03, -0.85, 3.185); skirt(0.7, 0.03, 4.85, 3.185);

const frameMat = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.5, metalness: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe4ee, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3 });
const curtMat = new THREE.MeshStandardMaterial({ map: getTex('weave').tex, roughness: 1 });
curtMat.color.copy(lin('#e9e2d4'));

function addWindow(cx, w) {
  const grp = new THREE.Group(); grp.position.set(cx, 0, -3.2); scene.add(grp);
  const h = 1.5, y0 = 0.85, yc = y0 + h / 2;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
  glass.position.set(0, yc, 0.02); grp.add(glass);
  const bar = (bw, bh, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.06), frameMat);
    m.position.set(x, y, 0.03); grp.add(m);
  };
  bar(w + 0.1, 0.07, 0, y0 - 0.035); bar(w + 0.1, 0.07, 0, y0 + h + 0.035);
  bar(0.07, h, -w / 2 - 0.035, yc); bar(0.07, h, w / 2 + 0.035, yc);
  bar(0.05, h, 0, yc); bar(w, 0.05, 0, yc);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, 0.05, 0.16), skirtMat);
  sill.position.set(0, y0 - 0.07, 0.08); grp.add(sill);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, w + 0.9, 10), frameMat);
  rod.rotation.z = Math.PI / 2; rod.position.set(0, 2.58, 0.12); grp.add(rod);
  [-1, 1].forEach(s => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.05, 0.1), curtMat);
    c.position.set(s * (w / 2 + 0.2), 1.45, 0.12); grp.add(c);
  });
}
addWindow(0.6, 1.7); addWindow(3.4, 1.7); addWindow(-4.4, 1.4);

(function addDoor() {
  const grp = new THREE.Group(); grp.position.set(4.0, 0, 3.2); scene.add(grp);
  const doorMat = new THREE.MeshStandardMaterial({ map: getTex('woodD').tex, roughness: 0.6 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.05, 0.06), doorMat);
  slab.position.set(0, 1.025, 0.03); grp.add(slab);
  [-0.495, 0.495].forEach(x => {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.1, 0.1), frameMat);
    j.position.set(x, 1.05, 0.03); grp.add(j);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 0.1), frameMat);
  lintel.position.set(0, 2.09, 0.03); grp.add(lintel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), frameMat);
  knob.position.set(0.36, 1.02, 0.09); grp.add(knob);
})();

/* ================= 家具工厂 ================= */
const FIX = {
  dark: new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.5, metalness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9 }),
  pillow: new THREE.MeshStandardMaterial({ color: 0xfbf8f1, roughness: 0.95 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x6b543c, roughness: 0.9 }),
  tvBody: new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.45, metalness: 0.4 }),
};
const BOOKCOLS = ['#b5674f', '#52708a', '#7a8b6f', '#d2a94e', '#8e4a52', '#4a4a4f', '#c9a26f']
  .map(c => new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.85 }));
const LEAFCOLS = ['#5e7d4f', '#6f8f5a', '#4c6b44']
  .map(c => new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.9, flatShading: true }));

function group() { const g = new THREE.Group(); g.userData.slots = []; return g; }
function box(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); g.add(m); return m;
}
function cyl(g, rt, rb, h, mat, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); g.add(m); return m;
}
function ico(g, r, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
  m.position.set(x, y, z); g.add(m); return m;
}
/* 每件家具的材质槽：同槽网格共用一个材质实例，换色一次到位 */
function slotMat(g, key, label, palId, defIdx) {
  let s = g.userData.slots.find(x => x.key === key);
  if (!s) {
    const pal = PALETTES[palId];
    s = {
      key, label, palette: palId, cur: defIdx,
      baseMap: pal.baseMap ? getTex(pal.baseMap).tex : null,
      mat: new THREE.MeshStandardMaterial({ roughness: pal.rough, metalness: pal.metal }),
    };
    g.userData.slots.push(s);
    applySwatchToSlot(g, s, defIdx);
  }
  return s.mat;
}
function applySwatchToSlot(g, slot, idx) {
  const pal = PALETTES[slot.palette], sw = pal.items[idx];
  slot.cur = idx;
  const m = slot.mat;
  if (slot.palette === 'rug') {
    m.map = getTex(sw.tex).tex; m.color.set('#ffffff');
    if (slot.extra) slot.extra.color.copy(lin(sw.color || '#ffffff'));
  } else if (sw.tex) {
    m.map = getTex(sw.tex).tex; m.color.set(sw.color || '#ffffff').convertSRGBToLinear();
  } else {
    m.map = slot.baseMap || null; m.color.set(sw.color).convertSRGBToLinear();
  }
  m.transparent = sw.opacity !== undefined;
  m.opacity = sw.opacity !== undefined ? sw.opacity : 1;
  m.roughness = sw.rough !== undefined ? sw.rough : pal.rough;
  m.metalness = sw.metal !== undefined ? sw.metal : pal.metal;
  m.needsUpdate = true;
}

function buildSofa(L, D) {
  const g = group();
  const fab = slotMat(g, 'fabric', '布艺', 'fabric', 0);
  const leg = slotMat(g, 'legs', '支脚', 'metal', 0);
  const n = L > 1.5 ? 3 : 1;
  box(g, L, 0.3, D - 0.12, fab, 0, 0.28, 0);
  box(g, 0.24, 0.6, D, fab, -(L / 2 - 0.12), 0.42, 0);
  box(g, 0.24, 0.6, D, fab, (L / 2 - 0.12), 0.42, 0);
  box(g, L - 0.44, 0.85, 0.2, fab, 0, 0.55, -(D / 2 - 0.12));
  const cw = (L - 0.44 - (n - 1) * 0.04) / n;
  for (let i = 0; i < n; i++) {
    const x = -((L - 0.44) / 2) + cw / 2 + i * (cw + 0.04);
    box(g, cw, 0.16, D - 0.36, fab, x, 0.51, 0.05);
    const bc = box(g, cw - 0.04, 0.42, 0.15, fab, x, 0.82, -(D / 2 - 0.26));
    bc.rotation.x = -0.16;
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    cyl(g, 0.024, 0.018, 0.13, leg, a * (L / 2 - 0.16), 0.065, b * (D / 2 - 0.16), 10));
  return g;
}
function buildCoffee() {
  const g = group();
  const top = slotMat(g, 'top', '台面', 'top', 0);
  const leg = slotMat(g, 'legs', '桌腿', 'metal', 0);
  box(g, 1.15, 0.05, 0.6, top, 0, 0.42, 0);
  box(g, 1.0, 0.025, 0.44, top, 0, 0.15, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    box(g, 0.045, 0.4, 0.045, leg, a * 0.51, 0.2, b * 0.24));
  return g;
}
function buildSide() {
  const g = group();
  const top = slotMat(g, 'top', '台面', 'top', 0);
  const leg = slotMat(g, 'legs', '桌腿', 'metal', 0);
  cyl(g, 0.28, 0.28, 0.035, top, 0, 0.52, 0, 28);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.5;
    cyl(g, 0.013, 0.013, 0.5, leg, Math.cos(a) * 0.19, 0.25, Math.sin(a) * 0.19, 10);
  }
  return g;
}
function buildTV() {
  const g = group();
  const wood = slotMat(g, 'wood', '柜体', 'wood', 0);
  box(g, 1.8, 0.4, 0.42, wood, 0, 0.26, 0);
  box(g, 0.85, 0.3, 0.014, wood, -0.44, 0.26, 0.217);
  box(g, 0.85, 0.3, 0.014, wood, 0.44, 0.26, 0.217);
  box(g, 0.16, 0.018, 0.018, FIX.dark, -0.44, 0.32, 0.235);
  box(g, 0.16, 0.018, 0.018, FIX.dark, 0.44, 0.32, 0.235);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    cyl(g, 0.016, 0.016, 0.06, FIX.dark, a * 0.8, 0.03, b * 0.16, 10));
  box(g, 0.32, 0.05, 0.2, FIX.tvBody, 0, 0.485, 0);
  box(g, 1.45, 0.85, 0.05, FIX.tvBody, 0, 0.93, 0);
  const scr = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.3, emissive: 0xb8d4e8, emissiveIntensity: 0.07 });
  tvMats.push(scr);
  box(g, 1.38, 0.78, 0.012, scr, 0, 0.93, 0.031);
  return g;
}
function buildDining() {
  const g = group();
  const top = slotMat(g, 'top', '台面', 'top', 0);
  const leg = slotMat(g, 'legs', '桌腿', 'wood', 0);
  box(g, 1.5, 0.06, 0.9, top, 0, 0.735, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    box(g, 0.07, 0.71, 0.07, leg, a * 0.65, 0.355, b * 0.35));
  return g;
}
function buildChair() {
  const g = group();
  const fab = slotMat(g, 'fabric', '坐垫', 'fabric', 3);
  const frame = slotMat(g, 'frame', '框架', 'wood', 0);
  box(g, 0.44, 0.05, 0.44, fab, 0, 0.46, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    cyl(g, 0.016, 0.016, 0.44, frame, a * 0.19, 0.22, b * 0.19, 10));
  cyl(g, 0.016, 0.016, 0.4, frame, -0.19, 0.66, -0.19, 10);
  cyl(g, 0.016, 0.016, 0.4, frame, 0.19, 0.66, -0.19, 10);
  box(g, 0.42, 0.28, 0.035, frame, 0, 0.82, -0.19);
  return g;
}
function buildBed() {
  const g = group();
  const frame = slotMat(g, 'frame', '床架', 'wood', 2);
  const bed = slotMat(g, 'fabric', '床品', 'fabric', 0);
  box(g, 1.62, 0.22, 2.1, frame, 0, 0.24, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    box(g, 0.08, 0.13, 0.08, frame, a * 0.73, 0.065, b * 0.96));
  box(g, 1.62, 0.8, 0.09, frame, 0, 0.66, -1.005);
  box(g, 1.52, 0.2, 1.98, FIX.white, 0, 0.45, 0.03);
  box(g, 0.6, 0.13, 0.4, FIX.pillow, -0.4, 0.615, -0.62).rotation.y = 0.05;
  box(g, 0.6, 0.13, 0.4, FIX.pillow, 0.4, 0.615, -0.62).rotation.y = -0.05;
  box(g, 1.56, 0.1, 1.2, bed, 0, 0.55, 0.4);
  return g;
}
function buildNight() {
  const g = group();
  const body = slotMat(g, 'wood', '柜体', 'wood', 0);
  box(g, 0.5, 0.44, 0.4, body, 0, 0.3, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) =>
    cyl(g, 0.014, 0.014, 0.08, FIX.dark, a * 0.2, 0.04, b * 0.15, 8));
  box(g, 0.42, 0.17, 0.016, body, 0, 0.39, 0.208);
  cyl(g, 0.012, 0.012, 0.03, FIX.dark, 0, 0.39, 0.225, 8);
  return g;
}
function buildWard() {
  const g = group();
  const body = slotMat(g, 'wood', '柜体', 'wood', 0);
  const handle = slotMat(g, 'metal', '把手', 'metal', 1);
  box(g, 2.0, 2.16, 0.62, body, 0, 1.16, 0);
  box(g, 0.94, 2.0, 0.022, body, -0.49, 1.16, 0.321);
  box(g, 0.94, 2.0, 0.022, body, 0.49, 1.16, 0.321);
  cyl(g, 0.011, 0.011, 0.3, handle, -0.07, 1.16, 0.345, 8);
  cyl(g, 0.011, 0.011, 0.3, handle, 0.07, 1.16, 0.345, 8);
  box(g, 2.06, 0.06, 0.66, body, 0, 2.27, 0);
  return g;
}
function buildShelf() {
  const g = group();
  const frame = slotMat(g, 'wood', '框架', 'wood', 0);
  box(g, 0.03, 1.8, 0.3, frame, -0.44, 0.9, 0);
  box(g, 0.03, 1.8, 0.3, frame, 0.44, 0.9, 0);
  box(g, 0.91, 0.03, 0.3, frame, 0, 1.815, 0);
  box(g, 0.91, 0.03, 0.3, frame, 0, 0.015, 0);
  box(g, 0.85, 0.025, 0.28, frame, 0, 0.6, 0);
  box(g, 0.85, 0.025, 0.28, frame, 0, 1.2, 0);
  box(g, 0.85, 1.78, 0.016, frame, 0, 0.9, -0.14);
  [0.032, 0.615, 1.215].forEach(by => { // 随机小书
    let x = -0.4;
    while (x < 0.3) {
      const bw = rand(0.03, 0.075), bh = rand(0.2, 0.3);
      const b = box(g, bw, bh, 0.2, pick(BOOKCOLS), x + bw / 2, by + bh / 2, 0.01);
      if (Math.random() < 0.12) b.rotation.z = rand(-0.12, 0.12);
      x += bw + rand(0.004, 0.02);
    }
  });
  return g;
}
function buildLamp() {
  const g = group();
  const shade = slotMat(g, 'fabric', '灯罩', 'fabric', 1);
  const pole = slotMat(g, 'metal', '灯杆', 'metal', 0);
  shade.side = THREE.DoubleSide; shadeMats.push(shade);
  cyl(g, 0.15, 0.17, 0.03, pole, 0, 0.015, 0, 20);
  cyl(g, 0.015, 0.015, 1.42, pole, 0, 0.74, 0, 10);
  cyl(g, 0.19, 0.24, 0.32, shade, 0, 1.56, 0, 26);
  const pl = new THREE.PointLight(0xffd2a0, 0, 5, 2);
  pl.position.set(0, 1.5, 0); g.add(pl); lampLights.push(pl);
  return g;
}
function buildPlant() {
  const g = group();
  const pot = slotMat(g, 'pot', '花盆', 'pot', 0);
  cyl(g, 0.17, 0.13, 0.32, pot, 0, 0.16, 0, 20);
  cyl(g, 0.15, 0.15, 0.02, FIX.dark, 0, 0.315, 0, 20);
  cyl(g, 0.02, 0.028, 0.6, FIX.trunk, 0, 0.6, 0, 8);
  for (let i = 0; i < 6; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.02, 0.14);
    const b = ico(g, rand(0.16, 0.26), LEAFCOLS[i % 3], Math.cos(a) * r, rand(0.85, 1.35), Math.sin(a) * r);
    b.scale.y = rand(0.9, 1.2);
  }
  return g;
}
function buildRug() {
  const g = group();
  const topMat = new THREE.MeshStandardMaterial({ roughness: 0.98 });
  const sideMat = new THREE.MeshStandardMaterial({ roughness: 0.98 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.035, 1.7),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  mesh.position.y = 0.018; g.add(mesh);
  g.userData.slots.push({ key: 'pattern', label: '图案', palette: 'rug', cur: 0, mat: topMat, extra: sideMat, baseMap: null });
  applySwatchToSlot(g, g.userData.slots[0], 0);
  return g;
}

/* ================= 家具目录与默认方案 ================= */
const CATALOG = [
  { id: 'sofa', name: '三人沙发', icon: '🛋️', build: () => buildSofa(2.2, 0.95), pos: [0.9, 0, -0.4], rotY: Math.PI / 2 },
  { id: 'armchair', name: '单人扶手椅', icon: '💺', build: () => buildSofa(0.98, 0.88), pos: [3.7, 0, -2.2], rotY: -0.59 },
  { id: 'coffee', name: '茶几', icon: '🫖', build: buildCoffee, pos: [2.5, 0, -0.4], rotY: 0 },
  { id: 'side', name: '边几', icon: '☕', build: buildSide, pos: [4.4, 0, -1.35], rotY: 0 },
  { id: 'tv', name: '电视柜+电视', icon: '📺', build: buildTV, pos: [4.915, 0, -0.4], rotY: -Math.PI / 2 },
  { id: 'dining', name: '餐桌', icon: '🍽️', build: buildDining, pos: [3.2, 0, 1.9], rotY: 0 },
  { id: 'chair', name: '餐椅', icon: '🪑', build: buildChair, pos: [2.45, 0, 1.9], rotY: Math.PI / 2 },
  { id: 'bed', name: '双人床', icon: '🛏️', build: buildBed, pos: [-4.1, 0, 0.2], rotY: Math.PI / 2 },
  { id: 'night', name: '床头柜', icon: '🕰️', build: buildNight, pos: [-4.8, 0, 1.28], rotY: Math.PI / 2 },
  { id: 'ward', name: '衣柜', icon: '🚪', build: buildWard, pos: [-2.75, 0, -2.83], rotY: 0 },
  { id: 'shelf', name: '书架', icon: '📚', build: buildShelf, pos: [-1.4, 0, 0.4], rotY: Math.PI / 2 },
  { id: 'lamp', name: '落地灯', icon: '💡', build: buildLamp, pos: [0.6, 0, -2.55], rotY: 0 },
  { id: 'plant', name: '绿植盆栽', icon: '🪴', build: buildPlant, pos: [4.8, 0, 2.7], rotY: 0 },
  { id: 'rug', name: '地毯', icon: '🧶', build: buildRug, pos: [2.35, 0, -0.4], rotY: Math.PI / 2 },
];
const CATALOG_BY = {};
CATALOG.forEach(c => CATALOG_BY[c.id] = c);

const DEFAULT_SCENE = [
  ['sofa'], ['coffee'], ['rug'], ['tv'], ['armchair'], ['side'], ['lamp'], ['plant'], ['shelf'],
  ['dining'],
  ['chair', [2.45, 0, 1.9], Math.PI / 2],
  ['chair', [3.95, 0, 1.9], -Math.PI / 2],
  ['chair', [3.2, 0, 1.22], 0],
  ['chair', [3.2, 0, 2.58], Math.PI],
  ['bed'],
  ['night', [-4.8, 0, 1.28], Math.PI / 2],
  ['night', [-4.8, 0, -0.88], Math.PI / 2],
  ['ward', [-2.75, 0, -2.83], 0],
  ['rug', [-3.7, 0, 0.2], Math.PI / 2],
];

let items = [];
let uidCnt = 0;

function updateHalf(g) {
  const b = new THREE.Box3().setFromObject(g);
  g.userData.he = { x: (b.max.x - b.min.x) / 2, z: (b.max.z - b.min.z) / 2 };
  g.userData.radius = Math.max(0.45, Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z) / 2);
}
function clampItem(g) { // 按所在分区夹在房间内，避免穿墙
  const he = g.userData.he, p = g.position;
  const inBed = p.x < ROOM.partX;
  const x0 = inBed ? ROOM.minX : ROOM.partX, x1 = inBed ? ROOM.partX : ROOM.maxX;
  let lo = x0 + he.x + 0.06, hi = x1 - he.x - 0.06;
  p.x = lo > hi ? (x0 + x1) / 2 : clamp(p.x, lo, hi);
  lo = ROOM.minZ + he.z + 0.06; hi = ROOM.maxZ - he.z - 0.06;
  p.z = lo > hi ? 0 : clamp(p.z, lo, hi);
}
function spawnItem(cat, pos, rotY) {
  const g = cat.build();
  g.userData.isItem = true; g.userData.catId = cat.id; g.userData.uid = ++uidCnt;
  g.position.set(pos ? pos[0] : cat.pos[0], 0, pos ? pos[2] : cat.pos[2]);
  g.rotation.y = rotY !== undefined ? rotY : (cat.rotY || 0);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); g.updateMatrixWorld(true);
  updateHalf(g); clampItem(g);
  items.push(g);
  return g;
}
function buildDefaults() { DEFAULT_SCENE.forEach(d => spawnItem(CATALOG_BY[d[0]], d[1], d[2])); }

/* ================= 全屋材质替换 ================= */
let curFloor = null, curWall = null;
function applyFloor(sw) {
  curFloor = sw;
  const t = getTex(sw.tex).tex.clone(); t.needsUpdate = true;
  t.repeat.set((ROOM.maxX - ROOM.minX) / sw.scale, (ROOM.maxZ - ROOM.minZ) / sw.scale);
  floorMat.map = t; floorMat.color.set('#ffffff');
  floorMat.roughness = sw.rough !== undefined ? sw.rough : 0.6;
  floorMat.metalness = sw.metal || 0;
  floorMat.needsUpdate = true;
}
function applyWall(sw) {
  curWall = sw;
  walls.forEach(o => {
    const m = o.mesh.material;
    if (sw.tex) {
      const t = getTex(sw.tex).tex.clone(); t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(o.w / sw.scale)), Math.max(1, Math.round(o.h / sw.scale)));
      m.map = t; m.color.set('#ffffff');
    } else {
      m.map = null; m.color.set(sw.color).convertSRGBToLinear();
    }
    m.needsUpdate = true;
  });
}

/* ================= 拾取 / 拖拽 / 选中 ================= */
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitV = new THREE.Vector3();
let selected = null, hovered = null, drag = null, emptyDown = null;

function setNDC(e) { ndc.x = (e.clientX / window.innerWidth) * 2 - 1; ndc.y = -(e.clientY / window.innerHeight) * 2 + 1; }
function pickItem(e) {
  setNDC(e); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(items, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.isItem) o = o.parent;
  return o;
}
function floorPoint(e) {
  setNDC(e); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(groundPlane, hitV) ? { x: hitV.x, z: hitV.z } : null;
}
function setEmissive(g, hex) {
  g.traverse(o => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => {
      if (m.emissive && !shadeMats.includes(m) && !tvMats.includes(m)) m.emissive.setHex(hex);
    });
  });
}
function setHover(g) {
  if (hovered === g) return;
  if (hovered && hovered !== selected) setEmissive(hovered, 0);
  hovered = g;
  if (hovered && hovered !== selected) setEmissive(hovered, 0x241708);
}

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.88, 1, 48),
  new THREE.MeshBasicMaterial({ color: 0xb06a45, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
ring.visible = false; ring.renderOrder = 2; scene.add(ring);

function onPointerDown(e) {
  camAnim = null;
  if (e.button !== 0) { emptyDown = null; return; }
  const g = pickItem(e);
  if (g) {
    controls.enabled = false;   // 抢在相机控制器之前禁用，避免边拖家具边转视角
    const p = floorPoint(e);
    drag = { g, ox: p ? g.position.x - p.x : 0, oz: p ? g.position.z - p.z : 0, moved: false, sx: e.clientX, sy: e.clientY };
    stage.style.cursor = 'grabbing';
  } else {
    emptyDown = { x: e.clientX, y: e.clientY };
  }
}
function onPointerMove(e) {
  if (drag) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
    if (drag.moved) {
      const p = floorPoint(e);
      if (p) { drag.g.position.x = p.x + drag.ox; drag.g.position.z = p.z + drag.oz; clampItem(drag.g); }
    }
    return;
  }
  if (e.buttons) { stage.style.cursor = ''; setHover(null); return; }
  const g = pickItem(e);
  setHover(g);
  stage.style.cursor = g ? 'grab' : '';
}
function onPointerUp(e) {
  if (drag) {
    controls.enabled = true; stage.style.cursor = '';
    select(drag.g);
    drag = null;
    return;
  }
  if (emptyDown) {
    if (Math.hypot(e.clientX - emptyDown.x, e.clientY - emptyDown.y) < 6) select(null);
    emptyDown = null;
  }
}
function select(g) {
  if (selected && selected !== g) setEmissive(selected, 0);
  selected = g;
  if (g) {
    setEmissive(g, 0x2a1c10);
    ring.visible = true; ring.scale.setScalar(g.userData.radius);
    openPanel(g);
    document.body.classList.add('sel-on');
  } else {
    ring.visible = false;
    closePanel();
    document.body.classList.remove('sel-on');
  }
}
function rotateSel(d) {
  if (!selected) return;
  selected.rotation.y += d * Math.PI / 4;
  selected.updateMatrixWorld(true);
  updateHalf(selected); clampItem(selected);
}
function deleteSel() {
  if (!selected) return;
  const g = selected;
  scene.remove(g);
  g.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  items = items.filter(x => x !== g);
  select(null);
  toastMsg('已删除一件家具');
}
window.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'Escape') select(null);
  else if (e.key === 'r' || e.key === 'R') rotateSel(1);
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSel();
});

/* ================= 昼夜模式 ================= */
const MODES = {
  day: { sky: ['#9fc6dd', '#f5efe2'], fog: '#e6e2d6', hemi: 0.62, hSky: '#ffffff', hGnd: '#b7a893', amb: 0.22, dir: 1.15, dCol: '#fff2dd', lamp: 0, glow: 0, tv: 0.07, fill: 0 },
  dusk: { sky: ['#8a7a9b', '#f2c391'], fog: '#d9c2a9', hemi: 0.34, hSky: '#ffd7b0', hGnd: '#8a7060', amb: 0.14, dir: 0.6, dCol: '#ffbe85', lamp: 0.75, glow: 0.3, tv: 0.5, fill: 0.18 },
  night: { sky: ['#0d1420', '#232c3d'], fog: '#141b28', hemi: 0.1, hSky: '#9fb4d8', hGnd: '#1c2028', amb: 0.07, dir: 0.05, dCol: '#7e93b8', lamp: 1.2, glow: 0.6, tv: 1.15, fill: 0.34 },
};
const skyCache = {};
function setMode(k) {
  const M = MODES[k];
  hemi.intensity = M.hemi; hemi.color.set(M.hSky); hemi.groundColor.set(M.hGnd);
  amb.intensity = M.amb; dir.intensity = M.dir; dir.color.set(M.dCol);
  fillLights.forEach(l => l.intensity = M.fill);
  lampLights.forEach(l => l.intensity = M.lamp);
  shadeMats.forEach(m => { m.emissive.set(0xffc98c); m.emissiveIntensity = M.glow; });
  tvMats.forEach(m => m.emissiveIntensity = M.tv);
  if (!skyCache[k]) skyCache[k] = skyTex(M.sky[0], M.sky[1]);
  scene.background = skyCache[k];
  scene.fog.color.set(M.fog);
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === k));
}

/* ================= 视角漫游 ================= */
const VIEWS = {
  all: { p: [8.8, 6.4, 9.2], t: [0, 0.75, 0] },
  top: { p: [0.3, 14, 0.4], t: [0.3, 0, 0.4] },
  living: { p: [2.4, 2.8, 6.1], t: [2.1, 0.8, -0.7] },
  bedroom: { p: [-0.7, 2.6, 4.9], t: [-3.4, 0.8, 0] },
};
let camAnim = null;
function flyTo(p, t) {
  camAnim = {
    t0: performance.now(), dur: 850,
    fp: camera.position.clone(), tp: new THREE.Vector3(p[0], p[1], p[2]),
    ft: controls.target.clone(), tt: new THREE.Vector3(t[0], t[1], t[2]),
  };
}

/* ================= UI ================= */
const floorGrid = document.getElementById('floorGrid');
const wallGrid = document.getElementById('wallGrid');
const furnGrid = document.getElementById('furnGrid');
const selPanel = document.getElementById('selPanel');
const selName = document.getElementById('selName');
const selSlots = document.getElementById('selSlots');
const selSwatches = document.getElementById('selSwatches');

function buildGrid(container, list, onPick) {
  list.forEach(sw => {
    const d = el('div', 'sw'); d.title = sw.name; d._sw = sw;
    const c = el('div', 'chip'); const n = el('div', 'nm'); n.textContent = sw.name;
    if (sw.url) c.style.backgroundImage = `url(${sw.url})`;
    else c.style.backgroundColor = sw.color || '#ccc';
    d.appendChild(c); d.appendChild(n);
    d.onclick = () => onPick(sw);
    container.appendChild(d);
  });
}
function refreshGlobalActive() {
  [...floorGrid.children].forEach(d => d.classList.toggle('active', d._sw === curFloor));
  [...wallGrid.children].forEach(d => d.classList.toggle('active', d._sw === curWall));
}
FLOORS.forEach(f => { if (f.tex) f.url = getThumb(f.tex); });
WALLS.forEach(w => { if (w.tex) w.url = getThumb(w.tex); });
buildGrid(floorGrid, FLOORS, sw => { applyFloor(sw); refreshGlobalActive(); });
buildGrid(wallGrid, WALLS, sw => { applyWall(sw); refreshGlobalActive(); });

CATALOG.forEach(cat => {
  const d = el('div', 'fcard');
  d.innerHTML = `<div class="ic">${cat.icon}</div><div class="fn">${cat.name}</div>`;
  d.onclick = () => {
    const g = spawnItem(cat, [1.8 + rand(-0.5, 0.5), 0, 0.9 + rand(-0.5, 0.5)]);
    select(g);
    toastMsg(`已添加「${cat.name}」`);
  };
  furnGrid.appendChild(d);
});

document.querySelectorAll('#panel .tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('#panel .tab').forEach(x => x.classList.toggle('on', x === b));
  document.getElementById('tab-mat').classList.toggle('on', b.dataset.tab === 'mat');
  document.getElementById('tab-furn').classList.toggle('on', b.dataset.tab === 'furn');
});
document.querySelectorAll('#viewSeg button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('on', x === b));
  const v = VIEWS[b.dataset.view];
  flyTo(v.p, v.t);
});
document.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => setMode(b.dataset.mode));

const btnSpin = document.getElementById('btnSpin');
btnSpin.onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  btnSpin.classList.toggle('on', controls.autoRotate);
};
document.getElementById('btnLucky').onclick = () => {
  applyFloor(pick(FLOORS)); applyWall(pick(WALLS));
  items.forEach(g => g.userData.slots.forEach(s =>
    applySwatchToSlot(g, s, Math.floor(Math.random() * PALETTES[s.palette].items.length))));
  refreshGlobalActive();
  if (selected) renderSelSwatches(selected);
  toastMsg('✨ 已随机生成一套新搭配');
};
document.getElementById('btnShot').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `灵感家-全屋效果图-${Date.now()}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
  toastMsg('📷 效果图已保存到下载文件夹');
};
document.getElementById('btnReset').onclick = () => {
  items.slice().forEach(g => {
    scene.remove(g);
    g.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  });
  items = [];
  select(null);
  buildDefaults();
  applyFloor(FLOORS[0]); applyWall(WALLS[0]); refreshGlobalActive();
  setMode('day');
  toastMsg('已恢复默认方案');
};
document.getElementById('rotL').onclick = () => rotateSel(-1);
document.getElementById('rotR').onclick = () => rotateSel(1);
document.getElementById('selDel').onclick = deleteSel;
document.getElementById('selClose').onclick = () => select(null);

function renderSelTabs(g) {
  selSlots.innerHTML = '';
  const curKey = g.userData.uiSlot || g.userData.slots[0].key;
  g.userData.slots.forEach(s => {
    const b = el('button', 'st' + (s.key === curKey ? ' on' : ''));
    b.textContent = s.label;
    b.onclick = () => { g.userData.uiSlot = s.key; renderSelTabs(g); renderSelSwatches(g); };
    selSlots.appendChild(b);
  });
}
function renderSelSwatches(g) {
  const key = g.userData.uiSlot || g.userData.slots[0].key;
  const slot = g.userData.slots.find(s => s.key === key);
  selSwatches.innerHTML = '';
  PALETTES[slot.palette].items.forEach((sw, i) => {
    const d = el('div', 'sws' + (i === slot.cur ? ' active' : ''));
    d.title = sw.name;
    const c = el('div', 'chip'); const n = el('div', 'nm'); n.textContent = sw.name;
    const url = sw.tex ? getThumb(sw.tex) : null;
    if (url) c.style.backgroundImage = `url(${url})`;
    else c.style.backgroundColor = sw.color || '#ccc';
    d.appendChild(c); d.appendChild(n);
    d.onclick = () => { applySwatchToSlot(g, slot, i); renderSelSwatches(g); };
    selSwatches.appendChild(d);
  });
}
function openPanel(g) {
  const cat = CATALOG_BY[g.userData.catId];
  selName.textContent = `${cat.icon} ${cat.name}`;
  renderSelTabs(g); renderSelSwatches(g);
  selPanel.classList.add('on');
}
function closePanel() { selPanel.classList.remove('on'); }

let toastT = null;
function toastMsg(s) {
  const t = document.getElementById('toast');
  t.textContent = s; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= 主循环 ================= */
function animate() {
  requestAnimationFrame(animate);
  if (camAnim) {
    const k = (performance.now() - camAnim.t0) / camAnim.dur;
    const e = k >= 1 ? 1 : (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    camera.position.lerpVectors(camAnim.fp, camAnim.tp, e);
    controls.target.lerpVectors(camAnim.ft, camAnim.tt, e);
    if (k >= 1) camAnim = null;
  }
  controls.update();
  if (selected) ring.position.set(selected.position.x, 0.02, selected.position.z);
  renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================= 启动 ================= */
buildDefaults();
applyFloor(FLOORS[0]);
applyWall(WALLS[0]);
refreshGlobalActive();
setMode('day');
controls.update();
animate();
setTimeout(() => {
  const l = document.getElementById('loading');
  if (l) { l.classList.add('off'); setTimeout(() => l.remove(), 600); }
}, 500);
