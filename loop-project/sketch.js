let font
let contours = []

async function setup () {
  createCanvas(windowWidth, windowHeight)

  font = await loadFont('./assets/oilrig.otf')
  textFont(font)
  textSize(240)
  textAlign(CENTER, CENTER)
  silas_location = { x: width / 2, y:0.2}
  contours = font.textToContours('SILAS', width / 2, height / 2, {
    sampleFactor: 1,
    simplifyThreshold: 0
  })
}

function draw () {
  background('white')
  //noFill()
  //   stroke("red")
  text('SILAS', silas_location.x, silas_location.y)
  if (silas_location.x < width / 2) {
    silas_location.x += 10
  }
  if (silas_location.y <= height / 2) {
    new_y = lerp(silas_location.y, height/2, powerInOut(silas_location.y / height/2))
    console.log(new_y)
    silas_location.y = new_y +5
  }
  strokeWeight(3)
  //   for (const contour of contours) {
  //     fill(random(255), random(255), random(255))
  //     for (let i = 0; i < contour.length; i += 10) {
  //       stroke(random(255), random(255), random(255))
  //       const a = contour[i]
  //       //console.log(a)
  //       const b = contour[(i + (frameCount % 9000)) % contour.length]

  //       //   line(a.x, a.y, b.x, b.y)
  //       ellipse(a.x, a.y, b.x - a.x, b.y - a.y)
  //       push()
  //       blendMode(DIFFERENCE)
  //       rect(a.x, a.y, b.x - a.x, b.y - a.y)
  //       pop()
  //       push()
  //       blendMode(SCREEN)
  //       //line(-a.x * i, -a.y*i, b.x, b.y)
  //       //line(a.x * i, a.y*i, b.x, b.y)
  //       //line(a.x * i, -a.y*i, b.x, b.y)
  //       line(a.x, a.y, b.x, b.y)
  //       //line(a.y, a.x, b.y, b.x )
  //       pop()
  //     }
  //   }
}

function powerInOut (t, a = 2) {
  t = max(0, min(t, 1))
  if (t < 0.5) {
    return pow(t * 2, a) * 0.5
  } else {
    return 1.0 - pow((1 - t) * 2, a) * 0.5
  }
}
