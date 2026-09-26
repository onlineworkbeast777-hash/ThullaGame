const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("THULLA MULTIPLAYER SERVER ONLINE");
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();

const MAX_PLAYERS = 4;
const ROOM_CODE_LENGTH = 4;


/* =========================================
   HELPERS
========================================= */

function send(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}


function broadcast(room, data) {
    if (!room) return;

    for (const player of room.players) {
        send(player.ws, data);
    }
}


function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {
        code = "";

        for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

    } while (rooms.has(code));

    return code;
}


function cleanName(name) {
    if (typeof name !== "string") {
        return "PLAYER";
    }

    name = name.trim();

    if (!name) {
        return "PLAYER";
    }

    return name.substring(0, 16);
}


function getRoomPlayers(room) {
    return room.players.map((player, index) => ({
        seat: index,
        name: player.name,
        host: player.id === room.hostId,
        ready: player.ready,
        connected: player.ws.readyState === WebSocket.OPEN
    }));
}


function sendLobbyUpdate(room) {
    broadcast(room, {
        type: "lobbyUpdate",
        roomCode: room.code,
        players: getRoomPlayers(room),
        hostId: room.hostId,
        gameStarted: room.gameStarted
    });
}


/* =========================================
   CREATE ROOM
========================================= */

function createRoom(ws, name) {

    const roomCode = generateRoomCode();

    const player = {
        id: cryptoRandomId(),
        name: cleanName(name),
        ws,
        ready: true
    };

    const room = {
        code: roomCode,
        hostId: player.id,
        players: [player],
        gameStarted: false,
        game: null
    };

    rooms.set(roomCode, room);

    ws.roomCode = roomCode;
    ws.playerId = player.id;

    send(ws, {
        type: "roomCreated",
        roomCode,
        playerId: player.id,
        host: true
    });

    sendLobbyUpdate(room);

    console.log(
        `Room ${roomCode} created by ${player.name}`
    );
}


/* =========================================
   JOIN ROOM
========================================= */

function joinRoom(ws, name, requestedCode) {

    const code = String(requestedCode || "")
        .trim()
        .toUpperCase();

    const room = rooms.get(code);

    if (!room) {
        send(ws, {
            type: "error",
            message: "Room not found."
        });

        return;
    }

    if (room.gameStarted) {
        send(ws, {
            type: "error",
            message: "Game has already started."
        });

        return;
    }

    if (room.players.length >= MAX_PLAYERS) {
        send(ws, {
            type: "error",
            message: "Room is full."
        });

        return;
    }

    const player = {
        id: cryptoRandomId(),
        name: cleanName(name),
        ws,
        ready: true
    };

    room.players.push(player);

    ws.roomCode = room.code;
    ws.playerId = player.id;

    send(ws, {
        type: "roomJoined",
        roomCode: room.code,
        playerId: player.id,
        host: false
    });

    sendLobbyUpdate(room);

    console.log(
        `${player.name} joined room ${room.code}`
    );
}


/* =========================================
   START GAME
========================================= */

function startGame(ws) {

    const room = rooms.get(ws.roomCode);

    if (!room) {
        send(ws, {
            type: "error",
            message: "Room not found."
        });

        return;
    }

    if (room.hostId !== ws.playerId) {
        send(ws, {
            type: "error",
            message: "Only the host can start the game."
        });

        return;
    }

    if (room.players.length < 2) {
        send(ws, {
            type: "error",
            message: "At least 2 players are required."
        });

        return;
    }

    room.gameStarted = true;

    room.game = {
        phase: "starting"
    };

    broadcast(room, {
        type: "gameStarting",
        players: getRoomPlayers(room)
    });

    console.log(
        `Game starting in room ${room.code}`
    );

    /*
       Actual card game logic will be added next.
    */
}


/* =========================================
   LEAVE ROOM
========================================= */

function removePlayer(ws) {

    const roomCode = ws.roomCode;

    if (!roomCode) return;

    const room = rooms.get(roomCode);

    if (!room) return;

    const playerIndex = room.players.findIndex(
        player => player.id === ws.playerId
    );

    if (playerIndex === -1) return;

    const leavingPlayer = room.players[playerIndex];

    room.players.splice(playerIndex, 1);

    console.log(
        `${leavingPlayer.name} left room ${room.code}`
    );


    if (room.players.length === 0) {

        rooms.delete(room.code);

        console.log(
            `Room ${room.code} deleted`
        );

        return;
    }


    /*
       If host leaves, next player becomes host.
    */

    if (room.hostId === leavingPlayer.id) {

        room.hostId = room.players[0].id;

        send(room.players[0].ws, {
            type: "becameHost"
        });
    }


    sendLobbyUpdate(room);
}


/* =========================================
   RANDOM PLAYER ID
========================================= */

function cryptoRandomId() {

    return (
        Math.random()
            .toString(36)
            .substring(2, 10) +
        Date.now()
            .toString(36)
    );
}


/* =========================================
   WEBSOCKET CONNECTION
========================================= */

wss.on("connection", (ws) => {

    console.log("WebSocket client connected");


    send(ws, {
        type: "connected",
        message: "Connected to THULLA server."
    });


    ws.on("message", (rawMessage) => {

        let data;

        try {
            data = JSON.parse(
                rawMessage.toString()
            );
        } catch (error) {

            send(ws, {
                type: "error",
                message: "Invalid message format."
            });

            return;
        }


        console.log(
            "Received:",
            data.type
        );


        switch (data.type) {

            case "createRoom":

                if (ws.roomCode) {
                    send(ws, {
                        type: "error",
                        message: "You are already in a room."
                    });

                    return;
                }

                createRoom(
                    ws,
                    data.name
                );

                break;


            case "joinRoom":

                if (ws.roomCode) {
                    send(ws, {
                        type: "error",
                        message: "You are already in a room."
                    });

                    return;
                }

                joinRoom(
                    ws,
                    data.name,
                    data.roomCode
                );

                break;


            case "startGame":

                startGame(ws);

                break;


            case "leaveRoom":

                removePlayer(ws);

                ws.roomCode = null;
                ws.playerId = null;

                break;


            case "ping":

                send(ws, {
                    type: "pong",
                    time: Date.now()
                });

                break;


            default:

                send(ws, {
                    type: "error",
                    message:
                        "Unknown message type: " +
                        data.type
                });
        }
    });


    ws.on("close", () => {

        console.log(
            "WebSocket client disconnected"
        );

        removePlayer(ws);
    });


    ws.on("error", (error) => {

        console.log(
            "WebSocket error:",
            error.message
        );
    });
});


/* =========================================
   SERVER START
========================================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `THULLA server running on port ${PORT}`
        );

        console.log(
            `WebSocket server ready`
        );
    }
);
