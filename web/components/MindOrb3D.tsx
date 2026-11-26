'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MindOrb3DProps {
  mentalState: string;
  respirationRate: number; // BPM
  fluidity: number;        // 0 - 100%
  breathPhase?: number;    // 0 - 1 phase of current breath cycle
  isWorn: boolean;
  className?: string;
}

// State color schemes (Primary, Secondary, Ambient)
const STATE_COLORS: Record<string, { primary: string; secondary: string; ambient: string }> = {
  flow: { primary: '#06b6d4', secondary: '#3b82f6', ambient: '#083344' },
  focus: { primary: '#8b5cf6', secondary: '#6366f1', ambient: '#2e1065' },
  calm: { primary: '#10b981', secondary: '#059669', ambient: '#064e3b' },
  stress: { primary: '#ef4444', secondary: '#f97316', ambient: '#450a0a' },
  distracted: { primary: '#f59e0b', secondary: '#eab308', ambient: '#451a03' },
  not_worn: { primary: '#64748b', secondary: '#475569', ambient: '#0f172a' },
};

// GLSL Vertex Shader: Dynamic 3D procedural noise displacement
const vertexShader = `
  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uDistortion;
  uniform float uFluidity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Classic 3D Perlin Noise simplex generator
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Harmonic multi-octave turbulence
    float speed = 0.8;
    float noise1 = snoise(position * 1.5 + vec3(uTime * speed));
    float noise2 = snoise(position * 3.0 - vec3(uTime * speed * 0.5)) * 0.5;
    float displacement = (noise1 + noise2) * uDistortion;

    // Diaphragmatic respiratory excursion: rhythmic breathing expansion
    float breathScale = 1.0 + (sin(uBreathPhase) * 0.12 * (uFluidity / 100.0));
    
    vec3 newPosition = position * breathScale + normal * displacement;
    vDisplacement = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// GLSL Fragment Shader: Chromatic refraction, fresnel edge glow, and inner depth
const fragmentShader = `
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorAmbient;
  uniform float uTime;
  uniform float uIsWorn;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // View direction relative to camera
    vec3 viewDir = normalize(-vPosition);
    
    // Fresnel rim glow effect
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.8);
    
    // Chromatic depth gradient across displacement
    float mixFactor = smoothstep(-0.25, 0.35, vDisplacement);
    vec3 baseColor = mix(uColorPrimary, uColorSecondary, mixFactor);
    
    // Dynamic inner luminescence
    float pulse = sin(uTime * 1.5) * 0.08 + 0.92;
    vec3 finalColor = mix(uColorAmbient, baseColor, pulse) + (uColorPrimary * fresnel * 1.4);

    if (uIsWorn < 0.5) {
      // Dimmed resting state when not clipped to waistband
      finalColor = mix(finalColor, vec3(0.2, 0.25, 0.3), 0.6) * 0.7;
    }

    gl_FragColor = vec4(finalColor, 0.92);
  }
`;

export const MindOrb3D: React.FC<MindOrb3DProps> = ({
  mentalState,
  respirationRate,
  fluidity,
  breathPhase,
  isWorn,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animFrameRef = useRef<number>(0);
  const isRenderingRef = useRef<boolean>(true);

  // Parse target color scheme
  const colors = STATE_COLORS[mentalState.toLowerCase()] || STATE_COLORS.flow;

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 320;
    const height = mountRef.current.clientHeight || 320;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.6;

    // 2. WebGL Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. High-resolution Icosahedron mesh
    const geometry = new THREE.IcosahedronGeometry(1.0, 64);

    // 4. Custom Shader Material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uDistortion: { value: 0.16 },
        uFluidity: { value: 85.0 },
        uIsWorn: { value: 1.0 },
        uColorPrimary: { value: new THREE.Color(colors.primary) },
        uColorSecondary: { value: new THREE.Color(colors.secondary) },
        uColorAmbient: { value: new THREE.Color(colors.ambient) },
      },
      transparent: true,
      side: THREE.FrontSide,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Animation loop
    let clock = new THREE.Clock();
    let localBreath = 0;

    const animate = () => {
      if (!isRenderingRef.current) return;
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      
      // Update breathing cycle rate
      const bpm = respirationRate || 14.0;
      const breathSpeed = (bpm / 60.0) * Math.PI * 2.0;
      localBreath += 0.016 * breathSpeed;

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
        materialRef.current.uniforms.uBreathPhase.value = breathPhase !== undefined ? breathPhase : localBreath;
      }

      // Smooth slow rotational drift
      mesh.rotation.y = elapsed * 0.15;
      mesh.rotation.x = Math.sin(elapsed * 0.1) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Modern Web Guidance: Efficient Background Processing
    // Pause rendering when scrolled out of view or tab inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRenderingRef.current = false;
        cancelAnimationFrame(animFrameRef.current);
      } else {
        if (!isRenderingRef.current) {
          isRenderingRef.current = true;
          clock.start();
          animate();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isRenderingRef.current) {
              isRenderingRef.current = true;
              clock.start();
              animate();
            }
          } else {
            isRenderingRef.current = false;
            cancelAnimationFrame(animFrameRef.current);
          }
        });
      },
      { rootMargin: '100px' }
    );
    observer.observe(mountRef.current);

    // Resize listener
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Update uniforms when props change
  useEffect(() => {
    if (!materialRef.current) return;
    const targetColors = STATE_COLORS[mentalState.toLowerCase()] || STATE_COLORS.flow;

    materialRef.current.uniforms.uColorPrimary.value.set(targetColors.primary);
    materialRef.current.uniforms.uColorSecondary.value.set(targetColors.secondary);
    materialRef.current.uniforms.uColorAmbient.value.set(targetColors.ambient);
    materialRef.current.uniforms.uFluidity.value = fluidity;
    materialRef.current.uniforms.uIsWorn.value = isWorn ? 1.0 : 0.0;

    // Distortion increases with lower fluidity / higher stress
    const distortion = mentalState === 'stress' ? 0.28 : mentalState === 'flow' ? 0.12 : 0.18;
    materialRef.current.uniforms.uDistortion.value = distortion;
  }, [mentalState, fluidity, isWorn]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center w-72 h-72 md:w-88 md:h-88 heavy-orb-container ${className}`}
    />
  );
};
