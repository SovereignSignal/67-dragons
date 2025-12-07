// REMOVED IMPORT: import * as THREE from 'three';
// Now using global window.THREE

// --- Global Variables ---
let scene, camera, renderer;
let dragon, skySphere;
const enemies = [];
const projectiles = [];
const explosions = [];
let lastTime = 0;
let gameState = 'start'; // start, playing, gameover
let score = 0;
let health = 100;

// Inputs
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
const mouse = { x: 0, y: 0 };

// Assets - Now loaded from global ASSETS object (Data URIs)
const textureLoader = new THREE.TextureLoader();
// Custom loader to remove black background
function loadTextureWithChromaKey(src, isSpriteSheet = false) {
    const texture = new THREE.Texture();
    const image = new Image();
    image.src = src;
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Simple black key: if dark enough, make transparent
            // Using a small threshold to catch compression artifacts if any
            if (r < 20 && g < 20 && b < 20) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        texture.image = canvas;
        texture.needsUpdate = true;
        if (isSpriteSheet) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.set(1 / 4, 1);
        }
    };
    return texture;
}

const textures = {
    // dragon: textureLoader.load(ASSETS.dragon), 
    dragonSheet: loadTextureWithChromaKey(ASSETS.dragonSheet, true),
    hunter: loadTextureWithChromaKey(ASSETS.hunter),
    fireball: loadTextureWithChromaKey(ASSETS.fireball),
    sky: textureLoader.load(ASSETS.sky) // Sky keeps background
};

// Animation State
let dragonFrame = 0;
let dragonFrameTime = 0;
const dragonFrameDuration = 100; // ms per frame

// --- Initialization ---
function init() {
    const canvas = document.getElementById('gameCanvas');

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffaa00, 1);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Create World
    createSky();
    createDragon();

    // Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => handleKey(e.code, true));
    window.addEventListener('keyup', (e) => handleKey(e.code, false));
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    // Start Loop
    renderer.setAnimationLoop(animate);
}

function createSky() {
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    // Invert geometry for inside view
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: textures.sky,
        side: THREE.BackSide
    });
    skySphere = new THREE.Mesh(geometry, material);
    scene.add(skySphere);
}

function createDragon() {
    // Billboard Sprite with Animation Sheet
    const map = textures.dragonSheet;
    const material = new THREE.SpriteMaterial({ map: map, color: 0xffffff });
    dragon = new THREE.Sprite(material);
    dragon.scale.set(8, 6, 1); // Width, Height
    scene.add(dragon);
}

// --- Game Logic ---

function startGame() {
    gameState = 'playing';
    score = 0;
    health = 100;

    // Reset positions
    dragon.position.set(0, 0, 0);
    camera.position.set(0, 2, 15);

    // Clear entities
    enemies.forEach(e => scene.remove(e.mesh));
    enemies.length = 0;
    projectiles.forEach(p => scene.remove(p.mesh));
    projectiles.length = 0;
    explosions.forEach(e => scene.remove(e.mesh));
    explosions.length = 0;

    updateHUD();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
}

function handleKey(code, pressed) {
    if (code === 'KeyW') keys.w = pressed;
    if (code === 'KeyS') keys.s = pressed;
    if (code === 'KeyA') keys.a = pressed;
    if (code === 'KeyD') keys.d = pressed;
    if (code === 'Space') keys.space = pressed;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.shift = pressed;
}

function onMouseMove(event) {
    // Normalize mouse position -1 to 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown() {
    if (gameState === 'playing') shoot();
}

function shoot() {
    const map = textures.fireball;
    const material = new THREE.SpriteMaterial({ map: map, blending: THREE.AdditiveBlending });
    const projectile = new THREE.Sprite(material);
    projectile.scale.set(3, 3, 1);

    // Start at dragon mouth (approx)
    projectile.position.copy(dragon.position);
    projectile.position.z -= 2; // Slightly in front
    projectile.position.y += 0.5;

    // Aiming with mouse
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    raycaster.ray.at(100, target); // Aim at point 100 units away

    const velocity = target.sub(projectile.position).normalize().multiplyScalar(1.5); // Speed

    scene.add(projectile);
    projectiles.push({ mesh: projectile, velocity: velocity, life: 100 });
}

function spawnEnemy() {
    if (Math.random() > 0.02) return; // Spawn chance per frame approx

    const map = textures.hunter;
    const material = new THREE.SpriteMaterial({ map: map });
    const enemy = new THREE.Sprite(material);
    enemy.scale.set(6, 4, 1);

    // Spawn far ahead
    const spawnX = (Math.random() - 0.5) * 100;
    const spawnY = (Math.random() - 0.5) * 60;
    const spawnZ = dragon.position.z - 200; // Far ahead

    enemy.position.set(spawnX, spawnY, spawnZ);
    scene.add(enemy);
    enemies.push({ mesh: enemy, hp: 1 });
}

function updateHUD() {
    document.getElementById('score').innerText = score;
    document.getElementById('health').innerText = health + '%';
}

function createExplosion(pos, color) {
    // Simple particle burst
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        const p = new THREE.Mesh(geometry, material);
        p.position.copy(pos);
        // Random spread
        p.position.x += (Math.random() - 0.5) * 2;
        p.position.y += (Math.random() - 0.5) * 2;

        const vel = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(0.5);

        scene.add(p);
        explosions.push({ mesh: p, velocity: vel, life: 1.0 });
    }
}

// --- Main Loop ---
function animate() {
    if (gameState !== 'playing') {
        renderer.render(scene, camera);
        return;
    }

    // 0. Animation Update
    const now = Date.now();
    if (now - dragonFrameTime > dragonFrameDuration) {
        dragonFrame = (dragonFrame + 1) % 4;
        dragonFrameTime = now;

        // Update texture offset
        dragon.material.map.offset.x = dragonFrame / 4;
    }

    // 1. Player Movement
    const speed = 0.5;
    if (keys.w) dragon.position.z -= speed;
    if (keys.s) dragon.position.z += speed; // Backward? sure
    if (keys.a) dragon.position.x -= speed;
    if (keys.d) dragon.position.x += speed;
    if (keys.space) dragon.position.y += speed;
    if (keys.shift) dragon.position.y -= speed;

    // Camera Follow
    const targetCamPos = dragon.position.clone();
    targetCamPos.z += 15;
    targetCamPos.y += 3;
    camera.position.lerp(targetCamPos, 0.1);

    // Rotate dragon slightly based on movement (banking)
    dragon.material.rotation = - (mouse.x * 0.5); // Bank with mouse x

    // 2. Skybox follow
    skySphere.position.copy(dragon.position);
    skySphere.rotation.y += 0.0005;

    // 3. Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.add(p.velocity);
        p.life--;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    // 4. Enemies
    spawnEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.mesh.position.z += 0.2; // Move towards +Z
        if (e.mesh.position.z > dragon.position.z + 50) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
        }

        // Collision with Player
        if (e.mesh.position.distanceTo(dragon.position) < 5) {
            health -= 10;
            updateHUD();
            createExplosion(e.mesh.position, 0xff0000);
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            if (health <= 0) {
                gameState = 'gameover';
                document.getElementById('final-score').innerText = score;
                document.getElementById('game-over-screen').classList.remove('hidden');
            }
        }
    }

    // 5. Collision Projectile vs Enemy
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (p.mesh.position.distanceTo(e.mesh.position) < 4) {
                score += 100;
                updateHUD();
                createExplosion(e.mesh.position, 0xffaa00);
                scene.remove(e.mesh);
                enemies.splice(j, 1);
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // 6. Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i];
        ex.mesh.position.add(ex.velocity);
        ex.mesh.rotation.z += 0.1;
        ex.life -= 0.05;
        ex.mesh.material.opacity = ex.life;
        ex.mesh.material.transparent = true;
        if (ex.life <= 0) {
            scene.remove(ex.mesh);
            explosions.splice(i, 1);
        }
    }

    // Render
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Init
init();
