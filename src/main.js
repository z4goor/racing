import { Car } from "./car.js";
import { Track } from "./track.js";

let controlledCar = null;
let keysPressed = {};
let track = null;
let fastestLap = getFastestLap();

const trackConfigUrl = '../config/config.json';
const trackElementId = 'track';

const startButton = document.getElementById('startButton');
const removeCarButton = document.getElementById('removeCarButton');
const resetButton = document.getElementById('resetFastestLapButton');
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');
const lapTime = document.getElementById('current-time')
const fastestLapTime = document.getElementById('fastest-time')

track = new Track(trackElementId, trackConfigUrl, fastestLap);

startButton.addEventListener('click', function() {
    setCurrentTime(0, 0, 0);
    const car = new Car(15, 25, '#fcff2d');
    if (!controlledCar) controlledCar = car;
    track.addCarToTrack(car);
});

removeCarButton.addEventListener('click', function() {
    track.removeCar(controlledCar);
    controlledCar = null;
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', null);
    track.fastestLap = null;
    updateFastestLapTime(null);
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    if (!controlledCar) return;
    switch (event.code) {
        case 'KeyW':
            controlledCar.increaseSpeed(0.5);
            break;
        case 'KeyA':
            controlledCar.setRotationSpeed(-4.2);
            break;
        case 'KeyS':
            controlledCar.decreaseSpeed(0.8);
            break;
        case 'KeyD':
            controlledCar.setRotationSpeed(4.2);
            break;
        case 'KeyX':
            showSensorsCheckbox.checked = !showSensorsCheckbox.checked;
            break;
        case 'KeyC':
            showCornersCheckbox.checked = !showCornersCheckbox.checked;
            break;
        case 'Space':
            controlledCar.x -= 200;
            break;
    }
});

document.addEventListener('keyup', event => {
    keysPressed[event.code] = false;
    if (controlledCar && (event.code === 'KeyA' || event.code === 'KeyD')) {
        controlledCar.setRotationSpeed(0);
    }
});

function getFastestLap() {
    const value = localStorage.getItem('fastestLap');
    return value ? parseInt(value, 10) : null;
}

function updateFastestLapTime(time) {
    if (!fastestLap || time < fastestLap) {
        saveFastestLap(time);
    }
    const displayTime = time ? `${Math.floor(time / 60000)}:${(Math.floor((time % 60000) / 1000)).toString().padStart(2, '0')}.${(time % 1000).toString().padStart(3, '0')}` : '0:00.000';
    fastestLapTime.textContent = displayTime;
}

function saveFastestLap(time) {
    localStorage.setItem('fastestLap', time);
    fastestLap = time;
}

function updateLapTime(lapTimeStart) {
    if (!lapTimeStart) {
        return;
    }
    const elapsedTime = Date.now() - lapTimeStart;
    lapTime.textContent = `${Math.floor(elapsedTime / 60000)}:${(Math.floor((elapsedTime % 60000) / 1000)).toString().padStart(2, '0')}.${(elapsedTime % 1000).toString().padStart(3, '0')}`;
}

function setCurrentTime(min, sec, ms) {
    document.getElementById('current-time').textContent = `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function sendGameStateToAI() {
    if (!controlledCar) return;

    const sensors = controlledCar.getSensorData(track.getContext()).map(sensor => sensor.distance);
    fetch('http://localhost:5000/game-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "speed": controlledCar.speed, "sensors": sensors }),
    })
        .then(response => response.json())
        .then(data => applyAIAction(data))
        .catch(error => console.log('error'));
}

function applyAIAction(action) {
    if (!controlledCar) return;
    console.log(action);
    switch (action) {
        case 'left':
            controlledCar.setRotationSpeed(-1.8);
            break;
        case 'right':
            controlledCar.setRotationSpeed(1.8);
            break;
        case 'accelerate':
            controlledCar.increaseSpeed(0.1);
            break;
    }
}

function update() {
    track.update();

    if (showSensorsCheckbox.checked) track.drawSensors();
    if (showCornersCheckbox.checked) track.drawCorners();

    updateFastestLapTime(track.fastestLap);
    if (controlledCar) updateLapTime(controlledCar.lapStartTime);

    requestAnimationFrame(update);
}

update();
