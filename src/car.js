export class Car {
    constructor(width, height, rotation, color) {
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.rotationSpeed = 0;
        this.reverseMove = false;
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

    checkCollision(ctx) {
        return this.corners.some(corner => this.isCollision(ctx, corner.x, corner.y));
    }

    move(ctx) {
        const nextX = this.x + this.speed * Math.sin(this.rotation);
        const nextY = this.y - this.speed * Math.cos(this.rotation);

        const originalX = this.x;
        const originalY = this.y;
        this.x = nextX;
        this.y = nextY;

        const isColliding = this.checkCollision(ctx);

        if (isColliding) {
            this.x = originalX;
            this.y = originalY;
            this.speed = 0;
            this.rotationSpeed = 0;
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        this.rotate();
        this.draw(ctx);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    rotate() {
        this.rotation += this.rotationSpeed * Math.PI / 180;
    }

    getSensorData(ctx) {
        const sensorAngles = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];

        const sensorData = sensorAngles.map(angle => {
            const radAngle = this.rotation + angle;
            let distance = 0;
            let sensorX, sensorY;

            while (true) {
                sensorX = this.x + distance * Math.sin(radAngle);
                sensorY = this.y - distance * Math.cos(radAngle);
                if (this.isCollision(ctx, sensorX, sensorY)) {
                    break;
                }
                distance++;
            }
            return { distance, endX: sensorX, endY: sensorY };
        });

        return sensorData;
    }

    isCollision(ctx, x, y) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        return r === 0 && g === 0 && b === 0;
    }
}
