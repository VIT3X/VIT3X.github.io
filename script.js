const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeElement = document.getElementById('timeValue');

// --- HERNÍ NASTAVENÍ ---
const GRAVITY = 0.7;
const JUMP_STRENGTH = -15;
const FAST_FALL_GRAVITY = 1.8;
const GROUND_Y = canvas.height - 100; // Pozice země
const TRACK_DISTANCE = 5000; // Celková délka trati v pixelech

// --- Načítání obrázků ---
const assets = {
    playerSheet: new Image(),
    obstacle: new Image(),
    finishLine: new Image()
};
assets.playerSheet.src = 'assets/runner.png';
assets.obstacle.src = 'assets/prekazka.png';
assets.finishLine.src = 'assets/cil.png';

let assetsLoaded = 0;
const totalAssets = Object.keys(assets).length;
for (let key in assets) {
    assets[key].onload = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            init(); // Spustíme hru, až se vše načte
        }
    };
}

// --- Hráč ---
const player = {
    width: 100, // Šířka jednoho snímku animace
    height: 100, // Výška jednoho snímku
    x: 50,
    y: GROUND_Y - 100,
    velocityY: 0,
    speedX: 0,
    maxSpeed: 8,
    acceleration: 0.05,
    onGround: true,
    // Animace
    frameCount: 8, // Počet snímků ve sprite sheetu
    currentFrame: 0,
    frameSpeed: 4, // Jak rychle se mění animace (nižší = rychlejší)
    frameCounter: 0
};

// --- HERNÍ STAV ---
let gameState = 'loading'; // stavy: loading, ready, running, finished
let worldOffsetX = 0;
let obstacles = [];
let startTime = 0;
let finalTime = 0;
let keys = {};

// --- Vstup od hráče ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });


function generateObstacles() {
    let currentPos = 500;
    while(currentPos < TRACK_DISTANCE) {
        obstacles.push({
            x: currentPos,
            y: GROUND_Y - 80, // Výška překážky 80px
            width: 80,
            height: 80
        });
        currentPos += 400 + Math.random() * 400; // Náhodný rozestup
    }
}

function startSequence() {
    gameState = 'ready';
    let countdown = ["READY...", "SET...", "GO!"];
    let i = 0;

    function showNext() {
        if (i < countdown.length) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawWorld();
            drawPlayer();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 80px Segoe UI';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.strokeText(countdown[i], canvas.width / 2, canvas.height / 2);
            ctx.fillText(countdown[i], canvas.width / 2, canvas.height / 2);
            i++;
            setTimeout(showNext, 1000);
        } else {
            gameState = 'running';
            startTime = performance.now();
            gameLoop();
        }
    }
    showNext();
}

function update() {
    if (gameState !== 'running') return;

    // --- Pohyb a zrychlení hráče ---
    if (player.onGround) {
        if (player.speedX < player.maxSpeed) {
            player.speedX += player.acceleration;
        }
    }
    worldOffsetX += player.speedX;

    // --- Skákání ---
    if (keys['Space'] && player.onGround) {
        player.velocityY = JUMP_STRENGTH;
        player.onGround = false;
    }
    
    // Aplikace gravitace
    player.velocityY += keys['Space'] ? GRAVITY : FAST_FALL_GRAVITY;
    player.y += player.velocityY;

    // Detekce země
    if (player.y + player.height > GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.onGround = true;
    }

    // --- Animace hráče ---
    player.frameCounter++;
    if (player.onGround && player.frameCounter >= player.frameSpeed) {
        player.currentFrame = (player.currentFrame + 1) % player.frameCount;
        player.frameCounter = 0;
    }

    // --- Kolize s překážkami ---
    obstacles.forEach(obs => {
        const playerLeft = player.x;
        const playerRight = player.x + player.width - 20; // -20 pro přesnější kolizi
        const obsLeft = obs.x - worldOffsetX;
        const obsRight = obs.x + obs.width - worldOffsetX;

        if (playerRight > obsLeft && playerLeft < obsRight && player.y + player.height > obs.y) {
            player.speedX *= 0.8; // Zpomalení při kolizi
        }
    });
    
    // --- Cíl ---
    if (worldOffsetX + player.x > TRACK_DISTANCE) {
        gameState = 'finished';
        finalTime = (performance.now() - startTime) / 1000;
    }
    
    // Aktualizace času
    const currentTime = (performance.now() - startTime) / 1000;
    timeElement.textContent = currentTime.toFixed(2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Kreslení světa
    drawWorld();
    
    // Kreslení překážek a cíle
    obstacles.forEach(obs => {
        ctx.drawImage(assets.obstacle, obs.x - worldOffsetX, obs.y, obs.width, obs.height);
    });
    ctx.drawImage(assets.finishLine, TRACK_DISTANCE - worldOffsetX, GROUND_Y - 200, 50, 200);

    // Kreslení hráče
    drawPlayer();

    // Konec hry
    if (gameState === 'finished') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'gold';
        ctx.font = 'bold 60px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('CÍL!', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '40px Segoe UI';
        ctx.fillText(`Tvůj čas: ${finalTime.toFixed(2)}s`, canvas.width / 2, canvas.height / 2 + 40);
    }
}

function drawPlayer() {
    const frameX = player.currentFrame * player.width;
    ctx.drawImage(assets.playerSheet, frameX, 0, player.width, player.height, player.x, player.y, player.width, player.height);
}

function drawWorld() {
    // Tráva
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    // Tartanová dráha
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(0, GROUND_Y - 20, canvas.width, 20);
}

function gameLoop() {
    update();
    draw();
    if (gameState === 'running') {
        requestAnimationFrame(gameLoop);
    }
}

function init() {
    generateObstacles();
    gameState = 'initial';
    draw(); // Vykreslíme úvodní stav
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Stiskni MEZERNÍK pro start', canvas.width / 2, canvas.height / 2);

    // Čekáme na první stisk mezerníku pro spuštění odpočtu
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && gameState === 'initial') {
            startSequence();
        }
    }, { once: true }); // event se spustí jen jednou
}
