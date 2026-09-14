var offset = 0
var strum = 1
//["#606c38","#283618","#fefae0","#dda15e","#bc6c25"]

async function setup () {
  createCanvas(1500, 2000)

  imageMode(CENTER)
  scaleCanvas(0.5)

  fish1 = await loadImage('assets/fish-1.svg')
  fish2 = await loadImage('assets/fish-2.svg')
  fish3 = await loadImage('assets/fish-3.svg')
  fish4 = await loadImage('assets/fish-4.svg')
  fish5 = await loadImage('assets/fish-5.svg')

  // grabbed from here so I can tint some of the fish https://editor.p5js.org/aferriss/sketches/Qa_68KTs8
  fish3.loadPixels();

    // Loop through the pixels X and Y
    for (let y = 0; y < fish3.height; y++) {
      for (let x = 0; x < fish3.width; x++) {

        // Calculate the pixel index
        const index = (y * fish3.width + x) * 4;

        // Get the red, green, and blue values
        const r = fish3.pixels[index + 0];
        const g = fish3.pixels[index + 1];
        const b = fish3.pixels[index + 2];
        
        // Invert the colors
        fish3.pixels[index + 0] = 255 - r;
        fish3.pixels[index + 1] = 255 - g;
        fish3.pixels[index + 2] = 255 - b;

      }
    }

    // We're finished working with pixels so update them
    fish3.updatePixels();
  randomSeed(10)
  noLoop()
}

function scaleCanvas (displayScale) {
  let cnv = select('canvas').elt
  cnv.style.setProperty('transform', 'scale(' + displayScale + ')')
  cnv.style.setProperty('transform-origin', 'left top')
}

function drawPads ({ x, y, size, arcStart, arcEnd }) {
  strokeWeight(4)
  if (size <= 1000) {
    strokeWeight(2)
  }
  // ai helped here
  push()
  blendMode(SCREEN)
  for (let ring = 0; ring < 3; ring++) {
    noFill()
    const radius = map(ring, 0, 3, size * 0.17, size / 19)
    const alphaValue = map(radius, 0, size, 100, 0)

    stroke(156, 185, 232, alphaValue)

    beginShape()
    // AI helped me come up with the squiggly bit
    for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
      const wobble =
        sin(angle * 8 + 10 * 0.04) * randomGaussian(8, 0.2) +
        sin(angle * 11 - 2 * 0.03) * randomGaussian(5, 0.2)
      const xPos = x + cos(angle) * (radius + wobble + 4)
      const yPos = y + sin(angle) * (radius + wobble + 4)

      vertex(xPos, yPos)
    }
    endShape()

    pop()
    fill('#698F3F')
    strokeWeight(6)
    noStroke()
    arc(x, y, size / 8, size / 8, arcStart, arcEnd)
  }
}
function drawFlower ({ x, y, size, rings }) {
  const pink = color('#D90368')
  const white = color('#ffffff')
  strokeWeight(4)
  // ai helped here
  push()
  //blendMode(SCREEN)
  push()
  blendMode(SCREEN)
  //RIPPLES
  for (let ring = 0; ring < 5; ring++) {
    noFill()
    const radius = map(ring, 0, 4, size * 1.5, size / 19)
    const alphaValue = map(radius, 0, size * 2.5, 100, 0)

    stroke(156, 185, 232, alphaValue)

    beginShape()
    // AI helped me come up with the squiggly bit
    for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
      const wobble =
        sin(angle * 18 + 10 * 0.04) * randomGaussian(8, 0.2) +
        sin(angle * 11 - 2 * 0.03) * randomGaussian(5, 0.2)
      const xPos = x + cos(angle) * (radius + wobble + 4)
      const yPos = y + sin(angle) * (radius + wobble + 4)

      vertex(xPos, yPos)
    }
    endShape()

    pop()
  }
  //FLOWER PEDALS
  for (let ring = rings - 1; ring >= 0; ring--) {
    blendMode(BLEND)
    //noFill()
    const ringColor = lerpColor(pink, white, ring / (rings - 1))

    fill(ringColor)

    const radius = map(ring, 0, 5, size * 0.17, size / 1)
    if (ring == 0) {
      fill('yellow')
    }

    beginShape()
    // AI helped me come up with the squiggly bit
    for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
      const wobble =
        sin(angle * 13 + 10 * 0.04) * 3 + sin(angle * 20 - 2 * 0.33) * 7
      const xPos = x + cos(angle) * (radius + wobble + 4)
      const yPos = y + sin(angle) * (radius + wobble + 4)

      vertex(xPos, yPos)
    }
    endShape()
    pop()

    //fill('#737A46')
    //strokeWeight(6)
    //noStroke()
    //arc(x, y, size / 8, size / 8, arcStart, arcEnd)
  }
}
function drawFish (x, y, degrees, fish) {
  push()
  translate(x, y)
  rotate(degrees)
  image(fish, 0, 0)
  pop()
}

function draw () {
  background('#0C1A32')
  tint('#F28C28')
  drawFish(1100, 100, 140, fish2)
  drawFish(1400, 700, 60, fish1)
  drawFish(100, 700, 60, fish3)
  drawFish(1100, 1700, 90, fish4)
  drawFish(510, 1700, 210, fish5)
  

  randomSeed(19)
  for (let i = 0; i < 25; i++) {
    let allFish = [fish1, fish2, fish3, fish4, fish5]
    drawFish(random(10,width-10), random(10, height-10), random(0,360),random(allFish) )
  }
  fill('#737A46')
  strokeWeight(6)
  noStroke()
  drawPads({
    x: 300,
    y: 400,
    size: 2600,
    arcStart: PI,
    arcEnd: PI - 0.1 * PI
  })
  drawPads({
    x: 800,
    y: 1400,
    size: 2000,
    arcStart: 1.8 * PI,
    arcEnd: 1.8 * PI - 0.1 * PI
  })
  drawPads({
    x: 0.8 * width,
    y: 0.3 * height,
    size: 700,
    arcStart: 1.6 * PI,
    arcEnd: 1.6 * PI - 0.1 * PI
  })
  drawPads({
    x: 0.75 * width,
    y: 0.2 * height,
    size: 800,
    arcStart: 0.7 * PI,
    arcEnd: 0.7 * PI - 0.1 * PI
  })
  drawPads({
    x: 0.9 * width,
    y: 0.15 * height,
    size: 650,
    arcStart: 1.4 * PI,
    arcEnd: 1.4 * PI - 0.1 * PI
  })
  drawPads({
    x: 0.25 * width,
    y: 0.88 * height,
    size: 800,
    arcStart: 0.7 * PI,
    arcEnd: 0.7 * PI - 0.1 * PI
  })
  drawPads({
    x: 0.75 * width,
    y: 0.8 * height,
    size: 800,
    arcStart: 0.7 * PI,
    arcEnd: 0.7 * PI - 0.1 * PI
  })
  //image(fishAbove, 0.5 * width, 0.5 * height, fishAbove.width, fishAbove.height)
  drawFlower({ x: 1380, y: 470, size: 120, rings: 4 })
  drawFlower({ x: 380, y: 1470, size: 120, rings: 4 })
  textSize(45)
  //fill('#F75C03')
  //text('fish.', width/2, height/2)
}

