export class Track {
    constructor(trackElementId, configUrl, imageUrl) {
        this.trackElement = document.getElementById(trackElementId);
        this.configUrl = configUrl;
        this.imageUrl = imageUrl;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.trackImage = new Image();
        this.config = null;
        this.startLine = null;

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
        } catch (error) {
            console.error('Error loading track configuration:', error);
        }
    }

    loadTrackImage() {
        this.trackImage.src = this.imageUrl;
        this.trackImage.onload = () => {
            this.drawTrackImage();
        };
    }

    drawTrackImage() {
        this.ctx.drawImage(this.trackImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    getStartLine() {
        return this.startLine;
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }

    getTrackImage() {
        return this.trackImage;
    }

    getConfig() {
        return this.config;
    }

    addCarToTrack(car) {
        car.setPosition(this.config.startPoint.x, this.config.startPoint.y);
        car.setRotation(this.config.startPoint.rotation * Math.PI / 180)
    }

    drawCorners(car) {
        const cornerColors = ['#ff0000', '#00ff00', '#0000ff', '#FFC0CB'];
        car.corners.forEach((corner, index) => {
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, 2, 0, 2 * Math.PI);
            this.ctx.fillStyle = cornerColors[index];
            this.ctx.fill();
        });
    }

    drawSensors(car) {
        const sensorData = car.getSensorData(this.ctx);
        sensorData.forEach(({ distance, endX, endY }) => {
            this.ctx.beginPath();
            this.ctx.moveTo(car.x, car.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }
}
