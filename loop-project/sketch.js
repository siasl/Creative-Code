let font
let contours = []
let elements = []
let shakeAmount = 0
const maxShake = 70
const decayFactor = 0.8 // How quickly the shake effect fades

async function setup () {
  createCanvas(windowWidth, windowHeight)

  font = await loadFont('./assets/oilrig.otf')
  textFont(font)
  textSize(240)
  textAlign(CENTER, CENTER)
  silas_location = { x: width / 2, y: 0.2 }
  contours = font.textToContours('SILAS', width / 2, height / 2, {
    sampleFactor: 1,
    simplifyThreshold: 0
  })
  randomSeed(10)
}

function draw () {
  background('black')
  //noFill()
  //   stroke("red")
  fill(255)
  text('SILAS', silas_location.x, silas_location.y)
  if (silas_location.x < width / 2) {
    silas_location.x += 10
  }
  if (silas_location.y <= height / 2) {
    shakeAmount = maxShake

    new_y = lerp(
      silas_location.y,
      height / 2,
      circularInOut(silas_location.y / height / 2)
    )
    console.log(new_y)
    silas_location.y = new_y + 15
  }
  noFill()
  //inspired by https://editor.p5js.org/luisa_NYU/sketches/QEM1tnYXE
  if (silas_location.y >= height / 2) {
    console.log('shake')
    let xOffset = random(-shakeAmount, shakeAmount)
    let yOffset = random(-shakeAmount, shakeAmount)

    // Apply the shake by translating the canvas
    //translate(xOffset, yOffset)
    silas_location.x += xOffset
    silas_location.y += yOffset
    //rotate(yOffset)
    shakeAmount *= decayFactor
  }
  
  if (shakeAmount <= 10) {
    
    silas_location.x = width/2
    silas_location.y = (height/2)+1
    strokeWeight(1)
     for (const contour of contours) {
      fill(random(255), random(255), random(255))
      for (let i = 0; i < contour.length; i += 5) {
        stroke(random(255), random(255), random(255))
        const a = contour[i]
        //console.log(a)
        const b = contour[(i + (frameCount % 9000)) % contour.length]

        //   line(a.x, a.y, b.x, b.y)
        ellipse(a.x, a.y, (b.x - a.x)*1.1, (b.y - a.y)*1.2)
        push()
        blendMode(DIFFERENCE)
        rect(a.x, a.y, b.x - a.x, b.y - a.y)
        pop()
        push()
        blendMode(SCREEN)
        //line(-a.x * i, -a.y*i, b.x, b.y)
        //line(a.x * i, a.y*i, b.x, b.y)
        //line(a.x * i, -a.y*i, b.x, b.y)
        line(a.x, a.y, b.x, b.y)
        //line(a.y, a.x, b.y, b.x )
        pop()
      }
    }
    for (const contour of contours) {
      fill(random(255), random(255), random(255))
      //noFill()
      console.log("contour.length: " + contour.length)
      for (let i = 0; i < contour.length; i += 5) {
        stroke(random(255), random(255), random(255))
        const a = contour[i]
        //console.log(a)
        const b = contour[(i + (frameCount % 9000)) % contour.length]

        //   line(a.x, a.y, b.x, b.y)
        ellipse(a.x+i, a.y+i, b.x - a.x, b.y - a.y)
        ellipse(a.x+i, -a.y+i, b.x - a.x, b.y - a.y)
        ellipse(-a.x+i, a.y+i, b.x - a.x, b.y - a.y)
        push()
        blendMode(DIFFERENCE)
        rect(a.x-i, a.y-i, b.x - a.x, b.y - a.y)
        rect(-a.x-i, a.y-i, b.x - a.x, b.y - a.y)
        rect(a.x-i, -a.y-i, b.x - a.x, b.y - a.y)
        pop()
        push()
        blendMode(SCREEN)

        line(a.x, a.y, b.x, b.y)
        // line(a.x*1.1, a.y*1.1, b.x*1.1, b.y*1.1 )
        pop()
      }
    }
   
  }
}

// got this forumla from https://www.kynd.info/p5sketches/easing.html
function powerInOut (t, a = 2) {
  t = max(0, min(t, 1))
  if (t < 0.5) {
    return pow(t * 2, a) * 0.5
  } else {
    return 1.0 - pow((1 - t) * 2, a) * 0.5
  }
}

function circularInOut(t) {
    t = max(0, min(t, 1));

    if (t < 0.5) {
      t *= 2;
      return 0.5 - sqrt(1 - (t) * (t)) * 0.5;
    } else {
      t = (t - 0.5) * 2;
      return 0.5 + sqrt(1 - (1 - t) * (1 - t)) * 0.5;
    }
  }