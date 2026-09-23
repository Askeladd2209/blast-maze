const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const ROOT_DIR =
    path.join(__dirname, "..");

const DATA_DIR =
    path.join(__dirname, "data");

const SCORES_FILE =
    path.join(
        DATA_DIR,
        "scores.json"
    );

if (!fs.existsSync(DATA_DIR)) {

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );
}

if (!fs.existsSync(SCORES_FILE)) {

    fs.writeFileSync(
        SCORES_FILE,
        "[]",
        "utf8"
    );
}

function sendJSON(
    response,
    statusCode,
    data
) {

    const body =
        JSON.stringify(data);

    response.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"
        }
    );

    response.end(body);
}

function readScores() {

    try {

        const content =
            fs.readFileSync(
                SCORES_FILE,
                "utf8"
            );

        const scores =
            JSON.parse(content);

        if (
            !Array.isArray(scores)
        ) {

            return [];
        }

        return scores;

    } catch (error) {

        console.error(
            "Error leyendo scores:",
            error
        );

        return [];
    }
}

function writeScores(scores) {

    fs.writeFileSync(
        SCORES_FILE,
        JSON.stringify(
            scores,
            null,
            4
        ),
        "utf8"
    );
}

function serveStaticFile(
    request,
    response
) {

    let requestPath =
        decodeURIComponent(
            request.url
        );

    if (
        requestPath === "/"
    ) {

        requestPath =
            "/index.html";
    }

    const filePath =
        path.normalize(
            path.join(
                ROOT_DIR,
                requestPath
            )
        );

    if (
        !filePath.startsWith(
            ROOT_DIR
        )
    ) {

        response.writeHead(
            403
        );

        response.end(
            "Forbidden"
        );

        return;
    }

    fs.stat(
        filePath,
        (
            error,
            stats
        ) => {

            if (
                error ||
                !stats.isFile()
            ) {

                response.writeHead(
                    404
                );

                response.end(
                    "Archivo no encontrado"
                );

                return;
            }

            const extension =
                path.extname(
                    filePath
                ).toLowerCase();

            const mimeTypes = {

                ".html":
                    "text/html; charset=utf-8",

                ".css":
                    "text/css; charset=utf-8",

                ".js":
                    "text/javascript; charset=utf-8",

                ".json":
                    "application/json; charset=utf-8",

                ".png":
                    "image/png",

                ".jpg":
                    "image/jpeg",

                ".jpeg":
                    "image/jpeg",

                ".gif":
                    "image/gif",

                ".svg":
                    "image/svg+xml",

                ".wav":
                    "audio/wav",

                ".mp3":
                    "audio/mpeg",

                ".ogg":
                    "audio/ogg"
            };

            response.writeHead(
                200,
                {
                    "Content-Type":
                        mimeTypes[
                            extension
                        ] ||
                        "application/octet-stream"
                }
            );

            fs.createReadStream(
                filePath
            ).pipe(
                response
            );
        }
    );
}

function receiveBody(
    request
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let body = "";

            request.on(
                "data",
                chunk => {

                    body +=
                        chunk.toString();

                    if (
                        body.length >
                        1000000
                    ) {

                        reject(
                            new Error(
                                "Solicitud demasiado grande"
                            )
                        );

                        request.destroy();
                    }
                }
            );

            request.on(
                "end",
                () => {

                    try {

                        if (
                            body.trim() ===
                            ""
                        ) {

                            resolve({});
                            return;
                        }

                        resolve(
                            JSON.parse(
                                body
                            )
                        );

                    } catch (error) {

                        reject(
                            new Error(
                                "JSON inválido"
                            )
                        );
                    }
                }
            );

            request.on(
                "error",
                reject
            );
        }
    );
}

function normalizeScore(
    data
) {

    const score =
        Number(
            data.score
        );

    const level =
        Number(
            data.level
        );

    const enemiesDefeated =
        Number(
            data.enemiesDefeated
        );

    const duration =
        Number(
            data.duration
        );

    const maxChain =
        Number(
            data.maxChain
        );

    return {

        player:
            typeof data.player ===
            "string" &&
            data.player.trim() !== ""
                ? data.player.trim()
                : "PLAYER",

        score:
            Number.isFinite(score)
                ? Math.max(
                    0,
                    Math.floor(score)
                )
                : 0,

        level:
            Number.isFinite(level)
                ? Math.max(
                    1,
                    Math.floor(level)
                )
                : 1,

        enemiesDefeated:
            Number.isFinite(
                enemiesDefeated
            )
                ? Math.max(
                    0,
                    Math.floor(
                        enemiesDefeated
                    )
                )
                : 0,

        duration:
            Number.isFinite(
                duration
            )
                ? Math.max(
                    0,
                    duration
                )
                : 0,

        maxChain:
            Number.isFinite(
                maxChain
            )
                ? Math.max(
                    0,
                    Math.floor(
                        maxChain
                    )
                )
                : 0,

        date:
            new Date()
                .toISOString()
    };
}

const server =
    http.createServer(
        async (
            request,
            response
        ) => {

            if (
                request.method ===
                "OPTIONS"
            ) {

                response.writeHead(
                    204,
                    {
                        "Access-Control-Allow-Origin":
                            "*",

                        "Access-Control-Allow-Methods":
                            "GET, POST, OPTIONS",

                        "Access-Control-Allow-Headers":
                            "Content-Type"
                    }
                );

                response.end();

                return;
            }

            if (
                request.url ===
                "/api/health"
            ) {

                sendJSON(
                    response,
                    200,
                    {
                        status:
                            "ok",

                        service:
                            "Blast Maze API"
                    }
                );

                return;
            }

            if (
                request.url ===
                    "/api/scores" &&
                request.method ===
                    "GET"
            ) {

                const scores =
                    readScores();

                scores.sort(
                    (
                        a,
                        b
                    ) =>
                        b.score -
                        a.score
                );

                sendJSON(
                    response,
                    200,
                    scores.slice(
                        0,
                        10
                    )
                );

                return;
            }

            if (
                request.url ===
                    "/api/scores" &&
                request.method ===
                    "POST"
            ) {

                try {

                    const body =
                        await receiveBody(
                            request
                        );

                    const newScore =
                        normalizeScore(
                            body
                        );

                    const scores =
                        readScores();

                    scores.push(
                        newScore
                    );

                    scores.sort(
                        (
                            a,
                            b
                        ) =>
                            b.score -
                            a.score
                    );

                    const limitedScores =
                        scores.slice(
                            0,
                            10
                        );

                    writeScores(
                        limitedScores
                    );

                    sendJSON(
                        response,
                        201,
                        {
                            message:
                                "Puntuación guardada correctamente",

                            score:
                                newScore
                        }
                    );

                } catch (error) {

                    console.error(
                        error
                    );

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                error.message
                        }
                    );
                }

                return;
            }

            if (
                request.url.startsWith(
                    "/api/"
                )
            ) {

                sendJSON(
                    response,
                    404,
                    {
                        error:
                            "Endpoint no encontrado"
                    }
                );

                return;
            }

            serveStaticFile(
                request,
                response
            );
        }
    );

server.listen(
    PORT,
    () => {

        console.log(
            "================================"
        );

        console.log(
            "BLAST MAZE SERVER"
        );

        console.log(
            "Servidor iniciado correctamente"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "API:",
        );

        console.log(
            `GET  http://localhost:${PORT}/api/scores`
        );

        console.log(
            `POST http://localhost:${PORT}/api/scores`
        );

        console.log(
            "================================"
        );
    }
);