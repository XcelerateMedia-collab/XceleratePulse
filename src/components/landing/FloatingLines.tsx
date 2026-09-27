"use client";
/* FloatingLines — self-contained Kexsio background.
   Three.js WebGL shader canvas with mouse deflection and dark editorial aesthetic. */

import React, { useEffect, useRef } from 'react';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform bool isLightTheme;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 BRAND_DEEP_BLUE = vec3(27.0, 19.0, 168.0) / 255.0; // #1b13a8
const vec3 BRAND_ELECTRIC  = vec3(4.0,  140.0, 252.0) / 255.0; // #048cfc

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  if (isLightTheme) {
    return vec3(0.0);
  }
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BRAND_DEEP_BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(BRAND_ELECTRIC, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.4;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return isLightTheme ? gradientColor : (gradientColor * 0.85);
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius); // radial falloff around cursor
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  float dist = abs(m);

  if (isLightTheme) {
    // Smooth, silky flowing ribbon with soft antialiasing (not too sharp)
    return 0.0085 / max(dist + 0.0034, 1e-4);
  } else {
    return 0.009 / max(dist + 0.0035, 1e-4);
  }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
    if (parallax) {
      mouseUv += parallaxOffset;
    }
  }

  if (isLightTheme) {
    // ── LIGHT THEME (Smooth, silky royal blue & cyan ribbons) ──
    vec3 totalColor = vec3(0.0);
    float totalAlpha = 0.0;

    // Bottom Wave: light, delicate ambient accent
    if (enableBottom) {
      for (int i = 0; i < bottomLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(bottomLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, vec3(0.0, 0.32, 1.0));
        
        float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        float w = wave(
          ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
          1.5 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        );
        // Light, subtle presence
        float a = clamp(w * 0.07, 0.0, 0.24);
        totalColor += lineCol * a;
        totalAlpha += a;
      }
    }

    // Middle Wave: Main vibrant horizontal hero ribbon
    if (enableMiddle) {
      for (int i = 0; i < middleLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(middleLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, vec3(0.0, 0.32, 1.0));
        
        float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        float w = wave(
          ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
          2.0 + 0.15 * fi,
          baseUv,
          mouseUv,
          interactive
        );
        // Main prominent wave: smooth, vibrant, rich presence
        float a = clamp(w * 0.22, 0.0, 0.72);
        totalColor += lineCol * a;
        totalAlpha += a;
      }
    }

    // Top Wave: light, delicate ambient accent
    if (enableTop) {
      for (int i = 0; i < topLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(topLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, vec3(0.0, 0.32, 1.0));
        
        float angle = topWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        ruv.x *= -1.0;
        float w = wave(
          ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
          1.0 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        );
        // Light, subtle presence
        float a = clamp(w * 0.05, 0.0, 0.20);
        totalColor += lineCol * a;
        totalAlpha += a;
      }
    }

    if (totalAlpha > 0.001) {
      vec3 finalCol = totalColor / totalAlpha;
      float finalAlpha = clamp(totalAlpha, 0.0, 0.72);
      fragColor = vec4(finalCol, finalAlpha);
    } else {
      fragColor = vec4(0.0);
    }

  } else {
    // ── DARK THEME (Original high-contrast glow over dark backdrop) ──
    vec3 col = vec3(0.0);
    vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

    if (enableBottom) {
      for (int i = 0; i < bottomLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(bottomLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
          1.5 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.2;
      }
    }

    if (enableMiddle) {
      for (int i = 0; i < middleLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(middleLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
          2.0 + 0.15 * fi,
          baseUv,
          mouseUv,
          interactive
        );
      }
    }

    if (enableTop) {
      for (int i = 0; i < topLineCount; ++i) {
        float fi = float(i);
        float t = fi / max(float(topLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = topWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        ruv.x *= -1.0;
        col += lineCol * wave(
          ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
          1.0 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.1;
      }
    }

    fragColor = vec4(col, 1.0);
  }
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

export type WavePosition = {
  x: number;
  y: number;
  rotate: number;
};

export type FloatingLinesProps = {
  theme?: 'light' | 'dark';
  linesGradient?: string[];
  enabledWaves?: Array<'top' | 'middle' | 'bottom'>;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  topWavePosition?: WavePosition;
  middleWavePosition?: WavePosition;
  bottomWavePosition?: WavePosition;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
  className?: string;
};

function hexToVec3(hex: string): Vector3 {
  let value = hex.trim();

  if (value.startsWith('#')) {
    value = value.slice(1);
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return new Vector3(r / 255, g / 255, b / 255);
}

export default function FloatingLines({
  theme = 'light',
  linesGradient = ['#0052FF', '#048cfc', '#192de4', '#092fac', '#092cb5', '#1b13a8'],
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [8],
  lineDistance = [8],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -1.8,
  mouseDamping = 0.08,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
  className = ''
}: FloatingLinesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetMouseRef = useRef<Vector2>(new Vector2(-1000, -1000));
  const currentMouseRef = useRef<Vector2>(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef<number>(0);
  const currentInfluenceRef = useRef<number>(0);
  const targetParallaxRef = useRef<Vector2>(new Vector2(0, 0));
  const currentParallaxRef = useRef<Vector2>(new Vector2(0, 0));

  const getLineCount = (waveType: 'top' | 'middle' | 'bottom'): number => {
    if (typeof lineCount === 'number') return lineCount;
    if (!enabledWaves.includes(waveType)) return 0;
    const index = enabledWaves.indexOf(waveType);
    return lineCount[index] ?? 8;
  };

  const getLineDistance = (waveType: 'top' | 'middle' | 'bottom'): number => {
    if (typeof lineDistance === 'number') return lineDistance;
    if (!enabledWaves.includes(waveType)) return 0.08;
    const index = enabledWaves.indexOf(waveType);
    return lineDistance[index] ?? 0.08;
  };

  const topLineCount = enabledWaves.includes('top') ? getLineCount('top') : 0;
  const middleLineCount = enabledWaves.includes('middle') ? getLineCount('middle') : 0;
  const bottomLineCount = enabledWaves.includes('bottom') ? getLineCount('bottom') : 0;

  const topLineDistance = enabledWaves.includes('top') ? getLineDistance('top') * 0.01 : 0.01;
  const middleLineDistance = enabledWaves.includes('middle') ? getLineDistance('middle') * 0.01 : 0.01;
  const bottomLineDistance = enabledWaves.includes('bottom') ? getLineDistance('bottom') * 0.01 : 0.01;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;

    const scene = new Scene();

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
    } catch (e) {
      console.warn('WebGL not supported for FloatingLines', e);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },

      enableTop: { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },

      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },

      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },

      topWavePosition: {
        value: new Vector3(topWavePosition?.x ?? 10.0, topWavePosition?.y ?? 0.5, topWavePosition?.rotate ?? -0.4)
      },
      middleWavePosition: {
        value: new Vector3(
          middleWavePosition?.x ?? 5.0,
          middleWavePosition?.y ?? 0.0,
          middleWavePosition?.rotate ?? 0.2
        )
      },
      bottomWavePosition: {
        value: new Vector3(
          bottomWavePosition?.x ?? 2.0,
          bottomWavePosition?.y ?? -0.7,
          bottomWavePosition?.rotate ?? 0.4
        )
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },
      isLightTheme: { value: theme === 'light' },

      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1))
      },
      lineGradientCount: { value: 0 }
    };

    if (linesGradient && linesGradient.length > 0) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;

      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const startTime = performance.now();

    const setSize = () => {
      if (!container || !active) return;
      const width = container.clientWidth || window.innerWidth || 1;
      const height = container.clientHeight || window.innerHeight || 1;

      renderer.setSize(width, height, false);

      const canvasWidth = renderer.domElement.width;
      const canvasHeight = renderer.domElement.height;
      uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
    };

    setSize();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!active) return;
            setSize();
          })
        : null;

    if (ro) ro.observe(container);

    const handlePointerMove = (event: PointerEvent) => {
      if (!renderer || !renderer.domElement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = renderer.getPixelRatio();

      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1.0;

      if (parallax) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (x - centerX) / rect.width;
        const offsetY = -(y - centerY) / rect.height;
        targetParallaxRef.current.set(offsetX * parallaxStrength, offsetY * parallaxStrength);
      }
    };

    const handlePointerLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        targetInfluenceRef.current = 0.0;
      }
    };

    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerdown', handlePointerMove, { passive: true });
      document.addEventListener('mouseleave', handlePointerLeave);
    }

    let raf = 0;
    const renderLoop = () => {
      if (!active) return;

      uniforms.iTime.value = (performance.now() - startTime) * 0.001;

      if (interactive) {
        currentMouseRef.current.lerp(targetMouseRef.current, mouseDamping);
        uniforms.iMouse.value.copy(currentMouseRef.current);

        currentInfluenceRef.current += (targetInfluenceRef.current - currentInfluenceRef.current) * mouseDamping;
        uniforms.bendInfluence.value = currentInfluenceRef.current;
      }

      if (parallax) {
        currentParallaxRef.current.lerp(targetParallaxRef.current, mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      active = false;
      cancelAnimationFrame(raf);

      if (ro) ro.disconnect();

      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerdown', handlePointerMove);
        document.removeEventListener('mouseleave', handlePointerLeave);
      }

      geometry.dispose();
      material.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement?.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      }
    };
  }, [
    linesGradient,
    enabledWaves,
    lineCount,
    lineDistance,
    topWavePosition,
    middleWavePosition,
    bottomWavePosition,
    animationSpeed,
    interactive,
    bendRadius,
    bendStrength,
    mouseDamping,
    parallax,
    parallaxStrength,
    theme
  ]);

  return (
    <div
      ref={containerRef}
      className={`floating-lines-container ${className}`}
      style={{
        mixBlendMode: theme === 'light' ? 'normal' : mixBlendMode,
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none'
      }}
    />
  );
}
