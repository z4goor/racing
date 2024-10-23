export class InfoPanel {
    constructor(panelElement) {
        this.panelElement = panelElement;
        this.generationLimit = panelElement.querySelector('#generation-limit');
        this.generationNumber = panelElement.querySelector('#current-generation');
        this.stats = panelElement.querySelector('#stats');
    }

    setNumberOfGenerations(n) {
        this.generationLimit.textContent = n;
    }

    updateGenerationNumber(n) {
        this.generationNumber.textContent = n;
    }
    
    updateStats(data) {
        this.stats.innerHTML = '';

        Object.keys(data).forEach(id => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>ID:</strong> ${id} - <strong>Fitness:</strong> ${data[id].toFixed(2)}`;
            this.stats.appendChild(listItem);
});
    }

    show() {
        this.panelElement.style.display = 'block';
    }
    
    hide() {
        this.panelElement.style.display = 'none';
    }
}
