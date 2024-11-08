import { Car } from "./car";

export class Game {
    constructor(track, cars=[]) {
        this.track = track;
        this.cars = cars;
    }

    update() {
        this.cars.forEach(car => {
            car.move();            
        });
    }

    addHumanCar() {
        this.cars.push(new Car(15, 25, '#ffa12d'));
    }

    addAiCar() {
        this.cars.push(new Car(15, 25, '#fcff2d'));
    }

    removeCars() {
        this.cars = [];
    }

    resetBestTime() {
        this.timer.resetFastestLap();
    }

    changeTrack(trackUrl) {
        this.track.setup(trackUrl);
    }
}