import { Input } from "./core/Input.js";
import { GameLoop } from "./core/GameLoop.js";
import { Player } from "./entities/Player.js";
import { Bomb } from "./entities/Bomb.js";
import { Explosion } from "./entities/Explosion.js";
import { Enemy } from "./entities/Enemy.js";
import { PowerUp } from "./entities/PowerUp.js";
import { MapGenerator } from "./systems/MapGenerator.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { ExplosionSystem } from "./systems/ExplosionSystem.js";

const input = new Input();

const mapGenerator = new MapGenerator();

const player = new Player(
    mapGenerator.tileSize,
    mapGenerator.tileSize
);

const collisionSystem =
    new CollisionSystem(mapGenerator);

const explosionSystem =
    new ExplosionSystem(mapGenerator);

const bombs = [];
const explosions = [];
const enemies = [];
const powerUps = [];

let currentLevel = 1;
let levelTime = 120;
let levelCompleted = false;

let elapsedGameTime = 0;
let totalEnemiesDefeated = 0;
let maxChain = 0;

let rankingCache = [];
let rankingLoading = false;

const GAME_STATES = {
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "game_over",
    INSTRUCTIONS: "instructions",
    RANKING: "ranking",
    CREDITS: "credits"
};

let gameState = GAME_STATES.MENU;

const buttons = {
    start: {
        x: 0,
        y: 0,
        width: 280,
        height: 55
    },

    instructions: {
        x: 0,
        y: 0,
        width: 280,
        height: 55
    },

    ranking: {
        x: 0,
        y: 0,
        width: 280,
        height: 55
    },

    credits: {
        x: 0,
        y: 0,
        width: 280,
        height: 55
    },

    continue: {
        x: 0,
        y: 0,
        width: 280,
        height: 60
    },

    restart: {
        x: 0,
        y: 0,
        width: 280,
        height: 60
    },

    menu: {
        x: 0,
        y: 0,
        width: 280,
        height: 60
    },

    back: {
        x: 0,
        y: 0,
        width: 280,
        height: 55
    }
};

function getReachableCells() {
    return mapGenerator
        .pathfinding
        .findReachableCells(
            mapGenerator.playerSpawn.x,
            mapGenerator.playerSpawn.y
        );
}

function spawnEnemies() {

    enemies.length = 0;

    const reachableCells =
        getReachableCells();

    const enemySpawnCandidates =
        reachableCells.filter(cell => {

            const distance =
                Math.abs(
                    cell.x -
                    mapGenerator.playerSpawn.x
                ) +
                Math.abs(
                    cell.y -
                    mapGenerator.playerSpawn.y
                );

            return distance >= 6;
        });

    const enemyTypes = [
        "rogue",
        "hunter",
        "predictor"
    ];

    const enemyCount =
        Math.min(
            3 +
            currentLevel -
            1,
            enemySpawnCandidates.length
        );

    const availableCells =
        [...enemySpawnCandidates];

    for (
        let i = 0;
        i < enemyCount;
        i++
    ) {

        if (
            availableCells.length === 0
        ) {
            break;
        }

        const randomIndex =
            Math.floor(
                Math.random() *
                availableCells.length
            );

        const spawn =
            availableCells.splice(
                randomIndex,
                1
            )[0];

        const type =
            enemyTypes[
                i %
                enemyTypes.length
            ];

        const enemy =
            new Enemy(
                spawn.x *
                mapGenerator.tileSize,

                spawn.y *
                mapGenerator.tileSize,

                type
            );

        enemy.setTarget(player);

        enemy.speed +=
            (currentLevel - 1) *
            10;

        enemies.push(enemy);
    }
}

function startLevel() {

    mapGenerator.generate();

    player.x =
        mapGenerator.playerSpawn.x *
        mapGenerator.tileSize;

    player.y =
        mapGenerator.playerSpawn.y *
        mapGenerator.tileSize;

    player.bombs =
        player.maxBombs;

    bombs.length = 0;
    explosions.length = 0;
    powerUps.length = 0;

    levelTime =
        Math.max(
            60,
            120 -
            (currentLevel - 1) *
            10
        );

    levelCompleted = false;

    spawnEnemies();

    console.log(
        "Nivel iniciado:",
        currentLevel,
        "| Tiempo:",
        levelTime,
        "| Enemigos:",
        enemies.length
    );
}

function completeLevel() {

    if (levelCompleted) {
        return;
    }

    levelCompleted = true;

    player.addScore(
        500 * currentLevel
    );

    currentLevel++;

    console.log(
        "Nivel completado. Siguiente nivel:",
        currentLevel
    );

    startLevel();
}

let scoreSaved = false;

async function saveScore() {

    if (scoreSaved) {
        return;
    }

    scoreSaved = true;

    const scoreData = {
        player: "PLAYER",
        score: player.score,
        level: currentLevel,
        enemiesDefeated: totalEnemiesDefeated,
        duration: Math.floor(elapsedGameTime),
        maxChain: maxChain
    };

    try {

        const response =
            await fetch(
                "/api/scores",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            scoreData
                        )
                }
            );

        if (!response.ok) {
            throw new Error(
                "Servidor respondió con HTTP " +
                response.status
            );
        }

        const result =
            await response.json();

        console.log(
            "Puntuación guardada en Node.js:",
            result
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar en Node.js. " +
            "Se utilizará LocalStorage como respaldo.",
            error
        );

        saveScoreLocal(scoreData);
    }
}

function saveScoreLocal(scoreData) {

    try {

        const ranking =
            JSON.parse(
                localStorage.getItem(
                    "blastMazeRanking"
                ) || "[]"
            );

        ranking.push({
            ...scoreData,
            date:
                new Date()
                    .toISOString()
        });

        ranking.sort(
            (a, b) =>
                b.score -
                a.score
        );

        ranking.splice(5);

        localStorage.setItem(
            "blastMazeRanking",
            JSON.stringify(ranking)
        );

        console.log(
            "Puntuación guardada localmente."
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar el ranking local:",
            error
        );
    }
}

async function loadRanking() {

    if (rankingLoading) {
        return;
    }

    rankingLoading = true;

    try {

        const response =
            await fetch(
                "/api/scores"
            );

        if (!response.ok) {
            throw new Error(
                "Servidor respondió con HTTP " +
                response.status
            );
        }

        const ranking =
            await response.json();

        rankingCache =
            Array.isArray(ranking)
                ? ranking.slice(0, 5)
                : [];

        console.log(
            "Ranking cargado desde Node.js:",
            rankingCache
        );

    } catch (error) {

        console.warn(
            "No se pudo obtener el ranking desde Node.js. " +
            "Se utilizará LocalStorage.",
            error
        );

        rankingCache =
            getLocalRanking();
    }

    rankingLoading = false;
}

function getLocalRanking() {

    try {

        const ranking =
            JSON.parse(
                localStorage.getItem(
                    "blastMazeRanking"
                ) || "[]"
            );

        if (!Array.isArray(ranking)) {
            return [];
        }

        ranking.sort(
            (a, b) =>
                b.score -
                a.score
        );

        return ranking.slice(0, 5);

    } catch (error) {

        console.warn(
            "No se pudo leer el ranking local:",
            error
        );

        return [];
    }
}

function resetGame() {

    scoreSaved = false;

    currentLevel = 1;
    levelTime = 120;
    levelCompleted = false;

    elapsedGameTime = 0;
    totalEnemiesDefeated = 0;
    maxChain = 0;

    player.reset(
        mapGenerator.tileSize,
        mapGenerator.tileSize
    );

    player.score = 0;
    player.speed = 120;

    bombs.length = 0;
    explosions.length = 0;
    enemies.length = 0;
    powerUps.length = 0;

    startLevel();

    gameState =
        GAME_STATES.PLAYING;

    console.log(
        "Partida reiniciada"
    );
}

function setGameOver(reason) {

    if (
        gameState ===
        GAME_STATES.GAME_OVER
    ) {
        return;
    }

    gameState =
        GAME_STATES.GAME_OVER;

    saveScore();

    bombs.length = 0;
    explosions.length = 0;

    console.log(
        "GAME OVER:",
        reason,
        "| Score:",
        player.score,
        "| Nivel:",
        currentLevel,
        "| Enemigos derrotados:",
        totalEnemiesDefeated,
        "| Duración:",
        Math.floor(elapsedGameTime),
        "s",
        "| Máxima cadena:",
        maxChain
    );
}

function goToMainMenu() {

    gameState =
        GAME_STATES.MENU;

    bombs.length = 0;
    explosions.length = 0;
    enemies.length = 0;
    powerUps.length = 0;

    levelCompleted = false;

    console.log(
        "Menú principal"
    );
}

console.log(
    "Blast Maze iniciado correctamente"
);

const canvas =
    document.getElementById(
        "gameCanvas"
    );

const ctx =
    canvas.getContext("2d");

canvas.addEventListener(
    "click",
    event => {

        const rect =
            canvas.getBoundingClientRect();

        const mouseX =
            (event.clientX -
                rect.left) *
            (
                canvas.width /
                rect.width
            );

        const mouseY =
            (event.clientY -
                rect.top) *
            (
                canvas.height /
                rect.height
            );

        handleCanvasClick(
            mouseX,
            mouseY
        );
    }
);

function isPointInsideButton(
    x,
    y,
    button
) {

    return (
        x >= button.x &&
        x <=
        button.x +
        button.width &&
        y >= button.y &&
        y <=
        button.y +
        button.height
    );
}

function handleCanvasClick(
    x,
    y
) {

    if (
        gameState ===
        GAME_STATES.MENU
    ) {

        if (
            isPointInsideButton(
                x,
                y,
                buttons.start
            )
        ) {

            resetGame();

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.instructions
            )
        ) {

            gameState =
                GAME_STATES.INSTRUCTIONS;

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.ranking
            )
        ) {

            gameState =
                GAME_STATES.RANKING;

            loadRanking();

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.credits
            )
        ) {

            gameState =
                GAME_STATES.CREDITS;
        }

        return;
    }

    if (
        gameState ===
        GAME_STATES.INSTRUCTIONS ||
        gameState ===
        GAME_STATES.RANKING ||
        gameState ===
        GAME_STATES.CREDITS
    ) {

        if (
            isPointInsideButton(
                x,
                y,
                buttons.back
            )
        ) {

            goToMainMenu();
        }

        return;
    }

    if (
        gameState ===
        GAME_STATES.PAUSED
    ) {

        if (
            isPointInsideButton(
                x,
                y,
                buttons.continue
            )
        ) {

            gameState =
                GAME_STATES.PLAYING;

            console.log(
                "Juego continuado"
            );

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.restart
            )
        ) {

            resetGame();

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.menu
            )
        ) {

            goToMainMenu();
        }

        return;
    }

    if (
        gameState ===
        GAME_STATES.GAME_OVER
    ) {

        if (
            isPointInsideButton(
                x,
                y,
                buttons.restart
            )
        ) {

            resetGame();

        } else if (
            isPointInsideButton(
                x,
                y,
                buttons.menu
            )
        ) {

            goToMainMenu();
        }
    }
}

function checkPlayerEnemyCollision(
    player,
    enemy
) {

    return (
        player.x <
        enemy.x +
        enemy.width &&

        player.x +
        player.width >
        enemy.x &&

        player.y <
        enemy.y +
        enemy.height &&

        player.y +
        player.height >
        enemy.y
    );
}

function update(deltaTime) {

    if (
        input.wasPressed(
            "Escape"
        ) &&
        (
            gameState ===
            GAME_STATES.INSTRUCTIONS ||
            gameState ===
            GAME_STATES.RANKING ||
            gameState ===
            GAME_STATES.CREDITS
        )
    ) {

        goToMainMenu();
    }

    if (
        gameState ===
        GAME_STATES.MENU
    ) {

        if (
            input.wasPressed(
                "Enter"
            )
        ) {

            resetGame();
        }

        input.endFrame();

        return;
    }

    if (
        gameState ===
        GAME_STATES.INSTRUCTIONS ||
        gameState ===
        GAME_STATES.RANKING ||
        gameState ===
        GAME_STATES.CREDITS
    ) {

        input.endFrame();

        return;
    }

    if (
        gameState ===
        GAME_STATES.PAUSED
    ) {

        if (
            input.wasPressed(
                "KeyP"
            )
        ) {

            gameState =
                GAME_STATES.PLAYING;

            console.log(
                "Juego continuado"
            );
        }

        input.endFrame();

        return;
    }

    if (
        gameState ===
        GAME_STATES.GAME_OVER
    ) {

        input.endFrame();

        return;
    }

    if (
        input.wasPressed(
            "KeyP"
        )
    ) {

        gameState =
            GAME_STATES.PAUSED;

        console.log(
            "Juego pausado"
        );

        input.endFrame();

        return;
    }

    if (levelCompleted) {

        input.endFrame();

        return;
    }

    elapsedGameTime +=
        deltaTime;

    levelTime -=
        deltaTime;

    if (levelTime <= 0) {

        levelTime = 0;

        setGameOver(
            "Tiempo agotado"
        );

        input.endFrame();

        return;
    }

    player.update(
        deltaTime
    );

    let dx = 0;
    let dy = 0;

    if (
        input.isDown(
            "KeyW"
        ) ||
        input.isDown(
            "ArrowUp"
        )
    ) {

        dy = -1;
    }

    if (
        input.isDown(
            "KeyS"
        ) ||
        input.isDown(
            "ArrowDown"
        )
    ) {

        dy = 1;
    }

    if (
        input.isDown(
            "KeyA"
        ) ||
        input.isDown(
            "ArrowLeft"
        )
    ) {

        dx = -1;
    }

    if (
        input.isDown(
            "KeyD"
        ) ||
        input.isDown(
            "ArrowRight"
        )
    ) {

        dx = 1;
    }

    player.move(
        dx,
        dy,
        deltaTime,
        collisionSystem
    );

    for (
        const enemy of enemies
    ) {

        enemy.update(
            deltaTime,
            collisionSystem,
            mapGenerator
        );
    }

    for (
        const enemy of enemies
    ) {

        if (!enemy.alive) {
            continue;
        }

        if (
            checkPlayerEnemyCollision(
                player,
                enemy
            ) &&
            !player.invulnerable
        ) {

            const damageApplied =
                player.loseLife();

            if (damageApplied) {

                console.log(
                    "Jugador golpeado por " +
                    enemy.type +
                    ". Vidas restantes:",
                    player.lives
                );

                if (
                    !player.alive
                ) {

                    setGameOver(
                        "Sin vidas"
                    );

                    input.endFrame();

                    return;
                }
            }
        }
    }

    if (
        input.wasPressed(
            "Space"
        ) &&
        player.bombs > 0
    ) {

        const tileSize =
            mapGenerator.tileSize;

        const bombX =
            Math.floor(
                player.x /
                tileSize
            ) *
            tileSize;

        const bombY =
            Math.floor(
                player.y /
                tileSize
            ) *
            tileSize;

        bombs.push(
            new Bomb(
                bombX,
                bombY,
                player.range
            )
        );

        player.bombs--;
    }

    for (
        let i =
            bombs.length - 1;
        i >= 0;
        i--
    ) {

        const bomb =
            bombs[i];

        bomb.update(
            deltaTime
        );

        if (
            bomb.exploded
        ) {

            const affectedCells =
                explosionSystem
                    .calculateExplosion(
                        bomb.x /
                        mapGenerator.tileSize,

                        bomb.y /
                        mapGenerator.tileSize,

                        bomb.range
                    );

            const destructibleCells =
                affectedCells.filter(
                    cell =>
                        mapGenerator.getTile(
                            cell.x,
                            cell.y
                        ) === 2
                );

            explosionSystem.destroyBlocks(
                affectedCells
            );

            for (
                const cell of
                destructibleCells
            ) {

                if (
                    Math.random() <
                    0.25
                ) {

                    const types = [
                        "bomb",
                        "fire",
                        "speed"
                    ];

                    const randomType =
                        types[
                            Math.floor(
                                Math.random() *
                                types.length
                            )
                        ];

                    powerUps.push(
                        new PowerUp(
                            cell.x *
                            mapGenerator.tileSize +
                            4,

                            cell.y *
                            mapGenerator.tileSize +
                            4,

                            randomType
                        )
                    );

                    console.log(
                        "Power-up generado:",
                        randomType,
                        "en",
                        cell.x,
                        cell.y
                    );
                }
            }

            console.log(
                "Explosión generada:",
                affectedCells
            );

            if (!bomb.chainGroup) {
                bomb.chainGroup = new Set();
            }

            bomb.chainGroup.add(bomb);

            const chainSize =
                bomb.chainGroup.size;

            if (chainSize > maxChain) {
                maxChain = chainSize;

                console.log(
                    "Nueva cadena máxima:",
                    maxChain
                );
            }

            for (
                const otherBomb of
                bombs
            ) {

                if (
                    otherBomb ===
                    bomb
                ) {
                    continue;
                }

                const otherBombX =
                    otherBomb.x /
                    mapGenerator.tileSize;

                const otherBombY =
                    otherBomb.y /
                    mapGenerator.tileSize;

                const hitBomb =
                    affectedCells.some(
                        cell =>
                            cell.x ===
                            otherBombX &&
                            cell.y ===
                            otherBombY
                    );

                if (
                    hitBomb &&
                    otherBomb.active
                ) {

                    otherBomb.chainGroup =
                        bomb.chainGroup;

                    otherBomb.explode();

                    bomb.chainGroup.add(
                        otherBomb
                    );

                    if (
                        bomb.chainGroup.size >
                        maxChain
                    ) {

                        maxChain =
                            bomb.chainGroup.size;

                        console.log(
                            "Nueva cadena máxima:",
                            maxChain
                        );
                    }

                    console.log(
                        "Bomba explotó en cadena:",
                        otherBombX,
                        otherBombY
                    );
                }
            }

            const explosion =
                new Explosion(
                    bomb.x,
                    bomb.y,
                    bomb.range,
                    affectedCells
                );

            explosion.damagedEnemies =
                new Set();

            explosions.push(
                explosion
            );

            if (
                Math.random() <
                0.50 &&
                player.bombs <
                player.maxBombs
            ) {

                player.bombs++;

                console.log(
                    "Bomba recuperada"
                );
            }

            bombs.splice(
                i,
                1
            );
        }
    }

    for (
        const explosion of
        explosions
    ) {

        explosion.update(
            deltaTime
        );

        if (
            !explosion.active
        ) {

            continue;
        }

        const playerCellX =
            Math.floor(
                player.x /
                mapGenerator.tileSize
            );

        const playerCellY =
            Math.floor(
                player.y /
                mapGenerator.tileSize
            );

        const playerHit =
            explosion.cells.some(
                cell =>
                    cell.x ===
                    playerCellX &&
                    cell.y ===
                    playerCellY
            );

        if (
            playerHit &&
            !explosion.playerDamaged
        ) {

            player.loseLife();

            explosion.playerDamaged =
                true;

            console.log(
                "Jugador alcanzado. " +
                "Vidas restantes:",
                player.lives
            );

            if (
                !player.alive
            ) {

                setGameOver(
                    "Sin vidas"
                );

                input.endFrame();

                return;
            }
        }

        for (
            const enemy of
            enemies
        ) {

            if (!enemy.alive) {
                continue;
            }

            if (
                explosion
                    .damagedEnemies
                    .has(enemy)
            ) {

                continue;
            }

            const enemyCellX =
                Math.floor(
                    enemy.x /
                    mapGenerator.tileSize
                );

            const enemyCellY =
                Math.floor(
                    enemy.y /
                    mapGenerator.tileSize
                );

            const enemyHit =
                explosion.cells.some(
                    cell =>
                        cell.x ===
                        enemyCellX &&
                        cell.y ===
                        enemyCellY
                );

            if (enemyHit) {

                const defeated =
                    enemy.takeDamage();

                explosion
                    .damagedEnemies
                    .add(enemy);

                if (defeated) {

                    let points = 0;

                    if (
                        enemy.type ===
                        "rogue"
                    ) {

                        points = 100;

                    } else if (
                        enemy.type ===
                        "hunter"
                    ) {

                        points = 200;

                    } else if (
                        enemy.type ===
                        "predictor"
                    ) {

                        points = 300;
                    }

                    player.addScore(
                        points
                    );

                    totalEnemiesDefeated++;

                    console.log(
                        "Enemigo derrotado:",
                        enemy.type,
                        "| Puntos:",
                        points,
                        "| Enemigos derrotados:",
                        totalEnemiesDefeated,
                        "| Score total:",
                        player.score
                    );

                } else {

                    console.log(
                        "Enemigo vulnerable:",
                        enemy.type
                    );
                }
            }
        }
    }

    for (
        const powerUp of
        powerUps
    ) {

        if (
            !powerUp.active
        ) {

            continue;
        }

        const collected =
            player.x <
            powerUp.x +
            powerUp.width &&

            player.x +
            player.width >
            powerUp.x &&

            player.y <
            powerUp.y +
            powerUp.height &&

            player.y +
            player.height >
            powerUp.y;

        if (collected) {

            powerUp.collect(
                player
            );

            console.log(
                "Power-up recogido:",
                powerUp.type
            );
        }
    }

    const playerCellX =
        Math.floor(
            player.x /
            mapGenerator.tileSize
        );

    const playerCellY =
        Math.floor(
            player.y /
            mapGenerator.tileSize
        );

    const onExit =
        playerCellX ===
        mapGenerator.exit.x &&

        playerCellY ===
        mapGenerator.exit.y &&

        mapGenerator.getTile(
            mapGenerator.exit.x,
            mapGenerator.exit.y
        ) === 0;

    if (onExit) {

        completeLevel();
    }

    input.endFrame();
}

function drawExit() {

    const exitTile =
        mapGenerator.getTile(
            mapGenerator.exit.x,
            mapGenerator.exit.y
        );

    if (
        exitTile !== 0
    ) {

        return;
    }

    const tileSize =
        mapGenerator.tileSize;

    const centerX =
        mapGenerator.exit.x *
        tileSize +
        tileSize / 2;

    const centerY =
        mapGenerator.exit.y *
        tileSize +
        tileSize / 2;

    const time =
        performance.now() /
        1000;

    const pulse =
        3 +
        Math.sin(
            time * 4
        ) * 3;

    ctx.save();

    ctx.translate(
        centerX,
        centerY
    );

    ctx.shadowColor =
        "#ff00ff";

    ctx.shadowBlur =
        20 + pulse;

    ctx.strokeStyle =
        "#ff00ff";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        12 + pulse,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    ctx.shadowBlur = 10;

    ctx.strokeStyle =
        "#00ffff";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        7,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 8;

    ctx.fillStyle =
        "#00ffff";

    ctx.font =
        "10px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "EXIT",
        0,
        -18
    );

    ctx.restore();
}

function drawButton(
    label,
    button
) {

    ctx.save();

    ctx.fillStyle =
        "rgba(8, 8, 25, 0.95)";

    ctx.strokeStyle =
        "#00ffff";

    ctx.lineWidth = 3;

    ctx.shadowColor =
        "#00ffff";

    ctx.shadowBlur = 14;

    ctx.fillRect(
        button.x,
        button.y,
        button.width,
        button.height
    );

    ctx.strokeRect(
        button.x,
        button.y,
        button.width,
        button.height
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 20px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";

    ctx.fillText(
        label,
        button.x +
        button.width / 2,
        button.y +
        button.height / 2
    );

    ctx.restore();
}

function drawOverlay() {

    ctx.save();

    ctx.fillStyle =
        "rgba(0, 0, 0, 0.72)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();
}

function drawMenu() {

    const centerX =
        canvas.width / 2;

    buttons.start.x =
        centerX -
        buttons.start.width / 2;

    buttons.start.y = 270;

    buttons.instructions.x =
        centerX -
        buttons.instructions.width /
        2;

    buttons.instructions.y =
        340;

    buttons.ranking.x =
        centerX -
        buttons.ranking.width /
        2;

    buttons.ranking.y =
        410;

    buttons.credits.x =
        centerX -
        buttons.credits.width /
        2;

    buttons.credits.y =
        480;

    ctx.save();

    ctx.fillStyle =
        "#090914";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle =
        "#00ffff";

    ctx.shadowColor =
        "#00ffff";

    ctx.shadowBlur = 25;

    ctx.font =
        "bold 58px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "BLAST MAZE",
        centerX,
        95
    );

    ctx.shadowColor =
        "#ff00ff";

    ctx.shadowBlur = 18;

    ctx.fillStyle =
        "#ff00ff";

    ctx.font =
        "24px Arial";

    ctx.fillText(
        "ARENA BOMBER",
        centerX,
        135
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "18px Arial";

    ctx.fillText(
        "CYBERPUNK NEON EDITION",
        centerX,
        170
    );

    drawButton(
        "INICIAR PARTIDA",
        buttons.start
    );

    drawButton(
        "INSTRUCCIONES",
        buttons.instructions
    );

    drawButton(
        "RANKING",
        buttons.ranking
    );

    drawButton(
        "CRÉDITOS",
        buttons.credits
    );

    ctx.font =
        "13px Arial";

    ctx.fillStyle =
        "#aaaaaa";

    ctx.fillText(
        "ENTER también inicia la partida",
        centerX,
        555
    );

    ctx.restore();
}

function drawPauseScreen() {

    const centerX =
        canvas.width / 2;

    buttons.continue.x =
        centerX -
        buttons.continue.width / 2;

    buttons.continue.y =
        220;

    buttons.restart.x =
        centerX -
        buttons.restart.width / 2;

    buttons.restart.y =
        300;

    buttons.menu.x =
        centerX -
        buttons.menu.width / 2;

    buttons.menu.y =
        380;

    drawOverlay();

    ctx.save();

    ctx.fillStyle =
        "#00ffff";

    ctx.shadowColor =
        "#00ffff";

    ctx.shadowBlur = 20;

    ctx.font =
        "bold 52px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "PAUSA",
        centerX,
        150
    );

    ctx.shadowBlur = 0;

    drawButton(
        "CONTINUAR",
        buttons.continue
    );

    drawButton(
        "REINICIAR",
        buttons.restart
    );

    drawButton(
        "MENÚ PRINCIPAL",
        buttons.menu
    );

    ctx.restore();
}

function drawGameOverScreen() {

    const centerX =
        canvas.width / 2;

    buttons.restart.x =
        centerX -
        buttons.restart.width / 2;

    buttons.restart.y =
        300;

    buttons.menu.x =
        centerX -
        buttons.menu.width / 2;

    buttons.menu.y =
        380;

    drawOverlay();

    ctx.save();

    ctx.fillStyle =
        "#ff00ff";

    ctx.shadowColor =
        "#ff00ff";

    ctx.shadowBlur = 22;

    ctx.font =
        "bold 54px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "GAME OVER",
        centerX,
        125
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "21px Arial";

    ctx.fillText(
        "SCORE: " +
        player.score,
        centerX,
        185
    );

    ctx.fillText(
        "NIVEL ALCANZADO: " +
        currentLevel,
        centerX,
        220
    );

    ctx.font =
        "17px Arial";

    ctx.fillText(
        "ENEMIGOS DERROTADOS: " +
        totalEnemiesDefeated,
        centerX,
        255
    );

    ctx.fillText(
        "CADENA MÁXIMA: " +
        maxChain,
        centerX,
        280
    );

    drawButton(
        "REINTENTAR",
        buttons.restart
    );

    drawButton(
        "MENÚ PRINCIPAL",
        buttons.menu
    );

    ctx.restore();
}

function drawInformationBackground(
    title
) {

    ctx.save();

    ctx.fillStyle =
        "#090914";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle =
        "#00ffff";

    ctx.shadowColor =
        "#00ffff";

    ctx.shadowBlur = 18;

    ctx.font =
        "bold 40px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        title,
        canvas.width / 2,
        65
    );

    ctx.restore();
}

function drawBackButton() {

    buttons.back.x =
        canvas.width / 2 -
        buttons.back.width / 2;

    buttons.back.y =
        520;

    drawButton(
        "VOLVER AL MENÚ",
        buttons.back
    );
}

function drawInstructions() {

    drawInformationBackground(
        "INSTRUCCIONES"
    );

    ctx.save();

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "17px Arial";

    ctx.textAlign =
        "left";

    const lines = [

        [
            "MOVIMIENTO",
            "W A S D o las flechas direccionales"
        ],

        [
            "BOMBA",
            "ESPACIO para colocar una bomba"
        ],

        [
            "PAUSA",
            "P para pausar o continuar"
        ],

        [
            "OBJETIVO",
            "Destruye bloques, encuentra la salida y avanza de nivel"
        ],

        [
            "ENEMIGOS",
            "Evita Rogue, Hunter y Predictor"
        ],

        [
            "POWER-UPS",
            "B = bombas, F = alcance, S = velocidad"
        ],

        [
            "EXPLOSIONES",
            "Pueden destruir bloques y activar otras bombas"
        ],

        [
            "TIEMPO",
            "Cada nivel tiene un límite de tiempo"
        ],

        [
            "SALIDA",
            "La salida aparece cuando se destruye el bloque que la oculta"
        ]
    ];

    lines.forEach(
        (item, index) => {

            const y =
                115 +
                index * 42;

            ctx.fillStyle =
                "#00ffff";

            ctx.font =
                "bold 17px Arial";

            ctx.fillText(
                item[0],
                115,
                y
            );

            ctx.fillStyle =
                "#ffffff";

            ctx.font =
                "17px Arial";

            ctx.fillText(
                item[1],
                260,
                y
            );
        }
    );

    ctx.restore();

    drawBackButton();
}

function drawRanking() {

    drawInformationBackground(
        "RANKING"
    );

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#00ffff";

    ctx.font =
        "bold 17px Arial";

    ctx.fillText(
        "POS",
        70,
        120
    );

    ctx.fillText(
        "JUGADOR",
        165,
        120
    );

    ctx.fillText(
        "SCORE",
        285,
        120
    );

    ctx.fillText(
        "NIVEL",
        385,
        120
    );

    ctx.fillText(
        "ENEM.",
        475,
        120
    );

    ctx.fillText(
        "TIEMPO",
        575,
        120
    );

    ctx.fillText(
        "CADENA",
        685,
        120
    );

    if (rankingLoading) {

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "20px Arial";

        ctx.fillText(
            "Cargando ranking...",
            canvas.width / 2,
            190
        );

    } else if (
        rankingCache.length === 0
    ) {

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "20px Arial";

        ctx.fillText(
            "Aún no hay partidas registradas",
            canvas.width / 2,
            190
        );

    } else {

        rankingCache.forEach(
            (entry, index) => {

                const y =
                    165 +
                    index * 55;

                ctx.fillStyle =
                    "#ffffff";

                ctx.font =
                    "16px Arial";

                ctx.fillText(
                    String(
                        index + 1
                    ),
                    70,
                    y
                );

                ctx.fillText(
                    String(
                        entry.player ||
                        "PLAYER"
                    ),
                    165,
                    y
                );

                ctx.fillText(
                    String(
                        entry.score ??
                        0
                    ),
                    285,
                    y
                );

                ctx.fillText(
                    String(
                        entry.level ??
                        1
                    ),
                    385,
                    y
                );

                ctx.fillText(
                    String(
                        entry.enemiesDefeated ??
                        0
                    ),
                    475,
                    y
                );

                ctx.fillText(
                    formatDuration(
                        entry.duration ??
                        0
                    ),
                    575,
                    y
                );

                ctx.fillText(
                    String(
                        entry.maxChain ??
                        0
                    ),
                    685,
                    y
                );
            }
        );
    }

    ctx.fillStyle =
        "#8888aa";

    ctx.font =
        "13px Arial";

    ctx.fillText(
        "Los resultados se almacenan en Node.js mediante Fetch API y JSON.",
        canvas.width / 2,
        455
    );

    ctx.restore();

    drawBackButton();
}

function formatDuration(
    seconds
) {

    const totalSeconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const remainingSeconds =
        totalSeconds % 60;

    return (
        String(minutes)
            .padStart(2, "0") +
        ":" +
        String(remainingSeconds)
            .padStart(2, "0")
    );
}

function drawCredits() {

    drawInformationBackground(
        "CRÉDITOS"
    );

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "23px Arial";

    ctx.fillText(
        "BLAST MAZE: ARENA BOMBER",
        canvas.width / 2,
        145
    );

    ctx.font =
        "18px Arial";

    ctx.fillText(
        "Proyecto integrador - Videojuego arcade web",
        canvas.width / 2,
        190
    );

    ctx.fillText(
        "Tecnologías: HTML5, CSS3, JavaScript, Canvas 2D y Node.js",
        canvas.width / 2,
        230
    );

    ctx.fillStyle =
        "#ff00ff";

    ctx.font =
        "bold 21px Arial";

    ctx.fillText(
        "CYBERPUNK NEON EDITION",
        canvas.width / 2,
        290
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "18px Arial";

    ctx.fillText(
        "Equipo de desarrollo",
        canvas.width / 2,
        345
    );

    ctx.fillText(
        "Blast Maze Team",
        canvas.width / 2,
        380
    );

    ctx.fillStyle =
        "#8888aa";

    ctx.font =
        "14px Arial";

    ctx.fillText(
        "Versión de desarrollo",
        canvas.width / 2,
        430
    );

    ctx.restore();

    drawBackButton();
}

function draw() {

    ctx.fillStyle =
        "#090914";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const tileSize =
        mapGenerator.tileSize;

    for (
        let y = 0;
        y < mapGenerator.height;
        y++
    ) {

        for (
            let x = 0;
            x < mapGenerator.width;
            x++
        ) {

            const tile =
                mapGenerator.getTile(
                    x,
                    y
                );

            if (
                tile === 1
            ) {

                ctx.fillStyle =
                    "#00ffff";

                ctx.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }

            if (
                tile === 2
            ) {

                ctx.fillStyle =
                    "#7a00ff";

                ctx.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }
        }
    }

    drawExit();

    ctx.save();

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "18px Arial";

    ctx.textAlign =
        "left";

    ctx.shadowColor =
        "#00ffff";

    ctx.shadowBlur = 8;

    ctx.fillText(
        "LEVEL: " +
        currentLevel,
        20,
        25
    );

    ctx.fillText(
        "SCORE: " +
        player.score,
        20,
        48
    );

    ctx.fillText(
        "LIVES: " +
        player.lives,
        20,
        71
    );

    ctx.fillText(
        "BOMBS: " +
        player.bombs +
        "/" +
        player.maxBombs,
        20,
        94
    );

    ctx.fillText(
        "TIME: " +
        Math.ceil(
            levelTime
        ),
        20,
        117
    );

    ctx.restore();

    ctx.fillStyle =
        "#00ffff";

    ctx.font =
        "24px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "BLAST MAZE",
        canvas.width / 2,
        canvas.height / 2
    );

    ctx.fillStyle =
        "#00ffff";

    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );

    for (
        const enemy of enemies
    ) {

        if (!enemy.alive) {
            continue;
        }

        if (
            enemy.state ===
            enemy.states.VULNERABLE
        ) {

            const blink =
                Math.floor(
                    performance.now() /
                    150
                ) % 2 === 0;

            ctx.fillStyle =
                blink
                    ? "#00ffff"
                    : "#ffffff";

        } else if (
            enemy.type ===
            "rogue"
        ) {

            ctx.fillStyle =
                "#ff3030";

        } else if (
            enemy.type ===
            "hunter"
        ) {

            ctx.fillStyle =
                "#ffff00";

        } else if (
            enemy.type ===
            "predictor"
        ) {

            ctx.fillStyle =
                "#ff00ff";
        }

        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height
        );
    }

    for (
        const bomb of bombs
    ) {

        ctx.fillStyle =
            "#ff00ff";

        ctx.beginPath();

        ctx.arc(
            bomb.x +
            tileSize / 2,
            bomb.y +
            tileSize / 2,
            12,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    for (
        const powerUp of powerUps
    ) {

        if (
            !powerUp.active
        ) {

            continue;
        }

        if (
            powerUp.type ===
            "bomb"
        ) {

            ctx.fillStyle =
                "#ff6600";

        } else if (
            powerUp.type ===
            "fire"
        ) {

            ctx.fillStyle =
                "#ff3030";

        } else if (
            powerUp.type ===
            "speed"
        ) {

            ctx.fillStyle =
                "#00ffff";
        }

        ctx.shadowColor =
            ctx.fillStyle;

        ctx.shadowBlur = 15;

        ctx.fillRect(
            powerUp.x,
            powerUp.y,
            powerUp.width,
            powerUp.height
        );

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "18px Arial";

        ctx.textAlign =
            "center";

        let symbol = "?";

        if (
            powerUp.type ===
            "bomb"
        ) {

            symbol = "B";

        } else if (
            powerUp.type ===
            "fire"
        ) {

            symbol = "F";

        } else if (
            powerUp.type ===
            "speed"
        ) {

            symbol = "S";
        }

        ctx.fillText(
            symbol,
            powerUp.x +
            powerUp.width / 2,
            powerUp.y + 22
        );
    }

    for (
        const explosion of explosions
    ) {

        if (
            !explosion.active
        ) {

            continue;
        }

        for (
            const cell of
            explosion.cells
        ) {

            ctx.fillStyle =
                "#ff00ff";

            ctx.fillRect(
                cell.x *
                tileSize,

                cell.y *
                tileSize,

                tileSize,
                tileSize
            );
        }
    }
}

function render() {

    if (
        gameState ===
        GAME_STATES.MENU
    ) {

        drawMenu();

        return;
    }

    if (
        gameState ===
        GAME_STATES.INSTRUCTIONS
    ) {

        drawInstructions();

        return;
    }

    if (
        gameState ===
        GAME_STATES.RANKING
    ) {

        drawRanking();

        return;
    }

    if (
        gameState ===
        GAME_STATES.CREDITS
    ) {

        drawCredits();

        return;
    }

    draw();

    if (
        gameState ===
        GAME_STATES.PAUSED
    ) {

        drawPauseScreen();

    } else if (
        gameState ===
        GAME_STATES.GAME_OVER
    ) {

        drawGameOverScreen();
    }
}

const gameLoop =
    new GameLoop(
        update,
        render
    );

gameLoop.start();