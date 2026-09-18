// a mix of AI assistance on this file and pulling from what I learned from boundary.js
class Cup {
  constructor (x, y, width = 120, height = 140, wallThickness = 12) {
    this.composite = Matter.Composite.create({
      label: 'Cup'
    })

    const options = {
      isStatic: true,
      restitution: 0.25,
      friction: 0.6
    }

    const bottom = Matter.Bodies.rectangle(
      x,
      y + height / 2,
      width,
      wallThickness,
      options
    )

    const leftWall = Matter.Bodies.rectangle(
      x - width / 2,
      y,
      wallThickness,
      height,
      options
    )

    const rightWall = Matter.Bodies.rectangle(
      x + width / 2,
      y,
      wallThickness,
      height,
      options
    )
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.wallThickness = wallThickness
    this.bottom = bottom
    this.leftWall = leftWall
    this.rightWall = rightWall

    Matter.Composite.add(this.composite, [bottom, leftWall, rightWall])
    Matter.Composite.add(world, this.composite)
  }

  show () {
    this.showBody(this.bottom, this.width, this.wallThickness)
    this.showBody(this.leftWall, this.wallThickness, this.height)
    this.showBody(this.rightWall, this.wallThickness, this.height)
  }

  showBody (body, width, height) {
    const pos = body.position
    const angle = body.angle

    push()
    translate(pos.x, pos.y)
    rotate(angle)
    rectMode(CENTER)
    fill(0)
    rect(0, 0, width, height)
    pop()
  }
}
