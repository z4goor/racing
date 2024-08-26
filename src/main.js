import { Car } from "./car.js";

let car;
let keysPressed = {};
let trackConfig;
let startLine;
let lineCrossing;
let timerStarted = false;
let startTime;
let fastestLap;

fetch('../config/config.json')
    .then(response => response.json())
    .then(data => {
        trackConfig = data;
    });

const startButton = document.getElementById('startButton');
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

lineCrossing = [];

startButton.addEventListener('click', function() {
    if (!trackConfig) {
        console.error('Track configuration not loaded.');
        return;
    }

    startLine = trackConfig.startLine;
    timerStarted = false;
    setCurrentTime(0, 0, 0);

    if (car) {
        track.removeChild(car.element);
        car = null;
    }

    car = new Car(15, 25, 0, '#fcff2d');

    if (trackConfig.startPoint) {
        car.setPosition(trackConfig.startPoint.x, trackConfig.startPoint.y);
        car.setRotation(trackConfig.startPoint.rotation);
    }

    car.addToTrack(track);
    car.setRotationSpeed(0);
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', undefined);
    saveFastestLap(undefined);
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyW':
            if (car) car.increaseSpeed(0.6);
            break;
        case 'KeyA':
            if (car) car.setRotationSpeed(-2);
            break;
        case 'KeyS':
            if (car) car.decreaseSpeed(1);
            break;
        case 'KeyD':
            if (car) car.setRotationSpeed(2);
            break;
        case 'Space':
            car.x -= 200;
            break;
    }
});

document.addEventListener('keyup', event => {
    keysPressed[event.code] = false;
    if (event.code === 'KeyA' || event.code === 'KeyD') {
        if (car) car.setRotationSpeed(0);
    }
});

function getFastestLap() {
    const value = localStorage.getItem('fastestLap');

    if (value !== null) {
        const parsedValue = parseInt(value, 10);

        if (!isNaN(parsedValue)) {
            return parsedValue;
        }
    }

    return null;
}

function saveFastestLap(time) {
    localStorage.setItem('fastestLap', time);
    fastestLap = time;
    updateFastestLapTime(time);
}

function updateFastestLapTime(time) {
    if (time == undefined) {
        document.getElementById('fastest-time').textContent = '0:00.000';
    } else {
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        const milliseconds = time % 1000;
        document.getElementById('fastest-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
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
    const { x: carX, y: carY } = car;
    const { p1, p2 } = line;
    
    const lineVector = { x: p2.x - p1.x, y: p2.y - p1.y };
    const carToLineStartVector = { x: carX - p1.x, y: carY - p1.y };
    const movementVector = car.direction;
    
    const dotProduct = (lineVector.x * movementVector.x + lineVector.y * movementVector.y) 
                     - (carToLineStartVector.x * movementVector.x + carToLineStartVector.y * movementVector.y);

    return dotProduct > 0;
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
        const carEdges = [
            { p1: corners[0], p2: corners[1] },
            { p1: corners[1], p2: corners[2] },
            { p1: corners[2], p2: corners[3] },
            { p1: corners[3], p2: corners[0] }
        ];

        car.getSensorDistances(ctx, 150);

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
                        if (fastestLap == undefined || elapsedTime < fastestLap) {
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
            if (isNaN(elapsedTime)) {
                setCurrentTime(0, 0, 0);
            } else {
                const minutes = Math.floor(elapsedTime / 60000);
                const seconds = Math.floor((elapsedTime % 60000) / 1000);
                const milliseconds = elapsedTime % 1000;
                setCurrentTime(minutes, seconds, milliseconds);
            }
        }
    }
    requestAnimationFrame(update);
}

update();
