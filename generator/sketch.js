//debugger
let cells = []
let old_cells = []
let new_circle = 0
let draft = null
let myPicker
function setup () {
  //myPicker = createColorPicker('deeppink')
  cells
    .push
    // new Cell(30, 10, 10, 10, '#0f4a9c', { x: 0, y: -3 }, cells),
    // new Cell(40, 120, 10, 10, '#2baa40', { x: -3, y: -2 }, cells),
    // new Cell(30, -120, 10, 10, '#aa2b2b', { x: 0, y: 2 }, cells),
    // new Cell(-10, 120, 10, 10, '#a8b915', { x: 3, y: -3 }, cells),
    // new Cell(-40, 230, 10, 10, '#e41bca', { x: 2, y: -1 }, cells)
    ()
  canvas = createCanvas(windowWidth, windowHeight)
  canvas.mouseClicked(handleCanvasClick)
}

function draw () {
  let mouse = worldMouse()

  background(255)
  translate(width / 2, height / 2)
  scale(1, -1)

  for (const [index, old_cell] of old_cells.entries()) {
    old_cell.fade = Math.min(1, old_cell.fade + 1 / 360)
    push()
    blendMode(DARKEST)
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
    //cell.checkSurroundings()
  }
  if (draft !== null) {
    const diameter =
      draft.diameter ?? 2 * Math.hypot(mouse.x - draft.x, mouse.y - draft.y)

    if (draft.diameter !== null) {
      line(draft.x, draft.y, mouse.x, mouse.y)
    }
    push()
    ellipse(draft.x, draft.y, diameter, diameter)
    pop()
  }
  if (draft === null) {
    push()
    noFill()
    ellipse(mouse.x, mouse.y, 13)
    pop()
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
    myPicker = createColorPicker('deeppink')
    myPicker.position(10, 10)
    return
  }
  // if (draft.color === null) {
  //   myPicker = createColorPicker('deeppink')
  //   myPicker.position(mouse.x, mouse.y)
  //   draft.color = myPicker.color
  //   return
  // }

  const dx = mouse.x - draft.x
  const dy = mouse.y - draft.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return // wait for a direction
  const chosenColor = myPicker.value()
  myPicker.remove()
  myPicker = null
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
    push()
    fill(this.color)
    let new_x = this.x + this.velocity.x
    let new_y = this.y + this.velocity.y
    ellipse(new_x, new_y, this.w, this.h)
    this.x = new_x
    this.y = new_y
    pop()
    this.checkSurroundings()
  }
  /**
   * Builds the trail that goes behind each cell
   */
  buildTrail () {
    if (frameCount % 1 === 0) {
      old_cells.push({
        x: this.x,
        y: this.y,
        w: this.w,
        h: this.h,
        color: this.color,
        fade: 0
      })
    }
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
      } else {
        this.nearbyCells.delete(other)
      }
      // have the cells move towards each other based on how similar their colors
      // are and what their size is.
      let colorScale = this.colorDistance(this.color, other.color)
			console.log(colorScale)
      if (colorScale < 100) {
        if (this.x > other.x) {
          this.velocity.x -= colorScale / this.area
        }
        if (this.x < other.x) {
          this.velocity.x += colorScale / this.area
        }
        if (this.y > other.y) {
          this.velocity.y -= colorScale / this.area
        }
        if (this.y < other.y) {
          this.velocity.y += colorScale / this.area
        }
      }
    }
    //bounce back if hitting edge of canvas
    // I originally had a rudimentary velocity reversing formula,
    // but I wanted something that would have it bounce off at the correct angle.
    // AI generated this code for me.
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
    let r1 = red(c1),
      g1 = green(c1),
      b1 = blue(c1)
    let r2 = red(c2),
      g2 = green(c2),
      b2 = blue(c2)

    // Returns a value from 0 (identical) to ~441.67 (opposite)
    let distance = dist(r1, g1, b1, r2, g2, b2)

    let tolerance = 200
    if (distance < tolerance) {
      return (tolerance - distance) / 100
    } else {
      return 1
    }
  }
}
