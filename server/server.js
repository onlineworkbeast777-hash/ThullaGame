const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

// Basic HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("THULLA SERVER IS ONLINE");
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to THULLA server!"
    }));

    ws.on("message", (message) => {
        console.log("Received:", message.toString());

        ws.send(JSON.stringify({
            type: "echo",
            message: message.toString()
        }));
    });

    ws.on("close", () => {
        console.log("Player disconnected");
    });

    ws.on("error", (error) => {
        console.log("WebSocket error:", error.message);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`THULLA server running on port ${PORT}`);
});
