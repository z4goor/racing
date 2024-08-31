export class Track {
    constructor(trackElementId, configUrl, fastestLapTime) {
        this.trackElement = document.getElementById(trackElementId);
        this.configUrl = configUrl;
        this.fastestLap = fastestLapTime;
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
            this.moveCar(car);
            this.drawCar(car);
        });
    }

    moveCar(car) {
        const corners = car.corners;
        const vector = car.movementVector;

        if (this.checkCollision(car.corners, vector)) {
            return car.stop();
        }

        car.move(vector);
        if (!this.isCarCrossingLine(corners)) {
            car.setCrossingLine(false);
            return;
        }
        
        if (!car.crossingLine) {
            car.setCrossingLine(true);
            if (this.checkAppropriateDirection(car)) {
                if (!car.reverseMove) {
                    const previousLapTime = car.startLap();
                    if (previousLapTime && (!this.fastestLap || previousLapTime < this.fastestLap)) {
                        this.fastestLap = previousLapTime;
                    }
                } else {
                    car.setReverseMove(false);
                }
            } else {
                car.setReverseMove(true);
            }
        }
    }

    addCarToTrack(car) {
        car.setPosition(this.config.startPoint.x, this.config.startPoint.y);
        car.setRotation(this.initialRotation);
        this.cars.push(car);
    }

    removeCar(car) {
        this.cars.pop(car);
    }

    checkCollision(corners, vector) {
        return corners.some(corner => this.isCollision(corner, vector));
    }

    isCollision(point, vector = { x: 0, y: 0}) {
        const imageData = this.context.getImageData(point.x + vector.x, point.y + vector.y, 1, 1);
        const [r, g, b] = imageData.data;
        return r === 0 && g === 0 && b === 0;
    }

    isCarCrossingLine(carCorners) {
        const { p1, p2 } = this.startLine;
        const lineStart = { x: p1.x, y: p1.y };
        const lineEnd = { x: p2.x, y: p2.y };
        return this.isLineIntersect(carCorners[0], carCorners[1], lineStart, lineEnd) ||
               this.isLineIntersect(carCorners[1], carCorners[2], lineStart, lineEnd) ||
               this.isLineIntersect(carCorners[2], carCorners[3], lineStart, lineEnd) ||
               this.isLineIntersect(carCorners[3], carCorners[0], lineStart, lineEnd);
    }

    isLineIntersect(p1, p2, q1, q2) {
        const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
        if (det === 0) return false;
        const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
        return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
    }

    checkAppropriateDirection(car) {
        const minRotation = this.initialRotation - Math.PI / 2;
        const maxRotation = this.initialRotation + Math.PI / 2;
        const rotation = car.rotation % Math.PI * Math.sign(car.speed);
        return rotation >= minRotation && rotation <= maxRotation;
    }

    getSensorData(car) {
        const sensorAngles = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];

        const sensorData = sensorAngles.map(angle => {
            const radAngle = car.rotation + angle;
            let distance = 0;
            let sensorX, sensorY;

            while (true) {
                sensorX = car.x + distance * Math.sin(radAngle);
                sensorY = car.y - distance * Math.cos(radAngle);
                if (this.isCollision({ x: sensorX, y: sensorY})) {
                    break;
                }
                distance++;
            }
            return { distance, endX: sensorX, endY: sensorY };
        });

        return sensorData;
    }

    drawCar(car) {
        this.context.save();
        this.context.translate(car.x, car.y);
        this.context.rotate(car.rotation);
        this.context.fillStyle = car.color;
        this.context.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
        this.context.restore();
    }

    drawCorners() {
        this.cars.forEach(car => {
            const cornerColors = ['#ff0000', '#00ff00', '#0000ff', '#FFC0CB'];
            car.corners.forEach((corner, index) => {
                this.context.beginPath();
                this.context.arc(corner.x, corner.y, 2, 0, 2 * Math.PI);
                this.context.fillStyle = cornerColors[index];
                this.context.fill();
            });
        });
    }

    drawSensors() {
        this.cars.forEach(car => {
            const sensorData = this.getSensorData(car);
            sensorData.forEach(({ distance, endX, endY }) => {
                this.context.beginPath();
                this.context.moveTo(car.x, car.y);
                this.context.lineTo(endX, endY);
                this.context.strokeStyle = 'red';
                this.context.lineWidth = 2;
                this.context.stroke();
            });
        });
    }
}
