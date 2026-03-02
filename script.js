// Get canvas and context
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Resize canvas to fit window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Game variables
let player, platforms, lasers, powerups;
let keys = {}, score, speed, gameRunning, difficultyTimer;
let highScore = localStorage.getItem("neonHighScore") || 0;
document.getElementById("highScore").textContent = highScore;
let laserCooldown = 0;

// Key input
document.addEventListener("keydown", e => {
  if (!player) return;

  // Double jump
  if (e.code === "Space" && player.jumpCount < 2) {
    player.dy = player.jump;
    player.jumpCount++;
  }

  // Horizontal dash (Shift keys)
  if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && player.dashCooldown <= 0) {
    activateDash();
  }

  // Vertical dash (Ctrl keys)
  if ((e.code === "ControlLeft" || e.code === "ControlRight") && player.verticalDashCooldown <= 0) {
    activateVerticalDash();
  }

  keys[e.code] = true;
});

document.addEventListener("keyup", e => keys[e.code] = false);

// Dash functions
function activateDash() {
  player.dashing = 15;         // horizontal dash distance
  player.invincible = 15;      // temporary invincibility
  player.dashCooldown = 600;   // 2 seconds
}

function activateVerticalDash() {
  player.dy = -20;                    // dash straight up
  player.invincible = 15;             // temporary invincibility
  player.verticalDashCooldown = 600;  // 2 seconds
}

// Start the game
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  resetGame();
  gameRunning = true;
  update();
}

// Reset game variables
function resetGame() {
  platforms = [];
  lasers = [];
  powerups = [];
  score = 0;
  speed = 1.5;
  difficultyTimer = 0;

  player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 150,
    size: 30,
    dy: 0,
    gravity: 0.6,
    jump: -12,
    jumpCount: 0,
    shield: false,
    slowTimer: 0,
    megaJumpTimer: 0,
    dashing: 0,
    invincible: 0,
    dashCooldown: 0,
    verticalDashCooldown: 0
  };

  // Initial platform
  platforms.push({
    x: canvas.width / 2 - 80,
    y: canvas.height - 100,
    w: 160,
    h: 15,
    move: false
  });

  // Other platforms
  for (let i = 1; i < 7; i++) {
    platforms.push({
      x: Math.random() * (canvas.width - 150),
      y: canvas.height - 100 - i * 120,
      w: 150,
      h: 15,
      move: false
    });
  }
}

// Spawn platform
function spawnPlatform() {
  const last = platforms[platforms.length - 1];
  const platformWidth = 120;
  const verticalGap = 120;
  const maxHorizontalReach = 250;

  let minX = Math.max(0, last.x - maxHorizontalReach);
  let maxX = Math.min(canvas.width - platformWidth, last.x + maxHorizontalReach);

  platforms.push({
    x: Math.random() * (maxX - minX) + minX,
    y: last.y - verticalGap,
    w: platformWidth,
    h: 15,
    move: difficultyTimer > 1500
  });
}

// Spawn laser
function spawnLaser() {
  const minSpacing = 150;
  let attempts = 0;
  let x;
  do {
    x = Math.random() * canvas.width;
    attempts++;
  } while (lasers.some(l => Math.abs(l.x - x) < minSpacing) && attempts < 10);

  lasers.push({
    x: x,
    y: -50,
    angle: 0,
    length: 150
  });
}

// Main update loop
function update() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  difficultyTimer++;

  // Laser spawning with cooldown
  if (difficultyTimer > 2000) {
    if (laserCooldown <= 0) {
      spawnLaser();
      laserCooldown = 120;
    } else {
      laserCooldown--;
    }
  }

  let gameSpeed = speed;

  // Movement
  if (keys["ArrowLeft"]) player.x -= 5;
  if (keys["ArrowRight"]) player.x += 5;

  // Horizontal dash
  if (player.dashing > 0) {
    player.x += (keys["ArrowLeft"] ? -15 : 15);
    player.dashing--;
  }

  // Gravity
  player.dy += player.gravity;
  player.y += player.dy;

  // Keep player inside canvas
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;

  // Platforms
  platforms.forEach(p => {
    p.y += gameSpeed;
    if (p.move) p.x += Math.sin(Date.now() / 400) * 1.5;

    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    if (player.x < p.x + p.w &&
        player.x + player.size > p.x &&
        player.y + player.size < p.y + 15 &&
        player.y + player.size + player.dy >= p.y) {
      player.dy = 0;
      player.y = p.y - player.size;
      player.jumpCount = 0;
    }
  });

  platforms = platforms.filter(p => p.y < canvas.height + 20);
  if (platforms.length < 8) spawnPlatform();

  // Lasers
  lasers.forEach(l => {
    l.y += gameSpeed;
    l.angle += 0.04;

    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.angle);
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(l.length, 0);
    ctx.stroke();
    ctx.restore();

    if (Math.abs(player.x - l.x) < 20 && Math.abs(player.y - l.y) < 20) {
      if (player.invincible > 0) {
        // Invincible
      } else if (player.shield) {
        player.shield = false;
      } else {
        gameOver();
      }
    }
  });

  lasers = lasers.filter(l => l.y < canvas.height + 50);

  // Cooldowns
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.verticalDashCooldown > 0) player.verticalDashCooldown--;

  // Update dash UI
  document.getElementById("dashCD").textContent =
    (player.dashCooldown <= 0 ? "Shift Ready" : "Shift: " + Math.ceil(player.dashCooldown / 60) + "s") +
    " | " +
    (player.verticalDashCooldown <= 0 ? "Ctrl Ready" : "Ctrl: " + Math.ceil(player.verticalDashCooldown / 60) + "s");

  // Draw player
  ctx.fillStyle = player.invincible > 0 ? "#ffffff" : "#ff00ff";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 20;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.shadowBlur = 0;

  if (player.y > canvas.height) gameOver();

  score++;
  document.getElementById("score").textContent = score;

  requestAnimationFrame(update);
}

// Game over
function gameOver() {
  gameRunning = false;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("neonHighScore", highScore);
  }
  document.getElementById("highScore").textContent = highScore;

  document.getElementById("startScreen").style.display = "flex";
  document.querySelector("#startScreen h1").innerText = "💀 You suck ";
  document.querySelector("#startScreen p").innerText =
    "Score: " + score + " | High Score: " + highScore;
}
