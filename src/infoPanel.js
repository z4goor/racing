export class InfoPanel {
    constructor(panelElement) {
        this.panelElement = panelElement;
        this.generationLimit = panelElement.querySelector('#generation-limit');
        this.generationElement = panelElement.querySelector('#current-generation');
    }

    setNumberOfGenerations(n) {
        this.generationLimit.textContent = n;
    }
    
    updateGeneration(generationNumber) {
        this.generationElement.textContent = generationNumber;
    }

    show() {
        this.panelElement.style.display = 'block';
    }
    
    hide() {
        this.panelElement.style.display = 'none';
    }
}
