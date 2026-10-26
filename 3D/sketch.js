let cloud
let pointShader
let cam
// Point size tuning (see the shader in setup)
const SIZE = 6 // pixels at REF_DIST
const REF_DIST = 2000 // distance from the camera where points are exactly SIZE
const GROWTH = 0.07 // how fast size changes with distance
const MAX_SIZE = 60 // pixel cap
const FOV = 90 //22.3

// Shimmer tuning (0 turns an effect off)
const SHIMMER_AMOUNT = 0.9 // brightness/size wobble per point (keep under ~0.4)
const SHIMMER_SPEED = 3 // radians per second of the per-point twinkle
const WAVE_SPEED = 10.5 // speed of the ripple sweeping through the scene depth
const WAVE_FREQ = 20.4 // ripples per unit of depth (higher = tighter bands)
const SPARKLE = 0.8 // how white the occasional glints get
const SPARKLE_SPEED = 2 // how often glints fire
async function setup () {
  createCanvas(windowWidth, windowHeight, WEBGL)
  angleMode(DEGREES)
  //createEasyCam()
  cam = createCamera()
  // After the scale in draw() the scene sits at +z, so start the camera behind the
  // origin (where the photo was taken), looking down +z, instead of from +z.
  cam.perspective(FOV, width / height, 10, 100000)
  cam.camera(0, 0, -9000, 0, 0, 500, 0, 1, 0)
  setCamera(cam)
  // Points are drawn by p5's stroke shader. This modifies it so the point size
  // depends on distance from the camera: size = SIZE * (distance / REF_DIST) ^ GROWTH
  //   GROWTH  1 = far points bigger (fills in the sparse background)
  //   GROWTH  0 = every point the same size
  //   GROWTH -1 = true perspective (far points smaller)
  pointShader = baseStrokeShader().modify({
    uniforms: {
      'float uSize': () => SIZE,
      'float uRefDist': () => REF_DIST,
      'float uGrowth': () => GROWTH,
      'float uMaxSize': () => MAX_SIZE,
      'float uFocal': () => height / (2 * tan(FOV / 2)), // matches perspective(...)
      'float uTime': () => millis() / 1000,
      'float uShimmerAmount': () => SHIMMER_AMOUNT,
      'float uShimmerSpeed': () => SHIMMER_SPEED,
      'float uWaveSpeed': () => WAVE_SPEED,
      'float uWaveFreq': () => WAVE_FREQ,
      'float uSparkle': () => SPARKLE,
      'float uSparkleSpeed': () => SPARKLE_SPEED
    },
    vertexDeclarations: `out float vShimmer;
      out float vSparkle;
      float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
      }`,
    fragmentDeclarations: `in float vShimmer;
      in float vSparkle;`,
    // Object space is stable under camera moves, so each point keeps its own phase
    'StrokeVertex getObjectInputs': `(StrokeVertex inputs) {
      float ph = hash13(inputs.position);
      float twinkle = sin(uTime * uShimmerSpeed + ph * 6.2831);
      float wave = sin(uTime * uWaveSpeed - inputs.position.z * uWaveFreq);
      vShimmer = uShimmerAmount * (0.6 * twinkle + 0.4 * wave);
      // only ~30% of points can glint, each on its own phase
      float glint = pow(max(sin(uTime * uSparkleSpeed + fract(ph * 13.7) * 6.2831), 0.0), 16.0);
      vSparkle = uSparkle * glint * step(0.7, fract(ph * 91.3));
      return inputs;
    }`,
    'StrokeVertex getCameraInputs': `(StrokeVertex inputs) {
      // inputs.position is in camera space here, so -z is the distance
      float dist = max(-inputs.position.z, 0.001);
      float px = uSize * pow(dist / uRefDist, uGrowth) * (1.0 + 0.5 * vShimmer + 0.5 * vSparkle);
      px = clamp(px, 1.0, uMaxSize);
      // the stroke weight is in world units and gets perspective-scaled, so
      // convert the wanted pixel size back to world units at this distance
      inputs.weight = px * dist / uFocal;
      return inputs;
    }`
    // 'Inputs getPixelInputs': `(Inputs inputs) {
    //   inputs.color.rgb = clamp(inputs.color.rgb * (1.0 + vShimmer) + vSparkle, 0.0, 1.0);
    //   return inputs;
    // }`
  })

  myShader = baseStrokeShader().modify({
    'float random': `(vec2 p) {
      vec3 p3  = fract(vec3(p.xyx) * .1471);
      p3 += dot(p3, p3.yzx + 32.33);
      return fract((p3.x + p3.y) * p3.z);
    }`,
    'Inputs getPixelInputs': `(Inputs inputs) {
      // Modify alpha with dithering effect
      float a = inputs.color.a;
      inputs.color.a = 1.0;
      inputs.color *= random(inputs.position.xy) > a ? 0.0 : 1.0;
      return inputs;
    }`
  })

  // monarch.bin is made by convert.py: 7 float32 per point (x y z r g b a)
  const buf = await (await fetch('./assets/archBig.bin')).arrayBuffer()
  const data = new Float32Array(buf)
  const count = data.length / 7

  // build all points once into a single geometry
  cloud = buildGeometry(() => {
    beginShape(POINTS)
    for (let i = 0; i < count; i++) {
      const o = i * 7
      fill(
        data[o + 3] * 255,
        data[o + 4] * 255,
        data[o + 5] * 255,
        data[o + 6] * 255
      )
      vertex(data[o], data[o + 1], data[o + 2])
    }
    endShape()
  })

  // buildGeometry stores per-point colour as a fill colour, but points are drawn
  // by the stroke shader, which reads vertexStrokeColors. Copy it across.
  cloud.vertexStrokeColors = cloud.vertexColors.slice()
  document.oncontextmenu = function () {
    return false
  }
}

function draw () {
  background(255)
  if (!cloud) return
  orbitControl()
  scale(100, 100, -100) // SHARP is y-down, z-forward (OpenCV); p5 is y-down, z-toward-viewer
  strokeShader(myShader)
  strokeShader(pointShader)
  model(cloud)
  if (cam.eyeZ < -100) {
    console.log("sdhfsdf")
    cam.setPosition(cam.eyeX, cam.eyeY, cam.eyeZ + 50)
  }
}
