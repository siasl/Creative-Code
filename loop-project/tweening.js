// Tracks elapsed animation time and the timestamp of the previous frame.
let msec = 0, prevNow = 0;
let tween, tweens;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    tween = new Tween();

    // Each entry pairs an easing function with the name shown under the graph.
    // The arrow functions supply an exponent to the configurable power easings.
    tweens = [
      {func:tween.linear , label: "linear"},
      {func:(t)=>{return tween.powerIn(t,2);} , label: "powerIn(2)"},
      {func:(t)=>{return tween.powerOut(t,2);} , label: "powerOut(2)"},
      {func:(t)=>{return tween.powerInOut(t,2);} , label: "powerInOut(2)"},
      {func:(t)=>{return tween.powerIn(t,3);} , label: "powerIn(3)"},
      {func:(t)=>{return tween.powerOut(t,3);} , label: "powerOut(3)"},
      {func:(t)=>{return tween.powerInOut(t,3);} , label: "powerInOut(3)"},
      {func:tween.sineIn , label: "sineIn"},
      {func:tween.sineOut , label: "sineOut"},
      {func:tween.circularIn , label: "circularIn"},
      {func:tween.circularOut , label: "circularOut"},
      {func:tween.circularInOut , label: "circularInOut"},
      {func:tween.createCubicBezier({x:0.4, y: 0.0}, {x:0.2, y: 1}), label:"bezier([0.2,0.8],[0.6,0.4])"}
    ];

}

function draw() {
  clear();
  background(29, 223, 182);
  ellapseTime();

  // Show each easing for one second, with a half-second pause between cycles.
  let duration = 1000, interval = 500;

  // Convert elapsed time into normalized progress and select the current easing.
  let t = (msec % (duration + interval) - interval / 2) / duration;
  let i = Math.floor(msec / (duration + interval)) % tweens.length;
  // Easing functions expect progress to stay between 0 and 1.
  t = Math.min(1, Math.max(0, t));

  // Make the canvas center the origin for the graph-drawing code.
  push();
  translate(width / 2, height / 2);
  plot(0, 0, tweens[i].func, tweens[i].label, t);
  pop();
}

function ellapseTime() {
  // Cap large frame gaps so returning to the tab does not jump the animation.
  msec += min(100, window.performance.now() - prevNow);
  prevNow = window.performance.now();
}

function plot(cx, cy, func, label, t) {
  // The graph fills 80% of the canvas height and is centered on the origin.
  let w = height * 0.8, h = height * 0.8;
  let graphLeft = -w / 2, graphBottom = h / 2;
  let resolution = w / 2;
  noFill(); stroke(0);

  // Sample the easing from x=0 to x=1 to draw its complete curve.
  beginShape();
  for (let i = 0; i <= resolution; i ++) {
    let x = i / resolution;
    vertex(graphLeft + w * x, graphBottom - h * func(x));
  }
  endShape();

  // Evaluate the easing at the current progress and draw crosshairs to it.
  let x = graphLeft + w * t, y = graphBottom - h * func(t);
  rect(graphLeft, graphBottom - h, w, h);
  line(graphLeft, y, graphLeft + w, y);
  line(x, graphBottom, x, graphBottom - h);
  fill(255); stroke(0);

  drawCircleMarker(createVector(x, y), 4);
  fill(0); noStroke(0);
  drawLabel(graphLeft, graphBottom + 20, label, LEFT);
  drawLabel(graphLeft + w, graphBottom + 20, "t", RIGHT);
  drawLabel(graphLeft, graphBottom - h + 16, "f(t)", RIGHT);
}

class Tween {
  // All easing methods map normalized time t (0..1) to progress (0..1).
  linear(t) {
    t = max(0, min(t, 1));
    return t;
  }

  powerIn(t, a = 2) {
    // A larger exponent produces a slower start and sharper acceleration.
    t = max(0, min(t, 1));
    return pow(t, a);
  }

  powerOut(t, a = 2) {
    // Reverse powerIn so motion starts quickly and slows near the end.
    t = 1.0 - max(0, min(t, 1));
    return 1.0 - pow(t, a);
  }

  powerInOut(t, a = 2) {
    // Use powerIn for the first half and its mirror image for the second.
    t = max(0, min(t, 1));
    if (t < 0.5) {
      return pow(t * 2, a) * 0.5;
    } else {
      return 1.0 - pow((1 - t) * 2, a) * 0.5;
    }
  }

  sineIn(t) {
    t = 1.0 - max(0, min(t, 1));
    return 1.0 - sin(t * PI * 0.5);
  }

  sineOut(t) {
    return sin(t * PI * 0.5);
  }

  sineInOut(t) {
    t = max(0, min(t, 1));
    return sin((t - 0.5) * PI) * 0.5 + 0.5;
  }

  circularIn(t) {
    t = max(0, min(t, 1));
    return sqrt(1 - (1 - t) * (1- t));
  }

  circularOut(t) {
    t = max(0, min(t, 1));
    return 1 - sqrt(1 - (t) * (t));
  }

  circularInOut(t) {
    t = max(0, min(t, 1));

    if (t < 0.5) {
      t *= 2;
      return 0.5 - sqrt(1 - (t) * (t)) * 0.5;
    } else {
      t = (t - 0.5) * 2;
      return 0.5 + sqrt(1 - (1 - t) * (1 - t)) * 0.5;
    }
  }

  createCubicBezier(a, b, resolution = 40) {
    // Pre-sample the Bezier curve into a lookup table. The curve always starts
    // at (0, 0) and ends at (1, 1); a and b are its two control points.
    let buff = [];

    let n = 0;
    let i = 0;
    // Step along the curve parameter n and record y whenever x passes the next
    // evenly spaced time sample. Oversampling makes the lookup more accurate.
    while (i <= resolution && n <= resolution * 10) {
      let x = 3*(1-n)*(1-n)*n * a.x + 3*(1-n)*n*n * b.x + n*n*n;
      if (x > i / resolution) {
        let y = 3*(1-n)*(1-n)*n * a.y + 3*(1-n)*n*n * b.y + n*n*n;
        buff.push(y);
        i ++;
      }
      n += 1 / resolution / 10;
    }

    // Return an easing function that interpolates between nearby samples.
    return (t)=>{
      t = max(0, min(t, 1));
      let ti = floor(t * resolution);
      let tr = t * resolution - ti;

      if (ti >= buff.length - 1) {
          return buff[ti];
      } else {
          return buff[ti] * (1-tr) + buff[ti + 1] * tr;
      }

      return 1;
    }
  }
}

function drawCircleMarker(p, size) {
  // p5's ellipse size is a diameter, while this helper accepts a radius.
  ellipse(p.x, p.y, size * 2, size * 2);
}

function drawLabel(x, y, label, align = CENTER) {
  // Keep labels from touching the graph edge when left- or right-aligned.
  push();
  strokeWeight(0);
  textFont("monospace");
  textSize(14);
  textAlign(align);
  if (align == LEFT) {x += 6;}
  if (align == RIGHT) {x -= 6;}
  text(label, x, y);
  pop();
}
