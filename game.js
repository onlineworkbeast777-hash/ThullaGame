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

const PLAYER_COUNT = 4;


// ========================================
// PLAYER PROFILE
// ========================================

let myNickname = "";


function loadNickname() {

    try {

        const saved =
            localStorage.getItem(
                "thulla_nickname"
            );

        if (saved) {
            myNickname = saved;
        }

    } catch (error) {

        myNickname = "";

    }
}


function saveNickname(name) {

    myNickname = name.trim();

    try {

        localStorage.setItem(
            "thulla_nickname",
            myNickname
        );

    } catch (error) {

        // Local storage may be unavailable.
    }
}


// ========================================
// SCREEN HELPERS
// ========================================

const setupScreen =
    document.getElementById(
        "setupScreen"
    );

const menuScreen =
    document.getElementById(
        "menuScreen"
    );

const lobbyScreen =
    document.getElementById(
        "lobbyScreen"
    );

const gameScreen =
    document.getElementById(
        "gameScreen"
    );


function showScreen(screen) {

    [
        setupScreen,
        menuScreen,
        lobbyScreen
    ].forEach(element => {

        if (element) {
            element.classList.remove(
                "active"
            );
        }

    });


    if (screen) {

        screen.classList.add(
            "active"
        );

    }


    if (gameScreen) {

        gameScreen.classList.remove(
            "active"
        );

    }


    if (screen === gameScreen) {

        gameScreen.classList.add(
            "active"
        );

    }
}


// ========================================
// GAME STATE
// ========================================

let players = [];
let deck = [];

let currentPlayer = 0;

let leadSuit = null;
let roundCards = [];

let firstMove = true;
let gameStarted = false;
let roundResolving = false;

let finishedPlayers = [];


// ========================================
// TIMING
// ========================================

const BOT_MIN_DELAY = 850;
const BOT_MAX_DELAY = 1350;

const THULLA_CARD_DELAY = 850;
const THULLA_POPUP_TIME = 1900;

const NORMAL_ROUND_DELAY = 900;


// ========================================
// DOM
// ========================================

const statusEl =
    document.getElementById(
        "status"
    );

const tableEl =
    document.getElementById(
        "table"
    );

const myHandEl =
    document.getElementById(
        "myHand"
    );

const newGameBtn =
    document.getElementById(
        "newGame"
    );

const gameMenuBtn =
    document.getElementById(
        "gameMenuBtn"
    );

const thullaPopup =
    document.getElementById(
        "thullaPopup"
    );

const thullaWinner =
    document.getElementById(
        "thullaWinner"
    );

const resultPopup =
    document.getElementById(
        "result"
    );

const resultTitle =
    document.getElementById(
        "resultTitle"
    );

const resultText =
    document.getElementById(
        "resultText"
    );


// ========================================
// MENU DOM
// ========================================

const nicknameInput =
    document.getElementById(
        "nicknameInput"
    );

const continueNickname =
    document.getElementById(
        "continueNickname"
    );

const setupError =
    document.getElementById(
        "setupError"
    );

const offlineBtn =
    document.getElementById(
        "offlineBtn"
    );

const multiplayerBtn =
    document.getElementById(
        "multiplayerBtn"
    );

const createRoomBtn =
    document.getElementById(
        "createRoomBtn"
    );

const joinRoomBtn =
    document.getElementById(
        "joinRoomBtn"
    );

const joinRoomInput =
    document.getElementById(
        "joinRoomInput"
    );

const lobbyBackBtn =
    document.getElementById(
        "lobbyBackBtn"
    );

const roomArea =
    document.getElementById(
        "roomArea"
    );

const roomCodeEl =
    document.getElementById(
        "roomCode"
    );

const lobbyPlayersEl =
    document.getElementById(
        "lobbyPlayers"
    );

const startMultiplayerBtn =
    document.getElementById(
        "startMultiplayerBtn"
    );


// ========================================
// HELPERS
// ========================================

function randomBetween(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;

}


function suitColor(suit) {

    if (
        suit === "♥" ||
        suit === "♦"
    ) {

        return "red";

    }

    return "black";

}


// ========================================
// DECK
// ========================================

function createDeck() {

    const newDeck = [];

    for (const suit of SUITS) {

        for (const rank of RANKS) {

            newDeck.push({

                suit: suit,

                rank: rank.name,

                value: rank.value,

                id:
                    `${rank.name}${suit}`

            });

        }

    }

    return newDeck;
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


// ========================================
// PLAYERS
// ========================================

function createPlayers() {

    players = [

        {
            name:
                myNickname ||
                "YOU",

            cards: [],

            human: true
        },

        {
            name: "PLAYER 2",

            cards: [],

            human: false
        },

        {
            name: "PLAYER 3",

            cards: [],

            human: false
        },

        {
            name: "PLAYER 4",

            cards: [],

            human: false
        }

    ];
}


// ========================================
// DEAL
// ========================================

function dealCards() {

    deck =
        shuffle(
            createDeck()
        );

    players.forEach(
        player => {

            player.cards = [];

        }
    );


    for (
        let i = 0;
        i < deck.length;
        i++
    ) {

        players[
            i % PLAYER_COUNT
        ].cards.push(
            deck[i]
        );

    }


    sortAllHands();
}


function sortAllHands() {

    players.forEach(
        player => {

            player.cards.sort(
                (a, b) => {

                    if (
                        a.suit ===
                        b.suit
                    ) {

                        return (
                            a.value -
                            b.value
                        );

                    }

                    return (
                        SUITS.indexOf(
                            a.suit
                        ) -
                        SUITS.indexOf(
                            b.suit
                        )
                    );

                }
            );

        }
    );
}


// ========================================
// FIND A♠
// ========================================

function findAceOfSpades() {

    for (
        let i = 0;
        i < players.length;
        i++
    ) {

        const hasAce =
            players[i]
                .cards
                .some(
                    card =>
                        card.rank === "A" &&
                        card.suit === "♠"
                );

        if (hasAce) {

            return i;

        }

    }

    return 0;
}


// ========================================
// START OFFLINE GAME
// ========================================

function startOfflineGame() {

    showScreen(
        gameScreen
    );

    startGame();
}


// ========================================
// START GAME
// ========================================

function startGame() {

    gameStarted = false;

    roundResolving = false;

    createPlayers();

    dealCards();

    currentPlayer =
        findAceOfSpades();

    leadSuit = null;

    roundCards = [];

    firstMove = true;

    finishedPlayers = [];

    hideResult();

    hideThullaPopup();

    updateUI();


    setStatus(
        `${players[currentPlayer].name} has A♠`
    );


    setTimeout(() => {

        if (!players.length) {
            return;
        }

        gameStarted = true;

        updateUI();

        setStatus(
            `${players[currentPlayer].name} plays A♠`
        );


        setTimeout(() => {

            if (!gameStarted) {
                return;
            }

            autoPlayAceOfSpades();

        }, 500);

    }, 500);
}


// ========================================
// AUTO A♠
// ========================================

function autoPlayAceOfSpades() {

    if (!gameStarted) {
        return;
    }

    if (!firstMove) {
        return;
    }

    const player =
        players[currentPlayer];

    if (!player) {
        return;
    }


    const aceIndex =
        player.cards.findIndex(
            card =>
                card.rank === "A" &&
                card.suit === "♠"
        );


    if (aceIndex === -1) {
        return;
    }


    playCard(
        currentPlayer,
        aceIndex
    );
}


// ========================================
// STATUS
// ========================================

function setStatus(text) {

    if (!statusEl) {
        return;
    }

    statusEl.textContent =
        text;
}


// ========================================
// VALIDATION
// ========================================

function canPlayCard(
    playerIndex,
    card
) {

    const player =
        players[playerIndex];

    if (!player || !card) {
        return false;
    }


    if (firstMove) {

        return (
            card.rank === "A" &&
            card.suit === "♠"
        );

    }


    if (
        roundCards.length === 0
    ) {

        return true;

    }


    const hasLeadSuit =
        player.cards.some(
            c =>
                c.suit === leadSuit
        );


    if (hasLeadSuit) {

        return (
            card.suit === leadSuit
        );

    }


    return true;
}


// ========================================
// THULLA CHECK
// ========================================

function willCauseThulla(
    playerIndex,
    card
) {

    if (
        roundCards.length === 0
    ) {

        return false;

    }


    if (
        card.suit === leadSuit
    ) {

        return false;

    }


    const player =
        players[playerIndex];

    if (!player) {
        return false;
    }


    const hasLeadSuit =
        player.cards.some(
            c =>
                c.suit === leadSuit
        );


    return !hasLeadSuit;
}


// ========================================
// PLAY CARD
// ========================================

function playCard(
    playerIndex,
    cardIndex
) {

    if (!gameStarted) {
        return;
    }

    if (roundResolving) {
        return;
    }

    if (
        playerIndex !==
        currentPlayer
    ) {

        return;

    }


    const player =
        players[playerIndex];

    if (!player) {
        return;
    }


    const card =
        player.cards[cardIndex];

    if (!card) {
        return;
    }


    if (
        !canPlayCard(
            playerIndex,
            card
        )
    ) {

        if (firstMove) {

            setStatus(
                "A♠ must start the game!"
            );

        } else {

            setStatus(
                `You must follow ${leadSuit}`
            );

        }

        return;
    }


    const isFirstCard =
        roundCards.length === 0;


    if (isFirstCard) {

        leadSuit =
            card.suit;

    }


    const isThulla =
        willCauseThulla(
            playerIndex,
            card
        );


    player.cards.splice(
        cardIndex,
        1
    );


    roundCards.push({

        playerIndex:
            playerIndex,

        card:
            card

    });


    if (firstMove) {

        firstMove = false;

    }


    updateUI();


    if (isThulla) {

        handleImmediateThulla(
            playerIndex
        );

        return;
    }


    checkPlayerFinished(
        playerIndex
    );


    if (!gameStarted) {
        return;
    }


    if (
        roundCards.length ===
        PLAYER_COUNT
    ) {

        roundResolving = true;

        setStatus(
            "Round complete..."
        );


        setTimeout(() => {

            if (!gameStarted) {
                return;
            }

            resolveNormalRound();

        }, NORMAL_ROUND_DELAY);

        return;
    }


    moveToNextPlayer();
}


// ========================================
// THULLA
// ========================================

function handleImmediateThulla(
    thullaPlayerIndex
) {

    roundResolving = true;

    let winnerIndex = null;

    let highestValue = -1;


    for (
        const played of roundCards
    ) {

        if (
            played.card.suit !==
            leadSuit
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
            roundCards[0]
                .playerIndex;

    }


    updateUI();


    setStatus(
        `${players[thullaPlayerIndex].name} gave THULLA!`
    );


    setTimeout(() => {

        if (!gameStarted) {
            return;
        }


        showThullaPopupOnly(

            players[
                thullaPlayerIndex
            ].name,

            players[
                winnerIndex
            ].name

        );


        setTimeout(() => {

            if (!gameStarted) {
                return;
            }


            hideThullaPopup();


            const cardsToGive =
                roundCards.map(
                    played =>
                        played.card
                );


            players[
                winnerIndex
            ].cards.push(
                ...cardsToGive
            );


            sortAllHands();


            roundCards = [];

            leadSuit = null;


            currentPlayer =
                winnerIndex;


            roundResolving =
                false;


            updateUI();


            setStatus(
                `${players[winnerIndex].name}'s turn`
            );


            setTimeout(() => {

                if (!gameStarted) {
                    return;
                }


                if (
                    players[
                        currentPlayer
                    ].human
                ) {

                    setStatus(
                        "Your turn"
                    );

                } else {

                    computerTurn();

                }

            }, 450);


        }, THULLA_POPUP_TIME);


    }, THULLA_CARD_DELAY);
}


// ========================================
// THULLA POPUP
// ========================================

function showThullaPopupOnly(
    thullaPlayerName,
    winnerName
) {

    if (!thullaPopup) {
        return;
    }


    if (thullaWinner) {

        thullaWinner.innerHTML =
            `${thullaPlayerName} gave THULLA<br>
             <strong>${winnerName}</strong> gets all cards`;

    }


    thullaPopup.classList.add(
        "show"
    );
}


// ========================================
// NORMAL ROUND
// ========================================

function resolveNormalRound() {

    if (!gameStarted) {
        return;
    }

    if (
        roundCards.length === 0
    ) {

        return;

    }


    let winnerIndex = null;

    let highestValue = -1;


    for (
        const played of roundCards
    ) {

        if (
            played.card.suit !==
            leadSuit
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
            roundCards[0]
                .playerIndex;

    }


    roundCards = [];

    leadSuit = null;

    currentPlayer =
        winnerIndex;

    roundResolving =
        false;

    updateUI();


    setTimeout(() => {

        if (!gameStarted) {
            return;
        }


        if (
            players[
                currentPlayer
            ].human
        ) {

            setStatus(
                "Your turn"
            );

        } else {

            setStatus(
                `${players[currentPlayer].name}'s turn`
            );

            computerTurn();

        }

    }, 300);
}


// ========================================
// NEXT PLAYER
// ========================================

function moveToNextPlayer() {

    let nextPlayer =
        currentPlayer;


    for (
        let i = 0;
        i < PLAYER_COUNT;
        i++
    ) {

        nextPlayer =
            (
                nextPlayer + 1
            ) % PLAYER_COUNT;


        if (
            players[nextPlayer]
                .cards.length > 0
        ) {

            break;

        }

    }


    currentPlayer =
        nextPlayer;


    updateUI();


    if (
        players[
            currentPlayer
        ].human
    ) {

        setStatus(
            "Your turn"
        );

    } else {

        setStatus(
            `${players[currentPlayer].name}'s turn`
        );

        computerTurn();

    }
}


// ========================================
// SMART BOT
// ========================================

function chooseSmartCard(
    playerIndex
) {

    const player =
        players[playerIndex];


    if (
        !player ||
        player.cards.length === 0
    ) {

        return -1;

    }


    const hand =
        player.cards;


    if (firstMove) {

        return hand.findIndex(
            card =>
                card.rank === "A" &&
                card.suit === "♠"
        );

    }


    if (
        roundCards.length === 0
    ) {

        const suitGroups = {};


        for (
            const suit of SUITS
        ) {

            suitGroups[suit] = [];

        }


        for (
            const card of hand
        ) {

            suitGroups[
                card.suit
            ].push(card);

        }


        let bestSuit = null;

        let bestCount = -1;


        for (
            const suit of SUITS
        ) {

            const count =
                suitGroups[suit]
                    .length;


            if (
                count >
                bestCount
            ) {

                bestCount =
                    count;

                bestSuit =
                    suit;

            }

        }


        const candidates =
            suitGroups[bestSuit] ||
            hand;


        const safeCards =
            candidates.filter(
                card =>
                    card.value <= 10
            );


        const pool =
            safeCards.length > 0
                ? safeCards
                : candidates;


        const lowest =
            [...pool].sort(
                (a,b) =>
                    a.value - b.value
            )[0];


        return hand.indexOf(
            lowest
        );
    }


    const sameSuit =
        hand.filter(
            card =>
                card.suit ===
                leadSuit
        );


    if (
        sameSuit.length > 0
    ) {

        let highestOnTable = 0;


        for (
            const played of roundCards
        ) {

            if (
                played.card.suit ===
                leadSuit
            ) {

                highestOnTable =
                    Math.max(
                        highestOnTable,
                        played.card.value
                    );

            }

        }


        const winningCards =
            sameSuit
                .filter(
                    card =>
                        card.value >
                        highestOnTable
                )
                .sort(
                    (a,b) =>
                        a.value - b.value
                );


        if (
            winningCards.length > 0
        ) {

            return hand.indexOf(
                winningCards[0]
            );

        }


        const lowest =
            [...sameSuit].sort(
                (a,b) =>
                    a.value - b.value
            )[0];


        return hand.indexOf(
            lowest
        );
    }


    const lowCards =
        [...hand].sort(
            (a,b) =>
                a.value - b.value
        );


    return hand.indexOf(
        lowCards[0]
    );
}


// ========================================
// BOT TURN
// ========================================

function computerTurn() {

    if (!gameStarted) {
        return;
    }

    if (roundResolving) {
        return;
    }


    const player =
        players[currentPlayer];


    if (
        !player ||
        player.human
    ) {

        return;

    }


    const delay =
        randomBetween(
            BOT_MIN_DELAY,
            BOT_MAX_DELAY
        );


    setTimeout(() => {

        if (!gameStarted) {
            return;
        }

        if (roundResolving) {
            return;
        }


        if (
            players[
                currentPlayer
            ].human
        ) {

            return;

        }


        const chosenIndex =
            chooseSmartCard(
                currentPlayer
            );


        if (
            chosenIndex >= 0
        ) {

            playCard(
                currentPlayer,
                chosenIndex
            );

        }

    }, delay);
}


// ========================================
// PLAYER FINISHED
// ========================================

function checkPlayerFinished(
    playerIndex
) {

    if (
        players[playerIndex]
            .cards.length === 0 &&
        !finishedPlayers.includes(
            playerIndex
        )
    ) {

        finishedPlayers.push(
            playerIndex
        );

    }


    checkGameOver();
}


// ========================================
// GAME OVER
// ========================================

function checkGameOver() {

    if (
        finishedPlayers.length >=
        PLAYER_COUNT - 1
    ) {

        const remaining =
            players
                .map(
                    (player,index) => ({
                        player,
                        index
                    })
                )
                .filter(
                    item =>
                        item.player
                            .cards.length > 0
                );


        let loser = null;


        if (
            remaining.length > 0
        ) {

            loser =
                remaining[0].index;

        }


        showResult(loser);


        gameStarted = false;


        return true;

    }


    return false;
}


// ========================================
// HIDE THULLA
// ========================================

function hideThullaPopup() {

    if (thullaPopup) {

        thullaPopup.classList.remove(
            "show"
        );

    }
}


// ========================================
// RESULT
// ========================================

function showResult(
    loserIndex
) {

    if (!resultPopup) {
        return;
    }


    if (resultTitle) {

        resultTitle.textContent =
            "GAME OVER";

    }


    let text = "";


    finishedPlayers.forEach(
        (
            playerIndex,
            position
        ) => {

            text +=
                `<strong>
                    ${position + 1}.
                    ${players[playerIndex].name}
                 </strong><br>`;

        }
    );


    if (
        loserIndex !== null
    ) {

        text +=
            `<br>
             💀 Last:
             ${players[loserIndex].name}`;

    }


    if (resultText) {

        resultText.innerHTML =
            text;

    }


    resultPopup.classList.add(
        "show"
    );
}


// ========================================
// HIDE RESULT
// ========================================

function hideResult() {

    if (resultPopup) {

        resultPopup.classList.remove(
            "show"
        );

    }
}


// ========================================
// RENDER HAND
// ========================================

function renderMyHand() {

    if (!myHandEl) {
        return;
    }


    myHandEl.innerHTML = "";


    if (!players[0]) {
        return;
    }


    players[0].cards.forEach(
        (
            card,
            index
        ) => {

            const cardEl =
                document.createElement(
                    "div"
                );


            cardEl.className =
                `card ${suitColor(
                    card.suit
                )}`;


            cardEl.innerHTML = `

                <div class="rank">
                    ${card.rank}
                </div>

                <div class="suit">
                    ${card.suit}
                </div>

            `;


            if (
                currentPlayer === 0 &&
                gameStarted &&
                !roundResolving
            ) {

                cardEl.classList.add(
                    "clickable"
                );


                cardEl.addEventListener(
                    "click",
                    () => {

                        playCard(
                            0,
                            index
                        );

                    }
                );

            }


            myHandEl.appendChild(
                cardEl
            );

        }
    );
}


// ========================================
// RENDER TABLE
// ========================================

function renderTable() {

    if (!tableEl) {
        return;
    }


    tableEl.innerHTML = "";


    roundCards.forEach(
        played => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "table-card";


            const playerLabel =
                document.createElement(
                    "div"
                );


            playerLabel.className =
                "table-player";


            playerLabel.textContent =
                players[
                    played.playerIndex
                ].name;


            const cardEl =
                document.createElement(
                    "div"
                );


            cardEl.className =
                `card ${suitColor(
                    played.card.suit
                )}`;


            cardEl.innerHTML = `

                <div class="rank">
                    ${played.card.rank}
                </div>

                <div class="suit">
                    ${played.card.suit}
                </div>

            `;


            wrapper.appendChild(
                playerLabel
            );


            wrapper.appendChild(
                cardEl
            );


            tableEl.appendChild(
                wrapper
            );

        }
    );
}


// ========================================
// PLAYER BOX
// ========================================

function updatePlayerBox(
    elementId,
    playerIndex
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    const player =
        players[playerIndex];


    if (!player) {
        return;
    }


    element.innerHTML = `

        <div>

            <strong>
                ${player.name}
            </strong>

            <span>
                ${player.cards.length}
                ${player.cards.length === 1 ? "card" : "cards"}
            </span>

        </div>

        <div>
            ${
                currentPlayer === playerIndex &&
                gameStarted
                    ? `<div class="turn-dot"></div>`
                    : ""
            }
        </div>
    `;


    element.classList.remove(
        "active"
    );


    if (
        gameStarted &&
        currentPlayer === playerIndex
    ) {

        element.classList.add(
            "active"
        );

    }
}


// ========================================
// UPDATE UI
// ========================================

function updateUI() {

    if (!players.length) {
        return;
    }


    updatePlayerBox(
        "you",
        0
    );

    updatePlayerBox(
        "p2",
        1
    );

    updatePlayerBox(
        "p3",
        2
    );

    updatePlayerBox(
        "p4",
        3
    );


    renderMyHand();

    renderTable();
}


// ========================================
// ROOM UI
// ========================================

let fakeRoomCode = null;


function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";


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


    return code;
}


function renderLobbyPreview() {

    if (!lobbyPlayersEl) {
        return;
    }


    const names = [

        {
            name:
                myNickname ||
                "YOU",

            host:true
        },

        {
            name:"Waiting for player...",
            empty:true
        },

        {
            name:"Waiting for player...",
            empty:true
        },

        {
            name:"Waiting for player...",
            empty:true
        }

    ];


    lobbyPlayersEl.innerHTML = "";


    names.forEach(
        player => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "lobby-player";


            if (player.host) {

                row.classList.add(
                    "host"
                );

            }


            row.innerHTML = `

                <div class="lobby-player-name">
                    ${player.name}
                </div>

                <div class="lobby-player-status">
                    ${
                        player.empty
                            ? "Waiting"
                            : "Ready"
                    }
                </div>

            `;


            lobbyPlayersEl.appendChild(
                row
            );

        }
    );
}


function openMultiplayer() {

    showScreen(
        lobbyScreen
    );


    if (roomArea) {

        roomArea.style.display =
            "none";

    }


    if (joinRoomInput) {

        joinRoomInput.value = "";

    }

}


function createRoom() {

    fakeRoomCode =
        generateRoomCode();


    if (roomCodeEl) {

        roomCodeEl.textContent =
            fakeRoomCode;

    }


    if (roomArea) {

        roomArea.style.display =
            "block";

    }


    renderLobbyPreview();

}


function joinRoom() {

    const code =
        joinRoomInput
            ? joinRoomInput.value
                .trim()
                .toUpperCase()
            : "";


    if (
        code.length !== 4
    ) {

        alert(
            "Enter a valid 4-character room code."
        );

        return;

    }


    alert(
        `Room ${code} found.\n\nOnline server connection will be added next.`
    );

}


// ========================================
// MULTIPLAYER START PLACEHOLDER
// ========================================

function startMultiplayer() {

    alert(
        "Multiplayer server is the next step.\n\nYour lobby is ready for the real connection."
    );

}


// ========================================
// MENU BUTTONS
// ========================================

if (continueNickname) {

    continueNickname.addEventListener(
        "click",
        saveNicknameFromInput
    );

}


if (nicknameInput) {

    nicknameInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                saveNicknameFromInput();

            }

        }
    );

}


function saveNicknameFromInput() {

    const value =
        nicknameInput
            ? nicknameInput.value.trim()
            : "";


    if (
        value.length < 2
    ) {

        if (setupError) {

            setupError.textContent =
                "Nickname must be at least 2 characters.";

        }

        return;

    }


    if (setupError) {

        setupError.textContent =
            "";

    }


    saveNickname(
        value
    );


    showScreen(
        menuScreen
    );

}


if (offlineBtn) {

    offlineBtn.addEventListener(
        "click",
        startOfflineGame
    );

}


if (multiplayerBtn) {

    multiplayerBtn.addEventListener(
        "click",
        openMultiplayer
    );

}


if (createRoomBtn) {

    createRoomBtn.addEventListener(
        "click",
        createRoom
    );

}


if (joinRoomBtn) {

    joinRoomBtn.addEventListener(
        "click",
        joinRoom
    );

}


if (startMultiplayerBtn) {

    startMultiplayerBtn.addEventListener(
        "click",
        startMultiplayer
    );

}


if (lobbyBackBtn) {

    lobbyBackBtn.addEventListener(
        "click",
        () => {

            showScreen(
                menuScreen
            );

        }
    );

}


if (gameMenuBtn) {

    gameMenuBtn.addEventListener(
        "click",
        () => {

            gameStarted = false;

            hideResult();

            hideThullaPopup();

            showScreen(
                menuScreen
            );

        }
    );

}


if (newGameBtn) {

    newGameBtn.addEventListener(
        "click",
        startGame
    );

}


// ========================================
// INITIALIZATION
// ========================================

loadNickname();


if (myNickname) {

    showScreen(
        menuScreen
    );

} else {

    showScreen(
        setupScreen
    );

}