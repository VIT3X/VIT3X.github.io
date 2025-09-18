class Obstacle {
    constructor() {
        this.width = 20;
        this.height = 20;
        this.x = canvas.width; // Start off-screen
        this.y = canvas.height - this.height; // Align with ground
        this.speed = 6; // Speed of obstacle movement
        this.active = true; // To check if the obstacle is active
    }

    spawn() {
        this.x = canvas.width; // Reset position to the right edge
        this.active = true; // Mark obstacle as active
    }

    update() {
        if (this.active) {
            this.x -= this.speed; // Move obstacle to the left
            if (this.x + this.width < 0) {
                this.active = false; // Deactivate if it goes off-screen
            }
        }
    }

    draw(context) {
        if (this.active) {
            context.fillStyle = 'red'; // Color of the obstacle
            context.fillRect(this.x, this.y, this.width, this.height); // Draw the obstacle
        }
    }
}

export default Obstacle;