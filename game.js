// Dragon's Ascent 3D - Enhanced Version
// Using global window.THREE

// --- Global Variables ---
let scene, camera, renderer;
let dragon, skySphere, dragonWings;
const enemies = [];
const projectiles = [];
const explosions = [];
let gameState = 'start';
let score = 0;
let health = 100;

// Wave System
let currentWave = 0;
let enemiesRemaining = 0;
let waveInProgress = false;
let timeSinceLastSpawn = 0;
let waveStartTime = 0;

const WAVE_CONFIGS = [
    { enemies: [{ type: 'scout', count: 5 }], spawnDelay: 800 },
    { enemies: [{ type: 'scout', count: 6 }, { type: 'fighter', count: 2 }], spawnDelay: 700 },
    { enemies: [{ type: 'scout', count: 4 }, { type: 'fighter', count: 4 }], spawnDelay: 600 },
    { enemies: [{ type: 'fighter', count: 5 }, { type: 'bomber', count: 2 }], spawnDelay: 550 },
    { enemies: [{ type: 'fighter', count: 4 }, { type: 'bomber', count: 4 }], spawnDelay: 500 },
    { enemies: [{ type: 'bomber', count: 5 }, { type: 'elite', count: 1 }], spawnDelay: 450 },
    { enemies: [{ type: 'elite', count: 3 }, { type: 'bomber', count: 4 }], spawnDelay: 400 },
    { enemies: [{ type: 'elite', count: 5 }, { type: 'fighter', count: 5 }], spawnDelay: 350 },
];

let waveEnemyQueue = [];

// Inputs
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
const mouse = { x: 0, y: 0 };

// Sky texture loader
const textureLoader = new THREE.TextureLoader();
const skyTexture = textureLoader.load(ASSETS.sky);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
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
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide
    });
    skySphere = new THREE.Mesh(geometry, material);
    scene.add(skySphere);
}

function createDragon() {
    // Enhanced 3D Dragon with smoother shapes
    dragon = new THREE.Group();
    dragonWings = { left: null, right: null };

    // Materials with metallic/shiny look
    const scaleMat = new THREE.MeshStandardMaterial({ 
        color: 0xcc2200, roughness: 0.3, metalness: 0.4 
    });
    const bellyMat = new THREE.MeshStandardMaterial({ 
        color: 0xffcc66, roughness: 0.5, metalness: 0.2 
    });
    const wingMat = new THREE.MeshStandardMaterial({ 
        color: 0xff6633, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide 
    });
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 1 
    });
    const hornMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333, roughness: 0.2, metalness: 0.6 
    });

    // Body - elongated ellipsoid
    const bodyGeo = new THREE.SphereGeometry(1, 16, 12);
    bodyGeo.scale(1.2, 1, 2.5);
    const body = new THREE.Mesh(bodyGeo, scaleMat);
    dragon.add(body);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(0.8, 12, 8);
    bellyGeo.scale(0.9, 0.6, 2);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.4, 0);
    dragon.add(belly);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.5, 0.8, 2.5, 8);
    const neck = new THREE.Mesh(neckGeo, scaleMat);
    neck.position.set(0, 0.5, -2.5);
    neck.rotation.x = Math.PI / 4;
    dragon.add(neck);

    // Head
    const headGeo = new THREE.SphereGeometry(0.8, 12, 10);
    headGeo.scale(0.8, 0.7, 1.2);
    const head = new THREE.Mesh(headGeo, scaleMat);
    head.position.set(0, 1.5, -4);
    dragon.add(head);

    // Snout
    const snoutGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.position.set(0, 1.3, -5);
    snout.rotation.x = Math.PI / 2;
    dragon.add(snout);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.4, 1.7, -4.3);
    dragon.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.4, 1.7, -4.3);
    dragon.add(rightEye);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.1, 0.8, 6);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(0.3, 2.2, -3.8);
    leftHorn.rotation.x = -0.3;
    leftHorn.rotation.z = 0.2;
    dragon.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(-0.3, 2.2, -3.8);
    rightHorn.rotation.x = -0.3;
    rightHorn.rotation.z = -0.2;
    dragon.add(rightHorn);

    // Wings (animated)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4, 1);
    wingShape.lineTo(5, 0);
    wingShape.lineTo(4, -0.5);
    wingShape.lineTo(2, -0.3);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0.8, 0.5, 0);
    leftWing.rotation.y = Math.PI / 2;
    leftWing.rotation.x = 0.2;
    dragonWings.left = leftWing;
    dragon.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(-0.8, 0.5, 0);
    rightWing.rotation.y = -Math.PI / 2;
    rightWing.rotation.x = 0.2;
    rightWing.scale.x = -1;
    dragonWings.right = rightWing;
    dragon.add(rightWing);

    // Tail
    const tailSegments = 5;
    for (let i = 0; i < tailSegments; i++) {
        const size = 0.6 - i * 0.1;
        const tailGeo = new THREE.SphereGeometry(size, 8, 6);
        tailGeo.scale(1, 0.8, 1.5);
        const tailSeg = new THREE.Mesh(tailGeo, scaleMat);
        tailSeg.position.set(0, -0.2 * i, 2 + i * 1.2);
        dragon.add(tailSeg);
    }
    // Tail spike
    const spikeGeo = new THREE.ConeGeometry(0.2, 1, 6);
    const spike = new THREE.Mesh(spikeGeo, hornMat);
    spike.position.set(0, -1, 7.5);
    spike.rotation.x = -Math.PI / 2;
    dragon.add(spike);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
    const positions = [[0.6, -1.2, 0.5], [-0.6, -1.2, 0.5], [0.6, -1.2, -1], [-0.6, -1.2, -1]];
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, scaleMat);
        leg.position.set(...pos);
        dragon.add(leg);
    });

    scene.add(dragon);
}

// --- Game Logic ---

function startGame() {
    gameState = 'playing';
    score = 0;
    health = 100;
    currentWave = 0;
    waveEnemyQueue = [];
    waveInProgress = false;

    // Reset positions
    dragon.position.set(0, 0, 0);
    dragon.rotation.set(0, 0, 0);
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
    
    // Start first wave
    setTimeout(() => startWave(1), 1000);
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

    // Update Crosshair position
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.left = `${event.clientX}px`;
        crosshair.style.top = `${event.clientY}px`;
    }
}

function onMouseDown() {
    if (gameState === 'playing') shoot();
}

function shoot() {
    // 3D Fireball (glowing sphere)
    const fireballGroup = new THREE.Group();
    
    const coreMat = new THREE.MeshStandardMaterial({ 
        color: 0xffff00, 
        emissive: 0xff6600, 
        emissiveIntensity: 2 
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), coreMat);
    fireballGroup.add(core);
    
    const outerMat = new THREE.MeshStandardMaterial({ 
        color: 0xff4400, 
        emissive: 0xff2200, 
        transparent: true, 
        opacity: 0.6 
    });
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), outerMat);
    fireballGroup.add(outer);

    // Start at dragon mouth
    fireballGroup.position.copy(dragon.position);
    fireballGroup.position.z -= 6;
    fireballGroup.position.y += 1;

    // Aiming with mouse
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    raycaster.ray.at(100, target);

    const velocity = target.sub(fireballGroup.position).normalize().multiplyScalar(2);

    scene.add(fireballGroup);
    projectiles.push({ mesh: fireballGroup, velocity: velocity, life: 100 });
}

// Enemy Type Creators
function createScout() {
    const enemy = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.3, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ffff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });

    // Sleek body
    const bodyGeo = new THREE.ConeGeometry(0.8, 3, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    enemy.add(body);

    // Cockpit
    const cockpitGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.3, -0.5);
    enemy.add(cockpit);

    // Small wings
    const wingGeo = new THREE.BoxGeometry(2, 0.1, 0.8);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(0, 0, 0.3);
    enemy.add(wing);

    // Engine
    const engineGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 6);
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(0, 0, 1.5);
    enemy.add(engine);

    return { mesh: enemy, hp: 1, speed: 0.4, score: 50, type: 'scout' };
}

function createFighter() {
    const enemy = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4444aa, roughness: 0.2, metalness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.3 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 });

    // Main fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    enemy.add(body);

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
    const nose = new THREE.Mesh(noseGeo, accentMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, -2.5);
    enemy.add(nose);

    // Wings
    const wingGeo = new THREE.BoxGeometry(4, 0.15, 1.2);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    enemy.add(wings);

    // Tail fins
    const finGeo = new THREE.BoxGeometry(0.1, 1, 0.8);
    const topFin = new THREE.Mesh(finGeo, accentMat);
    topFin.position.set(0, 0.6, 1.5);
    enemy.add(topFin);

    // Engines
    [-0.8, 0.8].forEach(x => {
        const engineGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.8, 6);
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(x, 0, 2.2);
        enemy.add(engine);
    });

    return { mesh: enemy, hp: 2, speed: 0.35, score: 100, type: 'fighter' };
}

function createBomber() {
    const enemy = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000 });

    // Heavy body
    const bodyGeo = new THREE.BoxGeometry(2, 1.5, 5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemy.add(body);

    // Armor plates
    const plateGeo = new THREE.BoxGeometry(2.2, 0.2, 3);
    const topPlate = new THREE.Mesh(plateGeo, armorMat);
    topPlate.position.set(0, 0.85, 0);
    enemy.add(topPlate);

    // Wide wings
    const wingGeo = new THREE.BoxGeometry(6, 0.3, 2);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.set(0, 0, 0.5);
    enemy.add(wings);

    // Multiple engines
    [-2, -0.7, 0.7, 2].forEach(x => {
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.4, 1, 6);
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(x, -0.3, 2.8);
        enemy.add(engine);
    });

    return { mesh: enemy, hp: 4, speed: 0.25, score: 200, type: 'bomber' };
}

function createElite() {
    const enemy = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x220022, roughness: 0.1, metalness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 2 });
    const shieldMat = new THREE.MeshStandardMaterial({ 
        color: 0x8800ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide 
    });

    // Sleek angular body
    const bodyGeo = new THREE.OctahedronGeometry(1.5, 0);
    bodyGeo.scale(1, 0.5, 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemy.add(body);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const core = new THREE.Mesh(coreGeo, glowMat);
    enemy.add(core);

    // Shield bubble
    const shieldGeo = new THREE.SphereGeometry(2.5, 16, 12);
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    enemy.add(shield);

    // Angular wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3, -0.5);
    wingShape.lineTo(2.5, 0.5);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    
    const leftWing = new THREE.Mesh(wingGeo, bodyMat);
    leftWing.position.set(1, 0, 0);
    leftWing.rotation.y = Math.PI / 2;
    enemy.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeo, bodyMat);
    rightWing.position.set(-1, 0, 0);
    rightWing.rotation.y = -Math.PI / 2;
    rightWing.scale.x = -1;
    enemy.add(rightWing);

    return { mesh: enemy, hp: 6, speed: 0.45, score: 500, type: 'elite' };
}

function createEnemy(type) {
    switch(type) {
        case 'scout': return createScout();
        case 'fighter': return createFighter();
        case 'bomber': return createBomber();
        case 'elite': return createElite();
        default: return createScout();
    }
}

// Wave System
function startWave(waveNum) {
    currentWave = waveNum;
    const config = WAVE_CONFIGS[Math.min(waveNum - 1, WAVE_CONFIGS.length - 1)];
    
    // Build enemy queue
    waveEnemyQueue = [];
    config.enemies.forEach(e => {
        for (let i = 0; i < e.count; i++) {
            waveEnemyQueue.push(e.type);
        }
    });
    // Shuffle queue
    waveEnemyQueue.sort(() => Math.random() - 0.5);
    
    enemiesRemaining = waveEnemyQueue.length;
    waveInProgress = true;
    timeSinceLastSpawn = 0;
    waveStartTime = Date.now();
    
    updateHUD();
}

function spawnFromWave() {
    if (!waveInProgress || waveEnemyQueue.length === 0) return;
    
    const config = WAVE_CONFIGS[Math.min(currentWave - 1, WAVE_CONFIGS.length - 1)];
    const now = Date.now();
    
    if (now - timeSinceLastSpawn < config.spawnDelay) return;
    timeSinceLastSpawn = now;
    
    const type = waveEnemyQueue.shift();
    const enemyData = createEnemy(type);
    
    // Spawn position
    const spawnX = (Math.random() - 0.5) * 80;
    const spawnY = (Math.random() - 0.5) * 40;
    const spawnZ = dragon.position.z - 150 - Math.random() * 50;
    
    enemyData.mesh.position.set(spawnX, spawnY, spawnZ);
    scene.add(enemyData.mesh);
    enemies.push(enemyData);
}

function checkWaveComplete() {
    if (waveInProgress && enemies.length === 0 && waveEnemyQueue.length === 0) {
        waveInProgress = false;
        // Start next wave after delay
        setTimeout(() => {
            if (gameState === 'playing') {
                startWave(currentWave + 1);
            }
        }, 2000);
    }
}

function updateHUD() {
    document.getElementById('score').innerText = score;
    document.getElementById('health').innerText = health + '%';
    
    // Update wave display (add to HUD if not exists)
    let waveDisplay = document.getElementById('wave-display');
    if (!waveDisplay) {
        waveDisplay = document.createElement('span');
        waveDisplay.id = 'wave-display';
        waveDisplay.style.marginLeft = '20px';
        document.getElementById('score-board').appendChild(waveDisplay);
    }
    waveDisplay.innerText = `Wave: ${currentWave}`;
}

function createExplosion(pos, color) {
    // 3D Cube particle burst
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
        const size = 0.2 + Math.random() * 0.4;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true 
        });
        const p = new THREE.Mesh(geometry, material);
        p.position.copy(pos);
        p.position.x += (Math.random() - 0.5) * 3;
        p.position.y += (Math.random() - 0.5) * 3;
        p.position.z += (Math.random() - 0.5) * 3;

        const vel = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(0.8);

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

    const now = Date.now();
    
    // Add "Bobbing" motion to make it feel like it's flying
    const bobOffset = Math.sin(now * 0.003) * 0.05;

    // 1. Player Movement
    const speed = 0.5;
    if (keys.w) dragon.position.z -= speed;
    if (keys.s) dragon.position.z += speed * 0.5; // Slower backward
    if (keys.a) dragon.position.x -= speed;
    if (keys.d) dragon.position.x += speed;
    if (keys.space) dragon.position.y += speed;
    if (keys.shift) dragon.position.y -= speed;
    
    // Apply bobbing after movement
    dragon.position.y += bobOffset;

    // Camera Follow
    const targetCamPos = dragon.position.clone();
    targetCamPos.z += 15;
    targetCamPos.y += 5;
    camera.position.lerp(targetCamPos, 0.08);
    camera.lookAt(dragon.position);

    // Rotate dragon based on mouse (banking)
    const targetRotationZ = -(mouse.x * 0.6);
    const targetRotationX = (mouse.y * 0.3);
    dragon.rotation.z = THREE.MathUtils.lerp(dragon.rotation.z, targetRotationZ, 0.1);
    dragon.rotation.x = THREE.MathUtils.lerp(dragon.rotation.x, targetRotationX, 0.1);

    // 2. Skybox follow
    skySphere.position.copy(dragon.position);
    skySphere.rotation.y += 0.0005;

    // Animate dragon wings
    if (dragonWings.left && dragonWings.right) {
        const wingFlap = Math.sin(now * 0.008) * 0.3;
        dragonWings.left.rotation.z = wingFlap;
        dragonWings.right.rotation.z = -wingFlap;
    }

    // 3. Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.add(p.velocity);
        p.mesh.rotation.x += 0.1;
        p.mesh.rotation.y += 0.1;
        p.life--;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    // 4. Enemies - Wave spawning
    spawnFromWave();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const speed = e.speed || 0.3;
        
        // Move towards player with slight tracking
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(dragon.position, e.mesh.position).normalize();
        e.mesh.position.z += speed;
        e.mesh.position.x += dirToPlayer.x * 0.05;
        e.mesh.position.y += dirToPlayer.y * 0.03;
        
        // Face direction of movement
        e.mesh.lookAt(dragon.position);
        
        if (e.mesh.position.z > dragon.position.z + 50) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
        }

        // Collision with Player
        const collisionDist = e.type === 'bomber' ? 6 : (e.type === 'elite' ? 5 : 4);
        if (e.mesh.position.distanceTo(dragon.position) < collisionDist) {
            const damage = e.type === 'bomber' ? 20 : (e.type === 'elite' ? 25 : 10);
            health -= damage;
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
            const hitDist = e.type === 'bomber' ? 5 : (e.type === 'elite' ? 4 : 3);
            if (p.mesh.position.distanceTo(e.mesh.position) < hitDist) {
                e.hp--;
                if (e.hp <= 0) {
                    score += e.score || 100;
                    updateHUD();
                    const color = e.type === 'elite' ? 0xff00ff : (e.type === 'bomber' ? 0x666666 : 0xffaa00);
                    createExplosion(e.mesh.position, color);
                    scene.remove(e.mesh);
                    enemies.splice(j, 1);
                } else {
                    // Hit but not destroyed - small spark
                    createExplosion(p.mesh.position, 0xffff00);
                }
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
                break;
            }
        }
    }
    
    // Check wave completion
    checkWaveComplete();

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
