//debugger
let cells = []
let old_cells = []
let new_circle = 0
let draft = null
function setup () {
  cells.push(
    new Cell(30, 10, 10, 10, '#0f4a9c', { x: 0, y: -3 }, cells),
    new Cell(40, 120, 10, 10, '#2baa40', { x: -3, y: -2 }, cells),
    new Cell(30, -120, 10, 10, '#aa2b2b', { x: 0, y: 2 }, cells),
    new Cell(-10, 120, 10, 10, '#a8b915', { x: 3, y: -3 }, cells),
    new Cell(-40, 230, 10, 10, '#e41bca', { x: 2, y: -1 }, cells)
  )
  createCanvas(windowWidth, windowHeight)
}

function draw () {
  let mouse = worldMouse()

  background(255)
  translate(width / 2, height / 2)
  scale(1, -1)

  for (const [index, old_cell] of old_cells.entries()) {
    old_cell.fade = Math.min(1, old_cell.fade + 1 / 360)
    push()
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
  if (new_circle == 1) {
    for (const d_circ of drawing_circle) {
      ellipse(
        d_circ.x,
        d_circ.y,
        Math.hypot(2 * (d_circ.x - mouse.x), 2 * (d_circ.y - mouse.y))
      )
      console.log(d_circ.x, d_circ.y, mouse.x, mouse.y)
    }
  }
  if (new_circle == 2) {
    ellipse(drawing_circle[0].x, drawing_circle[0].y, drawing_circle[0].h)
    for (const d_line of drawing_line) {
      line(d_line.x1, d_line.y1, mouse.x, mouse.y)
    }
  }
}

function worldMouse () {
  return {
    x: mouseX - width / 2,
    y: height / 2 - mouseY
  }
}
function mouseClicked () {
  let mouse = worldMouse()
  if (new_circle == 0) {
    drawing_circle.push({
      x: mouse.x,
      y: mouse.y,
      size: 2
    })
  } else if (new_circle == 1) {
    drawing_circle[0].h = Math.hypot(
      2 * (drawing_circle[0].x - mouse.x),
      2 * (drawing_circle[0].y - mouse.y)
    )
    drawing_line.push({
      x1: drawing_circle[0].x,
      y1: drawing_circle[0].y,
      x2: mouse.x,
      y2: mouse.y
    })
  } else if (new_circle == 2) {
    cells.push(
      new Cell(
        drawing_circle[0].x,
        drawing_circle[0].y,
        drawing_circle[0].h,
        drawing_circle[0].h,
        '#0f4a9c',
        { x: 0, y: -3 },
        cells
      )
    )
  }

  new_circle += 1
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
    this.area = PI * w * h
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
            let new_area = this.area + other.area
            let new_r = sqrt(new_area / PI)
            this.w = new_r
            this.h = new_r
            this.area = PI * this.w * this.h
            this.color = this.getImpactColor(other.color, other.area)
            const index = cells.indexOf(other)
            if (index !== -1) cells.splice(index, 1)
            console.log('new r = ' + new_r)
          }
        }
      } else {
        this.nearbyCells.delete(other)
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
    return dist(r1, g1, b1, r2, g2, b2)
  }
}
