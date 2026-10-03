// Pixel-art snowfall background: one WebGL2 fragment shader that ray-marches a
// grid of drifting flakes.
//
// Ported from React Bits "Pixel Snow" (https://reactbits.dev/backgrounds/pixel-snow).
// Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0:
// permission is granted to use, copy, modify, merge, publish and distribute the
// Software as part of an application, website or product, provided this notice
// is included; the components themselves may not be sold, sublicensed or
// redistributed, alone, in a bundle or as a ported version. THE SOFTWARE IS
// PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
//
// Differences from the original: plain WebGL2 instead of three.js, and the
// canvas is drawn at the shader's pixel-grid resolution and scaled up with
// `image-rendering: pixelated`. The shader already gives every block one
// colour, so this is the same picture for a fraction of the GPU work.

const VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

uniform float uTime;
uniform vec2 uResolution;
uniform float uFlakeSize;
uniform float uMinFlakeSize;
uniform float uSpeed;
uniform float uDepthFade;
uniform float uFarPlane;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uGamma;
uniform float uDensity;
uniform float uVariant;
uniform float uDirection;

out vec4 fragColor;

#define PI_OVER_6 0.5235988
#define PI_OVER_3 1.0471976
#define M1 1597334677U
#define M2 3812015801U
#define M3 3299493293U
#define F0 2.3283064e-10

#define hash(n) (n * (n ^ (n >> 15)))
#define coord3(p) (uvec3(p).x * M1 ^ uvec3(p).y * M2 ^ uvec3(p).z * M3)

const vec3 camK = vec3(0.57735027, 0.57735027, 0.57735027);
const vec3 camI = vec3(0.70710678, 0.0, -0.70710678);
const vec3 camJ = vec3(-0.40824829, 0.81649658, -0.40824829);
const vec2 b1d = vec2(0.574, 0.819);

vec3 hash3(uint n) {
  uvec3 hashed = hash(n) * uvec3(1U, 511U, 262143U);
  return vec3(hashed) * F0;
}

float snowflakeDist(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a = abs(mod(a + PI_OVER_6, PI_OVER_3) - PI_OVER_6);
  vec2 q = r * vec2(cos(a), sin(a));
  float dMain = max(abs(q.y), max(-q.x, q.x - 1.0));
  float b1t = clamp(dot(q - vec2(0.4, 0.0), b1d), 0.0, 0.4);
  float dB1 = length(q - vec2(0.4, 0.0) - b1t * b1d);
  float b2t = clamp(dot(q - vec2(0.7, 0.0), b1d), 0.0, 0.25);
  float dB2 = length(q - vec2(0.7, 0.0) - b2t * b1d);
  return min(dMain, min(dB1, dB2)) * 10.0;
}

void main() {
  // The canvas is already one texel per snow pixel, so no quantising here.
  vec2 fragCoord = floor(gl_FragCoord.xy);
  vec2 res = uResolution;
  float invResX = 1.0 / res.x;

  vec3 ray = normalize(vec3((fragCoord - res * 0.5) * invResX, 1.0));
  ray = ray.x * camI + ray.y * camJ + ray.z * camK;

  float timeSpeed = uTime * uSpeed;
  float windX = cos(uDirection) * 0.4;
  float windY = sin(uDirection) * 0.4;
  vec3 camPos = (windX * camI + windY * camJ + 0.1 * camK) * timeSpeed;
  vec3 pos = camPos;

  vec3 absRay = max(abs(ray), vec3(0.001));
  vec3 strides = 1.0 / absRay;
  vec3 raySign = step(ray, vec3(0.0));
  vec3 phase = fract(pos) * strides;
  phase = mix(strides - phase, phase, raySign);

  float rayDotCamK = dot(ray, camK);
  float invRayDotCamK = 1.0 / rayDotCamK;
  float invDepthFade = 1.0 / uDepthFade;
  float halfInvResX = 0.5 * invResX;
  vec3 timeAnim = timeSpeed * 0.1 * vec3(7.0, 8.0, 5.0);

  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    if (t >= uFarPlane) break;

    vec3 fpos = floor(pos);
    uint cellCoord = coord3(fpos);
    float cellHash = hash3(cellCoord).x;

    if (cellHash < uDensity) {
      vec3 h = hash3(cellCoord);

      vec3 sinArg1 = fpos.yzx * 0.073;
      vec3 sinArg2 = fpos.zxy * 0.27;
      vec3 flakePos = 0.5 - 0.5 * cos(4.0 * sin(sinArg1) + 4.0 * sin(sinArg2) + 2.0 * h + timeAnim);
      flakePos = flakePos * 0.8 + 0.1 + fpos;

      float toIntersection = dot(flakePos - pos, camK) * invRayDotCamK;

      if (toIntersection > 0.0) {
        vec3 testPos = pos + ray * toIntersection - flakePos;
        float testX = dot(testPos, camI);
        float testY = dot(testPos, camJ);
        vec2 testUV = abs(vec2(testX, testY));

        float depth = dot(flakePos - camPos, camK);
        float flakeSize = max(uFlakeSize, uMinFlakeSize * depth * halfInvResX);

        float dist;
        if (uVariant < 0.5) {
          dist = max(testUV.x, testUV.y);
        } else if (uVariant < 1.5) {
          dist = length(testUV);
        } else {
          float invFlakeSize = 1.0 / flakeSize;
          dist = snowflakeDist(vec2(testX, testY) * invFlakeSize) * flakeSize;
        }

        if (dist < flakeSize) {
          float flakeSizeRatio = uFlakeSize / flakeSize;
          float intensity = exp2(-(t + toIntersection) * invDepthFade) *
                           min(1.0, flakeSizeRatio * flakeSizeRatio) * uBrightness;
          fragColor = vec4(uColor * pow(vec3(intensity), vec3(uGamma)), 1.0);
          return;
        }
      }
    }

    float nextStep = min(min(phase.x, phase.y), phase.z);
    vec3 sel = step(phase, vec3(nextStep));
    phase = phase - nextStep + strides * sel;
    t += nextStep;
    pos = mix(pos + ray * nextStep, floor(pos + ray * nextStep + 0.5), sel);
  }

  fragColor = vec4(0.0);
}
`;

const VARIANTS = { square: 0, round: 1, snowflake: 2 };

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  }
  return shader;
}

export function mountPixelSnow({
  color = "#ffffff",
  flakeSize = 0.01,
  minFlakeSize = 1.25,
  pixelResolution = 200,
  speed = 1.25,
  depthFade = 8,
  farPlane = 20,
  brightness = 1,
  gamma = 0.4545,
  density = 0.3,
  variant = "square",
  direction = 125,
} = {}) {
  const root = document.createElement("div");
  root.className = "pixel-snow";
  root.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  root.append(canvas);
  document.body.prepend(root);

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  // Without WebGL2 the page keeps its plain dark background.
  if (!gl) return;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link failed");
    }
  } catch (err) {
    console.warn("Pixel snow background disabled:", err.message);
    return;
  }
  gl.useProgram(program);

  // One triangle that covers the whole viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  gl.uniform1f(u("uFlakeSize"), flakeSize);
  gl.uniform1f(u("uMinFlakeSize"), minFlakeSize);
  gl.uniform1f(u("uSpeed"), speed);
  gl.uniform1f(u("uDepthFade"), depthFade);
  gl.uniform1f(u("uFarPlane"), farPlane);
  gl.uniform3fv(u("uColor"), hexToRgb(color));
  gl.uniform1f(u("uBrightness"), brightness);
  gl.uniform1f(u("uGamma"), gamma);
  gl.uniform1f(u("uDensity"), density);
  gl.uniform1f(u("uVariant"), VARIANTS[variant] ?? 0);
  gl.uniform1f(u("uDirection"), (direction * Math.PI) / 180);
  const uTime = u("uTime");
  const uResolution = u("uResolution");

  // Same block size as the original: about `pixelResolution` blocks across.
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const block = Math.max(1, Math.floor(0.5 + width / pixelResolution));
    const cols = Math.ceil(width / block);
    const rows = Math.ceil(height / block);
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${cols * block}px`;
    canvas.style.height = `${rows * block}px`;
    gl.viewport(0, 0, cols, rows);
    gl.uniform2f(uResolution, cols, rows);
  };

  const draw = (seconds) => {
    gl.uniform1f(uTime, seconds);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // With reduced motion, show one still frame of snow.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STILL_TIME = 4;

  resize();
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      resize();
      if (reducedMotion) draw(STILL_TIME);
    }, 100);
  });

  if (reducedMotion) {
    draw(STILL_TIME);
    return;
  }

  const start = performance.now();
  const loop = (now) => {
    draw((now - start) / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
