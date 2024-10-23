import { Car } from "./car.js";
import { Track } from "./track.js";
import { Timer } from './timer.js';
import { Socket } from "./socket.js";
import { InfoPanel } from './infoPanel.js';
import { AiTrainingSidebar } from './aiTrainingSidebar.js';
import { TrackSidebar } from './trackSidebar.js';

let keysPressed = {};

const timer = new Timer(
    document.getElementById('current-time'),
    document.getElementById('fastest-time')
);

let socket = new Socket(
    'ws://localhost:8000/ws',
    onSocketMessage,
    onSocketClose
);

const track = new Track(
    document.getElementById('track'),
    timer.fastestLap,
    socket
);

const aiTrainingSidebar = await AiTrainingSidebar.create(document.getElementById('aiTrainingSidebar'), startTraining);
const trackSidebar = await TrackSidebar.create(document.getElementById('trackSidebar'), track, resetCars);
const infoPanel = new InfoPanel(document.getElementById('info-panel'));
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');

document.getElementById('addHumanButton').addEventListener('click', function() {
    if (track.controlledCar) return;
    const car = new Car(15, 25, '#ffa12d', true);
    track.addCarToTrack(car);
    track.controlledCar = car;
});

document.getElementById('addAIButton').addEventListener('click', function() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
});

document.getElementById('restartHumanButton').addEventListener('click', function() {
    if (!track.controlledCar) return;
    track.restartCar(track.controlledCar);
});

document.getElementById('removeCarsButton').addEventListener('click', function() {
    resetCars();
});

document.getElementById('resetFastestLapButton').addEventListener('click', function() {
    localStorage.setItem('fastestLap', null);
    track.fastestLap = null;
});

document.getElementById('aiTrainingButton').addEventListener('click', function() {
    aiTrainingSidebar.toggle();
});

document.getElementById('changeTrackButton').addEventListener('click', function() {
    trackSidebar.toggle();
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
        case 'KeyM':
            socket.connect();
            break;
        case 'KeyK':
            socket.disconnect();
            break;
        case 'KeyB':
            sendGameStateToAI();
            break;
    }

    if (!track.controlledCar) return;
    switch (event.code) {
        case 'KeyW':
            track.controlledCar.increaseSpeed(0.6);
            break;
        case 'KeyA':
            track.controlledCar.setRotationSpeed(-4.3);
            break;
        case 'KeyS':
            track.controlledCar.decreaseSpeed(0.8);
            break;
        case 'KeyD':
            track.controlledCar.setRotationSpeed(4.3);
            break;
        case 'KeyX':
            showSensorsCheckbox.checked = !showSensorsCheckbox.checked;
            break;
        case 'KeyC':
            showCornersCheckbox.checked = !showCornersCheckbox.checked;
            break;
        case 'Space':
            track.controlledCar.x -= 200;
            break;
    }
});

document.addEventListener('keyup', event => {
    keysPressed[event.code] = false;
    if (track.controlledCar && (event.code === 'KeyA' || event.code === 'KeyD')) {
        track.controlledCar.setRotationSpeed(0);
    }
});

function onSocketMessage(parsedMessage) {
    const { event, data } = parsedMessage;
    // console.log('Received ' + event + ' message. ');

    if (event === 'new_generation') {
        startGeneration(data);
    } else if (event === 'car_action') {
        applyAIAction(data);
    } else if (event === 'game_state') {
        sendGameStateToAI();
    } else if (event === 'start') {
        infoPanel.updateGenerationNumber(data.number + 1);
        track.raceStarted = true;
    } else if (event === 'stop') {
        track.clearTrack();
        track.raceStarted = false;
    } else if (event === 'stats') {
        infoPanel.updateStats(data);
    } else {
        console.log('Unknown message', event, data);
    }
}

function onSocketClose() {
    track.raceStarted = false;
    track.clearTrack();
}

async function startTraining(size, length) {
    if (!socket.isConnected()) {
        await socket.connect();
    }
    infoPanel.show();
    infoPanel.setNumberOfGenerations(length);
    socket.send('model_init', { generationSize: parseInt(size), numGenerations: parseInt(length) });
    aiTrainingSidebar.toggle();
}

function startGeneration(data) {
    track.clearTrack()
    for (let i = 0; i < data.size; i++) {
        addNewAICar();
    }
    track.raceStarted = true;
}

function addNewAICar() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
}

function resetCars() {
    track.clearTrack();
    track.controlledCar = null;
    track.raceStarted = false;
}

function applyAIAction(actions) {
    for (const [carId, action] of Object.entries(actions)) {
        const car = track.cars.find(car => car.id == carId);
        if (!car || car.collision) {
            continue
        }

        if (action[0]) {
            if (action[0] > 0) {
                car.increaseSpeed(0.09 * action[0]);
            } else {
                car.decreaseSpeed(-0.12 * action[0]);
            }
        }

        if (action[1]) {
            car.setRotationSpeed(4.5 * action[1]);
        }
    };
}

function update() {
    track.update();
    if (showSensorsCheckbox.checked) track.drawSensors();
    if (showCornersCheckbox.checked) track.drawCorners();
    timer.update(track.controlledCar, track);

    requestAnimationFrame(update);
}

update();
