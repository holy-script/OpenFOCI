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
  size?: number;
}

// State color schemes (Primary, Secondary, Ambient, Specular)
const STATE_COLORS: Record<
  string,
  { primary: string; secondary: string; ambient: string; specular: string }
> = {
  flow: { primary: '#06b6d4', secondary: '#3b82f6', ambient: '#041c2c', specular: '#e0f2fe' },
  focus: { primary: '#8b5cf6', secondary: '#6366f1', ambient: '#1e0b4b', specular: '#ede9fe' },
  calm: { primary: '#10b981', secondary: '#059669', ambient: '#04281f', specular: '#d1fae5' },
  stress: { primary: '#ef4444', secondary: '#f97316', ambient: '#3b0808', specular: '#fee2e2' },
  distracted: { primary: '#f59e0b', secondary: '#eab308', ambient: '#381602', specular: '#fef3c7' },
  not_worn: { primary: '#64748b', secondary: '#475569', ambient: '#0f172a', specular: '#cbd5e1' },
};

// GLSL Vertex Shader: Dynamic 3D procedural noise displacement with recomputed normals
const vertexShader = `
  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uDistortion;
  uniform float uFluidity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying float vDisplacement;

  // Classic 3D Simplex Noise
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

  // Multi-octave 3D fluid displacement function
  float getDisplacement(vec3 pos) {
    float speed = 0.7;
    // Primary large wave
    float n1 = snoise(pos * 1.6 + vec3(uTime * speed * 0.8));
    // Secondary medium ripple
    float n2 = snoise(pos * 3.2 - vec3(uTime * speed * 0.5)) * 0.5;
    // High-frequency capillary liquid ripple across the surface
    float n3 = snoise(pos * 6.4 + vec3(uTime * speed * 1.2)) * 0.25;

    return (n1 + n2 + n3) * uDistortion;
  }

  void main() {
    float displacement = getDisplacement(position);
    vDisplacement = displacement;

    // Diaphragmatic respiratory rhythm expansion
    float breathScale = 1.0 + (sin(uBreathPhase) * 0.14 * (uFluidity / 100.0));
    vec3 displacedPosition = position * breathScale + normal * displacement;

    // Tangent space finite difference to calculate real displaced surface normal
    float eps = 0.01;
    // Generate two orthogonal tangent vectors
    vec3 tangent = normalize(abs(normal.y) < 0.999 ? cross(normal, vec3(0.0, 1.0, 0.0)) : cross(normal, vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = cross(normal, tangent);

    vec3 p1 = (position + tangent * eps) * breathScale + normal * getDisplacement(position + tangent * eps);
    vec3 p2 = (position + bitangent * eps) * breathScale + normal * getDisplacement(position + bitangent * eps);

    vec3 calculatedNormal = normalize(cross(p1 - displacedPosition, p2 - displacedPosition));

    vNormal = normalize(normalMatrix * calculatedNormal);
    vWorldNormal = (modelMatrix * vec4(calculatedNormal, 0.0)).xyz;
    vPosition = (modelViewMatrix * vec4(displacedPosition, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

// GLSL Fragment Shader: Multi-source directional lighting, Blinn-Phong specular, subsurface depth
const fragmentShader = `
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorAmbient;
  uniform vec3 uColorSpecular;
  uniform float uTime;
  uniform float uIsWorn;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying float vDisplacement;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    vec3 normal = normalize(vNormal);

    // 1. Multi-Directional Lighting Sources in View Space
    // Key light (top-right, bright, creates crest highlights across the center)
    vec3 keyLightDir = normalize(vec3(0.8, 1.2, 1.5));
    // Fill light (bottom-left, soft cool balance)
    vec3 fillLightDir = normalize(vec3(-1.0, -0.6, 0.8));
    // Backlight / Rim
    vec3 backLightDir = normalize(vec3(0.0, 0.0, -1.0));

    // 2. Diffuse Lighting Calculations
    float diffKey = max(dot(normal, keyLightDir), 0.0);
    float diffFill = max(dot(normal, fillLightDir), 0.0) * 0.45;
    float diffuse = diffKey + diffFill;

    // 3. Blinn-Phong Specular Shimmer across fluid waves (critical for 3D depth in center!)
    vec3 halfVector = normalize(keyLightDir + viewDir);
    float specAngle = max(dot(normal, halfVector), 0.0);
    float specular = pow(specAngle, 40.0) * 1.5;

    // Secondary specular highlight from fill light
    vec3 halfFill = normalize(fillLightDir + viewDir);
    float specularFill = pow(max(dot(normal, halfFill), 0.0), 24.0) * 0.4;

    // 4. Fresnel Rim Glow
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

    // 5. Chromatic Color Layering based on wave elevation
    // Valleys are deeper and darker ambient; Peaks are vibrant and bright
    float elevation = smoothstep(-0.35, 0.4, vDisplacement);
    vec3 waveColor = mix(uColorAmbient, uColorSecondary, elevation * 0.7);
    waveColor = mix(waveColor, uColorPrimary, smoothstep(0.0, 0.5, vDisplacement));

    // Combine diffuse shading with wave color
    vec3 surfaceColor = waveColor * (0.35 + diffuse * 0.85);

    // Add bright specular shimmers across surface ripples
    surfaceColor += uColorSpecular * (specular + specularFill);

    // Add fresnel rim reflection
    surfaceColor += uColorPrimary * fresnel * 1.2;

    // Dynamic inner core luminescence pulse
    float corePulse = sin(uTime * 2.0) * 0.08 + 0.92;
    surfaceColor *= corePulse;

    if (uIsWorn < 0.5) {
      // Dimmed resting state when unclipped
      surfaceColor = mix(surfaceColor, vec3(0.15, 0.2, 0.25), 0.7) * 0.6;
    }

    gl_FragColor = vec4(surfaceColor, 0.95);
  }
`;

export const MindOrb3D: React.FC<MindOrb3DProps> = ({
  mentalState,
  respirationRate,
  fluidity,
  breathPhase,
  isWorn,
  className = '',
  size,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animFrameRef = useRef<number>(0);
  const isRenderingRef = useRef<boolean>(true);

  const colors = STATE_COLORS[mentalState.toLowerCase()] || STATE_COLORS.flow;

  useEffect(() => {
    if (!mountRef.current) return;

    const width = size || mountRef.current.clientWidth || 340;
    const height = size || mountRef.current.clientHeight || 340;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.z = 3.4;

    // 2. WebGL Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. High-resolution Icosahedron mesh for silky smooth liquid waves
    const geometry = new THREE.IcosahedronGeometry(1.0, 80);

    // 4. Custom Shader Material with full 3D lighting uniforms
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uDistortion: { value: 0.22 }, // Increased distortion for distinct wave peaks
        uFluidity: { value: 85.0 },
        uIsWorn: { value: 1.0 },
        uColorPrimary: { value: new THREE.Color(colors.primary) },
        uColorSecondary: { value: new THREE.Color(colors.secondary) },
        uColorAmbient: { value: new THREE.Color(colors.ambient) },
        uColorSpecular: { value: new THREE.Color(colors.specular) },
      },
      transparent: true,
      side: THREE.FrontSide,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Animation loop
    const clock = new THREE.Clock();
    let localBreath = 0;

    const animate = () => {
      if (!isRenderingRef.current) return;
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const bpm = respirationRate || 14.0;
      const breathSpeed = (bpm / 60.0) * Math.PI * 2.0;
      localBreath += 0.016 * breathSpeed;

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
        materialRef.current.uniforms.uBreathPhase.value = breathPhase !== undefined ? breathPhase : localBreath;
      }

      // Smooth 3D slow rotational drift
      mesh.rotation.y = elapsed * 0.18;
      mesh.rotation.x = Math.sin(elapsed * 0.12) * 0.15;
      mesh.rotation.z = Math.cos(elapsed * 0.08) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Modern Web Guidance: Efficient Background Processing
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

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const newWidth = size || mountRef.current.clientWidth;
      const newHeight = size || mountRef.current.clientHeight;
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
  }, [size]);

  useEffect(() => {
    if (!materialRef.current) return;
    const targetColors = STATE_COLORS[mentalState.toLowerCase()] || STATE_COLORS.flow;

    materialRef.current.uniforms.uColorPrimary.value.set(targetColors.primary);
    materialRef.current.uniforms.uColorSecondary.value.set(targetColors.secondary);
    materialRef.current.uniforms.uColorAmbient.value.set(targetColors.ambient);
    materialRef.current.uniforms.uColorSpecular.value.set(targetColors.specular);
    materialRef.current.uniforms.uFluidity.value = fluidity;
    materialRef.current.uniforms.uIsWorn.value = isWorn ? 1.0 : 0.0;

    // Amplitude of 3D liquid waves
    const distortion = mentalState === 'stress' ? 0.32 : mentalState === 'flow' ? 0.20 : 0.24;
    materialRef.current.uniforms.uDistortion.value = distortion;
  }, [mentalState, fluidity, isWorn]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center heavy-orb-container ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
};
