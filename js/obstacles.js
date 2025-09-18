class Obstacle {
    constructor(canvasWidth, canvasHeight) {
        this.width = 20;
        this.height = 40;
        this.x = canvasWidth;
        this.y = canvasHeight - this.height;
        this.speed = 6;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    isOffscreen() {
        return this.x + this.width < 0;
    }

    checkCollision(player) {
        // Simple AABB collision detection
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
}

export default Obstacle;