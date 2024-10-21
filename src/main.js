import { Car } from "./car.js";
import { Track } from "./track.js";
import { Timer } from './timer.js';
import { Socket } from "./socket.js";
import { InfoPanel } from './infoPanel.js';
import { TrackSidebar } from './trackSidebar.js';
import { Menu } from './menu.js';

let controlledCar = null;
let keysPressed = {};
let raceStarted = false;

const startRaceSidebar = document.getElementById('startRaceSidebar');
const trackSidebar = document.getElementById('trackSidebar');
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');


const timer = new Timer(
    document.getElementById('current-time'),
    document.getElementById('fastest-time')
);

const track = new Track(
    document.getElementById('track'),
    timer.fastestLap
);

const trackSidebarV2 = new TrackSidebar(document.getElementById('trackSidebar'), track, resetCars);
trackSidebarV2.initialize();
const infoPanel = new InfoPanel(document.getElementById('info-panel'));

let socket = new Socket(
    'ws://localhost:8000/ws',
    onSocketMessage,
    onSocketClose
);

document.querySelector('#startRaceSidebar .close-btn').addEventListener('click', function() {
    startRaceSidebar.classList.remove('show');
});

document.querySelector('#trackSidebar .close-btn').addEventListener('click', function() {
    trackSidebar.classList.remove('show');
});

document.getElementById('addHumanButton').addEventListener('click', function() {
    if (controlledCar) return;
    const car = new Car(15, 25, '#ffa12d', true);
    track.addCarToTrack(car);
    controlledCar = car;
});

document.getElementById('addAIButton').addEventListener('click', function() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
});

document.getElementById('restartHumanButton').addEventListener('click', function() {
    if (!controlledCar) return;
    track.restartCar(controlledCar);
});

document.getElementById('removeCarsButton').addEventListener('click', function() {
    resetCars();
});

document.getElementById('resetFastestLapButton').addEventListener('click', function() {
    localStorage.setItem('fastestLap', null);
    track.fastestLap = null;
});

document.getElementById('startRaceButton').addEventListener('click', function() {
    startRaceSidebar.classList.toggle('show');
});

document.getElementById('startRaceSubmitButton').addEventListener('click', async function() {
    const generationSize = document.getElementById('generationSize').value;
    const numGenerations = document.getElementById('numGenerations').value;

    if (!socket.isConnected()) {
        await socket.connect();
    }

    infoPanel.setNumberOfGenerations(numGenerations);
    socket.send('model_init', { generationSize: parseInt(generationSize), numGenerations: parseInt(numGenerations) });
    startRaceSidebar.classList.remove('show');
});

document.getElementById('changeTrackButton').addEventListener('click', function() {
    trackSidebar.classList.toggle('show');
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

    if (!controlledCar) return;
    switch (event.code) {
        case 'KeyW':
            controlledCar.increaseSpeed(0.6);
            break;
        case 'KeyA':
            controlledCar.setRotationSpeed(-4.3);
            break;
        case 'KeyS':
            controlledCar.decreaseSpeed(0.8);
            break;
        case 'KeyD':
            controlledCar.setRotationSpeed(4.3);
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
        infoPanel.updateGeneration(data.number + 1);
        infoPanel.show();
        raceStarted = true;
    } else if (event === 'stop') {
        track.clearTrack();
        raceStarted = false;
    }
}

function onSocketClose() {
    raceStarted = false;
    track.clearTrack();
}

function startGeneration(data) {
    startRace(data.size);
}

function startRace(n) {
    track.clearTrack()
    for (let i = 0; i < n; i++) {
        addNewAICar();
    }
    sendGameStateToAI();
}

function addNewAICar() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
}

function resetCars() {
    track.clearTrack();
    controlledCar = null;
    raceStarted = false;
}

function sendGameStateToAI() {
    // console.time('sending');
    socket.send('game_state', track.getCarData(true));
    // console.timeEnd('sending');
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
    if (raceStarted) {
        sendGameStateToAI();
    }

    if (showSensorsCheckbox.checked) track.drawSensors();
    if (showCornersCheckbox.checked) track.drawCorners();

    timer.update(controlledCar, track);

    requestAnimationFrame(update);
}

update();
