export class Track {
    constructor(trackElement, fastestLapTime) {
        this.trackElement = trackElement;
        this.fastestLap = fastestLapTime;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        this.image = new Image();
        this.config = null;
        this.startLine = null;
        this.initialRotation = null;
        this.array = null;
        this.cars = [];
    }

    async setupTrack(configUrl) {
        this.config = await this.loadConfig(configUrl);
        this.trackElement.innerHTML = '';
        this.startLine = this.config.startLine;
        this.initialRotation = this.calculateInitialRotation(this.startLine);
        this.loadTrackImage();
    }

    calculateInitialRotation(startLine) {
        const lineMidpoint = {
            x: (startLine.p1.x + startLine.p2.x) / 2,
            y: (startLine.p1.y + startLine.p2.y) / 2
        };
        const dx = lineMidpoint.x - this.config.startPoint.x;
        const dy = lineMidpoint.y - this.config.startPoint.y;
        const angle = Math.atan2(dy, dx);
        return ((angle + 2 * Math.PI) % (2 * Math.PI)) + Math.PI / 2;
    }

    loadTrackImage() {
        this.image.src = this.config.imageUrl;
        this.image.onload = () => {
            const canvas = this.setupCanvas(this.image.width, this.image.height);
            this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
            this.array = this.preprocessTrackData();
        };
    }

    setupCanvas(imageWidth, imageHeight) {
        this.canvas.width = imageWidth;
        this.canvas.height = imageHeight;
        this.trackElement.style.width = `${imageWidth}px`;
        this.trackElement.style.height = `${imageHeight}px`;
        this.trackElement.appendChild(this.canvas);
    }

    preprocessTrackData() {
        const trackWidth = this.canvas.width;
        const trackHeight = this.canvas.height;
        const imageData = this.context.getImageData(0, 0, trackWidth, trackHeight);
        const data = imageData.data;
        const trackArray = [];
    
        for (let y = 0; y < trackHeight; y++) {
            const row = [];
            for (let x = 0; x < trackWidth; x++) {
                const index = (y * trackWidth + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                if (r === 0 && g === 0 && b === 0) {
                    row.push(1);
                } else {
                    row.push(0);
                }
            }
            trackArray.push(row);
        }
        return trackArray;
    }

    async loadConfig(configUrl) {
        try {
            const response = await fetch(configUrl);
            return await response.json();
        } catch (error) {
            console.error('Error loading track configuration:', error);
        }
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        this.cars.forEach(car => {
            this.moveCar(car);
            this.updateCarSensors(car);
            this.drawCar(car);
        });
    }

    moveCar(car) {
        const corners = car.corners;
        const vector = car.movementVector;
        
        if (this.checkCollision(car.corners, vector)) return car.collide();
        
        car.move(vector);
        
        if (!this.isAnyCornerCrossingLine(corners, vector)) {
            return;
        }
    
        const { p1, p2 } = this.startLine;
        const carPosition = { x: car.x, y: car.y };
        const startPoint = this.config.startPoint;
    
        if (this.isSameSideOfLine(p1, p2, carPosition, startPoint)) {
            if (!this.isStartLineBetweenFrontAndRear(corners)) {
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
            } else {
                car.setReverseMove(true);
            }
        } else {
            if (!this.isStartLineBetweenFrontAndRear(corners)) {
                if (!this.checkAppropriateDirection(car)) {
                    if (!car.reverseMove) {
                        car.setReverseMove(true);
                    }
                }
            }
        }
    }

    isAnyCornerCrossingLine(corners, vector) {
        const { p1, p2 } = this.startLine;
    
        return corners.some(corner => {
            const movedCorner = {
                x: corner.x + vector.x,
                y: corner.y + vector.y
            };
    
            return this.isLineIntersect(corner, movedCorner, p1, p2);
        });
    }

    isSameSideOfLine(p1, p2, pointA, pointB) {
        function crossProduct(p1, p2, point) {
            return (p2.x - p1.x) * (point.y - p1.y) - (p2.y - p1.y) * (point.x - p1.x);
        }

        const cp1 = crossProduct(p1, p2, pointA);
        const cp2 = crossProduct(p1, p2, pointB);
        return (cp1 * cp2 >= 0);
    }    

    isStartLineBetweenFrontAndRear(corners) {
        const { p1, p2 } = this.startLine;
        const lineStart = { x: p1.x, y: p1.y };
        const lineEnd = { x: p2.x, y: p2.y };
    
        const frontLeft = corners[0];
        const rearRight = corners[3];
        const rearLeft = corners[2];
        const frontRight = corners[1];
    
        return this.isLineIntersect(frontLeft, rearRight, lineStart, lineEnd) ||
               this.isLineIntersect(rearLeft, frontRight, lineStart, lineEnd);
    }
    
    addCarToTrack(car) {
        car.setPosition(this.config.startPoint.x, this.config.startPoint.y);
        car.setRotation(this.initialRotation);
        car.sensors = this.getSensorData(car);
        this.cars.push(car);
    }

    removeCar(car) {
        this.cars.pop(car);
    }

    clearTrack() {
        this.cars = [];
    }

    restartCar(car) {
        car.stop();
        car.setPosition(this.config.startPoint.x, this.config.startPoint.y);
        car.setRotation(this.initialRotation);
        car.lapStartTime = null;
    }

    checkCollision(corners, vector) {
        return corners.some(corner => this.isCollision(corner, vector));
    }

    isCollision(point, vector = { x: 0, y: 0}) {
        return this.array[Math.floor(point.y + vector.y)][Math.floor(point.x + vector.x)] == 1
    }

    isLineIntersect(p1, p2, q1, q2) {
        const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
        if (det === 0) return false;
        const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
        return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
    }

    checkAppropriateDirection(car) {
        const normalizeAngle = (angle) => (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const carRotation = normalizeAngle(car.rotation * Math.sign(car.speed));
        const trackRotation = normalizeAngle(this.initialRotation);
        const angleDifference = Math.abs(carRotation - trackRotation);
        const adjustedDifference = Math.min(angleDifference, 2 * Math.PI - angleDifference);    
        return adjustedDifference <= Math.PI / 2;
    }

    updateCarSensors(car) {
        car.sensors = this.getSensorData(car);
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

    getCarData(skipHuman = false) {
        let cars = skipHuman ? this.cars.filter(car => !car.humanControlled) : this.cars;
    
        return cars.reduce((acc, car) => {
            acc[car.id] = {
                speed: car.speed,
                sensors: car.sensors,
                collision: car.collision
            };
            return acc;
        }, {});
    }

    drawCar(car) {
        this.context.save();
        this.context.translate(car.x, car.y);
        this.context.rotate(car.rotation);
        this.context.fillStyle = (car.collision && car.speed == 0) ? '#C6C5A4' : car.color;
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
            const sensorData = car.sensors;
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
