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
let second_cir = []
let minute_cir = []
let hour_cir = []
let boundaries = []
let cups = []
let current_second
let current_minute
let current_hour
let oc = 'close'
let min_sec
let start_ball = true
let cupAnimationStartedAt = [null, null]
const cupOpenTargets = [{ bottom: 1.6 }, { bottom: 0.8, right: -0.6 }]
const cupTiming = {
  button: [
    { openDuration: 1000, holdDuration: 1000, closeDuration: 1000 },
    { openDuration: 1000, holdDuration: 1500, closeDuration: 1000 }
  ],
  secondCup: { openAtSecond: 59, closeAtSecond: 1 },
  minuteCup: { openAtMinute: 59, closeAtSecond: 3 },
  hourCup: { openAtHour: 0, closeAtSecond: 5 }
}
function setup () {
  createCanvas(1000, 5500)
  current_second = second()
  current_minute = minute()
  current_hour = hour()
  min_sec = second()
  // create an engine
  engine = Engine.create()
  world = engine.world // the root composite

  line_boundaries({
    x1: 0,
    y1: 260,
    w1: 300,
    h1: 20,
    a1: 0.3,
    gap: 39,
    gap_growth: 10,
    count: 1
  })

  // line_boundaries({
  //   x1: 470,
  //   y1: 490,
  //   w1: 300,
  //   h1: 20,
  //   a1: -0.8,
  //   gap: 39,
  //   gap_growth: 10,
  //   count: 1
  // })
  // line_boundaries({
  //   x1: 530,
  //   y1: 375,
  //   w1: 100,
  //   h1: 20,
  //   a1: 0,
  //   gap: 39,
  //   gap_growth: 10,
  //   count: 1
  // })
  line_boundaries({
    x1: 260,
    y1: 1660,
    w1: 140,
    h1: 20,
    a1: 0.8,
    gap: 39,
    gap_growth: 10,
    count: 1
  })
  line_boundaries({
    x1: 380,
    y1: 1660,
    w1: 340,
    h1: 20,
    a1: PI/2,
    gap: 39,
    gap_growth: 10,
    count: 1
  })
  line_boundaries({
    x1: 450,
    y1: 3710,
    w1: 180,
    h1: 20,
    a1: PI/2,
    gap: 39,
    gap_growth: 10,
    count: 1
  })
  line_boundaries({
    x1: 320,
    y1: 3750,
    w1: 160,
    h1: 20,
    a1: .8,
    gap: 39,
    gap_growth: 10,
    count: 1
  })
  // second cup
  cups.push(
    new Cup({
      x: 250,
      y: 950,
      width: 55,
      height: 1300,
      wallThickness: 30,
      moves: true
    })
  )
  //minute cup
  cups.push(
    new Cup({
      x: 340,
      y: 2700,
      width: 68,
      height: 2000,
      wallThickness: 30,
      moves: true
    })
  )
  //hour cup
  cups.push(
    new Cup({
      x: 410,
      y: 4350,
      width: 70,
      height: 1100,
      wallThickness: 30,
      moves: true
    })
  )

  //boundaries.push(new Boundary(390, 175, 100, 20, 0.3))
  //boundaries.push(new Boundary(510, 212, 100, 20, 0.3))
}

function line_boundaries ({ x1, y1, w1, h1, a1, gap, gap_growth, count }) {
  boundaries.push(new Boundary(x1, y1, w1, h1, a1)) // right edge at 150
  for (let i = 0; i < count - 1; i++) {
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
    gap += gap_growth
  }
}

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
function new_sec_ball (x, y, r, res, xv, yv, color) {
  let newBall = new Circle(x, y, r, res, 0, color)
  Body.setVelocity(newBall.body, { x: xv, y: yv })
  second_cir.push(newBall)
}
function new_min_ball (x, y, r, res, xv, yv, color) {
  let newMinBall = new Circle(x, y, r, res, 0, color)
  Body.setVelocity(newMinBall.body, { x: xv, y: yv })
  minute_cir.push(newMinBall)
}
function new_hour_ball (x, y, r, res, xv, yv, color) {
  let newHourBall = new Circle(x, y, r, res, 0, color)
  Body.setVelocity(newHourBall.body, { x: xv, y: yv })
  hour_cir.push(newHourBall)
}

function drawCupButtons () {
  const buttons = [
    { x: 20, y: 20, label: 'Open second cup' },
    { x: 20, y: 70, label: 'Open minute cup' }
  ]

  push()
  rectMode(CORNER)
  textAlign(CENTER, CENTER)
  textSize(16)
  for (const button of buttons) {
    fill(70, 130, 180)
    rect(button.x, button.y, 180, 36, 6)
    fill(255)
    text(button.label, button.x + 90, button.y + 18)
  }
  pop()
}

function mouseClicked () {
  if (mouseX >= 20 && mouseX <= 200 && mouseY >= 20 && mouseY <= 56) {
    cupAnimationStartedAt[0] = millis()
  }
  if (mouseX >= 20 && mouseX <= 200 && mouseY >= 70 && mouseY <= 106) {
    cupAnimationStartedAt[1] = millis()
  }
}

function animateCupButton (cupIndex, openAngle, rightOpenAngle) {
  const elapsed = millis() - cupAnimationStartedAt[cupIndex]
  const { openDuration, holdDuration, closeDuration } =
    cupTiming.button[cupIndex]

  if (elapsed < openDuration) {
    cups[cupIndex].bottom_open(openAngle)
    if (rightOpenAngle !== undefined) {
      cups[cupIndex].right_open(rightOpenAngle)
    }
  } else if (elapsed < openDuration + holdDuration) {
    return
  } else if (elapsed < openDuration + holdDuration + closeDuration) {
    cups[cupIndex].bottom_close(0)
    if (rightOpenAngle !== undefined) {
      cups[cupIndex].right_close(0)
    }
  } else {
    cupAnimationStartedAt[cupIndex] = null
  }
}

function draw () {
  background(51)
  let now_second = second()
  let now_minute = minute()
  let now_hour = hour()

  drawCupButtons()

  //show cups
  for (let i = 0; i < cups.length; i++) {
    cups[i].show()
  }

  //load bondaries
  for (let i = 0; i < boundaries.length; i++) {
    moveBoundary(boundaries[i])
  }
  //make sure cup text is correct
  cups[0].update_text(second())
  cups[1].update_text(minute())
  cups[2].update_text(hour())

  // draw second balls every second
  if (now_second != current_second) {
    new_sec_ball(140, 50, 10, 0.6, 0, 1, 'red')
    current_second = now_second
  }

  //show the balls that exist on every frame
  for (let i = 0; i < second_cir.length; i++) {
    second_cir[i].show()
  }
  for (let i = 0; i < minute_cir.length; i++) {
    minute_cir[i].show()
  }
  for (let i = 0; i < hour_cir.length; i++) {
    hour_cir[i].show()
  }
  // populate second cup with right number of balls
  if (start_ball) {
    if (second_cir.length < now_second && now_second !== min_sec) {
      new_sec_ball(250, 290, 10, 0.6, 0, 1, 'red')
      min_sec= current_second
    }
  }
  // populate minute cup with right number of balls
  if (start_ball) {
    if (minute_cir.length < now_minute ) {
      new_min_ball(340, 1800, 15, 0.1, 1, 2, 'blue')
    }
  }
  //populate hour cup with right number of balls
  if (start_ball) {
    if (hour_cir.length < now_hour ) {
      new_hour_ball(400, 3900, 20, 0.1, 1, 2, 'green')
    }
  }

  // open and close the second cup at the right time
  if (now_second == cupTiming.secondCup.openAtSecond) {
    start_ball = false
    cups[0].bottom_open(cupOpenTargets[0].bottom)
  }
  if (now_second == cupTiming.secondCup.closeAtSecond) {
    cups[0].bottom_close(0)
  }

  // add new minute ball
  if (now_minute != current_minute && now_second == 1) {
    new_min_ball(340, 1600, 15, 0.6, 0, 2, 'blue')
    current_minute = now_minute
  }

  // add new hour ball
  if (now_hour != current_hour && now_minute == 0 && now_second == 1) {
    if (now_hour != 0) {
      new_hour_ball(400, 3700, 20, 0.6, 0, 2, 'green')
    }
    current_hour = now_hour
  }

  if (now_minute == cupTiming.minuteCup.openAtMinute) {
    if (now_second == 0) {
      cups[1].bottom_open()
    }
    if (now_second == cupTiming.minuteCup.closeAtSecond) {
      cups[1].bottom_close()
    }
  }
  // open and close the hour cup at midnight
  if (now_hour == cupTiming.hourCup.openAtHour && now_minute == 0) {
    if (now_second == 0) {
      cups[2].bottom_open()
    }
    if (now_second == cupTiming.hourCup.closeAtSecond) {
      cups[2].bottom_close()
    }
  }
  if (cupAnimationStartedAt[0] !== null) {
    animateCupButton(0, cupOpenTargets[0].bottom)
  }
  if (cupAnimationStartedAt[1] !== null) {
    animateCupButton(1, cupOpenTargets[1].bottom)
  }
  //remove second balls from board
  for (let i = second_cir.length - 1; i >= 0; i--) {
    // console.log(circles[0])
    if (second_cir[i].body.position.y > 1680) {
      Composite.remove(world, second_cir[i].body)
      second_cir.splice(i, 1)
    }
  }
  //remove minute circles
  for (let i = minute_cir.length - 1; i >= 0; i--) {
    // console.log(circles[0])
    if (minute_cir[i].body.position.y > 3760) {
      Composite.remove(world, minute_cir[i].body)
      minute_cir.splice(i, 1)
    }
  }
  //remove hour circles
  for (let i = hour_cir.length - 1; i >= 0; i--) {
    // console.log(circles[0])
    if (hour_cir[i].body.position.y > 5400) {
      Composite.remove(world, hour_cir[i].body)
      hour_cir.splice(i, 1)
    }
  }
  Engine.update(engine) //
}
