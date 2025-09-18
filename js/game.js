import Player from './player.js';
import Obstacle from './obstacles.js';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.width = 800;
canvas.height = 400;

let player;
let obstacles;
let score;
let gameOver;
let obstacleTimer;
let gameSpeed;

function init() {
    player = new Player(canvas.height);
    obstacles = [];
    score = 0;
    gameOver = false;
    obstacleTimer = 0;
    gameSpeed = 6; // Initial speed
    
    // Clear any existing obstacles
    obstacles.length = 0;

    // Start the game loop
    gameLoop();
}


function spawnObstacle() {
    const newObstacle = new Obstacle(canvas.width, canvas.height);
    newObstacle.speed = gameSpeed;
    obstacles.push(newObstacle);
}

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px sans-serif';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press Space to Restart', canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw player
    player.update();
    player.draw(ctx);

    // Spawn and manage obstacles
    obstacleTimer++;
    // Spawn a new obstacle at random intervals
    if (obstacleTimer > 90 + Math.random() * 50) {
        spawnObstacle();
        obstacleTimer = 0;
        // Increase speed over time
        gameSpeed += 0.1;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.update();
        obstacle.draw(ctx);

        if (obstacle.checkCollision(player)) {
            gameOver = true;
        }

        if (obstacle.isOffscreen()) {
            obstacles.splice(i, 1);
        }
    }

    // Update and draw score
    score += 0.1;
    ctx.fillStyle = 'black';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + Math.floor(score), 10, 30);

    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (gameOver) {
            init(); // Restart the game
        } else {
            player.jump();
        }
    }
});

// Start the game for the first time
init();