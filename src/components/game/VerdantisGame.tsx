import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../../utils/soundEngine';

type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAMEOVER';

interface GameStats {
  resonance: number;
  maxResonance: number;
  shardsCollected: number;
  totalShards: number;
  matrixCharge: number;
  speed: number;
  score: number;
}

export const VerdantisGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // High-level game state
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [stats, setStats] = useState<GameStats>({
    resonance: 100,
    maxResonance: 100,
    shardsCollected: 0,
    totalShards: 8,
    matrixCharge: 0,
    speed: 0,
    score: 0,
  });
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Mutable refs for 60fps simulation
  const gameLoopRef = useRef<{
    state: GameState;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    playerGroup: THREE.Group | null;
    cockpitMesh: THREE.Mesh | null;
    propellers: THREE.Mesh[];
    shards: { group: THREE.Group; collected: boolean; id: number }[];
    hazards: { group: THREE.Group; radius: number; speed: number }[];
    rings: { group: THREE.Group; passed: boolean }[];
    particles: THREE.Points | null;
    input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      boost: boolean;
    };
    playerPos: THREE.Vector3;
    playerVel: THREE.Vector3;
    playerRot: THREE.Euler;
    shake: number;
    hitStop: number;
    resonance: number;
    shardsCollected: number;
    score: number;
    matrixCharge: number;
  }>({
    state: 'TITLE',
    scene: null,
    camera: null,
    renderer: null,
    playerGroup: null,
    cockpitMesh: null,
    propellers: [],
    shards: [],
    hazards: [],
    rings: [],
    particles: null,
    input: { forward: false, backward: false, left: false, right: false, boost: false },
    playerPos: new THREE.Vector3(0, 15, 0),
    playerVel: new THREE.Vector3(0, 0, 0),
    playerRot: new THREE.Euler(0, 0, 0, 'YXZ'),
    shake: 0,
    hitStop: 0,
    resonance: 100,
    shardsCollected: 0,
    score: 0,
    matrixCharge: 0,
  });

  // Start game action
  const startGame = () => {
    const g = gameLoopRef.current;
    g.state = 'PLAYING';
    g.playerPos.set(0, 15, 0);
    g.playerVel.set(0, 0, 0);
    g.playerRot.set(0, 0, 0);
    g.resonance = 100;
    g.shardsCollected = 0;
    g.matrixCharge = 0;
    g.score = 0;
    g.shake = 0;
    g.hitStop = 0;

    // Reset collectibles
    g.shards.forEach((s) => {
      s.collected = false;
      s.group.visible = true;
    });
    g.rings.forEach((r) => {
      r.passed = false;
    });

    setGameState('PLAYING');
    soundEngine.playMood('temple-morning');
    soundEngine.playSFX('CHIME');
  };

  const resumeGame = () => {
    gameLoopRef.current.state = 'PLAYING';
    setGameState('PLAYING');
  };

  const pauseGame = () => {
    gameLoopRef.current.state = 'PAUSED';
    setGameState('PAUSED');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const g = gameLoopRef.current;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') g.input.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') g.input.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') g.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') g.input.right = true;
      if (e.code === 'Space') {
        g.input.boost = true;
        if (g.state === 'TITLE') startGame();
      }
      if (e.code === 'Enter') {
        if (g.state === 'TITLE' || g.state === 'GAMEOVER' || g.state === 'VICTORY') {
          startGame();
        }
      }
      if (e.code === 'Escape') {
        if (g.state === 'PLAYING') pauseGame();
        else if (g.state === 'PAUSED') resumeGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const g = gameLoopRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') g.input.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') g.input.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') g.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') g.input.right = false;
      if (e.code === 'Space') g.input.boost = false;
    };

    const handleBlur = () => {
      const g = gameLoopRef.current;
      g.input = { forward: false, backward: false, left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1e18); // Verdantis morning canopy
    scene.fog = new THREE.FogExp2(0x0c1e18, 0.0045);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 22, -32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Studio PBR Lighting
    const keyLight = new THREE.DirectionalLight(0xfef08a, 2.2); // Warm dawn light
    keyLight.position.set(60, 120, 80);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x86efac, 0x064e3b, 1.2); // Cool sky/ground
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // 3. Composite 8-Part Hero Ship (Aku's Arcanum Glider)
    const playerGroup = new THREE.Group();

    // Part 1: Aerodynamic Needle Fuselage
    const hullGeo = new THREE.ConeGeometry(1.6, 9, 8);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0f2a4a, // Navy Draoi officer blue
      metalness: 0.85,
      roughness: 0.2,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.castShadow = true;
    playerGroup.add(hull);

    // Part 2: Transmissive Crystal Cockpit Dome
    const cockpitGeo = new THREE.SphereGeometry(1.0, 16, 16);
    cockpitGeo.scale(0.8, 0.9, 1.8);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      transmission: 0.75,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.7, 0.5);
    playerGroup.add(cockpit);

    // Part 3: Swept Bio-Wings (White & Gold leaf lattice)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(6, -2);
    wingShape.lineTo(7, -3.5);
    wingShape.lineTo(1.5, -2);
    wingShape.lineTo(0, 0);

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.4,
      roughness: 0.35,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.position.set(0.6, 0.1, 1);
    leftWing.castShadow = true;
    playerGroup.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.x = -1;
    rightWing.position.set(-0.6, 0.1, 1);
    playerGroup.add(rightWing);

    // Part 4: Twin Wingtip Resonance Crystals
    const crystalGeo = new THREE.OctahedronGeometry(0.5);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.3,
    });
    const leftCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    leftCrystal.position.set(6.8, 0.2, -1.5);
    playerGroup.add(leftCrystal);

    const rightCrystal = leftCrystal.clone();
    rightCrystal.position.set(-6.8, 0.2, -1.5);
    playerGroup.add(rightCrystal);

    // Part 5: Rotating Gyro Ring around aft
    const ringGeo = new THREE.TorusGeometry(1.8, 0.08, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.1,
    });
    const gyroRing = new THREE.Mesh(ringGeo, ringMat);
    gyroRing.position.set(0, 0, -2.6);
    playerGroup.add(gyroRing);

    // Part 6: Glowing Ionic Plasma Thruster Cone
    const thrusterGeo = new THREE.CylinderGeometry(0.4, 0.8, 1.2, 16, 1, true);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.position.set(0, 0, -4.2);
    playerGroup.add(thruster);

    playerGroup.position.set(0, 15, 0);
    scene.add(playerGroup);

    // 4. Procedural Verdantis World (Waterfalls, Giant Cathedral Trees, Temple Spires)
    const worldGroup = new THREE.Group();

    // Terraced Ground
    const groundGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Procedural Temple Spire Pillars
    const spirePillars: THREE.Group[] = [];
    const pillarPositions = [
      [0, 0, 80],
      [-50, 0, 140],
      [60, 0, 180],
      [-70, 0, 260],
      [40, 0, 320],
      [0, 0, 420],
    ];

    pillarPositions.forEach(([px, py, pz]) => {
      const spireGroup = new THREE.Group();
      spireGroup.position.set(px, py, pz);

      // Tiered marble pedestal
      const baseGeo = new THREE.CylinderGeometry(8, 11, 8, 16);
      const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.1 });
      const base = new THREE.Mesh(baseGeo, marbleMat);
      base.position.y = 4;
      base.castShadow = true;
      base.receiveShadow = true;
      spireGroup.add(base);

      // Living Tree Column
      const trunkGeo = new THREE.CylinderGeometry(3.5, 6, 60, 12);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 34;
      trunk.castShadow = true;
      spireGroup.add(trunk);

      // Temple Balcony & Golden Ring
      const deckGeo = new THREE.CylinderGeometry(14, 14, 2, 24);
      const deck = new THREE.Mesh(deckGeo, marbleMat);
      deck.position.y = 55;
      spireGroup.add(deck);

      const balustradeGeo = new THREE.TorusGeometry(14, 0.4, 8, 32);
      balustradeGeo.rotateX(Math.PI / 2);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
      const balustrade = new THREE.Mesh(balustradeGeo, goldMat);
      balustrade.position.y = 56.5;
      spireGroup.add(balustrade);

      // Floating Sacred Crystal Obelisk
      const obeliskGeo = new THREE.OctahedronGeometry(4);
      obeliskGeo.scale(1, 2.5, 1);
      const obeliskMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.6,
        roughness: 0.1,
      });
      const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
      obelisk.position.y = 70;
      spireGroup.add(obelisk);

      worldGroup.add(spireGroup);
      spirePillars.push(spireGroup);
    });

    scene.add(worldGroup);

    // 5. Collectible Ark Shards (8 placed sequentially along the flight path)
    const shards: { group: THREE.Group; collected: boolean; id: number }[] = [];
    const shardCoords = [
      [0, 16, 40],
      [-20, 22, 100],
      [25, 18, 150],
      [-35, 26, 210],
      [15, 20, 270],
      [-10, 30, 340],
      [30, 22, 390],
      [0, 25, 460],
    ];

    shardCoords.forEach(([sx, sy, sz], idx) => {
      const shardGroup = new THREE.Group();
      shardGroup.position.set(sx, sy, sz);

      // Translucent Ark Sphere
      const sphereGeo = new THREE.SphereGeometry(2.0, 16, 16);
      const sphereMat = new THREE.MeshPhysicalMaterial({
        color: 0xfef08a,
        transmission: 0.8,
        roughness: 0.1,
        emissive: 0xd97706,
        emissiveIntensity: 0.7,
      });
      const orb = new THREE.Mesh(sphereGeo, sphereMat);
      shardGroup.add(orb);

      // Glowing Double-Helix Core
      const helixGeo = new THREE.TorusGeometry(1.2, 0.15, 8, 24);
      const helixMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
      });
      const helix = new THREE.Mesh(helixGeo, helixMat);
      helix.rotation.x = Math.PI / 3;
      shardGroup.add(helix);

      scene.add(shardGroup);
      shards.push({ group: shardGroup, collected: false, id: idx });
    });

    // 6. Harmonic Rings (Speed Boost Gates)
    const rings: { group: THREE.Group; passed: boolean }[] = [];
    const ringCoords = [
      [0, 16, 60],
      [-15, 20, 125],
      [20, 22, 180],
      [-25, 24, 240],
      [0, 25, 300],
      [10, 28, 365],
      [0, 25, 430],
    ];

    ringCoords.forEach(([rx, ry, rz]) => {
      const ringGroup = new THREE.Group();
      ringGroup.position.set(rx, ry, rz);

      const rGeo = new THREE.TorusGeometry(6, 0.35, 12, 32);
      const rMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(rGeo, rMat);
      ringGroup.add(mesh);

      scene.add(ringGroup);
      rings.push({ group: ringGroup, passed: false });
    });

    // 7. Olc Void Hazards (Pulsating Red Shards)
    const hazards: { group: THREE.Group; radius: number; speed: number }[] = [];
    const hazardCoords = [
      [-10, 16, 80],
      [15, 22, 130],
      [-5, 18, 200],
      [20, 24, 280],
      [-20, 25, 360],
      [10, 22, 420],
    ];

    hazardCoords.forEach(([hx, hy, hz], i) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(hx, hy, hz);

      const hGeo = new THREE.DodecahedronGeometry(2.5, 0);
      const hMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.9,
        wireframe: true,
      });
      const hMesh = new THREE.Mesh(hGeo, hMat);
      hGroup.add(hMesh);

      scene.add(hGroup);
      hazards.push({ group: hGroup, radius: 3.5, speed: 0.8 + i * 0.2 });
    });

    // 8. Atmospheric Floating Spores / Particles
    const pCount = 300;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 300;
      pPos[i + 1] = Math.random() * 80 + 5;
      pPos[i + 2] = Math.random() * 500;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 1.2,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Save refs
    const g = gameLoopRef.current;
    g.scene = scene;
    g.camera = camera;
    g.renderer = renderer;
    g.playerGroup = playerGroup;
    g.cockpitMesh = cockpit;
    g.propellers = [gyroRing];
    g.shards = shards;
    g.hazards = hazards;
    g.rings = rings;
    g.particles = particles;

    // 9. 60fps Game Simulation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);

      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      // Hitstop delay on heavy impacts
      if (g.hitStop > 0) {
        g.hitStop -= dt;
        return;
      }

      // Gyro rotation
      gyroRing.rotation.z += dt * 3.5;

      // Animate Collectibles & Hazards
      shards.forEach((s) => {
        if (!s.collected) {
          s.group.rotation.y += dt * 2.0;
          s.group.position.y += Math.sin(time * 0.003 + s.id) * 0.02;
        }
      });

      hazards.forEach((h, idx) => {
        h.group.rotation.x += dt * 1.5;
        h.group.rotation.y += dt * 2.0;
        h.group.position.x += Math.sin(time * 0.002 * h.speed + idx) * 0.15;
      });

      if (g.state === 'PLAYING') {
        // Player Dynamics
        const speedBase = g.input.boost ? 38 : 22;
        const forwardVel = g.input.backward ? -10 : speedBase;

        // Steering
        const turnSpeed = 2.4;
        const pitchSpeed = 1.8;

        if (g.input.left) g.playerRot.y += turnSpeed * dt;
        if (g.input.right) g.playerRot.y -= turnSpeed * dt;

        let targetPitch = 0;
        if (g.input.forward) targetPitch = -0.3;
        if (g.input.backward) targetPitch = 0.3;
        g.playerRot.x = THREE.MathUtils.damp(g.playerRot.x, targetPitch, 4, dt);

        // Bank roll when turning
        const targetRoll = g.input.left ? 0.45 : g.input.right ? -0.45 : 0;
        g.playerRot.z = THREE.MathUtils.damp(g.playerRot.z, targetRoll, 5, dt);

        // Apply velocities
        const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(g.playerRot);
        g.playerPos.addScaledVector(forwardDir, forwardVel * dt);

        // Height bounds
        g.playerPos.y = Math.max(6, Math.min(65, g.playerPos.y));

        playerGroup.position.copy(g.playerPos);
        playerGroup.rotation.copy(g.playerRot);

        // Collision: Shards
        shards.forEach((s) => {
          if (!s.collected && g.playerPos.distanceTo(s.group.position) < 4.2) {
            s.collected = true;
            s.group.visible = false;
            g.shardsCollected += 1;
            g.score += 250;
            g.matrixCharge = Math.min(100, g.matrixCharge + 15);
            soundEngine.playSFX('CHIME');

            if (g.shardsCollected >= g.shards.length) {
              g.state = 'VICTORY';
              setGameState('VICTORY');
            }
          }
        });

        // Collision: Rings (Speed boost & charge)
        rings.forEach((r) => {
          if (!r.passed && g.playerPos.distanceTo(r.group.position) < 6.0) {
            r.passed = true;
            g.score += 100;
            g.matrixCharge = Math.min(100, g.matrixCharge + 10);
            soundEngine.playSFX('CHIME');
          }
        });

        // Collision: Hazards (Damage & Screen Shake)
        hazards.forEach((h) => {
          if (g.playerPos.distanceTo(h.group.position) < h.radius) {
            g.resonance = Math.max(0, g.resonance - 25);
            g.shake = 1.2;
            g.hitStop = 0.05;
            soundEngine.playSFX('KRRK');

            if (g.resonance <= 0) {
              g.state = 'GAMEOVER';
              setGameState('GAMEOVER');
            }
          }
        });

        // Camera follow with silky exponential damping
        const idealCamOffset = new THREE.Vector3(0, 6, -18).applyEuler(g.playerRot);
        const targetCamPos = g.playerPos.clone().add(idealCamOffset);
        camera.position.lerp(targetCamPos, 0.08);

        // Camera shake
        if (g.shake > 0) {
          camera.position.x += (Math.random() - 0.5) * g.shake;
          camera.position.y += (Math.random() - 0.5) * g.shake;
          g.shake = Math.max(0, g.shake - dt * 3);
        }

        const lookTarget = g.playerPos.clone().add(new THREE.Vector3(0, 2, 10).applyEuler(g.playerRot));
        camera.lookAt(lookTarget);

        // Update UI Stats every few ticks
        if (Math.random() < 0.15) {
          setStats({
            resonance: Math.round(g.resonance),
            maxResonance: 100,
            shardsCollected: g.shardsCollected,
            totalShards: g.shards.length,
            matrixCharge: Math.round(g.matrixCharge),
            speed: Math.round(forwardVel * 3.6), // km/h
            score: g.score,
          });
        }
      } else if (g.state === 'TITLE') {
        // Dramatic Title Screen live-world camera glide
        camera.position.x = Math.sin(time * 0.0004) * 80;
        camera.position.y = 35 + Math.sin(time * 0.0006) * 10;
        camera.position.z = Math.cos(time * 0.0004) * 80;
        camera.lookAt(0, 25, 120);
      }

      renderer.render(scene, camera);
    };

    renderLoop(performance.now());

    // Window resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#04070c] select-none overflow-hidden font-sans">
      {/* 1. Isolated 3D Canvas Mount (React never re-renders the WebGL loop) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Top-Left Close Button (Accessible across all screens) */}
      <div className="absolute top-4 left-4 z-40">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          &larr; Exit to Cinema
        </button>
      </div>

      {/* 3. Title Screen State */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 sm:p-12 pointer-events-auto bg-gradient-to-t from-black/85 via-black/35 to-black/60">
          <div className="max-w-xl space-y-4 pt-12">
            {/* Bespoke inline SVG Title Lockup */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                SHARKFILET Interactive Flight Engine &bull; Three.js
              </div>
              <h1 className="font-serif font-black text-4xl sm:text-6xl tracking-wider text-white uppercase drop-shadow-2xl">
                STAR KEEP
              </h1>
              <p className="font-serif italic text-amber-300 text-lg sm:text-xl tracking-wide">
                The Ark Flight on Verdantis
              </p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Pilot Aku’s Arcanum Glider through the sacred bio-arboreal temple cathedrals of Verdantis. Collect the 8 awakened Ark resonance spheres, weave through acceleration rings, and evade the Olc transphase corruption fields.
            </p>

            {/* Start CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={startGame}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold font-serif tracking-wider text-sm shadow-xl shadow-amber-500/20 transform hover:scale-105 transition-all"
              >
                LAUNCH GLIDER (ENTER / SPACE)
              </button>
            </div>
          </div>

          {/* Flat Single Control Hint Line */}
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div>WASD / Arrows to Steer &bull; Space to Boost &bull; Esc to Pause</div>
            <div className="text-emerald-400">Verdantis Southern Temple Sector &bull; 60 FPS PBR Simulation</div>
          </div>
        </div>
      )}

      {/* 4. Active Low-Occlusion HUD Overlay (<= 15% viewport footprint, pointer-events: none) */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-6 flex flex-col justify-between">
          {/* Top Status Bar: Perimeter Clusters with tabular numbers */}
          <div className="flex items-start justify-between">
            {/* Resonance Health */}
            <div className="bg-black/60 border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span>ARK RESONANCE</span>
                <span className="font-bold text-amber-300 tabular-nums">{stats.resonance}%</span>
              </div>
              <div className="w-36 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${stats.resonance}%` }}
                />
              </div>
            </div>

            {/* Shards & Score */}
            <div className="flex items-center gap-3">
              <div className="bg-black/60 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs font-mono text-right">
                <span className="text-slate-400 block text-[10px]">ARK SHARDS</span>
                <span className="text-emerald-400 font-bold text-sm tabular-nums">
                  {stats.shardsCollected} / {stats.totalShards}
                </span>
              </div>
              <div className="bg-black/60 border border-white/15 rounded-xl px-4 py-2 text-xs font-mono text-right">
                <span className="text-slate-400 block text-[10px]">SCORE</span>
                <span className="text-white font-bold text-sm tabular-nums">{stats.score}</span>
              </div>
            </div>
          </div>

          {/* Bottom Center: Minimal Speed & Matrix telemetry */}
          <div className="flex items-end justify-between">
            <div className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-400">
              SPEED: <span className="text-amber-300 font-bold tabular-nums">{stats.speed}</span> KM/H
            </div>

            <div className="bg-black/60 border border-sky-500/30 rounded-xl px-4 py-2 text-xs font-mono text-right">
              <span className="text-slate-400 text-[10px] block">MATRIX HARMONIC CHARGE</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${stats.matrixCharge}%` }} />
                </div>
                <span className="text-sky-300 font-bold tabular-nums">{stats.matrixCharge}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Pause Modal */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-[#0b1320] border border-amber-500/30 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h2 className="font-serif font-bold text-2xl text-white">SIMULATION PAUSED</h2>
            <p className="text-xs text-slate-400">Glider hovering in orbital resonance lock.</p>
            <div className="space-y-2 pt-2">
              <button
                onClick={resumeGame}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase font-mono"
              >
                Resume Flight (Esc)
              </button>
              <button
                onClick={startGame}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs"
              >
                Restart Mission
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-mono text-xs"
              >
                Quit to Comic Cinema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Victory Modal */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#0b1f18] border border-emerald-500/50 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h2 className="font-serif font-bold text-3xl text-white">TEMPLE MATRIX RESTORED</h2>
            <p className="text-xs text-emerald-300 font-mono">
              All 8 Ark Shards aligned! The Southern Temple threshold awakens.
            </p>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 text-xs font-mono flex justify-between">
              <span className="text-slate-400">FINAL SCORE:</span>
              <span className="text-amber-400 font-bold">{stats.score + 500}</span>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase font-mono"
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono"
              >
                Back to Comic Movie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#1c0e11] border border-rose-500/50 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <h2 className="font-serif font-bold text-3xl text-rose-400">HARMONIC DE-SYNCHRONIZATION</h2>
            <p className="text-xs text-slate-300">
              Olc corruption intercepted the glider before the Ark shards were united.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase font-mono"
              >
                Retry Flight
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono"
              >
                Back to Comic Movie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
