export class Socket {
    constructor(url, onMessageCallback) {
        this.url = url;
        this.socket = null;
        this.onMessageCallback = onMessageCallback;
    }

    isConnected() {
        return Boolean(this.socket);
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
            };
        });
    }

    send(event, data) {
        if (this.isConnected() && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ event, data }));
        } else {
            console.error('WebSocket is not open.');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
