//debugger
let cells = []
let old_cells = []
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
  background(255)
  translate(width / 2, height / 2)

for (const [index, old_cell] of old_cells.entries()) {
    old_cell.fade =Math.min(1, old_cell.fade + 1 / 360)
    push()
    noStroke()
    fill(lerpColor(color(old_cell.color), color(255), old_cell.fade))
    ellipse(old_cell.x, old_cell.y, old_cell.w, old_cell.h)
    pop() 
    if(old_cell.fade >= 1){
        old_cells.splice(index,1)
    }
  }
  for (const cell of cells) {
    cell.draw()
    //cell.checkSurroundings()
  }
}

function mouseClicked () {
  cells.push(
    new Cell(
      mouseX - width / 2,
      mouseY - height / 2,
      10,
      10,
      '#0f4a9c',
      { x: 0, y: -3 },
      cells
    )
  )
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
    if (frameCount % 3 === 0) {
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
    if (
      this.x >= width / 2 ||
      this.x <= -1 * (width / 2) ||
      this.y >= height / 2 ||
      this.y <= -1 * (height / 2)
    ) {
      this.velocity.x *= -1
      this.velocity.y *= -1
    }
  }
}
