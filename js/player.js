class Player {
    constructor() {
        this.position = 0; // Initial position of the player
        this.isJumping = false; // State of the player
        this.jumpHeight = 100; // Height of the jump
        this.gravity = 5; // Gravity effect
        this.currentJumpHeight = 0; // Current jump height
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.currentJumpHeight = this.jumpHeight;
            // Play jump sound
            const jumpSound = new Audio('assets/sounds/jump.wav');
            jumpSound.play();
        }
    }

    update() {
        if (this.isJumping) {
            this.position -= this.currentJumpHeight; // Move up
            this.currentJumpHeight -= this.gravity; // Apply gravity

            if (this.currentJumpHeight <= 0) {
                this.isJumping = false; // Reset jump state
                this.currentJumpHeight = 0;
            }
        } else {
            if (this.position < 0) {
                this.position += this.gravity; // Fall down
            }
        }
    }
}

export default Player;