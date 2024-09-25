export class Timer {
    constructor(currentTimeElement, fastestTimeElement) {
        this.currentTimeElement = currentTimeElement;
        this.fastestTimeElement = fastestTimeElement;
        this.fastestLap = this.getFastestLap();
    }

    update(car, track) {
        this.updateCurrentLapDisplay(car);
        this.updateFastestLapDisplay(track);
    }

    updateCurrentLapDisplay(car) {
        if (!car || !car.lapStartTime) {
            this.currentTimeElement.textContent = '0:00.000';
            return;
        }
        const lapTime = Date.now() - car.lapStartTime;
        const formattedTime = this.formatTime(lapTime);
        this.currentTimeElement.textContent = formattedTime;
    }
    
    updateFastestLapDisplay(track) {
        const lapTime = track.fastestLap;
        const formattedTime = lapTime ? this.formatTime(lapTime) : '0:00.000';
        this.fastestTimeElement.textContent = formattedTime;
        if (!this.fastestLap || track.fastestLap < this.fastestLap) this.saveFastestLap(lapTime);
    }
    
    formatTime(timeInMs) {
        const minutes = Math.floor(timeInMs / 60000);
        const seconds = Math.floor((timeInMs % 60000) / 1000).toString().padStart(2, '0');
        const milliseconds = (timeInMs % 1000).toString().padStart(3, '0');
        return `${minutes}:${seconds}.${milliseconds}`;
    }
    
    getFastestLap() {
        const value = localStorage.getItem('fastestLap');
        return value ? parseInt(value, 10) : null;
    }
    
    saveFastestLap(time) {
        localStorage.setItem('fastestLap', time);
        this.fastestLap = time;
    }
    
    resetFastestLap() {
        this.fastestLap = null;
        localStorage.setItem('fastestLap', null);
        this.updateFastestLapDisplay();
    }
}
