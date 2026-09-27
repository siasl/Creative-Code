let lines = []
function setup () {
  canvas = createCanvas(windowWidth, windowHeight)
  let newLine
}
function draw () {
  background('white')
  fill(0)
  strokeWeight(4)
  // for (let x = width / 7; x <= (6 / 7) * width; x += 0.1 * width) {
  //   //push()
  //   //strokeWeight(noise(50 * frameCount))
  //   newLine = line(x, height / 7, x, (6 / 7) * height)
  //   lines.push(newLine)
  //   //pop()
  // }
  // for (let y = height / 7; y <= (6 / 7) * height; y += 0.1 * height) {
  //   newLine = line(width / 7, y, (6 / 7) * width, y)
  //   lines.push(newLine)
  // }
  textSize(120)
  
  text("Silas", width/2, height/2)
}
