let shapeChoice = 0;

function setup() {
  createCanvas(600, 500);
  
}
function circleA() {
  fill("black");
  stroke("black")
  quad(300, 250, 150, 250, -150, -420, 0, -420);
  //fill("green")
  quad(-300, 250, -150, 250, 150, -420, 0, -420);
  //fill("blue");
  circle(0, 155, 190);
}

function whiteSlash() {
  stroke("black");
  fill("black");
  quad(300, 250, 150, 250, -150, -420, 0, -420);
  //fill("green")
  quad(-300, 250, -150, 250, 150, -420, 0, -420);
  fill("white");
  stroke("white");
  quad(150, 250, 0, 250, -300, -420, -150, -420);
}

function draw() {
  background("white");
  fill("red")
  noStroke()
  text("Click the letter", 400,20)
  textSize(20)
  translate(width / 2, height / 2); //got this from gemini while working through getting text to show up. I learned about the lack of built in text when the canvas is in webGL mode. If it's in it's default 2d, mode, then text is built in. The issue is that the coordinate system changes, so this code fixes that.
 
  //circleA()
  if (shapeChoice ===0) {  whiteSlash();}
  else if (shapeChoice === 1) {circleA()}
  print(shapeChoice)
  //fill("blue");
  //print(frameCount);

  
}
function mouseClicked() {
  print("click")
  if(shapeChoice === 0){ shapeChoice = 1}
  else if(shapeChoice === 1){ shapeChoice = 0}
}
