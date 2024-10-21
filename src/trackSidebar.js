export class TrackSidebar {
    constructor(trackSidebarElement, track, resetCallback) {
        this.element = trackSidebarElement;
        this.trackConfig = localStorage.getItem('trackConfig');
        this.configsFolder = '../config';
        this.track = track;
        this.resetCallback = resetCallback;
    }

    async initialize() {
        const trackConfigUrl = await this.loadAllConfigs();
        if (this.trackConfig) {
            this.track.setup(this.trackConfig);
        } else {
            this.track.setup(trackConfigUrl);
        }
    }

    async loadAllConfigs() {
        try {
            const response = await fetch(`${this.configsFolder}/config_list.json`);
            const configFiles = await response.json();

            const trackConfigs = await Promise.all(
                configFiles.map(async (configFile) => {
                    const configResponse = await fetch(`${this.configsFolder}/${configFile}`);
                    const configData = await configResponse.json();
                    return {
                        configUrl: `${this.configsFolder}/${configFile}`,
                        imageUrl: configData.imageUrl
                    };
                })
            );

            this.loadTrackImages(trackConfigs);
            return trackConfigs[0].configUrl;
        } catch (error) {
            console.error("Error loading configs:", error);
            return null;
        }
    }

    loadTrackImages(trackConfigs) {
        const trackImagesContainer = document.getElementById('track-images');
        trackImagesContainer.innerHTML = '';
    
        trackConfigs.forEach(trackConfig => {
            const imgElement = document.createElement('img');
            imgElement.src = trackConfig.imageUrl;
            imgElement.alt = trackConfig.name;
            imgElement.addEventListener('click', () => {
                this.loadNewTrack(trackConfig.configUrl);
            });
            trackImagesContainer.appendChild(imgElement);
        });
    }
    
    loadNewTrack(configUrl) {
        localStorage.setItem('trackConfig', configUrl);
        this.resetCallback();
        this.track.setup(configUrl);
    }
}
