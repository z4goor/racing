import { Car } from "./car.js";
import { Track } from "./track.js";
import { Timer } from './timer.js';

let socket = null;
let controlledCar = null;
let keysPressed = {};
let raceStarted = false;
const trackConfig = localStorage.getItem('trackConfig');
const trackElement = document.getElementById('track');
const configsFolder = '../config';
const currentTimeElement = document.getElementById('current-time')
const fastestTimeElement = document.getElementById('fastest-time')
const timer = new Timer(currentTimeElement, fastestTimeElement);
const track = new Track(trackElement, timer.fastestLap);

const startRaceButton = document.getElementById('startRaceButton');
const startRaceSidebar = document.getElementById('startRaceSidebar');
const startRaceSubmitButton = document.getElementById('startRaceSubmitButton');

const addHumanButton = document.getElementById('addHumanButton');
const addAIButton = document.getElementById('addAIButton');
const restartHumanButton = document.getElementById('restartHumanButton');
const removeCarsButton = document.getElementById('removeCarsButton');
const resetButton = document.getElementById('resetFastestLapButton');

const changeTrackButton = document.getElementById('changeTrackButton');
const trackSidebar = document.getElementById('trackSidebar');

const showSensorsCheckbox = document.getElementById('showSensorsCheckbox');
const showCornersCheckbox = document.getElementById('showCornersCheckbox');

const closeStartRaceButton = document.querySelector('#startRaceSidebar .close-btn');
closeStartRaceButton.addEventListener('click', function() {
    startRaceSidebar.classList.remove('show');
});

const closeTrackButton = document.querySelector('#trackSidebar .close-btn');
closeTrackButton.addEventListener('click', function() {
    trackSidebar.classList.remove('show');
});

const trackConfigUrl = await loadAllConfigs();
if (trackConfig) {
    track.setup(trackConfig);
} else {
    track.setup(trackConfigUrl);
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

addHumanButton.addEventListener('click', function() {
    if (controlledCar) return;
    const car = new Car(15, 25, '#ffa12d', true);
    track.addCarToTrack(car);
    controlledCar = car;
});

addAIButton.addEventListener('click', function() {
    const car = new Car(15, 25, '#fcff2d');
    track.addCarToTrack(car);
});

restartHumanButton.addEventListener('click', function() {
    if (!controlledCar) return;
    track.restartCar(controlledCar);
});

removeCarsButton.addEventListener('click', function() {
    resetCars();
});

resetButton.addEventListener('click', function() {
    localStorage.setItem('fastestLap', null);
    track.fastestLap = null;
    updateFastestLapTime(null);
});

startRaceButton.addEventListener('click', function() {
    startRaceSidebar.classList.toggle('show');
});

startRaceSubmitButton.addEventListener('click', async function() {
    const generationSize = document.getElementById('generationSize').value;
    const numGenerations = document.getElementById('numGenerations').value;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Connecting to server...');
        await connectToServer();
    }

    send('model_init', { generationSize: parseInt(generationSize), numGenerations: parseInt(numGenerations) });

    sidebar.classList.remove('show');
});

changeTrackButton.addEventListener('click', function() {
    trackSidebar.classList.toggle('show');
});

document.addEventListener('keydown', event => {
    keysPressed[event.code] = true;

    switch (event.code) {
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

function connectToServer() {
    return new Promise((resolve, reject) => {
        socket = new WebSocket('ws://localhost:8000/ws');

        socket.onopen = function() {
            console.log('Connected to WebSocket server');
            resolve();
        };

        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
            reject(error);
        };

        socket.onclose = function() {
            console.log('Disconnected from WebSocket server');
        };

        socket.onmessage = function(message) {
            const parsedMessage = JSON.parse(message.data);
            const event = parsedMessage.event;
            const data = parsedMessage.data;

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
        };
    });
}

function send(event, data) {
    socket.send(JSON.stringify({'event': event, 'data': data}));
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
    send('game_state', track.getCarData(true));
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
