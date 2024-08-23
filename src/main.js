import { Car } from "./car.js";

let car;
let keysPressed = {};
let trackConfig;

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

startButton.addEventListener('click', function() {
    if (!trackConfig) {
        console.error('Track configuration not loaded.');
        return;
    }

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
            if (car) car.increaseSpeed(0.4);
            break;
        case 'KeyA':
            if (car) car.setRotationSpeed(-4);
            break;
        case 'KeyS':
            if (car) car.decreaseSpeed(0.75);
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

function update() {
    if (car) {
        car.move(ctx);

        if (car.speed > 0) {
            car.rotate();
        }
    }
    requestAnimationFrame(update);
}

update();
