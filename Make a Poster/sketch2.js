const circles = []
function setup () {
  createCanvas(600, 800)
  noLoop() // Prevents draw() from looping which improves performance and prevents the poster from changing every frame
  generateCircles()
}

function generateCircles () {
  for (let i = 0; i < 2555; i++) {
    rotate(radians((i % 7) * 30)),
      circles.push({
        x: (i * PI) % width,
        y: ((i / PI) % height) % height,
        width: ((sin(i) * 1000) % 3) * 15,
        height: ((sin(i) * 1000) % 4) * 6,
        red: (i % 4) * 255,
        green: (i % 2) * 255,
        blue: (i % 3) * 255
      })
  }
}

function flower (x1, y1, x2, y2, x3, y3) {
  for (let i = 0; i < 360; i += 30) {
    push()
    fill(cos(i) * 255, sin(i) * 255, tan(i) * 255)
    rotate(radians(i))
    triangle(x1, y1, x1, y2, x3, y3)
    pop()
  }
}
function draw () {
  background('#FFF')
   push() 
  beginClip()
  circle(300, 400, 600)
  endClip()
  strokeWeight(0.5)

  //ellipse(10, 10, 10, 10)

  stroke('black')
  //beginClip()

  //endClip()
  translate(300, 400)

  for (let h = 0; h < width * PI; h += 30) {
    fill('#fff')
    flower(0, 0, 10, sin(h) * 1000, cos(h) * 350, 20)
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
    stroke('#94d2bd')
    rotate(PI / 4)
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
    stroke('#000')
    rotate(PI / 5)
    flower(0, 0, 10, sin(h) * 100, cos(h) * 350, 20)
  }
  resetMatrix()
  blendMode(OVERLAY)
  for (let i = 0; i < circles.length; i++) {
    push()
    fill(circles[i].red, circles[i].green, circles[i].blue)

    // Triangle originating from the top-left
    triangle(
      0,
      0,
      circles[i].x,
      circles[i].y,
      circles[i].width,
      circles[i].height
    )

    //I got AI to help me with the mirroring here:
    // Matching triangle originating from the bottom-right
    translate(width, height)
    scale(-1, -1)

    triangle(
      0,
      0,
      circles[i].x,
      circles[i].y,
      circles[i].width,
      circles[i].height
    )
    pop()
  }
  blendMode(BLEND)
  noFill()
  stroke('#000')
  strokeWeight(2)

  // for (let heightAdj = 0; heightAdj <= height; heightAdj += 40) {
  //   beginShape()

  //   for (let x = 0; x <= width; x += 10) {
  //     const amplitude = 30
  //     const y = amplitude * sin(x * 0.4) + heightAdj
  //     vertex(x, y)
  //   }

  //   endShape()
  // }
  randomSeed(90)
  strokeWeight(4)
  stroke("white")
  for (let a = 60; a <= height; a += 170) {
    beginShape();
    for (let x = 0; x <= width; x += 7) {
      let amplitude = randomGaussian(80, 10);
      let y = amplitude * sin(3 + x * 1.4) + a;
      vertex(x, y);
    }
    endShape();
  }

 
  pop()
}
