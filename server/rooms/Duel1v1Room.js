const { Room } = require('colyseus');

class Duel1v1Room extends Room {
    onCreate(options) {
        console.log("Duel1v1Room created!", options);
        this.maxClients = 2;

        this.onMessage("type", (client, message) => {
            // handle "type" message
            console.log("Received message from", client.sessionId, ":", message);
        });
    }

    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
    }

    onLeave(client, consented) {
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}

exports.Duel1v1Room = Duel1v1Room;
