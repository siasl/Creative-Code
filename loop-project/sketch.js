let font
let contours = []

async function setup () {
  createCanvas(windowWidth, windowHeight)

  font = await loadFont('./assets/oilrig.otf')
  textFont(font)
  textSize(240)
  textAlign(CENTER, CENTER)

  contours = font.textToContours('SILAS', width / 2, height / 2, {
    sampleFactor: 1,
    simplifyThreshold: 0
  })
}

function draw () {
  background('white')
  //noFill()
  //   stroke("red")
  strokeWeight(3)
  for (const contour of contours) {
    fill(random(255), random(255), random(255))
    for (let i = 0; i < contour.length; i += 10) {
      stroke(random(255), random(255), random(255))
      const a = contour[i]
      //console.log(a)
      const b = contour[(i + (frameCount % 9000)) % contour.length]

      //   line(a.x, a.y, b.x, b.y)
      ellipse(a.x, a.y, b.x - a.x, b.y - a.y)
    }
  }
}
