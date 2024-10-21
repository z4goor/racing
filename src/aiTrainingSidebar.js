export class AiTrainingSidebar {
    constructor(aiTrainingSidebarElement, trainingCallback) {
        this.element = aiTrainingSidebarElement;
        this.trainingCallback = trainingCallback;
    }

    get closeButton() {
        return this.element.querySelector('.close-btn');
    }

    get submitButton() {
        return this.element.querySelector('#aiTrainingSubmitButton');
    }

    get trainingSize() {
        return this.element.querySelector('#generationSize').value;
    }

    get trainingLength() {
        return this.element.querySelector('#numGenerations').value;
    }

    static async create(aiTrainingSidebarElement, trainingCallback) {
        const instance = new AiTrainingSidebar(aiTrainingSidebarElement, trainingCallback);
        await instance.initialize();
        return instance;
    }

    async initialize() {
        this.closeButton.addEventListener('click', () => {
            this.toggle();
        });
        this.submitButton.addEventListener('click', async () => {
            await this.trainingCallback(this.trainingSize, this.trainingLength);
        });
    }

    toggle() {
        this.element.classList.toggle('show');
    }
}