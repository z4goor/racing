export class Track {
    constructor(trackElementId, configUrl) {
        this.trackElement = document.getElementById(trackElementId);
        this.configUrl = configUrl;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        this.image = new Image();
        this.config = null;
        this.startLine = null;
        this.initialRotation = null;
        this.cars = [];

        this.initialize();
    }

    async initialize() {
        this.setupCanvas();
        await this.loadConfig();
        this.loadTrackImage();
    }

    setupCanvas() {
        this.canvas.width = this.trackElement.clientWidth;
        this.canvas.height = this.trackElement.clientHeight;
        this.trackElement.appendChild(this.canvas);
    }

    async loadConfig() {
        try {
            const response = await fetch(this.configUrl);
            this.config = await response.json();
            this.startLine = this.config.startLine;
            this.initialRotation = this.calculateInitialRotation(this.startLine);
        } catch (error) {
            console.error('Error loading track configuration:', error);
        }
    }

    calculateInitialRotation(startLine) {        
        const dx = startLine.p2.x - startLine.p1.x;
        const dy = startLine.p2.y - startLine.p1.y;
        const angleDegrees = Math.atan2(dx, -dy);        
        return (angleDegrees - Math.PI / 2) % Math.PI;
    }

    loadTrackImage() {
        this.image.src = this.config.imageUrl;
        this.image.onload = () => {
            this.drawTrackImage();
        };
    }

    drawTrackImage() {
        this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        this.cars.forEach(car => {
            lapTime = car.move(this.context, this.startLine);
        });
    }

    addCarToTrack(car) {
        car.setPosition(this.config.startPoint.x, this.config.startPoint.y);
        car.setRotation(this.initialRotation);
    }

    drawCorners(car) {
        const cornerColors = ['#ff0000', '#00ff00', '#0000ff', '#FFC0CB'];
        car.corners.forEach((corner, index) => {
            this.context.beginPath();
            this.context.arc(corner.x, corner.y, 2, 0, 2 * Math.PI);
            this.context.fillStyle = cornerColors[index];
            this.context.fill();
        });
    }

    drawSensors(car) {
        const sensorData = car.getSensorData(this.context);
        sensorData.forEach(({ distance, endX, endY }) => {
            this.context.beginPath();
            this.context.moveTo(car.x, car.y);
            this.context.lineTo(endX, endY);
            this.context.strokeStyle = 'red';
            this.context.lineWidth = 2;
            this.context.stroke();
        });
    }
}
