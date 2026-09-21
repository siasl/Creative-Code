class Circle{
    constructor(x, y, r, restitution = 0.6, friction = 0, color = 127) {
        this.x = x;
        this.y = y;
        this.r = r;
        let options = {
            friction,
            restitution
        }
        this.body = Bodies.circle(this.x, this.y, this.r,  options);
        this.color = color
        Composite.add(world, this.body);
    }

    show() {
        let pos = this.body.position;
        let angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        rectMode(CENTER);
        strokeWeight(1);
        stroke(255)
        fill(this.color);
        ellipse(0, 0, this.r*2);
        pop();
    }
}