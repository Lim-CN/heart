// console.clear();

// 加载状态管理
let loadingProgress = 0;
const totalResources = 3; // 心脏模型 + 字体 + 初始化

function updateLoadingProgress() {
  loadingProgress++;
  if (loadingProgress >= totalResources) {
    // 所有资源加载完成，隐藏加载动画
    setTimeout(() => {
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.classList.add('hidden');
        setTimeout(() => {
          loadingElement.style.display = 'none';
        }, 500);
      }
    }, 500); // 延迟500ms确保动画流畅
  }
}

// 创建场景对象 Scene
const scene = new THREE.Scene();

// 创建透视相机
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

//  创建渲染器对象
const renderer = new THREE.WebGLRenderer({
  antialias: true, //  是否执行抗锯齿。默认值为false。
});

// 设置颜色及其透明度
renderer.setClearColor(new THREE.Color("rgb(0,0,0)"));

// 将输 canvas 的大小调整为 (width, height) 并考虑设备像素比，且将视口从 (0, 0) 开始调整到适合大小
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 表示对象局部位置的 Vector3。默认值为(0, 0, 0)。
camera.position.z = 1.8;

// 轨迹球控制器
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 3;
controls.minDistance = 0.7;

// 物体
const group = new THREE.Group();
scene.add(group);

let heart = null;
let sampler = null;
let originHeart = null;

// OBJ加载器
new THREE.OBJLoader().load(
  "https://assets.codepen.io/127738/heart_2.obj",
  (obj) => {
    heart = obj.children[0];
    heart.geometry.rotateX(-Math.PI * 0.5);
    heart.geometry.scale(0.04, 0.04, 0.04);
    heart.geometry.translate(0, -0.4, 0);
    group.add(heart);

    // 基础网格材质
    heart.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("rgb(0,0,0)"),
    });
    originHeart = Array.from(heart.geometry.attributes.position.array);
    // 用于在网格表面上采样加权随机点的实用程序类。
    sampler = new THREE.MeshSurfaceSampler(heart).build();
    // 生成表皮
    init();
    // 每一帧都会调用
    renderer.setAnimationLoop(render);
    
    // 心脏模型加载完成
    updateLoadingProgress();
  },
  // 加载进度回调
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% 心脏模型加载完成');
  },
  // 错误回调
  function (error) {
    console.error('心脏模型加载失败:', error);
    updateLoadingProgress(); // 即使失败也要更新进度
  }
);

let positions = [];
let colors = [];
const geometry = new THREE.BufferGeometry();

const material = new THREE.PointsMaterial({
  vertexColors: true, // Let Three.js knows that each point has a different color
  size: 0.009,
});

const particles = new THREE.Points(geometry, material);
group.add(particles);

// 添加文字"Quinn"
let textMesh = null;
const fontLoader = new THREE.FontLoader();

// 可用字体列表
const availableFonts = {
  'helvetiker': 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
  'optimer': 'https://threejs.org/examples/fonts/optimer_regular.typeface.json',
  'gentilis': 'https://threejs.org/examples/fonts/gentilis_regular.typeface.json',
  'droid_sans': 'https://threejs.org/examples/fonts/droid/droid_sans_regular.typeface.json',
  'droid_serif': 'https://threejs.org/examples/fonts/droid/droid_serif_regular.typeface.json'
};

// 当前选择的字体（可以修改这个值来切换字体）
const selectedFont = 'droid_serif'; // 可以改为: 'helvetiker', 'optimer', 'gentilis', 'droid_sans', 'droid_serif'

fontLoader.load(availableFonts[selectedFont], function(font) {
  const textGeometry = new THREE.TextGeometry('Quinn', {
    font: font,
    size: 0.08,
    height: 0.02,
    curveSegments: 20,
    bevelEnabled: false
  });
  
  // 居中文字
  textGeometry.computeBoundingBox();
  const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
  textGeometry.translate(-textWidth / 2, 0, 0);
  
  const textMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    transparent: true,
    opacity: 0.9
  });
  
  textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.y = 0.05; // 调整文字在心脏中的位置
  textMesh.position.z = 0.02; // 稍微向前偏移，避免与心脏重叠
  group.add(textMesh);
  
  // 字体加载完成
  updateLoadingProgress();
}, undefined, function(error) {
  console.error('字体加载失败:', error);
  updateLoadingProgress(); // 即使失败也要更新进度
});

const simplex = new SimplexNoise();
const pos = new THREE.Vector3();
// 原始色系（绿色系）
const originalPalette = [
  new THREE.Color("#b8e986"),  // 浅绿色
  new THREE.Color("#7ed321"),  // 草绿色
  new THREE.Color("#4a9d23"),  // 绿色
  new THREE.Color("#2d6a1f")   // 深绿色
];

// 红色系
const redPalette = [
  new THREE.Color("#ffd4ee"),  // 浅粉色
  new THREE.Color("#ff77fc"),  // 亮粉色
  new THREE.Color("#ff77ae"),  // 粉红色
  new THREE.Color("#ff1775")   // 深粉色
];

// 当前色系
let currentPalette = originalPalette;
let palette = originalPalette;
// 长按变色功能
let pressTimer = null;
let isRedTheme = false;

// 鼠标/触摸事件监听
document.addEventListener('mousedown', startPressTimer);
document.addEventListener('touchstart', startPressTimer);
document.addEventListener('mouseup', clearPressTimer);
document.addEventListener('touchend', clearPressTimer);
document.addEventListener('mouseleave', clearPressTimer);

function startPressTimer() {
  pressTimer = setTimeout(() => {
    toggleColorTheme();
  }, 5000); // 5秒长按
}

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function toggleColorTheme() {
  isRedTheme = !isRedTheme;
  currentPalette = isRedTheme ? redPalette : originalPalette;
  
  // 更新所有粒子的颜色
  spikes.forEach(spike => {
    spike.color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
  });
  
  // 添加切换动画效果
  if (isRedTheme) {
    // 切换到红色系时的动画
    gsap.to(renderer, { 
      clearColor: new THREE.Color("#1a0000"), 
      duration: 1, 
      ease: "power2.inOut" 
    });
  } else {
    // 切换回绿色系时的动画
    gsap.to(renderer, { 
      clearColor: new THREE.Color("rgb(0,0,0)"), 
      duration: 1, 
      ease: "power2.inOut" 
    });
  }
}

class SparkPoint {
  constructor() {
    sampler.sample(pos);
    this.color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
    this.rand = Math.random() * 0.03;
    this.pos = pos.clone();
    this.one = null;
    this.two = null;
  }
  update(a) {
    const noise =
      simplex.noise4D(this.pos.x * 1, this.pos.y * 1, this.pos.z * 1, 0.1) +
      1.5;
    const noise2 =
      simplex.noise4D(this.pos.x * 500, this.pos.y * 500, this.pos.z * 500, 1) +
      1;
    this.one = this.pos.clone().multiplyScalar(1.01 + noise * 0.15 * beat.a);
    this.two = this.pos
      .clone()
      .multiplyScalar(1 + noise2 * 1 * (beat.a + 0.3) - beat.a * 1.2);
  }
}

let spikes = [];
function init(a) {
  positions = [];
  colors = [];
  for (let i = 0; i < 10000; i++) {
    const g = new SparkPoint();
    spikes.push(g);
  }
  
  // 初始化完成
  updateLoadingProgress();
}

const beat = { a: 0 };
gsap
  .timeline({
    repeat: -1,
    repeatDelay: 0.3,
  })
  .to(beat, {
    a: 0.5,
    duration: 0.6,
    ease: "power2.in",
  })
  .to(beat, {
    a: 0.0,
    duration: 0.6,
    ease: "power3.out",
  });

// 0.22954521554974774 -0.22854083083283794
const maxZ = 0.23;
const rateZ = 0.5;

function render(a) {
  positions = [];
  colors = [];
  
  // 更新文字脉动效果
  if (textMesh) {
    // 更平滑的缩放动画
    const scale = 1 + Math.sin(a * 0.0005) * 0.05 * beat.a;
    textMesh.scale.set(scale, scale, scale);
    
    // 更缓慢的颜色变化，避免闪烁
    const hue = (a * 0.0005) % 1;
    textMesh.material.color.setHSL(hue, 0.6, 0.8);
  }
  spikes.forEach((g, i) => {
    g.update(a);
    const rand = g.rand;
    const color = g.color;
    if (maxZ * rateZ + rand > g.one.z && g.one.z > -maxZ * rateZ - rand) {
      positions.push(g.one.x, g.one.y, g.one.z);
      colors.push(color.r, color.g, color.b);
    }
    if (
      maxZ * rateZ + rand * 2 > g.one.z &&
      g.one.z > -maxZ * rateZ - rand * 2
    ) {
      positions.push(g.two.x, g.two.y, g.two.z);
      colors.push(color.r, color.g, color.b);
    }
  });
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)
  );

  const vs = heart.geometry.attributes.position.array;
  for (let i = 0; i < vs.length; i += 3) {
    const v = new THREE.Vector3(
      originHeart[i],
      originHeart[i + 1],
      originHeart[i + 2]
    );
    const noise =
      simplex.noise4D(
        originHeart[i] * 1.5,
        originHeart[i + 1] * 1.5,
        originHeart[i + 2] * 1.5,
        a * 0.0005
      ) + 1;
    v.multiplyScalar(0 + noise * 0.15 * beat.a);
    vs[i] = v.x;
    vs[i + 1] = v.y;
    vs[i + 2] = v.z;
  }
  heart.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}