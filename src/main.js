import { Car } from "./car.js";

let car;
let keysPressed = {};
let trackConfig;

fetch('../config.json')
    .then(response => response.json())
    .then(data => {
        trackConfig = data;
    });

const startButton = document.getElementById('startButton');
const track = document.getElementById('track');
track.style.backgroundImage = "url('../track001.png')";

startButton.addEventListener('click', function() {
    if (car) {
        track.removeChild(car.element);
        car = null;
    }
    car = new Car(15, 25, '#fcff2d');

    const trackRect = track.getBoundingClientRect();

    car.setPosition(trackConfig.startPoint.x, trackConfig.startPoint.y);
    car.addToTrack(track);
    car.setRotation(trackConfig.startPoint.rotation);
    car.setRotationSpeed(0);
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyW':
            if (car) car.increaseSpeed(0.5);
            break;
        case 'KeyA':
            if (car) car.setRotationSpeed(-3);
            break;
        case 'KeyS':
            if (car) car.decreaseSpeed(0.75);
            break;
        case 'KeyD':
            if (car) car.setRotationSpeed(3);
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
        car.move();

        if (car.speed > 0) {
            car.rotate();
        }
    }
    requestAnimationFrame(update);
}

update();
