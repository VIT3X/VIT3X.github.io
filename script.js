// Získání přístupu k HTML prvkům
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

// --- HERNÍ NASTAVENÍ ---
const playerWidth = 50;
const playerHeight = 50;
const playerColor = '#3498db'; // Modrá barva hráče

const obstacleWidth = 30;
const obstacleColor = '#e74c3c'; // Červená barva překážek
const obstacleSpeed = 5;
const obstacleSpawnInterval = 120; // Jak často se objeví nová překážka (v počtu snímků)

const gravity = 0.6;
const jumpStrength = -12;
const groundHeight = canvas.height - playerHeight;

// --- HERNÍ PROMĚNNÉ ---
let playerY = groundHeight;
let playerYVelocity = 0;
let isJumping = false;
let obstacles = [];
let score = 0;
let frameCount = 0;
let gameOver = false;
let gameStarted = false;

// --- FUNKCE PRO KRESLENÍ ---

// Vykreslení hráče
function drawPlayer() {
    ctx.fillStyle = playerColor;
    ctx.fillRect(50, playerY, playerWidth, playerHeight);
}

// Vykreslení překážek
function drawObstacles() {
    ctx.fillStyle = obstacleColor;
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// --- FUNKCE PRO AKTUALIZACI STAVU HRY ---

// Aktualizace pozice hráče (skok, gravitace)
function updatePlayer() {
    playerYVelocity += gravity;
    playerY += playerYVelocity;

    // Zabrání pádu pod zem
    if (playerY > groundHeight) {
        playerY = groundHeight;
        playerYVelocity = 0;
        isJumping = false;
    }
}

// Aktualizace pozic překážek a jejich generování
function updateObstacles() {
    frameCount++;

    // Generování nové překážky v pravidelných intervalech
    if (frameCount % obstacleSpawnInterval === 0) {
        const obstacleHeight = Math.random() * 100 + 50; // Náhodná výška
        obstacles.push({
            x: canvas.width,
            y: canvas.height - obstacleHeight,
            width: obstacleWidth,
            height: obstacleHeight
        });
    }

    // Posun a mazání starých překážek
    let scoredThisFrame = false;
    obstacles.forEach((obstacle, index) => {
        obstacle.x -= obstacleSpeed;

        // Pokud překážka zmizí z obrazovky, smažeme ji
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
        
        // Zvýšení skóre, když hráč úspěšně přeskočí překážku
        if (obstacle.x + obstacle.width < 50 && !obstacle.scored) {
             if (!scoredThisFrame) { // Zajistí, že se skóre zvýší jen jednou za snímek
                score++;
                scoreElement.textContent = score;
                scoredThisFrame = true;
             }
             // Označíme překážku jako "obodovanou", abychom nepřičítali body vícekrát
             obstacle.scored = true;
        }
    });
}

// Detekce kolize mezi hráčem a překážkou
function checkCollision() {
    const playerX = 50;
    for (const obstacle of obstacles) {
        // Jednoduchá detekce kolize dvou obdélníků
        if (
            playerX < obstacle.x + obstacle.width &&
            playerX + playerWidth > obstacle.x &&
            playerY < obstacle.y + obstacle.height &&
            playerY + playerHeight > obstacle.y
        ) {
            gameOver = true;
        }
    }
}

// Zobrazení "Game Over" obrazovky
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '20px Arial';
    ctx.fillText('Stiskni MEZERNÍK pro novou hru', canvas.width / 2, canvas.height / 2 + 20);
}

// Resetování hry do původního stavu
function resetGame() {
    playerY = groundHeight;
    playerYVelocity = 0;
    isJumping = false;
    obstacles = [];
    score = 0;
    frameCount = 0;
    gameOver = false;
    gameStarted = true;
    scoreElement.textContent = score;
    gameLoop(); // Znovu spustíme herní smyčku
}

// --- OVLÁDÁNÍ ---
document.addEventListener('keydown', (e) => {
    // Skok po stisknutí mezerníku
    if (e.code === 'Space') {
        if (!gameStarted) {
            gameStarted = true;
            gameLoop();
        }
        if (gameOver) {
            resetGame();
        } else if (!isJumping) {
            playerYVelocity = jumpStrength;
            isJumping = true;
        }
    }
});

// --- HLAVNÍ HERNÍ SMYČKA ---
function gameLoop() {
    if (gameOver) {
        drawGameOver();
        return; // Zastavíme smyčku, pokud je konec hry
    }

    // 1. Vymazání plátna
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Aktualizace stavu
    updatePlayer();
    updateObstacles();
    checkCollision();

    // 3. Vykreslení prvků
    drawPlayer();
    drawObstacles();

    // Požádáme prohlížeč, aby spustil tuto funkci znovu při dalším snímku
    requestAnimationFrame(gameLoop);
}

// Zobrazí úvodní text
ctx.fillStyle = 'black';
ctx.font = '30px Arial';
ctx.textAlign = 'center';
ctx.fillText('Stiskni MEZERNÍK pro start', canvas.width / 2, canvas.height / 2);
