export class Car {
    constructor(width, height, rotation, color) {
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.direction = { x: 0, y: 0 };
        this.rotationSpeed = 0;
        this.reverseMove = false;
        this.element = document.createElement('div');
        this.initCar();
    }

    get corners() {
        const rearLeft = {
            x: this.x - this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) - this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y - this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) + this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const rearRight = {
            x: this.x + this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) - this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y + this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) + this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const frontRight = {
            x: this.x + this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) + this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y + this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) - this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const frontLeft = {
            x: this.x - this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) + this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y - this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) - this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          return [frontLeft, frontRight, rearLeft, rearRight];
    }

    initCar() {
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
        this.element.style.backgroundColor = this.color;
        this.element.style.position = 'absolute';
        this.element.style.transformOrigin = 'center';
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.element.style.left = x - this.width / 2 + 'px';
        this.element.style.top = y - this.height / 2 + 'px';
    }

    addToTrack(track) {
        track.appendChild(this.element);
    }

    setSpeed(speed) {
        this.speed = speed;
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

    setRotation(degrees) {
        this.rotation = degrees;
        this.element.style.transform = `rotate(${degrees}deg)`;
        this.updateDirection();
    }

    setRotationSpeed(speed) {
        if (this.speed > 0) {
            this.rotationSpeed = speed;
        } else {
            this.rotationSpeed = 0;
        }
    }

    updateDirection() {
        const angle = this.rotation * (Math.PI / 180);
        this.direction.x = Math.sin(angle);
        this.direction.y = -Math.cos(angle);
    }

    checkCollision(ctx) {
        for (const corner of this.corners) {
            const imageData = ctx.getImageData(corner.x, corner.y, 1, 1);
            const [r, g, b] = imageData.data;
    
            if (r === 0 && g === 0 && b === 0) {
                return true;
            }
        }
        return false;
    }

    move(ctx) {
        const newX = this.x + this.direction.x * this.speed;
        const newY = this.y + this.direction.y * this.speed;

        this.setPosition(newX, newY);
        this.checkCollision(ctx);

        if (this.speed != 0 && !this.checkCollision(ctx)) {
            this.x = newX;
            this.y = newY;
        } else {
            this.setPosition(this.x, this.y);
            this.speed = 0;
        }
    }

    rotate() {
        if (this.rotationSpeed !== 0) {
            this.rotation += this.rotationSpeed;
            this.setRotation(this.rotation);
        }
    }

    getSensorData(ctx, maxDistance) {
        const sensorAngles = [
            this.rotation - 135,
            this.rotation - 180,
            this.rotation - 90,
            this.rotation - 45,
            this.rotation
        ];

        const sensorData = sensorAngles.map(angle => {
            const radAngle = angle * (Math.PI / 180);
            let distance = 0;
            let sensorX = this.x;
            let sensorY = this.y;

            while (distance < maxDistance) {
                sensorX = this.x + distance * Math.cos(radAngle);
                sensorY = this.y + distance * Math.sin(radAngle);

                if (this.isCollision(ctx, sensorX, sensorY)) {
                    break;
                }

                distance++;
            }

            return { distance, endX: sensorX, endY: sensorY };
        });

        return sensorData;
    }

    measureDistance(ctx, direction, maxDistance) {
        let distance = 0;
        let sensorX = this.x;
        let sensorY = this.y;

        while (distance < maxDistance) {
            sensorX = this.x + distance * Math.cos(this.rotation * Math.PI / 180 + direction);
            sensorY = this.y + distance * Math.sin(this.rotation * Math.PI / 180 + direction);

            if (this.isCollision(ctx, sensorX, sensorY)) {
                break;
            }

            distance++;
        }

        return distance;
    }
    
    isCollision(ctx, x, y) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        return r === 0 && g === 0 && b === 0;
    }
}
