// Coding Train / Daniel Shiffman
// 5.18 Matter.js tutorial

// https://www.youtube.com/watch?v=uITcoKpbQq4

// Note that the syntax has been updated to use object destructuring
// code grabbed from https://editor.p5js.org/codingtrain/sketches/DOqF83CzT

// equivilant to const Engine = Matter.Engine....
// It's known as object destructuring
const { Engine, World, Bodies, Composite, Body } = Matter

let engine
let world
let circles = []
let boundaries = []
let cups = []
let current_second
function setup () {
  createCanvas(1000, 1000)
  current_second = second()
  // create an engine
  engine = Engine.create()
  world = engine.world // the root composite

  cups.push(new Cup(400, 300, 150, 150, 10, true))
  boundaries.push(new Boundary(0, 260, 300, 20, 0.3)) // right edge at 150
  let gap = 30
  for (let i = 0; i < 1; i++) {
    last_bound = boundaries[boundaries.length - 1]
    console.log(last_bound)
    new_coords = calcBoundary(
      last_bound.x,
      last_bound.y,
      last_bound.w,
      100, // new width
      last_bound.body.angle,
      gap // gap
    )
    boundaries.push(
      new Boundary(new_coords.x, new_coords.y, 100, 20, new_coords.a)
    )
    gap += 10
  }

  //boundaries.push(new Boundary(390, 175, 100, 20, 0.3))
  //boundaries.push(new Boundary(510, 212, 100, 20, 0.3))

  console.log(new_coords)
}

// function mousePressed () {
//   if (mousePressed) {
//     circles.push(new Circle(mouseX, mouseY, random(5, 10)))
//   }
// }
//AI helped me come up with this formula. I don't remember Trig.
function calcBoundary (prev_x, prev_y, prev_w, new_w, a, gap) {
  dX = prev_w / 2 + gap + new_w / 2
  yNext = prev_y + tan(a) * dX
  return { x: prev_x + dX, y: yNext, a: a }
}

function moveCup (cup) {
  const newHeight = cup.y - (((frameCount / 60) * 6.67) % height)
  if (cup.moves) {
    const dy = newHeight - cup.y

    Composite.translate(cup.composite, {
      x: (frameCount / 100) % width,
      y: dy
    })
    cup.y = newHeight
  }
  cup.show()
}

function moveBoundary (boundary) {
  const newHeight = height - (((frameCount / 60) * 6.67) % height)
  if (boundary.moves) {
    Body.setPosition(boundary.body, {
      x: boundary.body.position.x,
      y: newHeight
    })
  }
  boundary.show()
}

function draw () {
  background(51)
  // if (mouseIsPressed) {
  //   circles.push(newBall)
  // }
  let now_second = second()
  let big_second = second()
  if (now_second != current_second) {
    let newBall = new Circle(140, 50, 10, 0.9)
    Body.setVelocity(newBall.body, { x: 0, y: 10 })
    circles.push(newBall)
    // if (now_second %3) {
    //   let newBall2 = new Circle(50, 50, 20, 0.9)
    //   Body.setVelocity(newBall2.body, { x: 0, y: 10 })
    //   circles.push(newBall2)
    // }
    current_second = now_second
  }
  console.log(now_second)
  if (now_second == 58) {
    cups[0].open()
  }
  if (now_second % 3 == 1) {
    cups[0].close()
  }

  for (let i = 0; i < circles.length; i++) {
    circles[i].show()
  }
  for (let i = 0; i < cups.length; i++) {
    cups[i].show()
  }

  // move boundaries that we want to move
  for (let i = 0; i < boundaries.length; i++) {
    moveBoundary(boundaries[i])
  }
  for (let i = circles.length - 1; i > 0; i--) {
    // console.log(circles[0])
    if (circles[i].body.position.y > 400) {
      circles.splice(i, 1)
    }
  }

  // for (let i = 0; i < cups.length; i++) {
  //   moveCup(cups[i])
  // }
  Engine.update(engine) //
}
