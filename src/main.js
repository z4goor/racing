import { Car } from "./car.js";

let car = null;
let keysPressed = {};
let trackConfig = null;
let startLine = null;
let lineCrossing = [];
let timerStarted = false;
let startTime = null;
let fastestLap = null;
let show_sensors = false;
let show_corners = false;

fetch('../config/config.json')
    .then(response => response.json())
    .then(data => {
        trackConfig = data;
    });

const startButton = document.getElementById('startButton');
const removeCarButton = document.getElementById('removeCarButton');
const resetButton = document.getElementById('resetFastestLapButton');
const track = document.getElementById('track');
track.style.backgroundImage = "url('../public/static/track001.png')";

const canvas = document.createElement('canvas');
canvas.width = track.clientWidth;
canvas.height = track.clientHeight;
track.appendChild(canvas);
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const trackImage = new Image();
trackImage.src = '../public/static/track001.png';
trackImage.onload = function () {
    ctx.drawImage(trackImage, 0, 0, canvas.width, canvas.height);
};

fastestLap = getFastestLap();
updateFastestLapTime(fastestLap);

startButton.addEventListener('click', function() {
    if (!trackConfig) {
        console.error('Track configuration not loaded.');
        return;
    }

    startLine = trackConfig.startLine;
    timerStarted = false;
    setCurrentTime(0, 0, 0);

    car = new Car(15, 25, trackConfig.startPoint.rotation * Math.PI / 180, '#fcff2d');

    if (trackConfig.startPoint) {
        car.setPosition(trackConfig.startPoint.x, trackConfig.startPoint.y);
    }
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', undefined);
    saveFastestLap(undefined);
});

removeCarButton.addEventListener('click', function() {
    car = null;
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    if (car) {
        switch (event.code) {
            case 'KeyW':
                car.increaseSpeed(0.5);
                break;
            case 'KeyA':
                car.setRotationSpeed(-2.2);
                break;
            case 'KeyS':
                car.decreaseSpeed(0.7);
                break;
            case 'KeyD':
                car.setRotationSpeed(2.2);
                break;
            case 'KeyX':
                show_sensors = !show_sensors;
                break;
            case 'KeyC':
                show_corners = !show_corners;
                break;
            case 'Space':
                car.x -= 200;
                break;
        }
    }
});

document.addEventListener('keyup', event => {
    keysPressed[event.code] = false;
    if (car && (event.code === 'KeyA' || event.code === 'KeyD')) {
        car.setRotationSpeed(0);
    }
});

function getFastestLap() {
    const value = localStorage.getItem('fastestLap');
    return value ? parseInt(value, 10) : null;
}

function saveFastestLap(time) {
    localStorage.setItem('fastestLap', time);
    fastestLap = time;
    updateFastestLapTime(time);
}

function updateFastestLapTime(time) {
    const displayTime = time ? `${Math.floor(time / 60000)}:${(Math.floor((time % 60000) / 1000)).toString().padStart(2, '0')}.${(time % 1000).toString().padStart(3, '0')}` : '0:00.000';
    document.getElementById('fastest-time').textContent = displayTime;
}

function setCurrentTime(min, sec, ms) {
    document.getElementById('current-time').textContent = `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function linesIntersect(line1, line2) {
    const { p1, p2 } = line1;
    const { p1: q1, p2: q2 } = line2;

    const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);

    if (det === 0) {
        return false;
    }

    const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;

    return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

function isMovingTowardsLine(car, line) {
    if (!car || !line) return false;

    const { x: carX, y: carY, rotation } = car;
    const { p1, p2 } = line;
    
    const carDirection = {
        x: Math.sin(rotation),
        y: -Math.cos(rotation)
    };
    
    const carToLineStartVector = {
        x: p1.x - carX,
        y: p1.y - carY
    };

    const lineVector = {
        x: p2.x - p1.x,
        y: p2.y - p1.y
    };
    
    const dotProduct = carDirection.x * carToLineStartVector.x + carDirection.y * carToLineStartVector.y;

    return dotProduct > 0;
}


function sendGameStateToAI() {
    if (!car) return;

    const sensors = car.getSensorData(ctx, 150).map(sensor => sensor.distance);
    fetch('http://localhost:5000/game-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "speed": car.speed, "sensors": sensors }),
    })
        .then(response => response.json())
        .then(data => applyAIAction(data))
        .catch(error => console.log('error'));
}

function applyAIAction(action) {
    if (!car) return;
    console.log(action);
    switch (action) {
        case 'left':
            car.setRotationSpeed(-1.8);
            break;
        case 'right':
            car.setRotationSpeed(1.8);
            break;
        case 'accelerate':
            car.increaseSpeed(0.1);
            break;
    }
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(trackImage, 0, 0, canvas.width, canvas.height);

    if (car) {
        car.move(ctx);

        if (car.speed > 0) {
            car.rotate();
        }

        const corners = car.corners;
        const cornerColors = ['#ff0000', '#00ff00', '#0000ff', '#FFC0CB'];

        if (show_corners) {
            corners.forEach((corner, index) => {
                ctx.beginPath();
                ctx.arc(corner.x, corner.y, 2, 0, 2 * Math.PI);
                ctx.fillStyle = cornerColors[index];
                ctx.fill();
            });
        }

        if (show_sensors) {
            const sensorData = car.getSensorData(ctx);
            sensorData.forEach(({ distance, endX, endY }) => {
                ctx.beginPath();
                ctx.moveTo(car.x, car.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        const carEdges = [
            { p1: corners[0], p2: corners[1] },
            { p1: corners[1], p2: corners[2] },
            { p1: corners[2], p2: corners[3] },
            { p1: corners[3], p2: corners[0] }
        ];

        const hasCrossedLine = carEdges.some(edge => linesIntersect(edge, startLine));
        const movingTowardsLine = isMovingTowardsLine(car, startLine);

        if (hasCrossedLine) {
            if (!lineCrossing.includes(car)) {
                lineCrossing.push(car);

                if (!movingTowardsLine) {
                    car.reverseMode = true;
                } else {
                    if (timerStarted && !car.reverseMode) {
                        const elapsedTime = Date.now() - startTime;
                        if (!fastestLap || elapsedTime < fastestLap) {
                            saveFastestLap(elapsedTime);
                        }
                    } else {
                        timerStarted = true;
                    }

                    if (!car.reverseMode) {
                        startTime = Date.now();
                    } else {
                        car.reverseMode = false;
                    }
                }
            }
        } else {
            if (lineCrossing.includes(car)) {
                lineCrossing.pop(car);
            }
        }

        if (timerStarted) {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            const milliseconds = elapsedTime % 1000;
            setCurrentTime(minutes, seconds, milliseconds);
        }
    }
    requestAnimationFrame(update);
}

update();
// setInterval(sendGameStateToAI, 150);
