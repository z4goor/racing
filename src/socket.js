export class Socket {
    constructor(url, onMessageCallback, onCloseCallback) {
        this.url = url;
        this.socket = null;
        this.onMessageCallback = onMessageCallback;
        this.onCloseCallback = onCloseCallback;
    }

    isConnected() {
        return Boolean(this.socket) && this.socket.readyState === WebSocket.OPEN;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log('Connected to WebSocket server');
                resolve();
            };

            this.socket.onmessage = (message) => {
                const parsedMessage = JSON.parse(message.data);
                if (this.onMessageCallback) this.onMessageCallback(parsedMessage);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.socket.onclose = () => {
                console.log('Disconnected from WebSocket server');
                this.socket = null;
            };
        });
    }

    send(event, data) {
        // console.log("Sending " + event + " message. ");
        if (this.isConnected()) {
            this.socket.send(JSON.stringify({ event, data }));
        } else {
            console.error('WebSocket is not open, cannot send message. ');
            this.onCloseCallback();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
