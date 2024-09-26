import { Car } from "./car.js";
import { Track } from "./track.js";
import { Timer } from './timer.js';
import { Socket } from "./socket.js";

let controlledCar = null;
let keysPressed = {};
let raceStarted = false;

const startRaceSidebar = document.getElementById('startRaceSidebar');
const trackSidebar = document.getElementById('trackSidebar');
const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');
const trackConfig = localStorage.getItem('trackConfig');
const configsFolder = '../config';

const timer = new Timer(
    document.getElementById('current-time'),
    document.getElementById('fastest-time')
);

const track = new Track(
    document.getElementById('track'),
    timer.fastestLap
);

const trackConfigUrl = await loadAllConfigs();
if (trackConfig) {
    track.setup(trackConfig);
} else {
    track.setup(trackConfigUrl);
}

let socket = new Socket(
    'ws://localhost:8000/ws',
    onSocketMessage
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
    updateFastestLapTime(null);
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
            controlledCar.setRotationSpeed(-4.5);
            break;
        case 'KeyS':
            controlledCar.decreaseSpeed(0.8);
            break;
        case 'KeyD':
            controlledCar.setRotationSpeed(4.5);
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

    if (event === 'new_generation') {
        startGeneration(data);
    } else if (event === 'car_action') {
        applyAIAction(data);
    } else if (event === 'game_state') {
        sendGameStateToAI();
    } else if (event === 'start') {
        raceStarted = true;
    } else if (event === 'stop') {
        track.clearTrack();
        raceStarted = false;
    }
}

async function loadAllConfigs() {
    try {
        const response = await fetch(`${configsFolder}/config_list.json`);
        const configFiles = await response.json();

        const trackConfigs = await Promise.all(
            configFiles.map(async (configFile) => {
                const configResponse = await fetch(`${configsFolder}/${configFile}`);
                const configData = await configResponse.json();
                return {
                    configUrl: `${configsFolder}/${configFile}`,
                    imageUrl: configData.imageUrl
                };
            })
        );

        loadTrackImages(trackConfigs);
        return trackConfigs[0].configUrl;
    } catch (error) {
        console.error("Error loading configs:", error);
        return null;
    }
}

function loadTrackImages(trackConfigs) {
    const trackImagesContainer = document.getElementById('track-images');
    trackImagesContainer.innerHTML = '';

    trackConfigs.forEach(trackConfig => {
        const imgElement = document.createElement('img');
        imgElement.src = trackConfig.imageUrl;
        imgElement.alt = trackConfig.name;
        imgElement.addEventListener('click', () => {
            loadNewTrack(trackConfig.configUrl);
        });
        trackImagesContainer.appendChild(imgElement);
    });
}

function loadNewTrack(configUrl) {
    localStorage.setItem('trackConfig', configUrl);
    resetCars();
    track.setup(configUrl);
}

function startGeneration(n) {
    startRace(n);
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
