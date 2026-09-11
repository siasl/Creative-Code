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

function flower (x1, y1, x2, y2, x3, y3) {
  for (let h = 0; h < width * PI; h += 30) {
    let p1 = { x: x1, y: y1 }
    let p2 = { x: x2, y: y2 }
    let p3 = { x: x3, y: y3 }
    for (let i = 0; i < 360; i += 30) {
      push()
      //fill(cos(i) * 255, sin(i) * 255, tan(i) * 255)
      rotate(radians(i))
      triangle(p1.x, p1.y, p1.x, p2.y, p3.x, p3.y)
      pop()
    }
  }
}
function draw () {
  background('#e9d8a6')
  translate(300, 400)

  //ellipse(10, 10, 10, 10)
  for (let i = 0; i < circles.length; i++) {
    fill(circles[i].red, circles[i].green, circles[i].blue)
    rect(circles[i].x, circles[i].y, circles[i].width, circles[i].height)
  }
  stroke('black')
  for (let h = 0; h < width * PI; h += 30) {
    fill("#fff")
    //stroke("#9b2226")
    flower(0, 0, 10, sin(h) * 1000, cos(h) * 350, 20)
    fill('#005f73')
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
    stroke('#94d2bd')
    fill('#0a9396')
    rotate(PI / 4)
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
    stroke('#000')
    fill('#ae2012')
    rotate(PI / 5)
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
  }
}
