import { Training } from "./training"

export class Menu {
    constructor(menuElement, game, aiTrainingSidebar, trackSidebar) {
        this.menuElement = menuElement
        this.game = game
        this.aiTrainingSidebar = aiTrainingSidebar
        this.trackSidebar = trackSidebar
    }

    startTraining(size, length) {
        new Training(this.game, size, length).run();
    }

    addHumanCar() {
        this.game.addHumanCar();
    }

    addAiCar() {
        this.game.addAiCar();
    }

    removeCars() {
        this.game.removeCars();
    }

    resetBestTime() {
        this.game.resetBestTime();
    }

    changeTrack(track) {
        this.game.changeTrack(track);
    }
}