const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const MAX_PLAYERS = 4;

const SUITS = ["♠", "♥", "♦", "♣"];

const RANKS = [
    { name: "2", value: 2 },
    { name: "3", value: 3 },
    { name: "4", value: 4 },
    { name: "5", value: 5 },
    { name: "6", value: 6 },
    { name: "7", value: 7 },
    { name: "8", value: 8 },
    { name: "9", value: 9 },
    { name: "10", value: 10 },
    { name: "J", value: 11 },
    { name: "Q", value: 12 },
    { name: "K", value: 13 },
    { name: "A", value: 14 }
];

const THULLA_CARD_DELAY = 850;
const THULLA_POPUP_TIME = 1900;
const NORMAL_ROUND_DELAY = 900;

const rooms = new Map();


/* =========================================
   HTTP SERVER
========================================= */

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("THULLA MULTIPLAYER SERVER ONLINE");
});


const wss = new WebSocket.Server({
    server
});


/* =========================================
   BASIC HELPERS
========================================= */

function send(ws, data) {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify(data)
        );
    }
}


function broadcast(room, data) {

    if (!room) return;

    room.players.forEach(
        player => {

            if (player.connected) {
                send(
                    player.ws,
                    data
                );
            }

        }
    );
}


function cleanName(name) {

    if (
        typeof name !== "string"
    ) {
        return "PLAYER";
    }

    const cleaned =
        name.trim()
            .substring(0, 16);

    return cleaned || "PLAYER";
}


function makeId() {

    return (
        Math.random()
            .toString(36)
            .substring(2, 10) +
        Date.now()
            .toString(36)
    );
}


function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (
            let i = 0;
            i < 4;
            i++
        ) {

            code +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }

    } while (
        rooms.has(code)
    );

    return code;
}


/* =========================================
   DECK
========================================= */

function createDeck() {

    const deck = [];

    for (
        const suit of SUITS
    ) {

        for (
            const rank of RANKS
        ) {

            deck.push({

                suit,

                rank:
                    rank.name,

                value:
                    rank.value,

                id:
                    `${rank.name}${suit}`

            });

        }

    }

    return deck;
}


function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];

    }

    return array;
}


function sortHand(hand) {

    hand.sort(
        (a, b) => {

            if (
                a.suit === b.suit
            ) {

                return (
                    a.value -
                    b.value
                );

            }

            return (
                SUITS.indexOf(a.suit) -
                SUITS.indexOf(b.suit)
            );

        }
    );
}


/* =========================================
   ROOM PLAYERS
========================================= */

function lobbyPlayers(room) {

    return room.players.map(
        (player, index) => ({

            seat: index,

            id: player.id,

            name: player.name,

            host:
                player.id ===
                room.hostId,

            ready:
                player.ready,

            connected:
                player.connected

        })
    );
}


function sendLobbyUpdate(room) {

    broadcast(
        room,
        {
            type: "lobbyUpdate",

            roomCode:
                room.code,

            players:
                lobbyPlayers(room),

            hostId:
                room.hostId
        }
    );
}


/* =========================================
   CREATE ROOM
========================================= */

function createRoom(
    ws,
    name
) {

    const code =
        generateRoomCode();

    const player = {

        id:
            makeId(),

        name:
            cleanName(name),

        ws,

        connected: true,

        ready: true

    };


    const room = {

        code,

        hostId:
            player.id,

        players: [
            player
        ],

        gameStarted: false,

        game: null

    };


    rooms.set(
        code,
        room
    );


    ws.roomCode =
        code;

    ws.playerId =
        player.id;


    send(
        ws,
        {
            type: "roomCreated",

            roomCode:
                code,

            playerId:
                player.id
        }
    );


    sendLobbyUpdate(
        room
    );


    console.log(
        `Room ${code} created by ${player.name}`
    );
}


/* =========================================
   JOIN ROOM
========================================= */

function joinRoom(
    ws,
    name,
    requestedCode
) {

    const code =
        String(
            requestedCode || ""
        )
        .trim()
        .toUpperCase();


    const room =
        rooms.get(code);


    if (!room) {

        send(
            ws,
            {
                type: "error",
                message:
                    "Room not found."
            }
        );

        return;
    }


    if (room.gameStarted) {

        send(
            ws,
            {
                type: "error",
                message:
                    "Game already started."
            }
        );

        return;
    }


    if (
        room.players.length >=
        MAX_PLAYERS
    ) {

        send(
            ws,
            {
                type: "error",
                message:
                    "Room is full."
            }
        );

        return;
    }


    const player = {

        id:
            makeId(),

        name:
            cleanName(name),

        ws,

        connected: true,

        ready: true

    };


    room.players.push(
        player
    );


    ws.roomCode =
        room.code;

    ws.playerId =
        player.id;


    send(
        ws,
        {
            type: "roomJoined",

            roomCode:
                room.code,

            playerId:
                player.id
        }
    );


    sendLobbyUpdate(
        room
    );


    console.log(
        `${player.name} joined ${room.code}`
    );
}


/* =========================================
   GAME SETUP
========================================= */

function startGame(room) {

    if (!room) return;


    const deck =
        shuffle(
            createDeck()
        );


    room.game = {

        started: true,

        currentPlayer: 0,

        leadSuit: null,

        roundCards: [],

        firstMove: true,

        roundResolving: false,

        finishedPlayers: [],

        players: room.players.map(
            player => ({

                cards: []

            })
        )

    };


    for (
        let i = 0;
        i < deck.length;
        i++
    ) {

        room.game.players[
            i % room.players.length
        ].cards.push(
            deck[i]
        );

    }


    room.game.players.forEach(
        player => {

            sortHand(
                player.cards
            );

        }
    );


    let acePlayer = 0;


    for (
        let i = 0;
        i < room.game.players.length;
        i++
    ) {

        const found =
            room.game.players[i]
                .cards
                .some(
                    card =>
                        card.rank === "A" &&
                        card.suit === "♠"
                );


        if (found) {

            acePlayer = i;

            break;

        }

    }


    room.game.currentPlayer =
        acePlayer;


    room.gameStarted =
        true;


    sendGameState(
        room
    );


    setTimeout(
        () => {

            if (
                !room.game ||
                !room.gameStarted
            ) {
                return;
            }


            playCardByIndex(
                room,
                acePlayer,
                room.game.players[
                    acePlayer
                ].cards.findIndex(
                    card =>
                        card.rank === "A" &&
                        card.suit === "♠"
                )
            );

        },
        1000
    );


    console.log(
        `Game started in ${room.code}`
    );
}


/* =========================================
   PUBLIC GAME STATE
========================================= */

function publicPlayers(room) {

    return room.players.map(
        (player, index) => {

            const gamePlayer =
                room.game.players[index];


            return {

                seat: index,

                id:
                    player.id,

                name:
                    player.name,

                cards:
                    gamePlayer.cards.length,

                connected:
                    player.connected

            };

        }
    );
}


function publicRoundCards(room) {

    return room.game.roundCards.map(
        played => ({

            playerIndex:
                played.playerIndex,

            card:
                played.card

        })
    );
}


function sendGameState(room) {

    if (
        !room.game
    ) {
        return;
    }


    room.players.forEach(
        (player, index) => {

            if (
                !player.connected
            ) {
                return;
            }


            send(
                player.ws,
                {

                    type:
                        "gameState",

                    players:
                        publicPlayers(room),

                    currentPlayer:
                        room.game
                            .currentPlayer,

                    leadSuit:
                        room.game
                            .leadSuit,

                    roundCards:
                        publicRoundCards(room),

                    firstMove:
                        room.game
                            .firstMove,

                    roundResolving:
                        room.game
                            .roundResolving,

                    finishedPlayers:
                        room.game
                            .finishedPlayers,

                    yourSeat:
                        index,

                    yourHand:
                        room.game
                            .players[index]
                            .cards

                }
            );

        }
    );
}


/* =========================================
   CARD VALIDATION
========================================= */

function canPlayCard(
    room,
    playerIndex,
    card
) {

    const game =
        room.game;

    const player =
        game.players[
            playerIndex
        ];


    if (
        !player ||
        !card
    ) {
        return false;
    }


    if (
        game.firstMove
    ) {

        return (
            card.rank === "A" &&
            card.suit === "♠"
        );

    }


    if (
        game.roundCards.length === 0
    ) {

        return true;

    }


    const hasLeadSuit =
        player.cards.some(
            c =>
                c.suit ===
                game.leadSuit
        );


    if (hasLeadSuit) {

        return (
            card.suit ===
            game.leadSuit
        );

    }


    return true;
}


function willCauseThulla(
    room,
    playerIndex,
    card
) {

    const game =
        room.game;


    if (
        game.roundCards.length === 0
    ) {
        return false;
    }


    if (
        card.suit ===
        game.leadSuit
    ) {
        return false;
    }


    const player =
        game.players[
            playerIndex
        ];


    const hasLeadSuit =
        player.cards.some(
            c =>
                c.suit ===
                game.leadSuit
        );


    return !hasLeadSuit;
}


/* =========================================
   PLAY CARD
========================================= */

function playCardByIndex(
    room,
    playerIndex,
    cardIndex
) {

    const game =
        room.game;


    if (
        !game ||
        !room.gameStarted
    ) {
        return;
    }


    if (
        game.roundResolving
    ) {
        return;
    }


    if (
        playerIndex !==
        game.currentPlayer
    ) {
        return;
    }


    const player =
        game.players[
            playerIndex
        ];


    const card =
        player.cards[
            cardIndex
        ];


    if (!card) {
        return;
    }


    if (
        !canPlayCard(
            room,
            playerIndex,
            card
        )
    ) {

        send(
            room.players[
                playerIndex
            ].ws,
            {
                type: "invalidMove",
                message:
                    game.firstMove
                        ? "A♠ must start the game."
                        : `You must follow ${game.leadSuit}.`
            }
        );

        return;
    }


    const isFirstCard =
        game.roundCards.length === 0;


    if (isFirstCard) {

        game.leadSuit =
            card.suit;

    }


    const isThulla =
        willCauseThulla(
            room,
            playerIndex,
            card
        );


    player.cards.splice(
        cardIndex,
        1
    );


    game.roundCards.push({

        playerIndex,

        card

    });


    if (
        game.firstMove
    ) {

        game.firstMove =
            false;

    }


    sendGameState(
        room
    );


    if (isThulla) {

        handleThulla(
            room,
            playerIndex
        );

        return;
    }


    markFinished(
        room,
        playerIndex
    );


    if (
        checkGameOver(room)
    ) {
        return;
    }


    if (
        game.roundCards.length >=
        room.players.length
    ) {

        game.roundResolving =
            true;


        sendGameState(
            room
        );


        setTimeout(
            () => {

                resolveNormalRound(
                    room
                );

            },
            NORMAL_ROUND_DELAY
        );


        return;
    }


    moveToNextPlayer(
        room
    );
}


/* =========================================
   THULLA
========================================= */

function handleThulla(
    room,
    thullaPlayerIndex
) {

    const game =
        room.game;


    game.roundResolving =
        true;


    let winnerIndex =
        null;

    let highestValue =
        -1;


    for (
        const played of
        game.roundCards
    ) {

        if (
            played.card.suit !==
            game.leadSuit
        ) {
            continue;
        }


        if (
            played.card.value >
            highestValue
        ) {

            highestValue =
                played.card.value;

            winnerIndex =
                played.playerIndex;

        }

    }


    if (
        winnerIndex === null
    ) {

        winnerIndex =
            game.roundCards[0]
                .playerIndex;

    }


    sendGameState(
        room
    );


    broadcast(
        room,
        {

            type: "thulla",

            giver:
                room.players[
                    thullaPlayerIndex
                ].name,

            winner:
                room.players[
                    winnerIndex
                ].name

        }
    );


    setTimeout(
        () => {

            if (
                !room.game ||
                !room.gameStarted
            ) {
                return;
            }


            const cardsToGive =
                game.roundCards.map(
                    played =>
                        played.card
                );


            game.players[
                winnerIndex
            ].cards.push(
                ...cardsToGive
            );


            sortHand(
                game.players[
                    winnerIndex
                ].cards
            );


            game.roundCards =
                [];

            game.leadSuit =
                null;

            game.currentPlayer =
                winnerIndex;

            game.roundResolving =
                false;


            sendGameState(
                room
            );


            if (
                checkGameOver(room)
            ) {
                return;
            }


            sendTurn(
                room
            );

        },
        THULLA_CARD_DELAY +
        THULLA_POPUP_TIME
    );
}


/* =========================================
   NORMAL ROUND
========================================= */

function resolveNormalRound(
    room
) {

    const game =
        room.game;


    if (
        !game ||
        !room.gameStarted ||
        game.roundCards.length === 0
    ) {
        return;
    }


    let winnerIndex =
        null;

    let highestValue =
        -1;


    for (
        const played of
        game.roundCards
    ) {

        if (
            played.card.suit !==
            game.leadSuit
        ) {
            continue;
        }


        if (
            played.card.value >
            highestValue
        ) {

            highestValue =
                played.card.value;

            winnerIndex =
                played.playerIndex;

        }

    }


    if (
        winnerIndex === null
    ) {

        winnerIndex =
            game.roundCards[0]
                .playerIndex;

    }


    game.roundCards =
        [];

    game.leadSuit =
        null;

    game.currentPlayer =
        winnerIndex;

    game.roundResolving =
        false;


    sendGameState(
        room
    );


    if (
        checkGameOver(room)
    ) {
        return;
    }


    sendTurn(
        room
    );
}


/* =========================================
   NEXT PLAYER
========================================= */

function moveToNextPlayer(
    room
) {

    const game =
        room.game;


    const count =
        room.players.length;


    let next =
        game.currentPlayer;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        next =
            (next + 1) %
            count;


        if (
            game.players[
                next
            ].cards.length > 0
        ) {

            break;

        }

    }


    game.currentPlayer =
        next;


    sendGameState(
        room
    );


    sendTurn(
        room
    );
}


function sendTurn(room) {

    const game =
        room.game;


    if (!game) return;


    const player =
        room.players[
            game.currentPlayer
        ];


    if (!player) return;


    broadcast(
        room,
        {
            type: "turn",

            playerIndex:
                game.currentPlayer,

            playerName:
                player.name
        }
    );
}


/* =========================================
   FINISHED / GAME OVER
========================================= */

function markFinished(
    room,
    playerIndex
) {

    const game =
        room.game;


    if (
        game.players[
            playerIndex
        ].cards.length === 0 &&
        !game.finishedPlayers.includes(
            playerIndex
        )
    ) {

        game.finishedPlayers.push(
            playerIndex
        );

    }
}


function checkGameOver(room) {

    const game =
        room.game;


    if (!game) {
        return false;
    }


    const needed =
        room.players.length - 1;


    if (
        game.finishedPlayers.length <
        needed
    ) {

        return false;

    }


    let loserIndex =
        null;


    for (
        let i = 0;
        i < game.players.length;
        i++
    ) {

        if (
            game.players[i]
                .cards.length > 0
        ) {

            loserIndex = i;

            break;

        }

    }


    game.roundResolving =
        true;


    broadcast(
        room,
        {

            type: "gameOver",

            finishedPlayers:
                game.finishedPlayers,

            loserIndex

        }
    );


    room.gameStarted =
        false;


    return true;
}


/* =========================================
   MESSAGE HANDLER
========================================= */

function handleMessage(
    ws,
    data
) {

    switch (
        data.type
    ) {

        case "createRoom":

            if (
                ws.roomCode
            ) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "Already in a room."
                    }
                );

                return;
            }


            createRoom(
                ws,
                data.name
            );

            break;


        case "joinRoom":

            if (
                ws.roomCode
            ) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "Already in a room."
                    }
                );

                return;
            }


            joinRoom(
                ws,
                data.name,
                data.roomCode
            );

            break;


        case "startGame": {

            const room =
                rooms.get(
                    ws.roomCode
                );


            if (!room) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "Room not found."
                    }
                );

                return;
            }


            if (
                room.hostId !==
                ws.playerId
            ) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "Only the host can start."
                    }
                );

                return;
            }


            if (
                room.players.length < 2
            ) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "At least 2 players are required."
                    }
                );

                return;
            }


            startGame(room);

            break;
        }


        case "playCard": {

            const room =
                rooms.get(
                    ws.roomCode
                );


            if (!room) return;


            const playerIndex =
                room.players.findIndex(
                    player =>
                        player.id ===
                        ws.playerId
                );


            if (
                playerIndex === -1
            ) {
                return;
            }


            const cardId =
                String(
                    data.cardId || ""
                );


            const cardIndex =
                room.game?.players[
                    playerIndex
                ]?.cards.findIndex(
                    card =>
                        card.id === cardId
                );


            if (
                cardIndex === undefined ||
                cardIndex < 0
            ) {

                send(
                    ws,
                    {
                        type: "error",
                        message:
                            "That card is not in your hand."
                    }
                );

                return;
            }


            playCardByIndex(
                room,
                playerIndex,
                cardIndex
            );

            break;
        }


        case "leaveRoom": {

            leaveRoom(
                ws
            );

            break;
        }


        case "ping":

            send(
                ws,
                {
                    type: "pong",
                    time: Date.now()
                }
            );

            break;


        default:

            send(
                ws,
                {
                    type: "error",
                    message:
                        "Unknown message."
                }
            );

    }
}


/* =========================================
   LEAVE / DISCONNECT
========================================= */

function leaveRoom(ws) {

    const room =
        rooms.get(
            ws.roomCode
        );


    if (!room) {
        return;
    }


    const index =
        room.players.findIndex(
            player =>
                player.id ===
                ws.playerId
        );


    if (index === -1) {
        return;
    }


    const leaving =
        room.players[index];


    /*
       During lobby:
       completely remove player.

       During game:
       keep the seat stable.
    */

    if (
        room.gameStarted
    ) {

        leaving.connected =
            false;

        sendLobbyUpdate(
            room
        );


        broadcast(
            room,
            {
                type:
                    "playerDisconnected",

                playerName:
                    leaving.name
            }
        );


        return;
    }


    room.players.splice(
        index,
        1
    );


    if (
        room.players.length === 0
    ) {

        rooms.delete(
            room.code
        );

        return;
    }


    if (
        leaving.id ===
        room.hostId
    ) {

        room.hostId =
            room.players[0].id;

    }


    sendLobbyUpdate(
        room
    );


    ws.roomCode =
        null;

    ws.playerId =
        null;
}


/* =========================================
   WEBSOCKET
========================================= */

wss.on(
    "connection",
    ws => {

        console.log(
            "WebSocket connected"
        );


        ws.isAlive =
            true;


        ws.on(
            "pong",
            () => {

                ws.isAlive =
                    true;

            }
        );


        send(
            ws,
            {
                type: "connected",
                message:
                    "Connected to THULLA."
            }
        );


        ws.on(
            "message",
            raw => {

                let data;


                try {

                    data =
                        JSON.parse(
                            raw.toString()
                        );

                } catch {

                    send(
                        ws,
                        {
                            type: "error",
                            message:
                                "Invalid JSON."
                        }
                    );

                    return;
                }


                handleMessage(
                    ws,
                    data
                );

            }
        );


        ws.on(
            "close",
            () => {

                console.log(
                    "WebSocket disconnected"
                );

                leaveRoom(
                    ws
                );

            }
        );


        ws.on(
            "error",
            error => {

                console.log(
                    "WebSocket error:",
                    error.message
                );

            }
        );

    }
);


/* =========================================
   HEARTBEAT
========================================= */

const heartbeat =
    setInterval(
        () => {

            wss.clients.forEach(
                ws => {

                    if (
                        ws.isAlive === false
                    ) {

                        ws.terminate();

                        return;

                    }


                    ws.isAlive =
                        false;

                    ws.ping();

                }
            );

        },
        30000
    );


wss.on(
    "close",
    () => {

        clearInterval(
            heartbeat
        );

    }
);


/* =========================================
   START
========================================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `THULLA server running on port ${PORT}`
        );

        console.log(
            "WebSocket server ready"
        );

    }
);
