const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.width = 800;
canvas.height = 400;

let score = 0;
let gameOver = false;

const Player = new (require('./player.js')).Player();
const Obstacle = new (require('./obstacles.js')).Obstacle();

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '48px sans-serif';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Player.update();
    Obstacle.update();

    if (Obstacle.checkCollision(Player)) {
        gameOver = true;
    }

    score++;
    ctx.fillStyle = 'black';
    ctx.font = '24px sans-serif';
    ctx.fillText('Score: ' + score, 10, 30);

    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        Player.jump();
    }
});

gameLoop();