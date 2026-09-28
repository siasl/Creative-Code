let font
let contours = []
let elements = []
let shakeAmount = 0
let shakeAmount2 = 0
const maxShake = 70
const decayFactor = 0.8 // How quickly the shake effect fades
const decayFactor2 = 0.8 // How quickly the shake effect fades
let size_counter = 0.01
let decrease = false
let startSecond
let shuffled_array
let final_shake = false
async function setup () {
  randomSeed("silas")

  createCanvas(windowWidth, windowHeight)
  startSecond = second()
  font = await loadFont('./assets/oilrig.otf')
  textFont(font)
  textSize(240)
  textAlign(CENTER, CENTER)
  silas_location = { x: width / 2, y: 0.2 }
  contours = font.textToContours('SILAS', width / 2, height / 2, {
    sampleFactor: 1,
    simplifyThreshold: 0
  })
  shuffled_array = shuffle(contours)
  console.log(contours)
  console.log(shuffled_array)
}

function draw () {
  background('black')
  //noFill()
  //   stroke("red")
  fill(255)
  text('SILAS', silas_location.x, silas_location.y)
  //move text
  if (silas_location.x < width / 2 && !final_shake) {
    silas_location.x += 10
  }
  if (silas_location.y <= height / 2 && !final_shake) {
    shakeAmount = maxShake

    new_y = lerp(
      silas_location.y,
      height / 2,
      circularInOut(silas_location.y / height / 2)
    )
    silas_location.y = new_y + 15
  }

  noFill()
  // SHAKE
  //inspired by https://editor.p5js.org/luisa_NYU/sketches/QEM1tnYXE
  if (silas_location.y >= height / 2 && decrease == false) {
    let xOffset = random(-shakeAmount, shakeAmount)
    let yOffset = random(-shakeAmount, shakeAmount)

    // Apply the shake by translating the canvas
    //translate(xOffset, yOffset)
    silas_location.x += xOffset
    silas_location.y += yOffset
    //rotate(yOffset)
    shakeAmount *= decayFactor
  }
  //if shake has stopped, do the crazy stuff
  if (shakeAmount <= 6 && !final_shake) {
    //make sure the text is centered
    silas_location.x = width / 2
    silas_location.y = height / 2 + 1
    strokeWeight(1)
    //   console.log("contour.length: " + contours.length)

    if (second() - startSecond <= 5) {
      for (let c = 0; c < contours.length; c += 1) {
        fill(random(255), random(255), random(255))
        for (let i = 0; i < contours[c].length; i += 10) {
          //   console.log("contour.length: " + contour.length)
          contour = contours[c]
          shuffled_contour = shuffled_array[c]
          stroke(random(255), random(255), random(255))
          const a = contour[i]
          const b = shuffled_contour[i % shuffled_contour.length]

          //   line(a.x, a.y, b.x, b.y)
          ellipse(
            a.x,
            a.y,
            (b.x - a.x) * size_counter,
            (b.y - a.y) * size_counter
          )
          push()
          blendMode(DIFFERENCE)
          rect(a.x * size_counter, a.y * size_counter, b.x - a.x, b.y - a.y)
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
      for (let c = 0; c < contours.length; c += 1) {
        fill(random(255), random(255), random(255))
        //noFill()
        for (let i = 0; i < contours[c].length; i += 5) {
          contour = contours[c]
          shuffled_contour = shuffled_array[c]
          stroke(random(255), random(255), random(255))
          const a = contour[i]
          const b = shuffled_contour[i % shuffled_contour.length]

          //   line(a.x, a.y, b.x, b.y)
          ellipse(
            a.x + i * size_counter,
            a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          ellipse(
            a.x + i * size_counter,
            -a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          ellipse(
            -a.x + i * size_counter,
            a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          push()
          blendMode(DIFFERENCE)
          rect(
            a.x - i * size_counter,
            a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          rect(
            -a.x - i * size_counter,
            a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          rect(
            a.x - i * size_counter,
            -a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          pop()
          push()
          blendMode(SCREEN)

          line(a.x - size_counter, a.y, b.x, b.y * size_counter)
          // line(a.x*1.1, a.y*1.1, b.x*1.1, b.y*1.1 )
          pop()
        }
      }
    }
    if (second() - startSecond > 5) {
      console.log('i')
      //make sure the text is centered
      silas_location.x = width / 2
      silas_location.y = height / 2 + 1
      strokeWeight(1)
      //   console.log("contour.length: " + contours.length)
      for (let c = 0; c < contours.length; c += 1) {
        fill(random(255), random(255), random(255))
        //noFill()
        for (let i = 0; i < contours[c].length; i += 5) {
          //   console.log("contour.length: " + contour.length)
          contour = contours[c]
          shuffled_contour = shuffled_array[c]
          stroke(random(255), random(255), random(255))
          const a = contour[i]
          const b = shuffled_contour[i % shuffled_contour.length]

          //   line(a.x, a.y, b.x, b.y)
          ellipse(
            a.x,
            a.y,
            (b.x - a.x) * size_counter,
            (b.y - a.y) * size_counter
          )
          push()
          blendMode(DIFFERENCE)
          rect(a.x * size_counter, a.y * size_counter, b.x - a.x, b.y - a.y)
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
      for (let c = 0; c < contours.length; c += 1) {
        fill(random(255), random(255), random(255))
        //noFill()
        for (let i = 0; i < contours[c].length; i += 5) {
          contour = contours[c]
          shuffled_contour = shuffled_array[c]
          stroke(random(255), random(255), random(255))
          const a = contour[i]
          const b = shuffled_contour[i % shuffled_contour.length]

          //   line(a.x, a.y, b.x, b.y)
          ellipse(
            a.x + i * size_counter,
            a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          ellipse(
            a.x + i * size_counter,
            -a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          ellipse(
            -a.x + i * size_counter,
            a.y + i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          push()
          blendMode(DIFFERENCE)
          rect(
            a.x - i * size_counter,
            a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          rect(
            -a.x - i * size_counter,
            a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
          rect(
            a.x - i * size_counter,
            -a.y - i * size_counter,
            b.x - a.x,
            b.y - a.y
          )
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
  if (size_counter <= 2 && decrease == false) {
    size_counter += 0.01
  } else if (size_counter > 0) {
    size_counter -= 0.03
    decrease = true
    console.log('true')
    shakeAmount2 = maxShake
  }

  if (decrease && size_counter <= 0) {
    final_shake = true
    shuffled_array = []
    contours = []
    let xOffset = random(-shakeAmount2, shakeAmount2)
    let yOffset = random(-shakeAmount2, shakeAmount2)
    console.log('end shake')
    // Apply the shake by translating the canvas
    //translate(xOffset, yOffset)
    silas_location.x += xOffset
    silas_location.y += yOffset
    //rotate(yOffset)
    shakeAmount2 *= decayFactor2
  }
//   if (final_shake && shakeAmount2 <= 0.02) {
//     silas_location.x -= 10
//   }
  if (final_shake && shakeAmount2 <= 0.02) {
    new_y = lerp(
      silas_location.y,
      0,
      circularInOut(silas_location.y / height / 2)
    )
    silas_location.y = new_y - 15
  }
  console.log(silas_location)
  if (final_shake && silas_location.y <= -100) {
    shakeAmount2 = 0
    shakeAmount = 0
    decrease = false
    final_shake = false
    startSecond = second()

    silas_location = { x: width / 2, y: 0.2 }
    contours = font.textToContours('SILAS', width / 2, height / 2, {
      sampleFactor: 1,
      simplifyThreshold: 0
    })
    shuffled_array = shuffle(contours)
  }
}

//   console.log("SC: " + size_counter)

// got this forumla from https://www.kynd.info/p5sketches/easing.html
function powerInOut (t, a = 2) {
  t = max(0, min(t, 1))
  if (t < 0.5) {
    return pow(t * 2, a) * 0.5
  } else {
    return 1.0 - pow((1 - t) * 2, a) * 0.5
  }
}

function circularInOut (t) {
  t = max(0, min(t, 1))

  if (t < 0.5) {
    t *= 2
    return 0.5 - sqrt(1 - t * t) * 0.5
  } else {
    t = (t - 0.5) * 2
    return 0.5 + sqrt(1 - (1 - t) * (1 - t)) * 0.5
  }
}
