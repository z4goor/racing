export class Car {
    constructor(width, height, color) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.direction = { x: 0, y: 0 };
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.element = document.createElement('div');
        this.initCar();
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
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
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

    move() {
        this.x += this.direction.x * this.speed;
        this.y += this.direction.y * this.speed;
        this.setPosition(this.x, this.y);
    }

    rotate() {
        if (this.rotationSpeed !== 0) {
            this.rotation += this.rotationSpeed;
            this.setRotation(this.rotation);
        }
    }
}
