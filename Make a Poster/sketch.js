let fish

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
function draw () {
  background('#333')
  for (let i = 1; i > 0; i -= 0.1) {
    tint(255, i * (random(0, 399)))
    image(
      fish,
      width*i, //x
      2000 * sin(3 + i*height * 1.4), //y
      fish.width * randomGaussian(.6, i), //width
      fish.height * randomGaussian(i, 2) //height
    )
  }
}
