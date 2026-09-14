let fish
var offset = 0
var strum = 1
//["#606c38","#283618","#fefae0","#dda15e","#bc6c25"]
async function setup () {
  createCanvas(1500, 2000)
  imageMode(CENTER)
  scaleCanvas(0.5)
  fish = await loadImage('assets/fish.png')
  randomSeed(10)
  noLoop()
}

function scaleCanvas (displayScale) {
  let cnv = select('canvas').elt
  cnv.style.setProperty('transform', 'scale(' + displayScale + ')')
  cnv.style.setProperty('transform-origin', 'left top')
}

function drawWaves () {
  //based on https://editor.p5js.org/stevenraysimon/sketches/HyTseadOg
  strokeWeight(2)
  stroke('#dda15e')
  noFill()
  for (let yAdj = -300; yAdj < height; yAdj += 50) {
    beginShape()
    vertex(0, height)
    for (var x = 0; x < width; x++) {
      //var angle = map(x, 0, width, 0, TWO_PI);
      var angle = offset + x * 0.01
      // map x between 0 and width to 0 and Two Pi
      var y = map(sin(angle), -strum, strum, 150, 250) + yAdj
      vertex(x, y)
    }
    vertex(width, height)
    endShape()
  }
}

function drawFish () {
  for (let i = 1; i > 0; i -= 0.1) {
    tint(255, i * random(0, 399))
    image(
      fish,
      width * i, //x
      2000 * sin(3 + i * height * 1.4), //y
      fish.width * randomGaussian(0.6, i), //width
      fish.height * randomGaussian(i, 2) //height
    )
  }
}
function draw () {
  background('#fefae0')
  drawWaves()
  drawFish()
  fill("#283618")
  strokeWeight(6)
  stroke("#606c38")
  arc(300, 200, 300, 300, 0, 1.8* PI)
}

