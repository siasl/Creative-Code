// Store every infinite line drawn by the sketch. Lines use the standard
// implicit equation ax + by + c = 0 rather than slope-intercept form.
let lines = [];

function setup() {
    // Match the drawing surface to the browser window.
    canvas = createCanvas(windowWidth, windowHeight);

    // Start with the two coordinate axes, then add three lines whose
    // endpoints will move smoothly in draw().
    lines.push(new Line(0, 1, 0)); // X-axis: a = 0, b != 0, c = 0
    lines.push(new Line(1, 0, 0)); // Y-axis: a != 0, b = 0, c = 0
    lines.push(new Line());
    lines.push(new Line());
    lines.push(new Line());
}

function draw() {
  clear();
  background(255, 235, 59);

  // After translate() below, the canvas spans this rectangle around (0, 0).
  let boundary = {x: -width / 2, y: -height / 2, w: width, h: height};

  // Rebuild each animated line from two noise-driven points. Each coordinate
  // uses a different rate so the lines drift organically instead of repeating
  // the same motion.
  for (let i = 2; i < lines.length; i ++) {
    let f = frameCount;
    let t0 = i + f * 0.00123, t1 = i + f * 0.00234, t2 = i + f * 0.00345, t3 = i + f * 0.00456;
    lines[i].fromTwoPoints({ x:signedNoise(t0) * 640, y: signedNoise(t1) * 640 }, { x:signedNoise(t2) * 640, y: signedNoise(t3) * 640 });
  }

  // Put the coordinate-system origin in the center of the canvas.
  translate(width / 2, height / 2);

  fill(255); stroke(0);

  // Draw each infinite line clipped to the visible canvas boundary.
  for (let i = 0; i < lines.length; i ++) {
    lines[i].draw(boundary);
  }

  // Check every unique pair of lines and mark its intersection, if one exists.
  for (let i = 0; i < lines.length; i ++) {
    for (let j = i + 1; j < lines.length; j ++) {
      let p = lines[i].getIntersectionPoint(lines[j]);
      if (p) {
        drawCircleMarker(p, 3);
      }
    }
  }
}

function signedNoise(x, y, z) {
  // p5.js noise() returns 0..1; remap it to -1..1 for motion on both axes.
  return (noise(x, y, z) - 0.5) * 2;
}

class Line {
  constructor(a, b, c) {
    // Coefficients for the implicit line equation: ax + by + c = 0.
    this.a = a;
    this.b = b;
    this.c = c;
  }

  fromTwoPoints(p0, p1) {
    // Derive the implicit-equation coefficients from two points on the line.
    let dx = p1.x - p0.x;
    let dy = p1.y - p0.y;
    this.a = dy;
    this.b = -dx;
    this.c = dx * p0.y - dy * p0.x;
    return this;
  }

  fromPointAndAngle(p0, angle) {
    // Convert the angle into a one-unit direction, then reuse fromTwoPoints().
    let p1 = {x: p0.x + cos(angle), y: p0.y + sin(angle)};
    return this.fromTwoPoints(p0, p1);
  }

  fromPointAndVector(p0, v) {
    // Treat v as a direction extending from p0.
    let p1 = {x: p0.x + v.x, y: p0.y + v.y};
    return this.fromTwoPoints(p0, p1);
  }

  intersects(o) {
    if (o instanceof Line) {
      // A zero determinant means the lines are parallel or coincident.
      let d = this.a * o.b - o.a * this.b;
      return d != 0.0;
    } else if (o instanceof LineSegment) {
      // The segment intersects when its endpoints lie on opposite sides of
      // this line (or when at least one endpoint lies directly on it).
      let t1 = this.a * o.p0.x + this.b * o.p0.y + this.c;
      let t2 = this.a * o.p1.x + this.b * o.p1.y + this.c;
      return t1 * t2 <= 0;
    }
    return undefined;
  }

  getIntersectionPoint(o) {
    if (o instanceof Line) {
      // Solve both implicit line equations with Cramer's rule.
      let d = this.a * o.b - o.a * this.b;
      if (d == 0.0) { return undefined; }
      let x = (this.b * o.c - o.b * this.c) / d;
      let y = (o.a * this.c - this.a * o.c) / d;
      return createVector(x, y);
    } else if (o instanceof LineSegment) {
      // First confirm the crossing occurs within the finite segment.
      if (!this.intersects(o)) { return undefined; }
      return this.getIntersectionPoint(o.toLine());
    }
    return undefined;
  }

  getAngle() {
    // (-b, a) is a direction vector that lies along this line.
    return atan2(this.a, -this.b);
  }

  getPerpendicular(p) {
    // Swap/negate the coefficients to rotate the line 90 degrees through p.
    return new Line(this.b, -this.a, this.a * p.y - this.b * p.x);
  }

  getParallel(p) {
    // Keep a and b (the direction) and choose c so the new line passes p.
    return new Line(this.a, this.b, -this.a * p.x - this.b * p.y);
  }

  getNearestPoint(p) {
    // The perpendicular projection of p onto this line is the nearest point.
    let l = this.getPerpendicular(p);
    return this.getIntersectionPoint(l);
  }

  draw(rect) {
    if (!rect) { rect = {x:0, y:0, w:0, h:0}}
    let l0, l1;

    // Choose opposite rectangle edges that this line is expected to cross.
    // More-vertical lines use the top/bottom edges; the rest use left/right.
    if (abs(this.a) > abs(this.b)) {
      l0 = new Line().fromTwoPoints({x:rect.x, y:rect.y}, {x:rect.x + width, y:rect.y});
      l1 = new Line().fromTwoPoints({x:rect.x, y:rect.y + height}, {x:rect.x + width,   y:height});
    } else {
        l0 = new Line().fromTwoPoints({x:rect.x, y:rect.y}, {x:rect.x, y:height});
      l1 = new Line().fromTwoPoints({x:rect.x + width, y:rect.y}, {x:rect.x + width, y:rect.y + height});
    }

    // Clip the infinite line to the chosen edges before drawing it.
    let p0 = this.getIntersectionPoint(l0);
    let p1 = this.getIntersectionPoint(l1);
    line(p0.x, p0.y, p1.x, p1.y);
  }
}

class LineSegment {
  constructor(x0, y0, x1, y1) {
    // Unlike Line, a segment is represented directly by its two endpoints.
    this.p0 = createVector(x0, y0);
    this.p1 = createVector(x1, y1);
  }

  fromTwoPoints(p0, p1) {
    this.p0 = p0;
    this.p1 = p1;
    return this;
  }

  fromTwoPointsAndLength(p0, p1, length) {
    this.p0 = p0;
    // Normalize the p0-to-p1 direction, then scale it to the requested length.
    let n = p1.copy().sub(p0).normalize();
    this.p1 = n.mult(length).add(p0);
    return this;
  }

  toLine() {
    // Return the infinite line that passes through both segment endpoints.
    return new Line().fromTwoPoints(this.p0, this.p1);
  }

  intersects(o) {
    if (o instanceof Line) {
      let t0 = o.a * this.p0.x + o.b * this.p0.y + o.c;
      let t1 = o.a * this.p1.x + o.b * this.p1.y + o.c;
      return t0 * t1 < 0;
    } else if (o instanceof LineSegment) {
      // Each segment must straddle the infinite line containing the other.
      return this.intersects(o.toLine()) && o.intersects(this.toLine());
    }
    return undefined;
  }

  getIntersectionPoint(o) {
    if (o instanceof Line) {
      if (!this.intersects(o)) { return undefined; }
      return o.getIntersectionPoint(this.toLine());
    } else if (o instanceof LineSegment) {
      if (!this.intersects(o)) { return undefined; }
      return o.toLine().getIntersectionPoint(this.toLine());
    }
    return undefined;
  }

  getAngle() {
    return atan2(this.p1.y - this.p0.y, this.p1.x - this.p0.x);
  }

  getLength() {
    return p0.dist(p1);
  }

  getNearestPoint(p) {
    // If the perpendicular projection falls beyond an endpoint, that endpoint
    // is nearest; otherwise, use the projection onto the segment's line.
    if (this.p1.copy().sub(this.p0).dot(p.copy().sub(this.p0)) < 0) return this.p0;
    if (this.p0.copy().sub(this.p1).dot(p.copy().sub(this.p1)) < 0) return this.p1;
    return this.toLine().getNearestPoint(p);
  }

  getBisection() {
    // The perpendicular bisector passes through the segment's midpoint.
    let o = this.getMidPoint();
    return this.toLine().getPerpendicular(o);
  }

  getMidPoint() {
    return this.p0.copy().add(this.p1).mult(0.5);
  }

  getPerpendicular(p) {
    return this.toLine().getPerpendicular(p);
  }

  getParallel(p) {
    return this.toLine().getParallel(p);
  }

  draw() {
    line(this.p0.x, this.p0.y, this.p1.x, this.p1.y);
  }
}

function drawCircleMarker(p, size) {
  // p5.js ellipse() accepts diameters, while callers provide a radius.
  ellipse(p.x, p.y, size * 2, size * 2);
}
