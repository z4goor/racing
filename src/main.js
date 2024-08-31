import { Car } from "./car.js";
import { Track } from "./track.js";

let car = null;
let keysPressed = {};
let track = null;
let fastestLap = null;

const trackConfigUrl = '../config/config.json';
const trackElementId = 'track';

track = new Track(trackElementId, trackConfigUrl);

const startButton = document.getElementById('startButton');
const removeCarButton = document.getElementById('removeCarButton');
const resetButton = document.getElementById('resetFastestLapButton');
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');

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
            car.setRotationSpeed(-4.2);
            break;
        case 'KeyS':
            car.decreaseSpeed(0.8);
            break;
        case 'KeyD':
            car.setRotationSpeed(4.2);
            break;
        case 'KeyX':
            showSensorsCheckbox.checked = !showSensorsCheckbox.checked;
            break;
        case 'KeyC':
            showCornersCheckbox.checked = !showCornersCheckbox.checked;
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
        const lapTime = car.move(track.context, track.startLine, track.initialRotation);
        
        if (lapTime && (!fastestLap || lapTime < fastestLap)) {
            saveFastestLap(lapTime);
        }

        if (showSensorsCheckbox.checked) track.drawSensors(car);
        if (showCornersCheckbox.checked) track.drawCorners(car);
    }
    requestAnimationFrame(update);
}

update();
