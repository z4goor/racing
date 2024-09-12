import { Car } from "./car.js";
import { Track } from "./track.js";

let socket;

function connectToServer() {
    socket = new WebSocket('ws://localhost:8000/ws'); // Replace with your server URL

    socket.onopen = function() {
        console.log('Connected to WebSocket server');
    };

    socket.onclose = function() {
        console.log('Disconnected from WebSocket server');
    };

    socket.onmessage = function(message) {
        const paresedMessage = JSON.parse(message.data);
        const event = paresedMessage.event;
        const data = paresedMessage.data;
        console.log('Message from server:', event, data);
        if (event == 'new_generation') {
            startRace();
        }
        if (event == 'game_state') {
            applyAIAction(data)
        }
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

let controlledCar = null;
let keysPressed = {};
let track = null;
let fastestLap = getFastestLap();
let raceStarted = false;

const trackConfigUrl = '../config/config.json';
const trackElementId = 'track';

const startRaceButton = document.getElementById('startRaceButton');
const addHumanButton = document.getElementById('addHumanButton');
const addAIButton = document.getElementById('addAIButton');
const restartHumanButton = document.getElementById('restartHumanButton');
const removeCarsButton = document.getElementById('removeCarsButton');
const resetButton = document.getElementById('resetFastestLapButton');
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');
const lapTime = document.getElementById('current-time')
const fastestLapTime = document.getElementById('fastest-time')

track = new Track(trackElementId, trackConfigUrl, fastestLap);

addHumanButton.addEventListener('click', function() {
    if (controlledCar) return;
    setCurrentTime(0, 0, 0);
    const car = new Car(15, 25, '#ffa12d', true);
    track.addCarToTrack(car);
    controlledCar = car;
});

addAIButton.addEventListener('click', function() {
    for (let i = 0; i < 30; i++) {
        addNewAICar();
    }
});

restartHumanButton.addEventListener('click', function() {
    if (!controlledCar) return;
    track.restartCar(controlledCar);
    setCurrentTime(0, 0, 0);
});

removeCarsButton.addEventListener('click', function() {
    track.clearTrack();
    controlledCar = null;
    raceStarted = false;
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', null);
    track.fastestLap = null;
    updateFastestLapTime(null);
});

startRaceButton.addEventListener('click', function() {
    socket.send(JSON.stringify({'event': 'model_init', 'data': 50})); // Sends the number of cars
    console.log('model_init sent');
});


document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyP':
            socket.emit('message', 'duuuupsko');
            break;
        case 'KeyM':
            connectToServer();
            break;
        case 'KeyK':
            socket.disconnect();
            break;
        case 'KeyB':
            sendGameStateToAI();
            break;
    }

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

function startRace() {
    track.clearTrack()
    for (let i = 0; i < 50; i++) {
        addNewAICar();
    }
    raceStarted = true;
    sendGameStateToAI('new_generation');
}

function addNewAICar() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
}

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

function sendGameStateToAI(event = 'game_state') {
    if (!raceStarted) return;
    let carData = track.getCarData(true);
    Object.values(carData).forEach(car => {
        console.log(car.sensors[3]); // Logs the entire fourth sensor object
    });
    socket.send(JSON.stringify({'event': event, 'data': carData}));
}

function applyAIAction(actions) {
    // console.log('actions: ', actions);
    for (const [carId, action] of Object.entries(actions)) {
        const car = track.cars.find(car => car.id == carId);
        switch (action) {
            case 'left':
                car.setRotationSpeed(-0.3);
                break;
            case 'right':
                car.setRotationSpeed(0.3);
                break;
            case 'accelerate':
                car.increaseSpeed(0.13);
                break;
            case 'brake':
                car.decreaseSpeed(0.2);
                break;
        }
    };
}

function update() {
    track.update();

    if (showSensorsCheckbox.checked) track.drawSensors();
    if (showCornersCheckbox.checked) track.drawCorners();

    updateFastestLapTime(track.fastestLap);
    if (controlledCar) updateLapTime(controlledCar.lapStartTime);

    requestAnimationFrame(update);
}

setInterval(() => {
    if (raceStarted) {
        sendGameStateToAI();
    }
}, 200);

connectToServer();
update();
