//debugger
/**
 * For this project, we had to build a generator. I was inspired by planets orbiting
 * each other. I was also inspired by Agar.io and other similar games.
 * As a result, I made this generator that has balls that are attracted to each other
 * based on color. The close a color is to another color, the more those balls are drawn
 * to each other. Size plays a role as well. As balls move around the canvas, they 
 * leave a trail which generates the "art". 
 * There are different parameters to play with such as the color likeness sensitivity, 
 * the velocity multiplier, and the color attraction multiplier. You can also choose to have the balls merge on 
 * collision or bounce off the walls.
 */
let cells = []
let old_cells = []
let new_circle = 0
let draft = null
let ballPicker
let bgPicker
let colorThreshold
let fadeTime
let playPause
let mergeBox
let speedSlider
let colorSlider
let blendSelector
let trails
let wallCheckbox
let saveButton
let clearButton
let showUI = true
let exportPending = false
let hasStarted = false
function setup () {
  cells.push(
    // new Cell(30, 10, 10, 10, '#0f4a9c', { x: 0, y: -3 }, cells),
    // new Cell(40, 120, 10, 10, '#2baa40', { x: -3, y: -2 }, cells),
    //new Cell(0, 0, 10, 10, '#aa2b2b', { x: 0, y: 0.1 }, cells),
    new Cell(-300, 0, 10, 10, '#2baa34', { x: 0.2, y: 0.5 }, cells),
    // new Cell(-10, 120, 10, 10, '#a8b915', { x: 3, y: -3 }, cells),
    new Cell(300, 0, 10, 10, '#1b5be4', { x: -0.2, y: -0.5 }, cells)
  )
  canvas = createCanvas(windowWidth, windowHeight)
  trails = createGraphics(width, height)
  //trails.background(255)
  canvas.mouseClicked(handleCanvasClick)
  colorThreshold = createInput(200)
  colorThreshold.position(10, 100)
  //fadeTime = createInput(300000)
  //fadeTime.position(10, 150)
  playPause = createButton('Paused', 'red')
  playPause.position(10, 170)
  playPause.mousePressed(playPausePressed)
  mergeBox = createCheckbox('Merge On Collision', true)
  mergeBox.position(10, 200)
  wallCheckbox = createCheckbox('Bouce Off Walls', true)
  wallCheckbox.position(10, 340)
  speedSlider = createSlider(0.1, 10, 1, 0.1)
  speedSlider.position(10, 240)
  colorSlider = createSlider(0.1, 10, 1, 0.1)
  colorSlider.position(10, 280)
  ballPicker = createColorPicker('deeppink')
  ballPicker.position(70, 10)
  bgPicker = createColorPicker('white')
  bgPicker.position(10, 10)
  saveButton = createButton('Save JPG')
  saveButton.position(10, 370)
  saveButton.mousePressed(saveImage)
  clearButton = createButton('Clear Balls')
  clearButton.position(100, 370)
  clearButton.mousePressed(clearBalls)

  blendSelector = createSelect()
  blendSelector.position(10, 310)
  blendSelector.option('Normal', BLEND)
  blendSelector.option(ADD)
  blendSelector.option(DARKEST)
  blendSelector.option(LIGHTEST)
  blendSelector.option(EXCLUSION)
  blendSelector.option(MULTIPLY)
  blendSelector.option(SCREEN)
  blendSelector.option(REPLACE)
  blendSelector.option(REMOVE)
  blendSelector.option(DIFFERENCE)
  blendSelector.option(OVERLAY)
  blendSelector.option(HARD_LIGHT)
  blendSelector.option(SOFT_LIGHT)
  blendSelector.option(DODGE)
  blendSelector.option(BURN)
}

function draw () {
  let mouse = worldMouse()
  background(bgPicker.value())
  image(trails, 0, 0)
  const drawUI = showUI && !exportPending
  translate(width / 2, height / 2)
  scale(1, -1)

  for (const [index, old_cell] of old_cells.entries()) {
    //old_cell.fade = Math.min(1, old_cell.fade + 1 / (fadeTime.value() * 60))
    push()
    blendMode(blendSelector.selected())
    noStroke()
    fill(lerpColor(color(old_cell.color), color(255), old_cell.fade))
    ellipse(old_cell.x, old_cell.y, old_cell.w, old_cell.h)
    pop()
    if (old_cell.fade >= 1) {
      old_cells.splice(index, 1)
    }
  }
  for (const cell of cells) {
    cell.draw()
  }
  if (draft !== null && !exportPending) {
    if (drawUI) {
      push()
      resetMatrix()
      const message = 'Hit Escape to leave draw mode'
      const boxWidth = textWidth(message) + 20
      noStroke()
      fill(255)
      rect(width / 2 - boxWidth / 2, 5, boxWidth, 22)
      fill(0)
      textAlign(CENTER)
      text(message, width / 2, 20)
      pop()
    }
    const diameter =
      draft.diameter ?? 2 * Math.hypot(mouse.x - draft.x, mouse.y - draft.y)

    if (draft.diameter !== null) {
      line(draft.x, draft.y, mouse.x, mouse.y)
    }
    push()
    ellipse(draft.x, draft.y, diameter, diameter)
    pop()
  }
  if (draft === null && !exportPending) {
    push()
    noFill()
    ellipse(mouse.x, mouse.y, 13)
    pop()
  }
  if (drawUI) {
    // drawn last so the panel sits on top of the cells
    push()
    resetMatrix()
    noStroke()
    fill(255)
    rect(0, 0, 280, 405)
    fill(0)
    text(" press 'h' to hide UI", 130, 30)
    textSize(18)
    text('BG', 10, 55)
    text('Ball', 70, 55)
    text('Color Likeness Sensitivity', 10, 90)
    // text('Fade Time (sec)', 10, 140)
    text(`Velocity Multiplier: ${speedSlider.value()}`, 10, 235)
    text(`Color Attraction Multiplier: ${colorSlider.value()}`, 10, 275)
    pop()
  }
  if (exportPending) {
    // this frame was drawn without UI, so save it now
    saveCanvas('generator-' + frameCount, 'jpg')
    exportPending = false
  }
}

function playPausePressed () {
  if (playPause.html() === 'Paused') {
    //noLoop()
    playPause.html('Playing')
    hasStarted = true
  } else {
    //loop()
    playPause.html('Paused')
  }
}

function worldMouse () {
  return {
    x: mouseX - width / 2,
    y: height / 2 - mouseY
  }
}
//I had written my own convoluted version of this. had chat gpt
// help me clean it up so it's more readable and implementable.
// my version of the code can be foudn in the git commits over time
// I fully understand how this works.
function handleCanvasClick () {
  const mouse = worldMouse()

  if (draft === null) {
    draft = { x: mouse.x, y: mouse.y, diameter: null, color: null }
    return
  }

  if (draft.diameter === null) {
    draft.diameter = 2 * Math.hypot(mouse.x - draft.x, mouse.y - draft.y)

    return
  }

  const dx = mouse.x - draft.x
  const dy = mouse.y - draft.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return // wait for a direction
  const chosenColor = ballPicker.value()
  const speed_scale = 10
  const velocity = {
    x: dx / speed_scale,
    y: dy / speed_scale
  }
  cells.push(
    new Cell(
      draft.x,
      draft.y,
      draft.diameter,
      draft.diameter,
      chosenColor,
      velocity,
      cells
    )
  )
  draft = null
}
function saveImage () {
  toggleUI()
  // defer the save to the next draw() so it renders without the UI
  exportPending = true
  toggleUI()
}

function clearBalls () {
  // empty in place: each Cell keeps a reference to this array
  cells.length = 0
  draft = null
  // before the first Play, also wipe the trails for a fresh start
  if (!hasStarted) {
    trails.clear()
  }
}

function toggleUI () {
  showUI = !showUI
  const controls = [
    colorThreshold,
    playPause,
    mergeBox,
    wallCheckbox,
    speedSlider,
    colorSlider,
    ballPicker,
    bgPicker,
    saveButton,
    clearButton,
    blendSelector
  ]
  for (const control of controls) {
    showUI ? control.show() : control.hide()
  }
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    draft = null
  }
  if (event.key === 'h' || event.key === 'H') {
    toggleUI()
  }
})
class Cell {
  /**
   *
   * @param {*} x x coord
   * @param {*} y y coord
   * @param {*} w ellipse width
   * @param {*} h ellipse height
   * @param {*} color
   * @param {*} velocity
   * @param {*} cells array of all of the cells that exist on the board
   */
  constructor (x, y, w, h, color, velocity, cells) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.color = color
    this.velocity = velocity
    this.cells = cells
    this.nearbyCells = new Set()
    this.area = PI * (w / 2) * (h / 2)
  }
  /**
   * Draw the cell
   */
  draw () {
    this.buildTrail()
    if (playPause.html() === 'Playing') {
      push()
      fill(this.color)
      let new_x = this.x + this.velocity.x * speedSlider.value()
      let new_y = this.y + this.velocity.y * speedSlider.value()
      ellipse(new_x, new_y, this.w, this.h)
      this.x = new_x
      this.y = new_y
      pop()
      this.checkSurroundings()
    }
  }
  /**
   * Builds the trail that goes behind each cell
   */
  buildTrail () {
    if (frameCount % 1 !== 0) return

    trails.push()
    trails.translate(width / 2, height / 2)
    trails.scale(1, -1)
    trails.blendMode(blendSelector.value())
    trails.noStroke()
    trails.fill(this.color)
    trails.ellipse(this.x, this.y, this.w, this.h)
    trails.pop()
  }
  /**
   * Checks for other cells nearby
   */
  checkSurroundings () {
    for (const other of this.cells) {
      if (other === this) continue

      const distance = Math.hypot(this.x - other.x, this.y - other.y)
      //console.log(distance)
      const touchingDistance = this.w / 2 + other.w / 2
      //   console.log(this.velocity)
      if (distance <= touchingDistance) {
        if (!this.nearbyCells.has(other)) {
          this.velocity.x *= -1
          this.velocity.y *= -1
          this.nearbyCells.add(other)

          //draw a red border for a frame when balls crash
          push()
          noFill()
          stroke('red')
          strokeWeight(5)
          line(width / 2, height / 2, width / 2, -height / 2)
          line(-width / 2, height / 2, width / 2, height / 2)
          line(width / 2, -height / 2, -width / 2, -height / 2)
          line(-width / 2, height / 2, -width / 2, -height / 2)
          pop()
          //merge the colliding cells
          if (mergeBox.checked()) {
            if (this.area >= other.area) {
              const newArea = this.area + other.area
              const newDiameter = 2 * Math.sqrt(newArea / PI)

              this.w = newDiameter
              this.h = newDiameter
              this.area = newArea
              this.color = this.getImpactColor(other.color, other.area)
              const index = cells.indexOf(other)
              if (index !== -1) cells.splice(index, 1)
            }
          }
        }
      } else {
        this.nearbyCells.delete(other)
      }
      // have the cells move towards each other based on how similar their colors
      // are and what their size is.
      let colorScale = this.colorDistance(this.color, other.color)
      if (colorScale > 0) {
        if (this.x > other.x) {
          this.velocity.x -= (colorScale / this.area) * colorSlider.value()
        }
        if (this.x < other.x) {
          this.velocity.x += (colorScale / this.area) * colorSlider.value()
        }
        if (this.y > other.y) {
          this.velocity.y -= (colorScale / this.area) * colorSlider.value()
        }
        if (this.y < other.y) {
          this.velocity.y += (colorScale / this.area) * colorSlider.value()
        }
      }
    }
    //bounce back if hitting edge of canvas
    // I originally had a rudimentary velocity reversing formula,
    // but I wanted something that would have it bounce off at the correct angle.
    // AI generated this code for me.
    if (wallCheckbox.checked()) {
      const halfW = this.w / 2
      const halfH = this.h / 2

      if (this.x + halfW >= width / 2) {
        this.x = width / 2 - halfW
        this.velocity.x = -Math.abs(this.velocity.x)
      } else if (this.x - halfW <= -width / 2) {
        this.x = -width / 2 + halfW
        this.velocity.x = Math.abs(this.velocity.x)
      }

      if (this.y + halfH >= height / 2) {
        this.y = height / 2 - halfH
        this.velocity.y = -Math.abs(this.velocity.y)
      } else if (this.y - halfH <= -height / 2) {
        this.y = -height / 2 + halfH
        this.velocity.y = Math.abs(this.velocity.y)
      }
    }
  }
  /**
   * Figure out what the new color is after impact. It's changed based on
   * The size differences between the cells
   * @param {*} otherColor
   * @param {*} otherArea
   * @returns
   */
  getImpactColor (otherColor, otherArea) {
    let areaRatio = otherArea / this.area
    let newColor = lerpColor(color(this.color), color(otherColor), areaRatio)
    return newColor
  }
  // Got this from the AI overview when
  // googling "p5 js how close colors are"
  colorDistance (c1, c2) {
    const distance = dist(
      red(c1),
      green(c1),
      blue(c1),
      red(c2),
      green(c2),
      blue(c2)
    )
    const threshold = Number(colorThreshold.value())
    if (threshold <= 0) return 0

    return Math.max(0, 1 - distance / threshold)
  }
}
