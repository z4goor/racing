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

    get movementVector() {
        return {
            x: this.speed * Math.sin(this.rotation),
            y: this.speed * -Math.cos(this.rotation)
        }
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

    move(vector) {
        this.x = this.x + vector.x;
        this.y = this.y + vector.y;
        this.rotate();
    }

    rotate() {
        this.rotation += this.rotationSpeed * Math.PI / 180;
    }

    stop() {
        this.speed = 0;
        this.rotationSpeed = 0;
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.fillStyle = this.color;
        context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        context.restore();
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

    isCollision(context, x, y) {
        const imageData = context.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        return r === 0 && g === 0 && b === 0;
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
