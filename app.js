const crank = document.getElementById("crank");
const counterEl = document.getElementById("counter");
const timerEl = document.getElementById("timer");
const degwindow = document.getElementById("degwindow");

let counter = 0; // cents
let lastAngle = null;
let isDragging = false;
let totalRotation = 0;
let hasSpunUp = false;



const successesEl = document.getElementById("successes_counter");
let spinUpCount = 0;
let spinUpJustAchieved = false;




// Keep track of correct direction
const timedirection = document.getElementById("timedirection");
let requiredDirection = 'cw';
let nextDirectionChange = performance.now() + (Math.random() * 5000 + 5000);

function pickRandomDirection() {
  return Math.random() < 0.5 ? 'cw' : 'ccw';
}

function scheduleNextDirectionChange(now) {
  requiredDirection = pickRandomDirection();
  timedirection.textContent = "Rotate: " + (requiredDirection === 'cw' ? "Clockwise >>>" : "Counterclockwise <<<");
  timedirection.className = "timedirection " + requiredDirection;
  nextDirectionChange = now + (Math.random() * 5000 + 5000);
}
scheduleNextDirectionChange(performance.now());


const RATE_PER_SECOND = 0.2; // 720 per hour (i.e. 0.2 cents per second)
let crankedTimeSeconds = 0;

// Rolling 10-second rotation tracking
let rotationHistory = []; // array of {time, delta}
const WINDOW_MS = 10 * 1000;
const REQUIRED_DEG = 3600;

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function getAngle(x, y, rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
}


function getCrankColor(degrees) {
  // Clamp degrees to 0...REQUIRED_DEG
  const t = Math.max(0, Math.min(1, degrees / REQUIRED_DEG));
  // Red: #e74c3c → [231, 76, 60], Green: #27ae60 → [39, 174, 96]
  const startcolor = [231, 76, 60];
  const endcolor = [0, 0, 0];
  const c = startcolor.map((start, i) => Math.round(start * (1 - t) + endcolor[i] * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}


function getDegreesInWindow() {
  const now = performance.now();
  rotationHistory = rotationHistory.filter(entry => now - entry.time <= WINDOW_MS);
  return rotationHistory.reduce((sum, entry) => sum + entry.delta, 0);
}

function isCrankActive(degreesInWindow) {
  if (!hasSpunUp) {
    return degreesInWindow >= REQUIRED_DEG;
  } else {
    return degreesInWindow > 0; // Allow *any* movement in correct direction after spin-up
  }
}

















function startDrag(event) {
  isDragging = true;
  const rect = crank.getBoundingClientRect();
  lastAngle = getAngle(event.clientX, event.clientY, rect);
}

function drag(event) {
  if (!isDragging) return;
  const rect = crank.getBoundingClientRect();
  const angle = getAngle(event.clientX, event.clientY, rect);
  let delta = angle - lastAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  totalRotation += delta;
  lastAngle = angle;
  crank.style.transform = `rotate(${totalRotation}deg)`;

  // Only count rotation in the active direction
  let degreeDelta = 0;
  if (requiredDirection === 'cw' && delta > 0) {
    degreeDelta = delta;
  } else if (requiredDirection === 'ccw' && delta < 0) {
    degreeDelta = -delta;
  }
  if (degreeDelta > 0.5) {
    rotationHistory.push({
      time: performance.now(),
      delta: degreeDelta
    });
  }
}

function endDrag() {
  isDragging = false;
}

// Mouse events
crank.addEventListener("mousedown", startDrag);
crank.addEventListener("mousemove", drag);
document.addEventListener("mouseup", endDrag);

// Touch events
crank.addEventListener("touchstart", e => startDrag(e.touches[0]));
crank.addEventListener("touchmove", e => {
  drag(e.touches[0]);
  e.preventDefault();
}, { passive: false });
document.addEventListener("touchend", endDrag);




function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hour${hrs === 1 ? '' : 's'}`);
  if (mins > 0) parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);
  // Always show seconds unless it's 0 and there is another, higher unit shown
  if (secs > 0 || parts.length === 0) 
    parts.push(`${secs} second${secs === 1 ? '' : 's'}`);

  return parts.join(' ');
}



























// Animation loop
let lastIncrement = performance.now();
function animate() {
  const now = performance.now();
  if (now >= nextDirectionChange) {
    scheduleNextDirectionChange(now);
    rotationHistory = [];
  }

  const degreesInWindow = getDegreesInWindow();
  const crankColor = getCrankColor(degreesInWindow);
  
  crank.querySelector('circle').setAttribute('stroke', crankColor);

  if (degreesInWindow >= REQUIRED_DEG && !spinUpJustAchieved) {
    spinUpCount++;
    successesEl.textContent = `${spinUpCount}`;
    spinUpJustAchieved = true;
  }
  if (degreesInWindow < REQUIRED_DEG) {
    spinUpJustAchieved = false;
  }


  // If not spun up yet, check if we should flip the flag
  if (!hasSpunUp && degreesInWindow >= REQUIRED_DEG) {
    hasSpunUp = true;
  }
  const canCrank = isCrankActive(degreesInWindow);

  if (canCrank) {
    const secondsSinceLast = (now - lastIncrement) / 1000;
    counter += secondsSinceLast * RATE_PER_SECOND;
    crankedTimeSeconds += secondsSinceLast;
    counterEl.classList.add('working');
    counterEl.classList.remove('stopped');
  } else {
  counterEl.classList.remove('working');
  counterEl.classList.add('stopped');
}
  
  counterEl.textContent = formatter.format(counter / 100);
  timerEl.textContent = formatTime(crankedTimeSeconds);
  degwindow.textContent = `${Math.floor(degreesInWindow)}° / 3600°`;

  lastIncrement = now;
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
