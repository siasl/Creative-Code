const circles = []
function setup () {
  createCanvas(600, 800)

  //generateCircles();
}

function generateCircles () {
  let maxNum = getRandomInt(0, width)
  for (let i = 0; i < 25555; i++) {
    circles.push({
      x: getRandomInt(0, width),
      y: getRandomInt(0, height),
      width: getRandomInt(1, 7),
      height: getRandomInt(1, 9),
      red: (i % 4) * 255,
      green: (i % 2) * 255,
      blue: (i % 3) * 255
    })
  }
}
function getRandomInt (min, max) {
  // Math.floor() rounds down to the nearest whole number
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function draw () {
  background(220)
  translate(300, 400)

  //ellipse(10, 10, 10, 10)
  for (let i = 0; i < circles.length; i++) {
    fill(circles[i].red, circles[i].green, circles[i].blue)
    rect(circles[i].x, circles[i].y, circles[i].width, circles[i].height)
  }
  for (let h = 0; h < width*PI; h += 30) {
    let p1 = { x: 0, y: 0 }
    let p2 = { x: 10, y: sin(h)*100 }
    let p3 = { x: cos(h)*350, y: 20 }
    for (let i = 0; i < 360; i += 30) {
      push()
      rotate(radians(i))
      triangle(p1.x, p1.y, p1.x, p2.y, p3.x, p3.y)
      pop()
    }
  }
}
