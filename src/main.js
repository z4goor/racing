import { Car } from "./car.js";
import { Track } from "./track.js";

let car = null;
let keysPressed = {};
let track = null;
let lineCrossing = [];
let fastestLap = null;
let show_sensors = false;
let show_corners = false;

const trackConfigUrl = '../config/config.json';
const trackImageUrl = '../public/static/track001.png';
const trackElementId = 'track';

track = new Track(trackElementId, trackConfigUrl, trackImageUrl);

const startButton = document.getElementById('startButton');
const removeCarButton = document.getElementById('removeCarButton');
const resetButton = document.getElementById('resetFastestLapButton');

fastestLap = getFastestLap();
updateFastestLapTime(fastestLap);

startButton.addEventListener('click', function() {
    setCurrentTime(0, 0, 0);

    car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
});

removeCarButton.addEventListener('click', function() {
    car = null;
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', undefined);
    saveFastestLap(undefined);
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    if (!car) return;
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
    
    const dotProduct = carDirection.x * carToLineStartVector.x + carDirection.y * carToLineStartVector.y;

    return dotProduct > 0;
}

function sendGameStateToAI() {
    if (!car) return;

    const sensors = car.getSensorData(track.getContext()).map(sensor => sensor.distance);
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
    track.update();

    if (car) {
        car.move(track.getContext());

        if (car.speed > 0) {
            car.rotate();
        }

        const corners = car.corners;

        if (show_corners) track.drawCorners(car);
        if (show_sensors) track.drawSensors(car);

        const carEdges = [
            { p1: corners[0], p2: corners[2] },
            { p1: corners[1], p2: corners[3] }
        ];

        const startLine = track.getStartLine();
        const hasCrossedLine = carEdges.some(edge => linesIntersect(edge, startLine));
        const movingTowardsLine = isMovingTowardsLine(car, startLine);

        if (hasCrossedLine) {
            if (!lineCrossing.includes(car)) {
                lineCrossing.push(car);

                if (!movingTowardsLine) {
                    car.reverseMode = true;
                } else {
                    const lapTime = car.startLap();
                    if (!car.reverseMode) {
                        if (lapTime && (!fastestLap || lapTime < fastestLap)) {
                            saveFastestLap(lapTime);
                        }
                    }

                    if (car.reverseMode) {
                        car.reverseMode = false;
                    }
                }
            }
        } else {
            if (lineCrossing.includes(car)) {
                lineCrossing.pop(car);
            }
        }
    }
    requestAnimationFrame(update);
}

update();
