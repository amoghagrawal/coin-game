let hasInteracted = false;
const backgroundMusic = document.getElementById('backgroundMusic');
const coinSound = document.getElementById('coinSound');
const selectSound = document.getElementById('selectSound');

const menu = document.getElementById('menu');
const ground = document.querySelector('.ground');
const player1 = document.getElementById('player1');
const player2 = document.getElementById('player2');
const scoreboard = document.getElementById('scoreboard');
const score1Element = document.getElementById('score1');
const score2Element = document.getElementById('score2');
const timerElement = document.getElementById('timer');
const timeDisplay = document.getElementById('time');
const restartButton = document.getElementById('restart-button');

let player1Score = 0;
let player2Score = 0;
let gameRunning = false;
let timeRemaining = 0;
let gameInterval;
let coinSpawnInterval;
let powerupSpawnInterval;
let player1Frozen = false;
let activeCoins = [];
let activePowerups = [];

const players = {
    player1: {
        element: player1,
        x: 100,
        speed: 5
    },
    player2: {
        element: player2,
        x: 200,
        speed: 5,
        isJumping: false
    }
};

restartButton.addEventListener('click', () => {
    selectSound.currentTime = 0;
    selectSound.play().catch(error => console.log("Audio playback failed:", error));
    startGame(initialGameDuration);
});

function optimizeGround() {
    const ground = document.querySelector('.ground');
    ground.style.contain = 'layout paint size';
    ground.style.willChange = 'transform';
    ground.style.transform = 'translateZ(0)';
}

const keys = {
    'ArrowLeft': false,
    'ArrowRight': false,
    'ArrowUp': false,
    'ArrowDown': false,
    'Space': false
};

const COIN_FALL_SPEED = 3;
const POWERUP_FALL_SPEED = 2;
const AI_REACTION_TIME = 100; 
const AI_POSITION_THRESHOLD = 2; 
const AI_UPDATE_INTERVAL = 16; 
const AI_PREDICTION_OFFSET = 20;
let lastAIUpdateTime = Date.now();
let lastTargetX = 0;
let isJumping = false;
let jumpTimeout = null;
let initialGameDuration = 0;

function startBackgroundMusic() {
    if (!hasInteracted) {
        hasInteracted = true;
        backgroundMusic.play().catch(error => {
            console.log("Audio playback failed:", error);
        });
    }
}

function startGame(duration) {
    if (!hasInteracted) {
        startBackgroundMusic();
    }
    
    initialGameDuration = duration; 
    timeRemaining = duration;
    player1Score = 0;
    player2Score = 0;
    score1Element.textContent = '0';
    score2Element.textContent = '0';
    gameRunning = true;
    player1Frozen = false;
    menu.style.display = 'none';
    ground.style.display = 'block';
    player1.style.display = 'block';
    player2.style.display = 'block';
    scoreboard.style.display = 'block';
    timerElement.style.display = 'block';
    document.getElementById('restart-button').style.display = 'block';
    players.player1.x = 100;
    players.player2.x = 200;
    movePlayer(players.player1, 0, 0);
    movePlayer(players.player2, 0, 0);
    activeCoins.forEach(coin => coin.element.remove());
    activePowerups.forEach(powerup => powerup.element.remove());
    activeCoins = [];
    activePowerups = [];
    clearInterval(gameInterval);
    clearInterval(coinSpawnInterval);
    clearInterval(powerupSpawnInterval);
    optimizeGround();
    gameInterval = setInterval(gameLoop, 16);
    coinSpawnInterval = setInterval(spawnCoin, 2000);
    powerupSpawnInterval = setInterval(spawnPowerup, 5000);
    updateTimer();
}

function gameLoop() {
    if (!gameRunning) return;
    if (!player1Frozen) {
        if (keys.ArrowLeft) movePlayer(players.player1, -players.player1.speed, 0);
        if (keys.ArrowRight) movePlayer(players.player1, players.player1.speed, 0);
        if (keys.Space && !isJumping) {
            jump(players.player1);
        }
    }

    updateAI();
    updateCoinsAndPowerups();
}

function updateAI() {
    const now = Date.now();
    if (now - lastAIUpdateTime < AI_UPDATE_INTERVAL) return;
    lastAIUpdateTime = now;
    let closestTarget = null;
    let closestDistance = Infinity;

    activeCoins.forEach(coin => {
        if (coin.top < window.innerHeight - 80) {
            const distance = Math.hypot(
                (players.player2.x + 50) - (coin.left + 10),
                (window.innerHeight - 160) - coin.top
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = {
                    x: coin.left + 10,
                    y: coin.top,
                    type: 'coin'
                };
            }
        }
    });

    if (closestTarget) {
        const aiCenterX = players.player2.x + 50;
        const targetX = closestTarget.x;
        const predictedX = targetX + (AI_PREDICTION_OFFSET * (Math.random() - 0.5));
        const horizontalDistance = Math.abs(aiCenterX - targetX);
        if (horizontalDistance < 40 && closestTarget.y > window.innerHeight - 300) {
            jumpAI();
        }

        const MOVEMENT_DEADZONE = 10;
        const positionDifference = aiCenterX - predictedX;
        
        if (Math.abs(positionDifference) > MOVEMENT_DEADZONE) {
            const movementDirection = positionDifference > 0 ? -1 : 1;
            const isSignificantMovement = Math.abs(positionDifference) > 20;
            if (!players.player2.isJumping && isSignificantMovement) {
                if (movementDirection > 0) {
                    players.player2.element.classList.remove('facing-left');
                    players.player2.element.classList.add('facing-right');
                } else {
                    players.player2.element.classList.remove('facing-right');
                    players.player2.element.classList.add('facing-left');
                }
            }
            
            movePlayer(players.player2, players.player2.speed * movementDirection, 0, false);
        }
        
        lastTargetX = targetX;
    }
}

function jumpAI() {
    if (players.player2.isJumping) return;
    
    const currentDirection = {
        left: players.player2.element.classList.contains('facing-left'),
        right: players.player2.element.classList.contains('facing-right')
    };
    
    players.player2.isJumping = true;
    players.player2.element.classList.add('jumping');
    
    setTimeout(() => {
        players.player2.element.classList.remove('jumping');
        players.player2.isJumping = false;
        if (currentDirection.left) {
            players.player2.element.classList.add('facing-left');
            players.player2.element.classList.remove('facing-right');
        } else if (currentDirection.right) {
            players.player2.element.classList.add('facing-right');
            players.player2.element.classList.remove('facing-left');
        }
    }, 600);
}

function movePlayer(player, dx, dy, updateDirection = true) {
    const newX = Math.max(0, Math.min(window.innerWidth - 100, player.x + dx));
    player.x = newX;
    player.element.style.left = player.x + 'px';
    player.element.style.bottom = '50px';
    
    if (updateDirection && !player.isJumping) {
        if (dx > 0) {
            player.element.classList.remove('facing-left');
            player.element.classList.add('facing-right');
        } else if (dx < 0) {
            player.element.classList.remove('facing-right');
            player.element.classList.add('facing-left');
        }
    }
}

function jump(player) {
    if (player === players.player1 && isJumping) return;
    if (player === players.player2 && players.player2.isJumping) return;
    
    if (player === players.player1) {
        isJumping = true;
    } else {
        players.player2.isJumping = true;
    }
    
    player.element.classList.add('jumping');
    
    setTimeout(() => {
        player.element.classList.remove('jumping');
        if (player === players.player1) {
            isJumping = false;
        } else {
            players.player2.isJumping = false;
        }
    }, 600);
}

function updateCoinsAndPowerups() {
    for (let i = activeCoins.length - 1; i >= 0; i--) {
        const coin = activeCoins[i];
        coin.top += COIN_FALL_SPEED;
        coin.element.style.top = coin.top + 'px';
        if (coin.top >= window.innerHeight - 160 && coin.top <= window.innerHeight - 80) {
            const coinCenterX = coin.left + 10;
            if (Math.abs(players.player1.x + 50 - coinCenterX) < 40 && !player1Frozen) {
                player1Score++;
                score1Element.textContent = player1Score;
                coinSound.currentTime = 0;
                coinSound.play().catch(error => console.log("Audio playback failed:", error));
                coin.element.remove();
                activeCoins.splice(i, 1);
                continue;
            }
            
            if (Math.abs(players.player2.x + 50 - coinCenterX) < 40) {
                player2Score++;
                score2Element.textContent = player2Score;
                coinSound.currentTime = 0;
                coinSound.play().catch(error => console.log("Audio playback failed:", error));
                coin.element.remove();
                activeCoins.splice(i, 1);
                continue;
            }
        }

        if (coin.top > window.innerHeight) {
            coin.element.remove();
            activeCoins.splice(i, 1);
        }
    }

    for (let i = activePowerups.length - 1; i >= 0; i--) {
        const powerup = activePowerups[i];
        powerup.top += POWERUP_FALL_SPEED;
        powerup.element.style.top = powerup.top + 'px';
        if (powerup.top >= window.innerHeight - 160 && powerup.top <= window.innerHeight - 80) {
            const powerupCenterX = powerup.left + 15;
            
            if (Math.abs(players.player1.x + 50 - powerupCenterX) < 40) {
                if (powerup.type === 'tooth') {
                    player1Frozen = true;
                    player1.classList.add('frozen');
                    setTimeout(() => {
                        player1Frozen = false;
                        player1.classList.remove('frozen');
                    }, 5000);
                } else if (powerup.type === 'potion') {
                    player1Score = Math.max(0, player1Score - 3);
                    score1Element.textContent = player1Score;
                }
                powerup.element.remove();
                activePowerups.splice(i, 1);
            }
        }

        if (powerup.top > window.innerHeight) {
            powerup.element.remove();
            activePowerups.splice(i, 1);
        }
    }
}

function spawnCoin() {
    if (!gameRunning) return;

    const coin = document.createElement('div');
    coin.className = 'coin';
    if (Math.random() < 0.3) coin.classList.add('silver');
    
    coin.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="${coin.classList.contains('silver') ? '#C0C0C0' : '#FFD700'}" stroke="#000" stroke-width="1"/>
        <text x="10" y="14" text-anchor="middle" fill="#000" font-size="12">$</text>
    </svg>`;
    
    const left = Math.random() * (window.innerWidth - 20);
    coin.style.left = left + 'px';
    coin.style.top = '0px';
    document.body.appendChild(coin);
    
    const rotation = Math.random() * 360;
    coin.style.transform = `rotate(${rotation}deg)`;
    
    activeCoins.push({
        element: coin,
        left: left,
        top: 0
    });
}

function spawnPowerup() {
    if (!gameRunning) return;

    const powerup = document.createElement('div');
    const type = Math.random() < 0.5 ? 'tooth' : 'potion';
    powerup.className = `powerup ${type}`;
    
    const left = Math.random() * (window.innerWidth - 30);
    powerup.style.left = left + 'px';
    powerup.style.top = '0px';
    document.body.appendChild(powerup);
    
    const rotation = Math.random() * 360;
    powerup.style.transform = `rotate(${rotation}deg)`;
    
    activePowerups.push({
        element: powerup,
        left: left,
        top: 0,
        type: type
    });
}

function updateTimer() {
    if (!gameRunning) return;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timeRemaining <= 0) {
        endGame();
    } else {
        timeRemaining--;
        setTimeout(updateTimer, 1000);
    }
}

function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    clearInterval(coinSpawnInterval);
    clearInterval(powerupSpawnInterval);
    ground.style.display = 'none';
    player1.style.display = 'none';
    player2.style.display = 'none';
    scoreboard.style.display = 'none';
    timerElement.style.display = 'none';
    document.getElementById('restart-button').style.display = 'none'; 
    activeCoins.forEach(coin => coin.element.remove());
    activePowerups.forEach(powerup => powerup.element.remove());
    activeCoins = [];
    activePowerups = [];
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    
    const menu = document.getElementById('menu');
    menu.innerHTML = `
        <h1 class="game-over-title">Game Over!</h1>
        <div class="winner-text">${player1Score > player2Score ? 'Player Wins!' : player1Score < player2Score ? 'Bot Wins!' : 'It\'s a Tie!'}</div>
        <div>Final Score:</div>
        <div>Player: ${player1Score} - Bot: ${player2Score}</div>
        <button class="menu-button" onclick="playAgain()">Play Again</button>
    `;
    menu.style.display = 'block';
}

function playAgain() {
    selectSound.currentTime = 0;
    selectSound.play().catch(error => console.log("Audio playback failed:", error));
    location.reload();
}

document.querySelectorAll('.menu-button').forEach(button => {
    button.addEventListener('click', function() {
        selectSound.currentTime = 0;
        selectSound.play().catch(error => console.log("Audio playback failed:", error));
        const duration = parseInt(this.getAttribute('data-duration'));
        startGame(duration);
    });
});

document.addEventListener('click', startBackgroundMusic);
document.addEventListener('keydown', startBackgroundMusic);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        keys.Space = true;
        e.preventDefault();
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        keys.Space = false;
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});
