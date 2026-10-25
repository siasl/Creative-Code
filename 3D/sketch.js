let cloud
let pointShader

async function setup () {
  createCanvas(windowWidth, windowHeight, WEBGL)
  angleMode(DEGREES)
  //createEasyCam()

  // Points are drawn by p5's stroke shader. This modifies it so points shrink
  // with distance from the camera instead of all being the same pixel size.
  pointShader = baseStrokeShader().modify({
    uniforms: {
      'float uSize': () => 300
    },
    'StrokeVertex getCameraInputs': `(StrokeVertex inputs) {
      // inputs.position is in camera space here, so -z is the distance
      inputs.weight = clamp(uSize * 1000.0 / max(-inputs.position.z, 0.001), 1.0, 14.0);
      return inputs;
    }`
  })

  // monarch.bin is made by convert.py: 7 float32 per point (x y z r g b a)
  const buf = await (await fetch('./assets/monarch.bin')).arrayBuffer()
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
  lights()
  scale(2000, -2000, 300) // splats are often y-down; flip if it looks upside down
  strokeShader(pointShader)
  model(cloud)
}
