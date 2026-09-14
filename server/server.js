const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const HOST = "localhost";

const server = http.createServer((req, res) => {
    let filePath = req.url === "/"
        ? path.join(__dirname, "..", "index.html")
        : path.join(__dirname, "..", req.url);

    const extension = path.extname(filePath);

    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8"
    };

    const contentType = contentTypes[extension] || "text/plain; charset=utf-8";

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            res.end("Archivo no encontrado");
            return;
        }

        res.writeHead(200, {
            "Content-Type": contentType
        });

        res.end(content);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Blast Maze server running at http://${HOST}:${PORT}`);
});