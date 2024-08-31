export class Car {
    constructor(width, height, color) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.crossingLine = false;
        this.reverseMove = false;
        this.lapStartTime = null;
    }

    get corners() {
        const sinRotation = Math.sin(this.rotation);
        const cosRotation = Math.cos(this.rotation);

        const rearLeft = {
            x: this.x - (this.width / 2) * cosRotation + (this.height / 2) * sinRotation,
            y: this.y - (this.width / 2) * sinRotation - (this.height / 2) * cosRotation
        };

        const rearRight = {
            x: this.x + (this.width / 2) * cosRotation + (this.height / 2) * sinRotation,
            y: this.y + (this.width / 2) * sinRotation - (this.height / 2) * cosRotation
        };

        const frontRight = {
            x: this.x + (this.width / 2) * cosRotation - (this.height / 2) * sinRotation,
            y: this.y + (this.width / 2) * sinRotation + (this.height / 2) * cosRotation
        };

        const frontLeft = {
            x: this.x - (this.width / 2) * cosRotation - (this.height / 2) * sinRotation,
            y: this.y - (this.width / 2) * sinRotation + (this.height / 2) * cosRotation
        };

        return [frontLeft, frontRight, rearLeft, rearRight];
    }

    increaseSpeed(amount) {
        this.speed += amount;
    }

    decreaseSpeed(amount) {
        if (this.speed > 0) {
            this.speed = Math.max(0, this.speed - amount);
        } else {
            this.speed -= amount;
        }
    }

    setRotationSpeed(speed) {
        if (this.speed != 0) {
            this.rotationSpeed = speed;
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setRotation(rotation) {
        this.rotation = rotation;
    }

    move(context, startLine, initialRotation) {
        let lapTime = null;
        const nextX = this.x + this.speed * Math.sin(this.rotation);
        const nextY = this.y - this.speed * Math.cos(this.rotation);

        const originalX = this.x;
        const originalY = this.y;
        this.x = nextX;
        this.y = nextY;

        if (this.checkCollision(context)) {
            this.x = originalX;
            this.y = originalY;
            this.speed = 0;
            this.rotationSpeed = 0;
        } else {
            if (this.isCrossingLine(startLine)) {
                if (!this.crossingLine) {
                    this.crossingLine = true;
                    if (this.checkAppropriateDirection(initialRotation)) {
                        if (!this.reverseMove) {
                            lapTime = this.startLap();
                        } else {
                            this.reverseMove = false;
                        }
                    } else {
                        this.reverseMove = true;
                    }
                }
            } else {
                this.crossingLine = false;
            }
        }

        this.rotate();
        this.draw(context);
        return lapTime;
    }

    checkCollision(context) {
        return this.corners.some(corner => this.isCollision(context, corner.x, corner.y));
    }

    isCollision(context, x, y) {
        const imageData = context.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        return r === 0 && g === 0 && b === 0;
    }

    checkAppropriateDirection(initialRotation) {
        const minRotation = initialRotation - Math.PI / 2;
        const maxRotation = initialRotation + Math.PI / 2;
        const rotation = this.rotation % Math.PI * Math.sign(this.speed);
        return rotation >= minRotation && rotation <= maxRotation;
    }

    isCrossingLine(startLine) {
        const { p1, p2 } = startLine;
        const lineStart = { x: p1.x, y: p1.y };
        const lineEnd = { x: p2.x, y: p2.y };
        return this.isLineIntersect(this.corners[0], this.corners[1], lineStart, lineEnd) ||
               this.isLineIntersect(this.corners[1], this.corners[2], lineStart, lineEnd) ||
               this.isLineIntersect(this.corners[2], this.corners[3], lineStart, lineEnd) ||
               this.isLineIntersect(this.corners[3], this.corners[0], lineStart, lineEnd);
    }

    isLineIntersect(p1, p2, q1, q2) {
        const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
        if (det === 0) return false;
        const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
        return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.fillStyle = this.color;
        context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        context.restore();
    }

    rotate() {
        this.rotation += this.rotationSpeed * Math.PI / 180;
    }

    getSensorData(context) {
        const sensorAngles = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];

        const sensorData = sensorAngles.map(angle => {
            const radAngle = this.rotation + angle;
            let distance = 0;
            let sensorX, sensorY;

            while (true) {
                sensorX = this.x + distance * Math.sin(radAngle);
                sensorY = this.y - distance * Math.cos(radAngle);
                if (this.isCollision(context, sensorX, sensorY)) {
                    break;
                }
                distance++;
            }
            return { distance, endX: sensorX, endY: sensorY };
        });

        return sensorData;
    }

    startLap() {
        if (!this.lapStartTime) {
            this.lapStartTime = Date.now();
            return null;
        }
        const lapTime = Date.now() - this.lapStartTime;
        this.lapStartTime = Date.now();
        return lapTime;
    }
}
