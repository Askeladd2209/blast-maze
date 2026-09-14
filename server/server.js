const http = require("http");

const HOST = "localhost";
const PORT = 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        proyecto: "Blast Maze",
        estado: "Servidor funcionando"
    }));
});

server.listen(PORT, HOST, () => {
    console.log(`Blast Maze server running at http://${HOST}:${PORT}`);
});