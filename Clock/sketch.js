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
function setup () {
  createCanvas(1000, 400)
  // create an engine
  engine = Engine.create()
  world = engine.world // the root composite
  //boundaries.push(new Boundary(150, 100, width * 0.6, 20, 0.3))
  // boundaries.push(new Boundary(40, 300, 110, 20, 0.4, true))
  // boundaries.push(new Boundary(100, height / 1.2, 30, height, 0, false))
  // boundaries.push(new Boundary(10, height / 2, 30, height, 0, false))
  // cups.push(new Cup(400, 100, 100, 100, 10, true))
  boundaries.push(new Boundary(0, 100, 300, 20, 0))
  boundaries.push(new Boundary(410, 100, 200, 20, 0))
}

// function mousePressed () {
//   if (mousePressed) {
//     circles.push(new Circle(mouseX, mouseY, random(5, 10)))
//   }
// }

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
  if (mouseIsPressed) {
    let newBall = new Circle(mouseX, mouseY, random(5, 10))
    console.log(newBall)
    console.log(newBall.body)
    Body.setVelocity(newBall.body, {x:40, y:0})
    circles.push(newBall)
  }
  //circles.push(new Circle(0,90, random(5, 10)))
  fill(255)
  text(circles.length, 100, 100)
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
  for (let i = 0; i < cups.length; i++) {
    moveCup(cups[i])
  }
  Engine.update(engine) //

  // circles.push(new Circle(mouseX, mouseY, random(5, 10)));
}
