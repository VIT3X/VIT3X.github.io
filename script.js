const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeElement = document.getElementById('timeValue');

// --- Responsive canvas setup ---
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const maxWidth = Math.min(window.innerWidth - 20, 1000);
    const maxHeight = Math.min(window.innerHeight * 0.6, 500);
    
    // Zachováme poměr stran 2:1
    let newWidth = maxWidth;
    let newHeight = maxWidth * 0.5;
    
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * 2;
    }
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    
    // Nastavíme vnitřní rozlišení canvasu
    canvas.width = 1000;
    canvas.height = 500;
}

// Spustíme resize při načtení a změně velikosti okna
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Debug - zkontrolujeme jestli se elementy načetly
console.log('Canvas:', canvas);
console.log('Context:', ctx);
console.log('Time element:', timeElement);

if (!canvas || !ctx) {
    console.error('Canvas se nenačetl správně!');
}

// --- HERNÍ NASTAVENÍ ---
const GRAVITY = 0.8;
const JUMP_STRENGTH = -16;
const FAST_FALL_GRAVITY = 2.0;
const GROUND_Y = canvas.height - 80; // Pozice země
const TRACK_DISTANCE = 6000; // Celková délka trati v pixelech

// --- Barvy pro atleta ---
const RUNNER_COLORS = {
    skin: '#FFDBAC',
    shirt: '#FF4444',
    shorts: '#2222FF',
    shoes: '#333333',
    hair: '#8B4513'
};

// --- Hráč ---
const player = {
    width: 60,
    height: 80,
    x: 100,
    y: GROUND_Y - 80,
    velocityY: 0,
    speedX: 0,
    maxSpeed: 10,
    acceleration: 0.08,
    onGround: true,
    // Animace
    frameCount: 8, // Počet snímků běžecké animace
    currentFrame: 0,
    frameSpeed: 3, // Jak rychle se mění animace
    frameCounter: 0,
    // Stav animace
    isJumping: false,
    jumpFrame: 0
};

// --- HERNÍ STAV ---
let gameState = 'initial'; // stavy: initial, countdown, running, finished
let worldOffsetX = 0;
let obstacles = [];
let startTime = 0;
let finalTime = 0;
let keys = {};
let countdownIndex = 0;
let countdownTimer = 0;

// --- Mobilní detekce ---
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
let isJumping = false; // Pro touch ovládání

// --- Vstup od hráče ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Touch ovládání pro mobily ---
let touchStartY = 0;
let isTouching = false;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartY = e.touches[0].clientY;
    isTouching = true;
    isJumping = true;
    
    // Pokud je hra v initial stavu, spustíme ji
    if (gameState === 'initial') {
        startSequence();
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
    isJumping = false;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// --- Click ovládání pro desktop/tablet ---
canvas.addEventListener('mousedown', (e) => {
    isJumping = true;
    if (gameState === 'initial') {
        startSequence();
    }
});

canvas.addEventListener('mouseup', (e) => {
    isJumping = false;
});

// Zabráníme scrollování na mobilu
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// --- Funkce pro kreslení běžce ---
function drawRunner(x, y, frame, isJumping = false) {
    ctx.save();
    ctx.translate(x + player.width/2, y + player.height);
    
    // Výpočet animace běhu
    const runCycle = frame / player.frameCount;
    const legAngle = Math.sin(runCycle * Math.PI * 2) * 0.6;
    const armAngle = Math.sin(runCycle * Math.PI * 2 + Math.PI) * 0.4;
    
    // Hlavní tělo
    ctx.fillStyle = RUNNER_COLORS.shirt;
    ctx.fillRect(-15, -65, 30, 35);
    
    // Hlava
    ctx.fillStyle = RUNNER_COLORS.skin;
    ctx.beginPath();
    ctx.arc(0, -75, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Vlasy
    ctx.fillStyle = RUNNER_COLORS.hair;
    ctx.beginPath();
    ctx.arc(0, -80, 10, 0, Math.PI);
    ctx.fill();
    
    if (isJumping) {
        // Skákající pozice - nohy pokrčené
        // Levá noha
        ctx.save();
        ctx.rotate(-0.3);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-8, -30, 8, 20);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(-8, -45, 8, 15);
        ctx.restore();
        
        // Pravá noha
        ctx.save();
        ctx.rotate(0.2);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(0, -25, 8, 20);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(0, -40, 8, 15);
        ctx.restore();
        
        // Ruce nahoru
        ctx.save();
        ctx.rotate(-0.5);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-25, -60, 20, 8);
        ctx.restore();
        
        ctx.save();
        ctx.rotate(0.5);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(5, -60, 20, 8);
        ctx.restore();
    } else {
        // Běžecká animace
        // Levá noha
        ctx.save();
        ctx.rotate(legAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-8, -30, 8, 25);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(-8, -45, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-10, -8, 12, 8);
        ctx.restore();
        
        // Pravá noha
        ctx.save();
        ctx.rotate(-legAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(0, -30, 8, 25);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(0, -45, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-2, -8, 12, 8);
        ctx.restore();
        
        // Levá ruka
        ctx.save();
        ctx.rotate(armAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-25, -55, 20, 8);
        ctx.restore();
        
        // Pravá ruka
        ctx.save();
        ctx.rotate(-armAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(5, -55, 20, 8);
        ctx.restore();
    }
    
    ctx.restore();
}

// --- Funkce pro kreslení překážky ---
function drawHurdle(x, y, width, height) {
    ctx.fillStyle = '#FFD700'; // Zlatá barva
    
    // Levá noha překážky
    ctx.fillRect(x, y + height - 20, 8, 20);
    ctx.fillRect(x, y, 8, height - 40);
    
    // Pravá noha překážky
    ctx.fillRect(x + width - 8, y + height - 20, 8, 20);
    ctx.fillRect(x + width - 8, y, 8, height - 40);
    
    // Horní lišta
    ctx.fillRect(x, y, width, 8);
    
    // Příčky
    for (let i = 1; i <= 3; i++) {
        ctx.fillRect(x + 5, y + (height / 4) * i, width - 10, 4);
    }
    
    // Stín
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + 5, y + height + 2, width, 8);
}

// --- Funkce pro kreslení cílové čáry ---
function drawFinishLine(x, y) {
    // Sloupek
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y - 150, 10, 150);
    
    // Banner
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - 30, y - 150, 70, 30);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', x + 5, y - 135);
    
    // Cílová čára na zemi
    for (let i = 0; i < 100; i += 10) {
        ctx.fillStyle = i % 20 === 0 ? '#FFFFFF' : '#000000';
        ctx.fillRect(x - 2, y + i, 14, 10);
    }
}


function generateObstacles() {
    obstacles = [];
    let currentPos = 800; // První překážka dále
    let hurdleCount = 0;
    const maxHurdles = 10;
    
    while(currentPos < TRACK_DISTANCE - 500 && hurdleCount < maxHurdles) {
        obstacles.push({
            x: currentPos,
            y: GROUND_Y - 60, // Výška překážky
            width: 60,
            height: 60
        });
        currentPos += 350 + Math.random() * 200; // Rozestup překážek
        hurdleCount++;
    }
}

function startSequence() {
    gameState = 'countdown';
    countdownIndex = 0;
    countdownTimer = 0;
    
    function updateCountdown() {
        const messages = ["READY", "SET", "GO!"];
        const delays = [1000, 1000, 800]; // Milisekundy pro každou fázi
        
        if (countdownIndex < messages.length) {
            // Vykreslení countdown zprávy
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawWorld();
            drawPlayer();
            
            // Velký text countdown
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = countdownIndex === 2 ? '#00FF00' : '#FFFFFF';
            ctx.font = 'bold 120px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.strokeText(messages[countdownIndex], canvas.width / 2, canvas.height / 2);
            ctx.fillText(messages[countdownIndex], canvas.width / 2, canvas.height / 2);
            
            setTimeout(() => {
                countdownIndex++;
                if (countdownIndex < messages.length) {
                    updateCountdown();
                } else {
                    gameState = 'running';
                    startTime = performance.now();
                    gameLoop();
                }
            }, delays[countdownIndex]);
        }
    }
    updateCountdown();
}

function update() {
    if (gameState !== 'running') return;

    // --- Pohyb a zrychlení hráče (jen na zemi!) ---
    if (player.onGround) {
        if (player.speedX < player.maxSpeed) {
            player.speedX += player.acceleration;
        }
        player.isJumping = false;
    } else {
        // Ve vzduchu se nezrychluje
        player.isJumping = true;
    }
    
    worldOffsetX += player.speedX;

    // --- Vylepšené skákání (klávesnice nebo touch) ---
    const jumpInput = keys['Space'] || isJumping;
    
    if (jumpInput && player.onGround) {
        player.velocityY = JUMP_STRENGTH;
        player.onGround = false;
        player.isJumping = true;
    }
    
    // Gravitace - rychlejší pád když nepodržíme vstup
    const gravityToUse = jumpInput && player.velocityY < 0 ? GRAVITY : FAST_FALL_GRAVITY;
    player.velocityY += gravityToUse;
    player.y += player.velocityY;

    // Detekce země
    if (player.y + player.height > GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.onGround = true;
        player.isJumping = false;
    }

    // --- Animace hráče (jen při běhu na zemi) ---
    if (player.onGround) {
        player.frameCounter++;
        if (player.frameCounter >= player.frameSpeed) {
            player.currentFrame = (player.currentFrame + 1) % player.frameCount;
            player.frameCounter = 0;
        }
    }

    // --- Kolize s překážkami ---
    obstacles.forEach(obs => {
        const playerLeft = player.x + 15; // Přesnější hitbox
        const playerRight = player.x + player.width - 15;
        const obsLeft = obs.x - worldOffsetX;
        const obsRight = obs.x + obs.width - worldOffsetX;

        if (playerRight > obsLeft && playerLeft < obsRight && 
            player.y + player.height > obs.y + 10) { // Trochu tolerance
            player.speedX *= 0.7; // Větší zpomalení při kolizi
            // Malý odraz zpět
            if (player.onGround) {
                player.velocityY = -8;
                player.onGround = false;
            }
        }
    });
    
    // --- Cíl ---
    if (worldOffsetX + player.x > TRACK_DISTANCE) {
        gameState = 'finished';
        finalTime = (performance.now() - startTime) / 1000;
    }
    
    // Aktualizace času
    if (gameState === 'running') {
        const currentTime = (performance.now() - startTime) / 1000;
        timeElement.textContent = currentTime.toFixed(2);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Kreslení světa
    drawWorld();
    
    // Kreslení překážek
    obstacles.forEach(obs => {
        const screenX = obs.x - worldOffsetX;
        if (screenX > -100 && screenX < canvas.width + 100) { // Optimalizace - kreslí jen viditelné
            drawHurdle(screenX, obs.y, obs.width, obs.height);
        }
    });
    
    // Kreslení cílové čáry
    const finishX = TRACK_DISTANCE - worldOffsetX;
    if (finishX > -100 && finishX < canvas.width + 100) {
        drawFinishLine(finishX, GROUND_Y);
    }

    // Kreslení hráče
    drawPlayer();

    // Konec hry
    if (gameState === 'finished') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText('CÍL!', canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillText('CÍL!', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px Arial';
        ctx.strokeText(`Čas: ${finalTime.toFixed(2)}s`, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText(`Čas: ${finalTime.toFixed(2)}s`, canvas.width / 2, canvas.height / 2 + 30);
        
        // Hodnocení času
        let rating = '';
        if (finalTime < 20) rating = '🏆 MISTROVSKÝ ČAS!';
        else if (finalTime < 25) rating = '🥇 VÝBORNÝ ČAS!';
        else if (finalTime < 30) rating = '🥈 DOBRÝ ČAS!';
        else rating = '🥉 ZKUS TO ZNOVU!';
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(rating, canvas.width / 2, canvas.height / 2 + 80);
    }
}

function drawPlayer() {
    drawRunner(player.x, player.y, player.currentFrame, player.isJumping);
}

function drawWorld() {
    // Nebe s gradientem
    const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, GROUND_Y);
    
    // Atletická dráha
    ctx.fillStyle = '#8B4513'; // Hnědá země
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    
    // Tartanová dráha (červená)
    ctx.fillStyle = '#CC2222';
    ctx.fillRect(0, GROUND_Y - 5, canvas.width, 5);
    
    // Běhací dráhy (bílé čáry)
    for (let i = 0; i < 4; i++) {
        const laneY = GROUND_Y + 20 + i * 30;
        if (laneY < canvas.height) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, laneY, canvas.width, 2);
        }
    }
    
    // Startovní bloky na začátku
    if (worldOffsetX < 200) {
        ctx.fillStyle = '#333333';
        const blockX = 50 - worldOffsetX;
        ctx.fillRect(blockX, GROUND_Y - 15, 30, 15);
        ctx.fillRect(blockX + 5, GROUND_Y - 25, 20, 10);
    }
    
    // Značky vzdálenosti
    for (let dist = 0; dist < TRACK_DISTANCE; dist += 1000) {
        const markerX = dist - worldOffsetX;
        if (markerX > -50 && markerX < canvas.width + 50) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(markerX, GROUND_Y - 10, 3, 10);
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${dist/100}m`, markerX, GROUND_Y - 15);
        }
    }
    
    // Tribuna v pozadí (jednoduché)
    ctx.fillStyle = '#666666';
    ctx.fillRect(-50, GROUND_Y - 250, canvas.width + 100, 100);
    ctx.fillStyle = '#444444';
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.fillRect(i, GROUND_Y - 240, 15, 80);
    }
}

function gameLoop() {
    update();
    draw();
    if (gameState === 'running') {
        requestAnimationFrame(gameLoop);
    }
}

function init() {
    try {
        console.log('Inicializace hry...');
        generateObstacles();
        gameState = 'initial';
        draw(); // Vykreslíme úvodní stav
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText('ATLETICKÝ BĚH S PŘEKÁŽKAMI', canvas.width / 2, canvas.height / 2 - 60);
        ctx.fillText('ATLETICKÝ BĚH S PŘEKÁŽKAMI', canvas.width / 2, canvas.height / 2 - 60);
        
        // Různé instrukce pro mobil a desktop
        ctx.font = 'bold 30px Arial';
        const startText = isMobile ? 'Dotkni se obrazovky pro start' : 'Stiskni MEZERNÍK pro start';
        ctx.strokeText(startText, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(startText, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFFF88';
        const jumpText = isMobile ? 'Drž prst na obrazovce pro skok!' : 'Drž MEZERNÍK pro skok, pusť dříve pro rychlejší dopad!';
        ctx.fillText(jumpText, canvas.width / 2, canvas.height / 2 + 60);

        // Čekáme na první vstup pro spuštění odpočtu
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space' && gameState === 'initial') {
                startSequence();
            }
        }, { once: true });
        
        console.log('Hra inicializována úspěšně! Mobile:', isMobile);
    } catch (error) {
        console.error('Chyba při inicializaci:', error);
        // Fallback - zobrazíme alespoň nějakou zprávu
        if (ctx) {
            ctx.fillStyle = 'red';
            ctx.font = '20px Arial';
            ctx.fillText('Chyba při načítání hry: ' + error.message, 50, 50);
        }
    }
}

// Spustíme hru až po načtení DOM
document.addEventListener('DOMContentLoaded', function() {
    resizeCanvas();
    init();
});
