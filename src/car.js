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
        this.element = document.createElement('div');
        this.initCar();
    }

    initCar() {
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
        this.element.style.backgroundColor = this.color;
        this.element.style.position = 'absolute';
        this.element.style.transformOrigin = 'center'
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
        this.speed = Math.max(0, this.speed - amount);
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
        for (const corner of this.calculateCorners()) {
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

    calculateCorners() {
        // width = this.width * 0.5;
        const topLeft = {
            x: this.x - this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) - this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y - this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) + this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const topRight = {
            x: this.x + this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) - this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y + this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) + this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const bottomRight = {
            x: this.x + this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) + this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y + this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) - this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          const bottomLeft = {
            x: this.x - this.width / 2 * Math.cos(this.rotation / 180 * Math.PI) + this.height / 2 * Math.sin(this.rotation / 180 * Math.PI),
            y: this.y - this.width / 2 * Math.sin(this.rotation / 180 * Math.PI) - this.height / 2 * Math.cos(this.rotation / 180 * Math.PI)
          };
        
          return [topLeft, topRight, bottomRight, bottomLeft];
    }
}
