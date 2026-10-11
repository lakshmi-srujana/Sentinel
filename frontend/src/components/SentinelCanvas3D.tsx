import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../contexts/ThemeContext';

export const SentinelCanvas3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Keep references to update theme-sensitive materials without rebuilding entire scene
  const materialsRef = useRef<{
    outerWireframe?: THREE.LineBasicMaterial;
    innerMesh?: THREE.MeshStandardMaterial;
    coreSphere?: THREE.MeshStandardMaterial;
    ring1?: THREE.LineBasicMaterial;
    ring2?: THREE.LineBasicMaterial;
    particlesMat?: THREE.PointsMaterial;
    pointLight1?: THREE.PointLight;
    pointLight2?: THREE.PointLight;
    ambientLight?: THREE.AmbientLight;
  }>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Group for mouse interaction tilt
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Outer Icosahedron Shield (Wireframe)
    const icoGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const wireframeGeo = new THREE.WireframeGeometry(icoGeo);
    const isDark = theme === 'dark';

    const outerWireframe = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x2d4d3c,
      transparent: true,
      opacity: isDark ? 0.65 : 0.45,
      linewidth: 1,
    });
    const outerMesh = new THREE.LineSegments(wireframeGeo, outerWireframe);
    coreGroup.add(outerMesh);

    // 2. Inner Translucent Faceted Core
    const innerGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const innerMeshMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0xe2ece4,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: isDark ? 0.7 : 0.85,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMeshMat);
    coreGroup.add(innerMesh);

    // 3. Central Luminous Node
    const coreSphereGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const coreSphereMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x6366f1 : 0x477356,
      emissive: isDark ? 0x38bdf8 : 0x2e543b,
      emissiveIntensity: isDark ? 0.6 : 0.35,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreSphere = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    coreGroup.add(coreSphere);

    // 4. Orbital Security Rings
    const ring1Geo = new THREE.BufferGeometry();
    const ring1Points: THREE.Vector3[] = [];
    const ringRadius1 = 2.9;
    const ringSegments = 90;
    for (let i = 0; i <= ringSegments; i++) {
      const theta = (i / ringSegments) * Math.PI * 2;
      ring1Points.push(new THREE.Vector3(Math.cos(theta) * ringRadius1, 0, Math.sin(theta) * ringRadius1));
    }
    ring1Geo.setFromPoints(ring1Points);
    const ring1Mat = new THREE.LineBasicMaterial({
      color: isDark ? 0x818cf8 : 0x62836d,
      transparent: true,
      opacity: isDark ? 0.7 : 0.5,
    });
    const ring1 = new THREE.Line(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI * 0.28;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.BufferGeometry();
    const ring2Points: THREE.Vector3[] = [];
    const ringRadius2 = 3.3;
    for (let i = 0; i <= ringSegments; i++) {
      const theta = (i / ringSegments) * Math.PI * 2;
      ring2Points.push(new THREE.Vector3(Math.cos(theta) * ringRadius2, Math.sin(theta) * ringRadius2 * 0.4, Math.sin(theta) * ringRadius2 * 0.8));
    }
    ring2Geo.setFromPoints(ring2Points);
    const ring2Mat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x3a5a46,
      transparent: true,
      opacity: isDark ? 0.55 : 0.4,
    });
    const ring2 = new THREE.Line(ring2Geo, ring2Mat);
    ring2.rotation.z = Math.PI * 0.35;
    coreGroup.add(ring2);

    // 5. Orbital Sentinel Satellite Nodes
    const satelliteCount = 4;
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < satelliteCount; i++) {
      const satGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const satMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x38bdf8 : 0x2e4f3a,
        emissive: isDark ? 0x38bdf8 : 0x23422e,
        emissiveIntensity: 0.8,
      });
      const sat = new THREE.Mesh(satGeo, satMat);
      coreGroup.add(sat);
      satellites.push(sat);
    }

    // 6. Floating Particle Field (Data Telemetry Cloud)
    const particleCount = 450;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i + 2] = (Math.random() - 0.5) * 10;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particlesMat = new THREE.PointsMaterial({
      color: isDark ? 0x38bdf8 : 0x486b51,
      size: 0.045,
      transparent: true,
      opacity: isDark ? 0.75 : 0.6,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x1e293b : 0xe2ece4,
      isDark ? 1.2 : 1.8
    );
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(
      isDark ? 0x38bdf8 : 0x4a7356,
      isDark ? 4 : 2.5,
      12
    );
    pointLight1.position.set(4, 3, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(
      isDark ? 0x818cf8 : 0x6e8f77,
      isDark ? 3 : 2,
      12
    );
    pointLight2.position.set(-4, -3, -4);
    scene.add(pointLight2);

    materialsRef.current = {
      outerWireframe,
      innerMesh: innerMeshMat,
      coreSphere: coreSphereMat,
      ring1: ring1Mat,
      ring2: ring2Mat,
      particlesMat,
      pointLight1,
      pointLight2,
      ambientLight,
    };

    // Mouse and Pointer Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.45;
      targetY = y * 0.45;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Window Resize handling
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth inertia rotation following mouse
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      coreGroup.rotation.y = elapsedTime * 0.2 + mouseX;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.15) * 0.15 - mouseY;

      outerMesh.rotation.y = elapsedTime * 0.12;
      outerMesh.rotation.z = Math.cos(elapsedTime * 0.1) * 0.1;

      innerMesh.rotation.y = -elapsedTime * 0.18;
      innerMesh.rotation.x = elapsedTime * 0.1;

      ring1.rotation.y = elapsedTime * 0.25;
      ring2.rotation.z = -elapsedTime * 0.2;

      // Orbiting satellites
      satellites.forEach((sat, idx) => {
        const offset = (idx * (Math.PI * 2)) / satelliteCount;
        const angle = elapsedTime * 0.7 + offset;
        const radius = 2.9;
        sat.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.5) * 0.7,
          Math.sin(angle) * radius
        );
      });

      // Slowly rotate particle field
      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.05;

      // Heartbeat pulse in core sphere
      const pulse = 1 + Math.sin(elapsedTime * 2.5) * 0.06;
      coreSphere.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      icoGeo.dispose();
      wireframeGeo.dispose();
      innerGeo.dispose();
      coreSphereGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      particlesGeo.dispose();
    };
  }, []);

  // Update materials when theme changes dynamically
  useEffect(() => {
    const isDark = theme === 'dark';
    const m = materialsRef.current;
    if (!m.outerWireframe) return;

    m.outerWireframe.color.setHex(isDark ? 0x38bdf8 : 0x2d4d3c);
    m.outerWireframe.opacity = isDark ? 0.65 : 0.45;

    if (m.innerMesh) {
      m.innerMesh.color.setHex(isDark ? 0x0f172a : 0xe2ece4);
      m.innerMesh.opacity = isDark ? 0.7 : 0.85;
    }

    if (m.coreSphere) {
      m.coreSphere.color.setHex(isDark ? 0x6366f1 : 0x477356);
      m.coreSphere.emissive.setHex(isDark ? 0x38bdf8 : 0x2e543b);
      m.coreSphere.emissiveIntensity = isDark ? 0.6 : 0.35;
    }

    if (m.ring1) {
      m.ring1.color.setHex(isDark ? 0x818cf8 : 0x62836d);
      m.ring1.opacity = isDark ? 0.7 : 0.5;
    }

    if (m.ring2) {
      m.ring2.color.setHex(isDark ? 0x38bdf8 : 0x3a5a46);
      m.ring2.opacity = isDark ? 0.55 : 0.4;
    }

    if (m.particlesMat) {
      m.particlesMat.color.setHex(isDark ? 0x38bdf8 : 0x486b51);
      m.particlesMat.opacity = isDark ? 0.75 : 0.6;
    }

    if (m.ambientLight) {
      m.ambientLight.color.setHex(isDark ? 0x1e293b : 0xe2ece4);
      m.ambientLight.intensity = isDark ? 1.2 : 1.8;
    }

    if (m.pointLight1) {
      m.pointLight1.color.setHex(isDark ? 0x38bdf8 : 0x4a7356);
      m.pointLight1.intensity = isDark ? 4 : 2.5;
    }

    if (m.pointLight2) {
      m.pointLight2.color.setHex(isDark ? 0x818cf8 : 0x6e8f77);
      m.pointLight2.intensity = isDark ? 3 : 2;
    }
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="sentinel-3d-canvas"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
      }}
    />
  );
};
