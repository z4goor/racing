import { Car } from "./car.js";

let car;
let keysPressed = {};

const startButton = document.getElementById('startButton');
const removeButton = document.getElementById('removeButton');
const track = document.getElementById('track');

startButton.addEventListener('click', function() {
    if (car) {
        track.removeChild(car.element);
        car = null;
    }
    car = new Car(15, 25, 'red');

    const trackRect = track.getBoundingClientRect();
    const centerX = (trackRect.width - car.width) / 2;
    const centerY = (trackRect.height - car.height) / 2;

    car.setPosition(centerX, centerY);
    car.addToTrack(track);
    car.setRotation(0);
    car.setRotationSpeed(0);
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyW':
            if (car) car.increaseSpeed(2);
            break;
        case 'KeyA':
            if (car) car.setRotationSpeed(-2);
            break;
        case 'KeyS':
            if (car) car.decreaseSpeed(2);
            break;
        case 'KeyD':
            if (car) car.setRotationSpeed(2);
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
