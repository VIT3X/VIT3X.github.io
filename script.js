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
const GRAVITY = 0.4; // Mírnější gravitace pro lepší kontrolu
const JUMP_FORCE = -0.8; // Síla držení - kontinuální tlak nahoru
const FALL_GRAVITY = 1.0; // Rychlejší padání když nepodržíme
const MAX_JUMP_HEIGHT = GROUND_Y - 180; // Maximální výška skoku
const GROUND_Y = canvas.height - 80; // Pozice země
const TRACK_DISTANCE = 4000; // Kratší trať pro lepší gameplay

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
    maxSpeed: 5, // Zpomaleno z 10
    acceleration: 0.03, // Zpomaleno z 0.08
    onGround: true,
    // Animace
    frameCount: 6, // Méně snímků pro plynulejší animaci
    currentFrame: 0,
    frameSpeed: 8, // Pomalejší změna snímků
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
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 ('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0) || 
                 window.innerWidth <= 768;
let isJumping = false; // Pro touch ovládání

console.log('Mobile detection:', {
    userAgent: navigator.userAgent,
    ontouchstart: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    windowWidth: window.innerWidth,
    isMobile: isMobile
});

// --- Vstup od hráče ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Touch ovládání pro mobily ---
let touchStartY = 0;
let isTouching = false;

// Touch eventy na celém documentu pro lepší funkčnost
document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    console.log('Touch start detected!');
    touchStartY = e.touches[0].clientY;
    isTouching = true;
    isJumping = true;
    
    // Pokud je hra v initial stavu, spustíme ji
    if (gameState === 'initial') {
        console.log('Starting game from touch...');
        startSequence();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    console.log('Touch end detected!');
    isTouching = false;
    isJumping = false;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Canvas touch eventy jako backup
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    console.log('Canvas touch start!');
    isTouching = true;
    isJumping = true;
    
    if (gameState === 'initial') {
        startSequence();
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    console.log('Canvas touch end!');
    isTouching = false;
    isJumping = false;
}, { passive: false });

// --- Click ovládání pro desktop/tablet ---
canvas.addEventListener('mousedown', (e) => {
    console.log('Mouse down detected!');
    isJumping = true;
    if (gameState === 'initial') {
        startSequence();
    }
});

canvas.addEventListener('mouseup', (e) => {
    console.log('Mouse up detected!');
    isJumping = false;
});

// Click eventy na celém documentu jako backup
document.addEventListener('click', (e) => {
    console.log('Document click detected!');
    if (gameState === 'initial') {
        startSequence();
    }
});

// --- Funkce pro kreslení běžce ---
function drawRunner(x, y, frame, isJumping = false) {
    ctx.save();
    ctx.translate(x + player.width/2, y + player.height);
    
    // Výpočet animace běhu - realističtější
    const runCycle = (frame / player.frameCount) * Math.PI * 2;
    const legAngle = Math.sin(runCycle) * 0.4; // Menší rozsah pohybu
    const armAngle = Math.sin(runCycle + Math.PI) * 0.3;
    const bodyBob = Math.sin(runCycle * 2) * 2; // Lehké kolébání těla
    
    // Aplikujeme lehké kolébání
    ctx.translate(0, bodyBob);
    
    // Hlavní tělo (atletický dres)
    ctx.fillStyle = RUNNER_COLORS.shirt;
    ctx.fillRect(-15, -65, 30, 35);
    
    // Číslo na dresu
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('42', 0, -45);
    
    // Hlava
    ctx.fillStyle = RUNNER_COLORS.skin;
    ctx.beginPath();
    ctx.arc(0, -75, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Vlasy (běžecká čelenka)
    ctx.fillStyle = RUNNER_COLORS.hair;
    ctx.beginPath();
    ctx.arc(0, -80, 10, 0, Math.PI);
    ctx.fill();
    
    if (isJumping) {
        // Skákající pozice - realističtější překážkový styl
        // Levá noha (vedoucí)
        ctx.save();
        ctx.rotate(-0.4);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-8, -35, 8, 25);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(-8, -50, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-10, -12, 12, 8);
        ctx.restore();
        
        // Pravá noha (následující)
        ctx.save();
        ctx.rotate(0.1);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(0, -25, 8, 20);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(0, -40, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-2, -8, 12, 8);
        ctx.restore();
        
        // Ruce v překážkovém stylu
        ctx.save();
        ctx.rotate(-0.6);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-25, -55, 22, 8);
        ctx.restore();
        
        ctx.save();
        ctx.rotate(0.2);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(3, -60, 22, 8);
        ctx.restore();
    } else {
        // Běžecká animace - atletický styl
        // Levá noha
        ctx.save();
        ctx.rotate(legAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-8, -30, 8, 25);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(-8, -45, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-10, -8, 14, 8);
        // Atletické tretry - hřeby
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(-8, -6, 2, 2);
        ctx.fillRect(-5, -6, 2, 2);
        ctx.restore();
        
        // Pravá noha
        ctx.save();
        ctx.rotate(-legAngle);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(0, -30, 8, 25);
        ctx.fillStyle = RUNNER_COLORS.shorts;
        ctx.fillRect(0, -45, 8, 15);
        ctx.fillStyle = RUNNER_COLORS.shoes;
        ctx.fillRect(-2, -8, 14, 8);
        // Atletické tretry - hřeby
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(2, -6, 2, 2);
        ctx.fillRect(5, -6, 2, 2);
        ctx.restore();
        
        // Levá ruka - atletická technika
        ctx.save();
        ctx.rotate(armAngle * 0.8);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(-25, -55, 20, 8);
        // Ruka v pěst
        ctx.beginPath();
        ctx.arc(-30, -51, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Pravá ruka
        ctx.save();
        ctx.rotate(-armAngle * 0.8);
        ctx.fillStyle = RUNNER_COLORS.skin;
        ctx.fillRect(5, -55, 20, 8);
        // Ruka v pěst
        ctx.beginPath();
        ctx.arc(30, -51, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore();
}

// --- Funkce pro kreslení překážky ---
function drawHurdle(x, y, width, height, isKnockedOver = false) {
    ctx.save();
    
    if (isKnockedOver) {
        // Spadlá překážka
        ctx.translate(x + width/2, y + height/2);
        ctx.rotate(Math.PI/4); // Nakloněná o 45°
        ctx.translate(-width/2, -height/2);
        ctx.globalAlpha = 0.7;
    }
    
    // Barvy reálné překážky
    const hurdleColor = '#E6E6E6'; // Stříbrná/bílá
    const baseColor = '#333333';   // Černé podstavce
    
    // Levý podstavec
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, height - 15, 12, 15); // Spodní část
    ctx.fillRect(2, 0, 8, height - 25);   // Svislá tyč
    
    // Pravý podstavec  
    ctx.fillRect(width - 12, height - 15, 12, 15);
    ctx.fillRect(width - 10, 0, 8, height - 25);
    
    // Hlavní horní lišta (to přes co skáčeme)
    ctx.fillStyle = hurdleColor;
    ctx.fillRect(0, 0, width, 10);
    
    // Stínování pro 3D efekt
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(0, 8, width, 2);
    
    // Boční výztuhy (pro realismus)
    ctx.fillStyle = '#999999';
    ctx.fillRect(8, 12, 4, height - 35);
    ctx.fillRect(width - 12, 12, 4, height - 35);
    
    // Protiskluzové pásky
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(width/4, 2, width/2, 6);
    
    // Bílé pruhy pro visibility
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(width/4 + i * (width/6), 3, 2, 4);
    }
    
    // Stín na zemi
    if (!isKnockedOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(2, height + 2, width - 4, 6);
    }
    
    ctx.restore();
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
    const hurdleCount = 10; // Vždy přesně 10 překážek
    const startPos = 500; // Pozice první překážky
    const endPos = TRACK_DISTANCE - 600; // Pozice poslední překážky
    const totalDistance = endPos - startPos;
    
    // Vygenerujeme náhodné vzdálenosti mezi překážkami
    let distances = [];
    let totalRandomDistance = 0;
    
    // Vygenerujeme náhodné hodnoty
    for (let i = 0; i < hurdleCount - 1; i++) {
        const randomDist = 200 + Math.random() * 200; // 200-400px
        distances.push(randomDist);
        totalRandomDistance += randomDist;
    }
    
    // Škálujeme vzdálenosti aby se vešly na trať
    const scale = totalDistance / totalRandomDistance;
    distances = distances.map(d => d * scale);
    
    // Umístíme překážky
    let currentPos = startPos;
    for (let i = 0; i < hurdleCount; i++) {
        obstacles.push({
            x: currentPos,
            y: GROUND_Y - 60,
            width: 60,
            height: 60,
            isKnockedOver: false,
            originalX: currentPos,
            id: i // Pro debug
        });
        
        if (i < distances.length) {
            currentPos += distances[i];
        }
    }
    
    console.log(`Generated ${obstacles.length} hurdles with distances:`, distances.map(d => Math.round(d)));
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

    // --- Vylepšená skoková mechanika ---
    const jumpInput = keys['Space'] || isJumping;
    
    if (jumpInput) {
        // Držíme vstup - létáme nahoru (ale jen do limitu)
        if (player.y > MAX_JUMP_HEIGHT) {
            player.velocityY += JUMP_FORCE;
            if (!player.onGround) {
                player.isJumping = true;
            }
        }
        
        // První skok ze země
        if (player.onGround) {
            player.velocityY = JUMP_FORCE * 8; // Počáteční impuls
            player.onGround = false;
            player.isJumping = true;
        }
    }
    
    // Aplikace gravitace
    const gravityToUse = jumpInput && player.y > MAX_JUMP_HEIGHT ? GRAVITY : FALL_GRAVITY;
    player.velocityY += gravityToUse;
    
    // Omezení maximální rychlosti pádu
    if (player.velocityY > 12) player.velocityY = 12;
    
    player.y += player.velocityY;

    // Detekce země
    if (player.y + player.height >= GROUND_Y) {
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
        const playerLeft = player.x + 10; // Přesnější hitbox
        const playerRight = player.x + player.width - 10;
        const obsLeft = obs.x - worldOffsetX;
        const obsRight = obs.x + obs.width - worldOffsetX;

        if (playerRight > obsLeft && playerLeft < obsRight && 
            player.y + player.height > obs.y + 15 && !obs.isKnockedOver) { // Trochu tolerance
            
            console.log('Collision detected with hurdle', obs.id);
            
            // Shodíme překážku
            obs.isKnockedOver = true;
            
            // Výrazné zpomalení běžce
            player.speedX *= 0.3; // Velké zpomalení
            
            // Kratký "zakopnutí" efekt
            if (player.onGround) {
                player.velocityY = -6; // Menší skok nahoru
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
            // Kreslíme překážku na její pozici
            ctx.save();
            ctx.translate(screenX, obs.y);
            drawHurdle(0, 0, obs.width, obs.height, obs.isKnockedOver);
            ctx.restore();
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
        if (finalTime < 15) rating = '🏆 MISTROVSKÝ ČAS!';
        else if (finalTime < 20) rating = '🥇 VÝBORNÝ ČAS!';
        else if (finalTime < 25) rating = '🥈 DOBRÝ ČAS!';
        else rating = '🥉 ZKUS TO ZNOVU!';
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(rating, canvas.width / 2, canvas.height / 2 + 80);
        
        // Zobrazíme restart tlačítko
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.classList.add('show');
        }
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
    
    // Maximální výška skoku (neviditelná čára)
    ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.fillRect(0, MAX_JUMP_HEIGHT, canvas.width, 2);
    
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
        const startText = isMobile ? 'DOTKNI SE OBRAZOVKY PRO START' : 'STISKNI MEZERNÍK PRO START';
        ctx.strokeText(startText, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(startText, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFFF88';
        const jumpText = isMobile ? 'Drž prst na obrazovce pro skok!' : 'Drž MEZERNÍK pro skok, pusť dříve pro rychlejší dopad!';
        ctx.fillText(jumpText, canvas.width / 2, canvas.height / 2 + 60);

        // Debug info
        ctx.fillStyle = '#FF0000';
        ctx.font = '16px Arial';
        ctx.fillText(`Debug: Mobile=${isMobile}, GameState=${gameState}`, canvas.width / 2, canvas.height - 30);

        // Zobrazíme start tlačítko pro mobily
        const startButton = document.getElementById('startButton');
        if (startButton && isMobile) {
            startButton.classList.add('show');
        }

        // Čekáme na první vstup pro spuštění odpočtu
        document.addEventListener('keydown', function(e) {
            console.log('Key pressed:', e.code);
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
    
    // Přidáme event listener pro start tlačítko
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log('Start button clicked!');
            if (gameState === 'initial') {
                startButton.style.display = 'none';
                startSequence();
            }
        });
        
        startButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            console.log('Start button touched!');
            if (gameState === 'initial') {
                startButton.style.display = 'none';
                startSequence();
            }
        });
    }
    
    // Přidáme event listener pro restart tlačítko
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            console.log('Restart button clicked!');
            restartGame();
        });
        
        restartButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            console.log('Restart button touched!');
            restartGame();
        });
    }
    
    init();
});

function restartGame() {
    // Reset všech hodnot
    gameState = 'initial';
    worldOffsetX = 0;
    player.speedX = 0;
    player.velocityY = 0;
    player.x = 100;
    player.y = GROUND_Y - 80;
    player.onGround = true;
    player.isJumping = false;
    player.currentFrame = 0;
    player.frameCounter = 0;
    startTime = 0;
    finalTime = 0;
    countdownIndex = 0;
    countdownTimer = 0;
    isJumping = false;
    
    // Skryjeme restart tlačítko
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.classList.remove('show');
    }
    
    // Znovu vygenerujeme překážky
    generateObstacles();
    
    // Restartujeme hru
    init();
}
