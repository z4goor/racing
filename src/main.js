import { Car } from "./car.js";

let car;
let keysPressed = {};
let trackConfig;
let startLine;
let lineCrossing;
let timerStarted = false;
let startTime;

fetch('./config.json')
    .then(response => response.json())
    .then(data => {
        trackConfig = data;
    });

const startButton = document.getElementById('startButton');
const track = document.getElementById('track');
track.style.backgroundImage = "url('./track001.png')";

const canvas = document.createElement('canvas');
canvas.width = track.clientWidth;
canvas.height = track.clientHeight;
track.appendChild(canvas);
const ctx = canvas.getContext('2d');

const trackImage = new Image();
trackImage.src = './track001.png';
trackImage.onload = function () {
    ctx.drawImage(trackImage, 0, 0, canvas.width, canvas.height);
};

lineCrossing = [];

startButton.addEventListener('click', function() {
    if (!trackConfig) {
        console.error('Track configuration not loaded.');
        return;
    }

    startLine = trackConfig.startLine;
    timerStarted = false;
    document.getElementById('elapsed-time').textContent = '0:00.000';

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

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyW':
            if (car) car.increaseSpeed(0.3);
            break;
        case 'KeyA':
            if (car) car.setRotationSpeed(-4);
            break;
        case 'KeyS':
            if (car) car.decreaseSpeed(0.6);
            break;
        case 'KeyD':
            if (car) car.setRotationSpeed(4);
            break;
    }
});

document.addEventListener('keyup', event => {
    keysPressed[event.code] = false;

    if (event.code === 'KeyA' || event.code === 'KeyD') {
        if (car) car.setRotationSpeed(0);
    }
});

function linesIntersect(line1, line2) {
    const { p1, p2 } = line1;
    const { p1: q1, p2: q2 } = line2;

    const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);

    if (det === 0) {
        return false; // Lines are parallel
    }

    const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;

    return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}


function update() {
    if (car) {
        car.move(ctx);

        if (car.speed > 0) {
            car.rotate();
        }

        const corners = car.corners;
        const carEdges = [
            { p1: corners[0], p2: corners[1] }, // Top edge
            { p1: corners[1], p2: corners[2] }, // Right edge
            { p1: corners[2], p2: corners[3] }, // Bottom edge
            { p1: corners[3], p2: corners[0] }  // Left edge
        ];

        const hasCrossedLine = carEdges.some(edge => linesIntersect(edge, startLine));

        if (hasCrossedLine) {
            if (!lineCrossing.includes(car)) {
                console.log("Car crossed the start/finish line!");
                lineCrossing.push(car);

                if (!timerStarted) {
                    startTime = Date.now();
                    timerStarted = true;
                    console.log("Timer started!");
                } else {
                    const elapsedTime = Date.now() - startTime;
                    const minutes = Math.floor(elapsedTime / 60000);
                    const seconds = Math.floor((elapsedTime % 60000) / 1000);
                    const milliseconds = elapsedTime % 1000;
                    console.log(`Lap time: ${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`);
                    startTime = Date.now();
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
            document.getElementById('elapsed-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        }
    }
    requestAnimationFrame(update);
}

update();
