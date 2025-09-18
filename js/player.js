class Player {
    constructor(canvasHeight) {
        this.canvasHeight = canvasHeight;
        this.width = 50;
        this.height = 50;
        this.x = 50;
        this.y = this.canvasHeight - this.height;
        this.velocityY = 0;
        this.gravity = 0.8;
        this.jumpStrength = -20;
        this.isJumping = false;
        this.groundY = this.canvasHeight - this.height;
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = this.jumpStrength;
            // Play jump sound - Assuming you have an assets folder
            const jumpSound = new Audio('assets/sounds/jump.wav');
            jumpSound.play().catch(e => console.error("Could not play sound:", e));
        }
    }

    update() {
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Prevent falling through the ground
        if (this.y > this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.isJumping = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Player;