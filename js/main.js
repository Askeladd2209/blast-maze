import { Input } from "./core/Input.js";
import { GameLoop } from "./core/GameLoop.js";
import { AssetManager } from "./core/AssetManager.js";
import { AudioManager } from "./core/AudioManager.js";
import { Player } from "./entities/Player.js";
import { Bomb } from "./entities/Bomb.js";
import { Explosion } from "./entities/Explosion.js";
import { Enemy } from "./entities/Enemy.js";
import { PowerUp } from "./entities/PowerUp.js";
import { MapGenerator } from "./systems/MapGenerator.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { ExplosionSystem } from "./systems/ExplosionSystem.js";

const input = new Input();

const audioManager =
    new AudioManager();

const assetManager =
    new AssetManager();

const playerAssetPromise =
    assetManager.loadImage(
        "player",
        "./assets/sprites/player.png"
    );

playerAssetPromise
    .then(() => {

        console.log(
            "Sprite del Player cargado correctamente."
        );

    })
    .catch(error => {

        console.error(
            "Error cargando Sprite del Player:",
            error
        );

    });

const rogueAssetPromise =
    assetManager.loadImage(
        "rogue",
        "./assets/sprites/rogue.png"
    );

const hunterAssetPromise =
    assetManager.loadImage(
        "hunter",
        "./assets/sprites/hunter.png"
    );

const predictorAssetPromise =
    assetManager.loadImage(
        "predictor",
        "./assets/sprites/predictor.png"
    );

Promise.all([
    rogueAssetPromise,
    hunterAssetPromise,
    predictorAssetPromise
])
.then(() => {

    console.log(
        "Sprites de enemigos cargados correctamente."
    );

})
.catch(error => {

    console.error(
        "Error cargando sprites de enemigos:",
        error
    );

});

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

    audioManager.playPause();

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

    
    audioManager.init();
    audioManager.resume();
    audioManager.startMusic("gameplay");

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

        audioManager.stopMusic();
        audioManager.playGameOver();

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


    audioManager.stopMusic();
    audioManager.startMusic("menu");

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

function getBombPlacementCell() {

    const tileSize =
        mapGenerator.tileSize;

    // =========================================
    // CENTRO REAL DEL JUGADOR
    // =========================================

    const playerCenterX =
        player.x +
        player.width / 2;

    const playerCenterY =
        player.y +
        player.height / 2;

    const cellX =
        Math.floor(
            playerCenterX /
            tileSize
        );

    const cellY =
        Math.floor(
            playerCenterY /
            tileSize
        );

    // =========================================
    // VALIDAR QUE LA CELDA EXISTA
    // =========================================

    if (
        cellX < 0 ||
        cellY < 0 ||
        cellX >= mapGenerator.width ||
        cellY >= mapGenerator.height
    ) {

        return null;
    }

    // =========================================
    // LA BOMBA SOLO PUEDE ESTAR EN SUELO
    // =========================================

    const tile =
        mapGenerator.getTile(
            cellX,
            cellY
        );

    if (tile !== 0) {

        return null;
    }

    // =========================================
    // EVITAR DOS BOMBAS EN LA MISMA CELDA
    // =========================================

    const bombAlreadyExists =
        bombs.some(
            bomb =>
                Math.floor(
                    bomb.x / tileSize
                ) === cellX &&
                Math.floor(
                    bomb.y / tileSize
                ) === cellY &&
                bomb.active
        );

    if (bombAlreadyExists) {

        return null;
    }

    return {
        x: cellX,
        y: cellY
    };
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

                audioManager.playPause();

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


            audioManager.playPause();

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

                audioManager.playEnemyHit();

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

    const bombCell =
        getBombPlacementCell();

    // =========================================
    // CELDA NO VÁLIDA
    // =========================================

    if (!bombCell) {

        console.log(
            "No se puede colocar la bomba aquí."
        );

    } else {

        const tileSize =
            mapGenerator.tileSize;

        const bombX =
            bombCell.x *
            tileSize;

        const bombY =
            bombCell.y *
            tileSize;

        // =====================================
        // CREAR BOMBA
        // =====================================

        bombs.push(
            new Bomb(
                bombX,
                bombY,
                player.range
            )
        );

        audioManager.playBomb();

        player.bombs--;

        console.log(
            "Bomba colocada en:",
            bombCell.x,
            bombCell.y
        );
    }
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

            audioManager.playBomb();

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
            

            const damageApplied =
            player.loseLife();
            
            if (damageApplied) {
                audioManager.playPlayerHit();
            }
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

                    audioManager.playEnemyHit();

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

            audioManager.playPowerUp();

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

function drawGlowCircle(x, y, radius, color, blur = 20) {
    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawLabBackground() {
    const time = performance.now() / 1000;

    // =========================================================
    // FONDO DEL LABORATORIO
    // =========================================================

    const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        50,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
    );

    gradient.addColorStop(0, "#0b1918");
    gradient.addColorStop(0.45, "#061012");
    gradient.addColorStop(1, "#020607");

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =========================================================
    // REJILLA DEL LABORATORIO
    // =========================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 210, 0.07)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < canvas.width;
        x += 40
    ) {
        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += 40
    ) {
        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =========================================================
    // LÍNEAS DE CIRCUITO
    // =========================================================

    ctx.save();

    const circuitPulse =
        (Math.sin(time * 3) + 1) / 2;

    ctx.strokeStyle =
        `rgba(0, 255, 225, ${
            0.08 + circuitPulse * 0.10
        })`;

    ctx.lineWidth = 2;

    // Línea superior
    ctx.beginPath();

    ctx.moveTo(0, 130);
    ctx.lineTo(180, 130);
    ctx.lineTo(210, 105);
    ctx.lineTo(390, 105);

    ctx.stroke();

    // Línea derecha
    ctx.beginPath();

    ctx.moveTo(
        canvas.width,
        160
    );

    ctx.lineTo(
        canvas.width - 180,
        160
    );

    ctx.lineTo(
        canvas.width - 220,
        200
    );

    ctx.lineTo(
        canvas.width - 390,
        200
    );

    ctx.stroke();

    // Línea inferior
    ctx.beginPath();

    ctx.moveTo(
        0,
        canvas.height - 45
    );

    ctx.lineTo(
        220,
        canvas.height - 45
    );

    ctx.lineTo(
        260,
        canvas.height - 75
    );

    ctx.lineTo(
        470,
        canvas.height - 75
    );

    ctx.stroke();

    ctx.restore();


    // =========================================================
    // NODOS DE ENERGÍA
    // =========================================================

    const nodes = [
        {
            x: 180,
            y: 130
        },
        {
            x: 390,
            y: 105
        },
        {
            x: canvas.width - 180,
            y: 160
        },
        {
            x: canvas.width - 390,
            y: 200
        },
        {
            x: 220,
            y: canvas.height - 45
        },
        {
            x: 470,
            y: canvas.height - 75
        }
    ];

    for (const node of nodes) {

        const pulse =
            2 +
            Math.sin(
                time * 4 +
                node.x * 0.01
            ) * 1.5;

        ctx.save();

        ctx.shadowColor =
            "#00ffe1";

        ctx.shadowBlur =
            12;

        ctx.fillStyle =
            "#00ffe1";

        ctx.beginPath();

        ctx.arc(
            node.x,
            node.y,
            pulse,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }


    // =========================================================
    // PARTÍCULAS DE CONTAMINACIÓN
    // =========================================================

    ctx.save();

    for (
        let i = 0;
        i < 65;
        i++
    ) {

        /*
         * Las posiciones se calculan matemáticamente.
         * No necesitamos modificar el sistema de juego.
         */

        const baseX =
            (i * 137.37) %
            canvas.width;

        const baseY =
            (i * 83.21) %
            canvas.height;

        const speed =
            8 +
            (i % 5) * 3;

        const x =
            (
                baseX +
                Math.sin(
                    time * 0.5 +
                    i
                ) * 12
            ) %
            canvas.width;

        let y =
            (
                baseY -
                time * speed
            ) %
            canvas.height;

        if (y < 0) {
            y += canvas.height;
        }

        const size =
            1 +
            (i % 3);

        const alpha =
            0.12 +
            (
                Math.sin(
                    time * 2 +
                    i
                ) + 1
            ) * 0.08;

        ctx.fillStyle =
            `rgba(124, 255, 0, ${alpha})`;

        ctx.shadowColor =
            "#7cff00";

        ctx.shadowBlur =
            5;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =========================================================
    // PARTÍCULAS MAGENTA
    // =========================================================

    ctx.save();

    for (
        let i = 0;
        i < 25;
        i++
    ) {

        const baseX =
            (i * 211.17) %
            canvas.width;

        const baseY =
            (i * 97.31) %
            canvas.height;

        const x =
            baseX +
            Math.sin(
                time * 0.7 +
                i * 2
            ) * 18;

        let y =
            baseY +
            Math.sin(
                time * 0.4 +
                i
            ) * 25;

        y =
            (
                y +
                canvas.height
            ) %
            canvas.height;

        const alpha =
            0.10 +
            (
                Math.sin(
                    time * 2.5 +
                    i
                ) + 1
            ) * 0.07;

        ctx.fillStyle =
            `rgba(255, 0, 217, ${alpha})`;

        ctx.shadowColor =
            "#ff00d9";

        ctx.shadowBlur =
            7;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =========================================================
    // ONDA DE CONTAMINACIÓN
    // =========================================================

    const wave =
        (
            Math.sin(
                time * 1.5
            ) + 1
        ) / 2;

    ctx.save();

    ctx.strokeStyle =
        `rgba(124, 255, 0, ${
            0.03 + wave * 0.06
        })`;

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        180 + wave * 100,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    ctx.restore();


    // =========================================================
    // FRANJA INFERIOR DEL LABORATORIO
    // =========================================================

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 15, 17, 0.88)";

    ctx.fillRect(
        0,
        canvas.height - 35,
        canvas.width,
        35
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.35)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        0,
        canvas.height - 35
    );

    ctx.lineTo(
        canvas.width,
        canvas.height - 35
    );

    ctx.stroke();

    ctx.restore();
}

function drawTileFloor(x, y) {
    const tileSize = mapGenerator.tileSize;

    ctx.fillStyle = "#081316";

    ctx.fillRect(
        x * tileSize,
        y * tileSize,
        tileSize,
        tileSize
    );

    ctx.strokeStyle = "rgba(0, 255, 210, 0.08)";
    ctx.lineWidth = 1;

    ctx.strokeRect(
        x * tileSize + 1,
        y * tileSize + 1,
        tileSize - 2,
        tileSize - 2
    );
}

function drawFixedWall(x, y) {
    const tileSize = mapGenerator.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;

    ctx.save();

    ctx.fillStyle = "#101d20";
    ctx.fillRect(px, py, tileSize, tileSize);

    ctx.strokeStyle = "#00d9b5";
    ctx.lineWidth = 2;

    ctx.shadowColor = "#00d9b5";
    ctx.shadowBlur = 8;

    ctx.strokeRect(
        px + 3,
        py + 3,
        tileSize - 6,
        tileSize - 6
    );

    ctx.shadowBlur = 0;

    // Detalles industriales
    ctx.strokeStyle = "rgba(0, 255, 210, 0.25)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(px + 7, py + 12);
    ctx.lineTo(px + tileSize - 7, py + 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + 7, py + tileSize - 12);
    ctx.lineTo(px + tileSize - 7, py + tileSize - 12);
    ctx.stroke();

    ctx.restore();
}

function drawDestructibleBlock(x, y) {
    const tileSize = mapGenerator.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;

    ctx.save();

    ctx.fillStyle = "#18261d";

    ctx.shadowColor = "#7cff00";
    ctx.shadowBlur = 8;

    ctx.fillRect(
        px + 3,
        py + 3,
        tileSize - 6,
        tileSize - 6
    );

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#72ff4d";
    ctx.lineWidth = 2;

    ctx.strokeRect(
        px + 4,
        py + 4,
        tileSize - 8,
        tileSize - 8
    );

    // Patrón de contaminación
    ctx.strokeStyle = "rgba(180, 255, 70, 0.45)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(px + 8, py + 10);
    ctx.lineTo(px + 18, py + 18);
    ctx.lineTo(px + 12, py + 31);
    ctx.lineTo(px + 28, py + 25);
    ctx.lineTo(px + 34, py + 12);
    ctx.stroke();

    ctx.restore();
}

function drawExit() {
    const exitTile = mapGenerator.getTile(
        mapGenerator.exit.x,
        mapGenerator.exit.y
    );

    if (exitTile !== 0) {
        return;
    }

    const tileSize = mapGenerator.tileSize;

    const centerX =
        mapGenerator.exit.x * tileSize +
        tileSize / 2;

    const centerY =
        mapGenerator.exit.y * tileSize +
        tileSize / 2;

    const time =
        performance.now() / 1000;

    ctx.save();

    // =====================================================
    // PULSO GENERAL
    // =====================================================

    const pulse =
        Math.sin(time * 4);

    const pulseSize =
        2 + pulse * 2;


    // =====================================================
    // AURA DIMENSIONAL
    // =====================================================

    const aura =
        ctx.createRadialGradient(
            centerX,
            centerY,
            2,
            centerX,
            centerY,
            28 + pulseSize
        );

    aura.addColorStop(
        0,
        "rgba(124, 255, 0, 0.30)"
    );

    aura.addColorStop(
        0.45,
        "rgba(255, 0, 217, 0.16)"
    );

    aura.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle = aura;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        30 + pulseSize,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // ANILLO EXTERIOR
    // =====================================================

    ctx.shadowColor = "#ff00d9";
    ctx.shadowBlur = 25;

    ctx.strokeStyle = "#ff00d9";
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        19 + pulseSize,
        time * 0.7,
        time * 0.7 + Math.PI * 1.65
    );

    ctx.stroke();


    // =====================================================
    // SEGUNDO ANILLO
    // =====================================================

    ctx.shadowColor = "#00ffe1";
    ctx.shadowBlur = 20;

    ctx.strokeStyle = "#00ffe1";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        15,
        -time * 1.2,
        -time * 1.2 + Math.PI * 1.6
    );

    ctx.stroke();


    // =====================================================
    // TERCER ANILLO
    // =====================================================

    ctx.strokeStyle = "#7cff00";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        11 + Math.sin(time * 6),
        time * 1.8,
        time * 1.8 + Math.PI * 1.3
    );

    ctx.stroke();


    // =====================================================
    // DISTORSIÓN CENTRAL
    // =====================================================

    ctx.shadowColor = "#ff00d9";
    ctx.shadowBlur = 18;

    const core =
        ctx.createRadialGradient(
            centerX,
            centerY,
            1,
            centerX,
            centerY,
            11
        );

    core.addColorStop(
        0,
        "#ffffff"
    );

    core.addColorStop(
        0.25,
        "#7cff00"
    );

    core.addColorStop(
        0.65,
        "#ff00d9"
    );

    core.addColorStop(
        1,
        "#120018"
    );

    ctx.fillStyle = core;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        10 + pulseSize * 0.4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // NÚCLEO
    // =====================================================

    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // PARTÍCULAS DEL PORTAL
    // =====================================================

    for (let i = 0; i < 10; i++) {

        const angle =
            time * 1.5 +
            i * (
                Math.PI * 2 / 10
            );

        const radius =
            18 +
            Math.sin(
                time * 3 + i
            ) * 4;

        const particleX =
            centerX +
            Math.cos(angle) *
            radius;

        const particleY =
            centerY +
            Math.sin(angle) *
            radius;

        const particleSize =
            1.5 +
            Math.sin(
                time * 5 + i
            );

        ctx.fillStyle =
            i % 2 === 0
                ? "#00ffe1"
                : "#ff00d9";

        ctx.shadowColor =
            ctx.fillStyle;

        ctx.shadowBlur = 10;

        ctx.beginPath();

        ctx.arc(
            particleX,
            particleY,
            Math.max(
                1,
                particleSize
            ),
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    // =====================================================
    // ETIQUETA
    // =====================================================

    ctx.shadowColor = "#ff00d9";
    ctx.shadowBlur = 10;

    ctx.fillStyle = "#ffffff";

    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        "EXIT",
        centerX,
        centerY - 27
    );


    // =====================================================
    // LÍNEAS DE ANOMALÍA
    // =====================================================

    ctx.strokeStyle =
        "rgba(124, 255, 0, 0.6)";

    ctx.lineWidth = 1;

    for (let i = 0; i < 4; i++) {

        const angle =
            time * 0.5 +
            i * Math.PI / 2;

        const startRadius = 22;
        const endRadius = 27;

        const x1 =
            centerX +
            Math.cos(angle) *
            startRadius;

        const y1 =
            centerY +
            Math.sin(angle) *
            startRadius;

        const x2 =
            centerX +
            Math.cos(angle) *
            endRadius;

        const y2 =
            centerY +
            Math.sin(angle) *
            endRadius;

        ctx.beginPath();

        ctx.moveTo(
            x1,
            y1
        );

        ctx.lineTo(
            x2,
            y2
        );

        ctx.stroke();
    }

    ctx.restore();
}

function drawPlayer() {

    const sprite =
        assetManager.getImage("player");

    // =========================================
    // FALLBACK
    // =========================================

    if (!sprite) {

        ctx.save();

        ctx.fillStyle =
            "#00ffff";

        ctx.shadowColor =
            "#00ffff";

        ctx.shadowBlur =
            12;

        ctx.fillRect(
            player.x,
            player.y,
            player.width,
            player.height
        );

        ctx.restore();

        return;
    }

    // =========================================
    // CONFIGURACIÓN DEL SPRITE SHEET
    // =========================================

    const frameCounts = {

        idle: 4,
        down: 4,
        up: 4,
        left: 4,
        right: 4,
        hit: 4,
        death: 6

    };

    /*
     * Las primeras 6 animaciones utilizan
     * 4 frames distribuidos horizontalmente.
     */

    const normalFrameWidth = 176;
    const normalFrameHeight = 160;

    /*
     * La animación de muerte utiliza
     * 6 frames y ocupa todo el ancho.
     */

    const deathFrameWidth =
        sprite.width / 6;

    const deathFrameHeight =
        sprite.height - 960;

    // =========================================
    // ESTADO ACTUAL
    // =========================================

    const state =
        player.animationState || "idle";

    let frame =
        player.currentFrame || 0;

    // Seguridad para evitar frames inexistentes

    const maxFrames =
        frameCounts[state] || 4;

    frame =
        Math.max(
            0,
            Math.min(
                frame,
                maxFrames - 1
            )
        );

    // =========================================
    // CALCULAR RECORTE DEL SPRITE
    // =========================================

    let sourceX;
    let sourceY;
    let sourceWidth;
    let sourceHeight;

    if (state === "death") {

        sourceWidth =
            deathFrameWidth;

        sourceHeight =
            deathFrameHeight;

        sourceX =
            frame *
            deathFrameWidth;

        sourceY =
            960;

    } else {

        sourceWidth =
            normalFrameWidth;

        sourceHeight =
            normalFrameHeight;

        sourceX =
            frame *
            normalFrameWidth;

        const row =
            player.animationRows[state] ?? 0;

        sourceY =
            row *
            normalFrameHeight;
    }

    // =========================================
    // DIBUJAR
    // =========================================

    ctx.save();

    ctx.imageSmoothingEnabled = true;

    /*
     * El sprite se dibuja ligeramente más grande
     * que la caja de colisión para que el astronauta
     * tenga presencia visual sin modificar las
     * colisiones reales del jugador.
     */

    const drawWidth = 40;
    const drawHeight = 40;

    const drawX =
        player.x +
        player.width / 2 -
        drawWidth / 2;

    const drawY =
        player.y +
        player.height / 2 -
        drawHeight / 2;

    ctx.drawImage(

        sprite,

        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        drawX,
        drawY,
        drawWidth,
        drawHeight

    );

    ctx.restore();
}

function drawEnemy(enemy) {

    if (!enemy.alive) {
        return;
    }

    const sprite =
        assetManager.getImage(enemy.type);

    // =====================================================
    // FALLBACK
    // =====================================================

    if (!sprite) {

        drawEnemyFallback(enemy);

        return;
    }

    const time =
        performance.now() / 1000;

    const vulnerable =
        enemy.state ===
        enemy.states.VULNERABLE;

    // =====================================================
    // CONFIGURACIÓN DE SPRITES
    // =====================================================

    let rows = [];
    let rowIndex = 0;
    let frame = 0;

    // =====================================================
    // ROGUE
    // =====================================================

    if (enemy.type === "rogue") {

        rows = [

            // DOWN
            {
                y: 10,
                height: 156,
                frames: [
                    { x: 188, width: 176 },
                    { x: 384, width: 176 },
                    { x: 579, width: 176 },
                    { x: 775, width: 177 }
                ]
            },

            // DOWN WALK
            {
                y: 160,
                height: 174,
                frames: [
                    { x: 182, width: 179 },
                    { x: 384, width: 175 },
                    { x: 578, width: 175 },
                    { x: 775, width: 180 }
                ]
            },

            // UP
            {
                y: 315,
                height: 180,
                frames: [
                    { x: 180, width: 180 },
                    { x: 381, width: 177 },
                    { x: 578, width: 177 },
                    { x: 777, width: 179 }
                ]
            },

            // LEFT
            {
                y: 470,
                height: 165,
                frames: [
                    { x: 169, width: 186 },
                    { x: 377, width: 185 },
                    { x: 582, width: 185 },
                    { x: 787, width: 185 }
                ]
            },

            // RIGHT
            {
                y: 610,
                height: 160,
                frames: [
                    { x: 169, width: 186 },
                    { x: 378, width: 182 },
                    { x: 580, width: 182 },
                    { x: 790, width: 194 }
                ]
            },

            // VULNERABLE
            {
                y: 740,
                height: 175,
                frames: [
                    { x: 146, width: 189 },
                    { x: 356, width: 189 },
                    { x: 571, width: 198 },
                    { x: 791, width: 198 }
                ]
            }
        ];
    }

    // =====================================================
    // HUNTER
    // =====================================================

    if (enemy.type === "hunter") {

        rows = [

            // DOWN
            {
                y: 5,
                height: 150,
                frames: [
                    { x: 126, width: 116 },
                    { x: 257, width: 113 },
                    { x: 382, width: 113 },
                    { x: 517, width: 130 }
                ]
            },

            // DOWN WALK
            {
                y: 155,
                height: 153,
                frames: [
                    { x: 117, width: 116 },
                    { x: 246, width: 116 },
                    { x: 384, width: 130 },
                    { x: 528, width: 130 }
                ]
            },

            // UP
            {
                y: 308,
                height: 147,
                frames: [
                    { x: 107, width: 130 },
                    { x: 252, width: 129 },
                    { x: 395, width: 129 },
                    { x: 545, width: 141 }
                ]
            },

            // LEFT
            {
                y: 450,
                height: 135,
                frames: [
                    { x: 98, width: 150 },
                    { x: 265, width: 150 },
                    { x: 435, width: 156 },
                    { x: 625, width: 183 }
                ]
            },

            // RIGHT
            {
                y: 585,
                height: 135,
                frames: [
                    { x: 88, width: 157 },
                    { x: 262, width: 157 },
                    { x: 436, width: 157 },
                    { x: 614, width: 163 }
                ]
            },

            // VULNERABLE
            {
                y: 715,
                height: 145,
                frames: [
                    { x: 96, width: 151 },
                    { x: 264, width: 151 },
                    { x: 438, width: 161 },
                    { x: 622, width: 168 }
                ]
            }
        ];
    }

    // =====================================================
    // PREDICTOR
    // =====================================================

    if (enemy.type === "predictor") {

        rows = [

            // DOWN
            {
                y: 10,
                height: 160,
                frames: [
                    { x: 52, width: 168 },
                    { x: 238, width: 168 },
                    { x: 428, width: 166 },
                    { x: 612, width: 166 },
                    { x: 798, width: 168 },
                    { x: 987, width: 172 },
                    { x: 1182, width: 167 },
                    { x: 1367, width: 167 }
                ]
            },

            // RIGHT
            {
                y: 178,
                height: 152,
                frames: [
                    { x: 25, width: 169 },
                    { x: 213, width: 169 },
                    { x: 405, width: 171 },
                    { x: 595, width: 171 },
                    { x: 785, width: 171 },
                    { x: 982, width: 165 },
                    { x: 1165, width: 165 },
                    { x: 1350, width: 168 }
                ]
            },

            // UP
            {
                y: 345,
                height: 155,
                frames: [
                    { x: 46, width: 162 },
                    { x: 226, width: 162 },
                    { x: 410, width: 168 },
                    { x: 601, width: 168 },
                    { x: 788, width: 168 },
                    { x: 980, width: 166 },
                    { x: 1166, width: 162 },
                    { x: 1346, width: 162 }
                ]
            },

            // LEFT
            {
                y: 515,
                height: 155,
                frames: [
                    { x: 38, width: 172 },
                    { x: 229, width: 172 },
                    { x: 426, width: 170 },
                    { x: 618, width: 165 },
                    { x: 801, width: 165 },
                    { x: 995, width: 168 },
                    { x: 1186, width: 161 },
                    { x: 1365, width: 161 }
                ]
            },

            // VULNERABLE
            {
                y: 680,
                height: 155,
                frames: [
                    { x: 36, width: 171 },
                    { x: 226, width: 171 },
                    { x: 424, width: 163 },
                    { x: 605, width: 163 },
                    { x: 789, width: 169 },
                    { x: 977, width: 169 },
                    { x: 1178, width: 162 },
                    { x: 1358, width: 162 }
                ]
            }
        ];
    }

    // =====================================================
    // SEGURIDAD
    // =====================================================

    if (rows.length === 0) {

        drawEnemyFallback(enemy);

        return;
    }

    // =====================================================
    // DETERMINAR FILA SEGÚN DIRECCIÓN
    // =====================================================

    if (vulnerable) {

        rowIndex =
            enemy.type === "predictor"
                ? 4
                : 5;

    } else {

        const dx =
            enemy.direction?.x ?? 0;

        const dy =
            enemy.direction?.y ?? 0;

        if (Math.abs(dx) > Math.abs(dy)) {

            if (dx < 0) {
                rowIndex = 3;
            } else {
                rowIndex = 4;
            }

        } else {

            if (dy < 0) {
                rowIndex = 2;
            } else {
                rowIndex = 0;
            }
        }
    }

    // =====================================================
    // SEGURIDAD DE FILA
    // =====================================================

    rowIndex =
        Math.max(
            0,
            Math.min(
                rowIndex,
                rows.length - 1
            )
        );

    const row =
        rows[rowIndex];

    // =====================================================
    // ANIMACIÓN
    // =====================================================

    frame =
        Math.floor(
            time * 7
        ) %
        row.frames.length;

    const frameData =
        row.frames[frame];

    // =====================================================
    // DIMENSIONES DEL FRAME
    // =====================================================

    const sourceX =
        frameData.x;

    const sourceY =
        row.y;

    const sourceWidth =
        frameData.width;

    const sourceHeight =
        row.height;

    // =====================================================
    // DESTINO
    // =====================================================

    const maxSize =
        vulnerable
            ? 48
            : 46;

    const scale =
        Math.min(
            maxSize / sourceWidth,
            maxSize / sourceHeight
        );

    const drawWidth =
        sourceWidth * scale;

    const drawHeight =
        sourceHeight * scale;

    const centerX =
        enemy.x +
        enemy.width / 2;

    const centerY =
        enemy.y +
        enemy.height / 2;

    const drawX =
        centerX -
        drawWidth / 2;

    const drawY =
        centerY -
        drawHeight / 2;

    // =====================================================
    // AURA
    // =====================================================

    ctx.save();

    if (vulnerable) {

        const blink =
            Math.floor(
                performance.now() / 120
            ) % 2 === 0;

        ctx.shadowColor =
            blink
                ? "#ffffff"
                : "#00ffe1";

        ctx.shadowBlur = 24;

    } else {

        if (enemy.type === "rogue") {
            ctx.shadowColor = "#7cff00";
        }

        if (enemy.type === "hunter") {
            ctx.shadowColor = "#7cff00";
        }

        if (enemy.type === "predictor") {
            ctx.shadowColor = "#ff00d9";
        }

        ctx.shadowBlur = 14;
    }

    // =====================================================
    // SPRITE
    // =====================================================

    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(
        sprite,

        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        drawX,
        drawY,
        drawWidth,
        drawHeight
    );

    ctx.restore();

    // =====================================================
    // INDICADOR VULNERABLE
    // =====================================================

    if (vulnerable) {

        ctx.save();

        const blink =
            Math.floor(
                performance.now() / 120
            ) % 2 === 0;

        ctx.strokeStyle =
            blink
                ? "#ffffff"
                : "#00ffe1";

        ctx.shadowColor =
            "#00ffe1";

        ctx.shadowBlur = 18;

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.arc(
            centerX,
            centerY,
            23 +
            Math.sin(time * 8) * 2,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.fillStyle =
            "#00ffe1";

        ctx.shadowBlur = 8;

        ctx.font =
            "bold 8px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            "VULNERABLE",
            centerX,
            enemy.y - 7
        );

        ctx.restore();
    }
}

function drawEnemyFallback(enemy) {

    const centerX =
        enemy.x +
        enemy.width / 2;

    const centerY =
        enemy.y +
        enemy.height / 2;

    let color =
        "#7cff00";

    if (enemy.type === "hunter") {
        color = "#ffd000";
    }

    if (enemy.type === "predictor") {
        color = "#ff00d9";
    }

    ctx.save();

    ctx.shadowColor =
        color;

    ctx.shadowBlur =
        14;

    ctx.fillStyle =
        "#080d0e";

    ctx.strokeStyle =
        color;

    ctx.lineWidth =
        3;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        14,
        0,
        Math.PI * 2
    );

    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawBomb(bomb) {
    const tileSize = mapGenerator.tileSize;

    const centerX =
        bomb.x +
        tileSize / 2;

    const centerY =
        bomb.y +
        tileSize / 2;

    const time =
        performance.now() / 1000;

    // Pulsación de la bomba
    const pulse =
        Math.sin(time * 7) * 2;

    ctx.save();

    // =====================================================
    // AURA EXTERIOR
    // =====================================================

    ctx.shadowColor = "#ff00d9";
    ctx.shadowBlur = 25;

    ctx.strokeStyle = "#ff00d9";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        15 + pulse,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    // =====================================================
    // CUERPO DE LA BOMBA
    // =====================================================

    const gradient =
        ctx.createRadialGradient(
            centerX - 5,
            centerY - 5,
            2,
            centerX,
            centerY,
            16
        );

    gradient.addColorStop(
        0,
        "#293b3b"
    );

    gradient.addColorStop(
        0.55,
        "#10191b"
    );

    gradient.addColorStop(
        1,
        "#030506"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        13 + pulse * 0.4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // CONTORNO
    // =====================================================

    ctx.shadowColor = "#ff00d9";
    ctx.shadowBlur = 12;

    ctx.strokeStyle = "#ff00d9";
    ctx.lineWidth = 2;

    ctx.stroke();


    // =====================================================
    // NÚCLEO MUTANTE
    // =====================================================

    ctx.shadowColor = "#7cff00";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#7cff00";

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        5 + pulse * 0.3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // NÚCLEO INTERNO
    // =====================================================

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        centerX - 1,
        centerY - 1,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // =====================================================
    // CONEXIÓN SUPERIOR
    // =====================================================

    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 12;

    ctx.strokeStyle = "#ff8c00";
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
        centerX + 7,
        centerY - 9
    );

    ctx.lineTo(
        centerX + 10,
        centerY - 13
    );

    ctx.stroke();


    // =====================================================
    // CHISPA
    // =====================================================

    const spark =
        Math.sin(time * 18) > 0;

    if (spark) {

        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 15;

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            centerX + 11,
            centerY - 14,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();
}

function drawPowerUp(powerUp) {
    if (!powerUp.active) {
        return;
    }

    let color = "#ff8c00";
    let symbol = "B";

    if (powerUp.type === "fire") {
        color = "#ff3355";
        symbol = "F";
    }

    if (powerUp.type === "speed") {
        color = "#00ffe1";
        symbol = "S";
    }

    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#0b1515";

    ctx.fillRect(
        powerUp.x + 3,
        powerUp.y + 3,
        powerUp.width - 6,
        powerUp.height - 6
    );

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.strokeRect(
        powerUp.x + 3,
        powerUp.y + 3,
        powerUp.width - 6,
        powerUp.height - 6
    );

    ctx.fillStyle = color;
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        symbol,
        powerUp.x + powerUp.width / 2,
        powerUp.y + powerUp.height / 2
    );

    ctx.restore();
}

function drawExplosion(explosion) {
    if (!explosion.active) {
        return;
    }

    const tileSize =
        mapGenerator.tileSize;

    const time =
        performance.now() / 1000;

    ctx.save();

    // =====================================================
    // ANIMACIÓN DE LA EXPLOSIÓN
    // =====================================================

    const pulse =
        0.85 +
        Math.sin(time * 18) * 0.15;

    ctx.globalAlpha = 0.85;


    // =====================================================
    // CELDAS AFECTADAS
    // =====================================================

    for (const cell of explosion.cells) {

        const px =
            cell.x * tileSize;

        const py =
            cell.y * tileSize;

        const centerX =
            px + tileSize / 2;

        const centerY =
            py + tileSize / 2;


        // -----------------------------------------------
        // AURA MAGENTA
        // -----------------------------------------------

        ctx.shadowColor = "#ff00d9";
        ctx.shadowBlur = 30;

        ctx.fillStyle =
            `rgba(255, 0, 217, ${0.35 * pulse})`;

        ctx.fillRect(
            px,
            py,
            tileSize,
            tileSize
        );


        // -----------------------------------------------
        // NÚCLEO VERDE
        // -----------------------------------------------

        ctx.shadowColor = "#7cff00";
        ctx.shadowBlur = 18;

        ctx.fillStyle =
            `rgba(124, 255, 0, ${0.65 * pulse})`;

        ctx.beginPath();

        ctx.arc(
            centerX,
            centerY,
            10 * pulse,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // -----------------------------------------------
        // NÚCLEO BLANCO
        // -----------------------------------------------

        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 12;

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            centerX,
            centerY,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // -----------------------------------------------
        // RAYOS DE ENERGÍA
        // -----------------------------------------------

        ctx.shadowColor = "#ff00d9";
        ctx.shadowBlur = 15;

        ctx.strokeStyle = "#ff00d9";
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            centerX,
            py + 3
        );

        ctx.lineTo(
            centerX,
            py + tileSize - 3
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
            px + 3,
            centerY
        );

        ctx.lineTo(
            px + tileSize - 3,
            centerY
        );

        ctx.stroke();


        // -----------------------------------------------
        // DESTELLOS DIAGONALES
        // -----------------------------------------------

        ctx.strokeStyle = "#7cff00";
        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.moveTo(
            px + 8,
            py + 8
        );

        ctx.lineTo(
            px + tileSize - 8,
            py + tileSize - 8
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
            px + tileSize - 8,
            py + 8
        );

        ctx.lineTo(
            px + 8,
            py + tileSize - 8
        );

        ctx.stroke();
    }

    ctx.restore();
}

function drawButton(label, button) {
    ctx.save();

    ctx.fillStyle = "rgba(5, 20, 22, 0.94)";

    ctx.strokeStyle = "#00ffe1";
    ctx.lineWidth = 2;

    ctx.shadowColor = "#00ffe1";
    ctx.shadowBlur = 12;

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

    ctx.fillStyle = "#ffffff";

    ctx.font = "bold 18px Arial";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        label,
        button.x + button.width / 2,
        button.y + button.height / 2
    );

    ctx.restore();
}

function drawOverlay() {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();
}

function drawMenu() {
    const time = performance.now() / 1000;

    const centerX = canvas.width / 2;

    // =====================================================
    // POSICIÓN DE LOS BOTONES
    // =====================================================

    buttons.start.x =
        centerX - buttons.start.width / 2;

    buttons.start.y = 235;

    buttons.instructions.x =
        centerX - buttons.instructions.width / 2;

    buttons.instructions.y = 285;

    buttons.ranking.x =
        centerX - buttons.ranking.width / 2;

    buttons.ranking.y = 335;

    buttons.credits.x =
        centerX - buttons.credits.width / 2;

    buttons.credits.y = 385;


    // =====================================================
    // FONDO
    // =====================================================

    const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
    );

    gradient.addColorStop(
        0,
        "#020708"
    );

    gradient.addColorStop(
        0.5,
        "#071417"
    );

    gradient.addColorStop(
        1,
        "#030406"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.07)";

    ctx.lineWidth = 1;

    const gridSize = 40;

    for (
        let x = 0;
        x < canvas.width;
        x += gridSize
    ) {
        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += gridSize
    ) {
        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // PARTÍCULAS
    // =====================================================

    ctx.save();

    for (let i = 0; i < 35; i++) {

        const x =
            (i * 173) % canvas.width;

        const baseY =
            (i * 97) % canvas.height;

        const y =
            (
                baseY +
                Math.sin(time * 1.2 + i) * 18 +
                time * 8
            ) % canvas.height;

        const radius =
            1.5 +
            Math.sin(time * 2 + i) * 0.8;

        ctx.shadowColor =
            "#7cff00";

        ctx.shadowBlur = 10;

        ctx.fillStyle =
            "rgba(124, 255, 0, 0.45)";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            Math.max(0.5, radius),
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =====================================================
    // CIRCUITOS
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(255, 0, 217, 0.18)";

    ctx.lineWidth = 1;

    const circuitOffset =
        (time * 30) % 80;

    for (
        let y = 80;
        y < canvas.height;
        y += 80
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y + circuitOffset
        );

        ctx.lineTo(
            100,
            y + circuitOffset
        );

        ctx.lineTo(
            125,
            y + 25 + circuitOffset
        );

        ctx.lineTo(
            210,
            y + 25 + circuitOffset
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // AURA CENTRAL
    // =====================================================

    const centerY = 155;

    const pulse =
        1 +
        Math.sin(time * 2.5) * 0.08;

    const aura =
        ctx.createRadialGradient(
            centerX,
            centerY,
            10,
            centerX,
            centerY,
            210 * pulse
        );

    aura.addColorStop(
        0,
        "rgba(124, 255, 0, 0.14)"
    );

    aura.addColorStop(
        0.45,
        "rgba(0, 255, 225, 0.06)"
    );

    aura.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
    );

    ctx.fillStyle = aura;

    ctx.fillRect(
        centerX - 230,
        centerY - 230,
        460,
        460
    );


    // =====================================================
    // TÍTULO
    // =====================================================

    ctx.save();

    ctx.textAlign = "center";

    ctx.shadowColor =
        "#00ffe1";

    ctx.shadowBlur = 25;

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 56px Arial";

    ctx.fillText(
        "BLAST MAZE",
        centerX,
        100
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "bold 20px Arial";

    ctx.fillText(
        "// MUTATION",
        centerX,
        130
    );

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "11px Arial";

    ctx.fillText(
        "BIOLOGICAL ANOMALY CONTAINMENT SYSTEM",
        centerX,
        150
    );

    ctx.restore();


    // =====================================================
    // PANEL CENTRAL
    // =====================================================

    const panelX = 290;
    const panelY = 180;
    const panelWidth = 380;
    const panelHeight = 270;

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.92)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.35)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // =====================================================
    // ESQUINAS DEL PANEL
    // =====================================================

    ctx.strokeStyle =
        "#7cff00";

    ctx.lineWidth = 2;


    // Superior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 20
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 20,
        panelY
    );

    ctx.stroke();


    // Superior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 20
    );

    ctx.stroke();


    // Inferior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + panelHeight - 20
    );

    ctx.lineTo(
        panelX,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + 20,
        panelY + panelHeight
    );

    ctx.stroke();


    // Inferior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight - 20
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // ESTADO DEL EXPERIMENTO
    // =====================================================

    ctx.save();

    ctx.textAlign = "left";

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 10px Arial";

    ctx.fillText(
        "EXPERIMENT STATUS",
        panelX + 25,
        panelY + 24
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.beginPath();

    ctx.arc(
        panelX + 350,
        panelY + 20,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "CONTAINMENT: ACTIVE",
        panelX + 25,
        panelY + 40
    );

    ctx.restore();


    // =====================================================
    // BOTONES
    // =====================================================

    drawButton(
        "NEW EXPERIMENT",
        buttons.start
    );

    drawButton(
        "INSTRUCTIONS",
        buttons.instructions
    );

    drawButton(
        "RANKING",
        buttons.ranking
    );

    drawButton(
        "CREDITS",
        buttons.credits
    );


    // =====================================================
    // INFORMACIÓN INFERIOR
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#456060";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "SYSTEM READY // AWAITING OPERATOR INPUT",
        centerX,
        500
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "HTML5 // CANVAS 2D // NODE.JS",
        centerX,
        520
    );

    ctx.fillStyle =
        "#263b3b";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "BLAST MAZE MUTATION PROTOCOL",
        centerX,
        540
    );

    ctx.restore();


    // =====================================================
    // LÍNEA DE ESCANEO
    // =====================================================

    const scanY =
        (time * 45) % canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 20,
            0,
            scanY + 20
        );

    scanGradient.addColorStop(
        0,
        "rgba(0, 255, 225, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(0, 255, 225, 0.05)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 20,
        canvas.width,
        40
    );

    ctx.restore();
}

function drawPauseScreen() {

    const time =
        performance.now() / 1000;

    const centerX =
        canvas.width / 2;


    // =====================================================
    // FONDO OSCURECIDO
    // =====================================================

    ctx.save();

    ctx.fillStyle =
        "rgba(1, 6, 8, 0.90)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.08)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < canvas.width;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // AURA DE PAUSA
    // =====================================================

    const pulse =
        1 +
        Math.sin(time * 2) * 0.08;

    const aura =
        ctx.createRadialGradient(
            centerX,
            210,
            10,
            centerX,
            210,
            220 * pulse
        );

    aura.addColorStop(
        0,
        "rgba(0, 255, 225, 0.12)"
    );

    aura.addColorStop(
        0.5,
        "rgba(124, 255, 0, 0.04)"
    );

    aura.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
    );

    ctx.fillStyle =
        aura;

    ctx.fillRect(
        centerX - 250,
        0,
        500,
        450
    );


    // =====================================================
    // PANEL
    // =====================================================

    const panelX = 270;
    const panelY = 105;
    const panelWidth = 420;
    const panelHeight = 390;

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.96)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.4)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // Esquinas
    ctx.strokeStyle =
        "#7cff00";

    ctx.lineWidth = 2;


    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 20
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 20,
        panelY
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 20
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + panelHeight - 20
    );

    ctx.lineTo(
        panelX,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + 20,
        panelY + panelHeight
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight - 20
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // ENCABEZADO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.shadowColor =
        "#00ffe1";

    ctx.shadowBlur = 18;

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 42px Arial";

    ctx.fillText(
        "PAUSED",
        centerX,
        170
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "// CONTAINMENT TEMPORARILY SUSPENDED",
        centerX,
        195
    );

    ctx.restore();


    // =====================================================
    // ESTADO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "CURRENT EXPERIMENT",
        centerX,
        235
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 18px Arial";

    ctx.fillText(
        "LEVEL " +
        String(currentLevel).padStart(2, "0"),
        centerX,
        258
    );

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "12px Arial";

    ctx.fillText(
        "SCORE: " +
        player.score,
        centerX,
        282
    );

    ctx.fillText(
        "TIME: " +
        Math.ceil(levelTime) +
        "s",
        centerX,
        302
    );

    ctx.restore();


    // =====================================================
    // BOTONES
    // =====================================================

    buttons.continue.x =
        centerX -
        buttons.continue.width / 2;

    buttons.continue.y =
        325;

    buttons.restart.x =
        centerX -
        buttons.restart.width / 2;

    buttons.restart.y =
        375;

    buttons.menu.x =
        centerX -
        buttons.menu.width / 2;

    buttons.menu.y =
        425;


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


    // =====================================================
    // ESCANEO
    // =====================================================

    const scanY =
        (time * 35) %
        canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 15,
            0,
            scanY + 15
        );

    scanGradient.addColorStop(
        0,
        "rgba(0, 255, 225, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(0, 255, 225, 0.04)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 15,
        canvas.width,
        30
    );

    ctx.restore();
}

function drawGameOverScreen() {

    const time =
        performance.now() / 1000;

    const centerX =
        canvas.width / 2;


    // =====================================================
    // FONDO
    // =====================================================

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#090204"
    );

    gradient.addColorStop(
        0.5,
        "#12030e"
    );

    gradient.addColorStop(
        1,
        "#030406"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(255, 0, 217, 0.07)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < canvas.width;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // AURA DE FALLO
    // =====================================================

    const pulse =
        1 +
        Math.sin(time * 4) * 0.1;

    const aura =
        ctx.createRadialGradient(
            centerX,
            170,
            10,
            centerX,
            170,
            260 * pulse
        );

    aura.addColorStop(
        0,
        "rgba(255, 0, 217, 0.15)"
    );

    aura.addColorStop(
        0.5,
        "rgba(255, 51, 85, 0.05)"
    );

    aura.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
    );

    ctx.fillStyle =
        aura;

    ctx.fillRect(
        centerX - 280,
        0,
        560,
        450
    );


    // =====================================================
    // PANEL
    // =====================================================

    const panelX = 250;
    const panelY = 80;
    const panelWidth = 460;
    const panelHeight = 450;

    ctx.save();

    ctx.fillStyle =
        "rgba(12, 2, 8, 0.96)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(255, 0, 217, 0.45)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // =====================================================
    // ESQUINAS
    // =====================================================

    ctx.strokeStyle =
        "#ff00d9";

    ctx.lineWidth = 2;


    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 20
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 20,
        panelY
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 20
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + panelHeight - 20
    );

    ctx.lineTo(
        panelX,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + 20,
        panelY + panelHeight
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight - 20
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // TÍTULO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.shadowColor =
        "#ff00d9";

    ctx.shadowBlur = 25;

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 48px Arial";

    ctx.fillText(
        "GAME OVER",
        centerX,
        145
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#ff3355";

    ctx.font =
        "bold 11px Arial";

    ctx.fillText(
        "// CONTAINMENT BREACH",
        centerX,
        170
    );

    ctx.restore();


    // =====================================================
    // ESTADÍSTICAS
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "left";

    const statX =
        panelX + 45;

    const valueX =
        panelX + 300;

    const stats = [

        [
            "FINAL SCORE",
            String(player.score)
        ],

        [
            "LEVEL REACHED",
            String(currentLevel)
        ],

        [
            "MUTATIONS",
            String(totalEnemiesDefeated)
        ],

        [
            "MAX CHAIN",
            String(maxChain)
        ],

        [
            "DURATION",
            formatDuration(
                elapsedGameTime
            )
        ]

    ];


    stats.forEach(
        (stat, index) => {

            const y =
                220 +
                index * 38;


            ctx.fillStyle =
                "#638080";

            ctx.font =
                "bold 10px Arial";

            ctx.fillText(
                stat[0],
                statX,
                y
            );


            ctx.fillStyle =
                "#ffffff";

            ctx.font =
                "bold 14px Arial";

            ctx.textAlign =
                "right";

            ctx.fillText(
                stat[1],
                valueX,
                y
            );

            ctx.textAlign =
                "left";


            ctx.strokeStyle =
                "rgba(255, 0, 217, 0.12)";

            ctx.lineWidth = 1;

            ctx.beginPath();

            ctx.moveTo(
                statX,
                y + 12
            );

            ctx.lineTo(
                panelX + panelWidth - 45,
                y + 12
            );

            ctx.stroke();
        }
    );

    ctx.restore();


    // =====================================================
    // MENSAJE
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#b7caca";

    ctx.font =
        "11px Arial";

    ctx.fillText(
        "THE EXPERIMENT HAS TERMINATED",
        centerX,
        410
    );

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "REINITIALIZE CONTAINMENT TO ATTEMPT AGAIN",
        centerX,
        430
    );

    ctx.restore();


    // =====================================================
    // BOTONES
    // =====================================================

    buttons.restart.x =
        centerX -
        buttons.restart.width / 2;

    buttons.restart.y =
        450;

    buttons.menu.x =
        centerX -
        buttons.menu.width / 2;

    buttons.menu.y =
        500;


    drawButton(
        "REINTENTAR",
        buttons.restart
    );

    drawButton(
        "MENÚ PRINCIPAL",
        buttons.menu
    );


    // =====================================================
    // ESCANEO
    // =====================================================

    const scanY =
        (time * 45) %
        canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 15,
            0,
            scanY + 15
        );

    scanGradient.addColorStop(
        0,
        "rgba(255, 0, 217, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(255, 0, 217, 0.04)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(255, 0, 217, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 15,
        canvas.width,
        30
    );

    ctx.restore();
}

function drawInstructions() {

    const time = performance.now() / 1000;

    const centerX =
        canvas.width / 2;


    // =====================================================
    // FONDO
    // =====================================================

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#020708"
    );

    gradient.addColorStop(
        0.5,
        "#071417"
    );

    gradient.addColorStop(
        1,
        "#030406"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.07)";

    ctx.lineWidth = 1;

    const gridSize = 40;

    for (
        let x = 0;
        x < canvas.width;
        x += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // PARTÍCULAS
    // =====================================================

    ctx.save();

    for (
        let i = 0;
        i < 30;
        i++
    ) {

        const x =
            (i * 173) %
            canvas.width;

        const baseY =
            (i * 97) %
            canvas.height;

        const y =
            (
                baseY +
                Math.sin(
                    time * 1.2 + i
                ) * 15 +
                time * 7
            ) %
            canvas.height;

        ctx.shadowColor =
            "#7cff00";

        ctx.shadowBlur = 8;

        ctx.fillStyle =
            "rgba(124, 255, 0, 0.4)";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =====================================================
    // TÍTULO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.shadowColor =
        "#00ffe1";

    ctx.shadowBlur = 20;

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 38px Arial";

    ctx.fillText(
        "MUTATION // OPERATING MANUAL",
        centerX,
        55
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "BIOLOGICAL ANOMALY CONTAINMENT PROTOCOL",
        centerX,
        78
    );

    ctx.restore();


    // =====================================================
    // PANEL PRINCIPAL
    // =====================================================

    const panelX = 105;
    const panelY = 100;
    const panelWidth = 750;
    const panelHeight = 410;

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.94)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.35)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // =====================================================
    // ESQUINAS
    // =====================================================

    ctx.strokeStyle =
        "#7cff00";

    ctx.lineWidth = 2;


    // Superior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 22
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 22,
        panelY
    );

    ctx.stroke();


    // Superior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 22,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 22
    );

    ctx.stroke();


    // Inferior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + panelHeight - 22
    );

    ctx.lineTo(
        panelX,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + 22,
        panelY + panelHeight
    );

    ctx.stroke();


    // Inferior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 22,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight - 22
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // ENCABEZADO DEL PANEL
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 11px Arial";

    ctx.fillText(
        "OPERATOR TRAINING // SYSTEM GUIDE",
        panelX + 25,
        panelY + 25
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.beginPath();

    ctx.arc(
        panelX + panelWidth - 28,
        panelY + 20,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();


    // =====================================================
    // DATOS DE INSTRUCCIONES
    // =====================================================

    const instructions = [

        [
            "MOVEMENT",
            "W A S D / FLECHAS",
            "Mover al operador por el laboratorio"
        ],

        [
            "BOMB",
            "SPACE",
            "Colocar una bomba en la posición actual"
        ],

        [
            "PAUSE",
            "P",
            "Pausar o continuar el experimento"
        ],

        [
            "OBJECTIVE",
            "DESTRUIR + ESCAPAR",
            "Destruir bloques, eliminar mutaciones y encontrar el portal"
        ],

        [
            "ENEMIES",
            "ROGUE / HUNTER / PREDICTOR",
            "Evitar sus ataques y aprovechar sus estados vulnerables"
        ],

        [
            "POWER-UPS",
            "BOMB / FIRE / SPEED",
            "Aumentar bombas, alcance de explosión o velocidad"
        ],

        [
            "CHAIN REACTION",
            "BOMB → BOMB",
            "Una explosión puede activar otras bombas"
        ],

        [
            "TIME",
            "CONTAINMENT",
            "Completar el nivel antes de que termine el tiempo"
        ],

        [
            "EXIT",
            "PORTAL",
            "Encontrar la salida dimensional para avanzar"
        ]
    ];


    // =====================================================
    // DIBUJAR INSTRUCCIONES
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "left";

    instructions.forEach(
        (item, index) => {

            const y =
                panelY +
                62 +
                index * 36;


            // Línea divisoria
            ctx.strokeStyle =
                "rgba(0, 255, 225, 0.08)";

            ctx.lineWidth = 1;

            ctx.beginPath();

            ctx.moveTo(
                panelX + 25,
                y + 14
            );

            ctx.lineTo(
                panelX + panelWidth - 25,
                y + 14
            );

            ctx.stroke();


            // Nombre
            ctx.fillStyle =
                "#00ffe1";

            ctx.font =
                "bold 12px Arial";

            ctx.fillText(
                item[0],
                panelX + 25,
                y
            );


            // Tecla / acción
            ctx.fillStyle =
                "#7cff00";

            ctx.font =
                "bold 11px Arial";

            ctx.fillText(
                item[1],
                panelX + 185,
                y
            );


            // Descripción
            ctx.fillStyle =
                "#b7caca";

            ctx.font =
                "11px Arial";

            ctx.fillText(
                item[2],
                panelX + 350,
                y
            );
        }
    );

    ctx.restore();


    // =====================================================
    // INDICADOR INFERIOR
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#456060";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "SYSTEM GUIDE // OPERATOR MUST MAINTAIN CONTAINMENT",
        centerX,
        535
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "WASD / ARROWS  •  SPACE: BOMB  •  P: PAUSE",
        centerX,
        553
    );

    ctx.restore();


    // =====================================================
    // BOTÓN VOLVER
    // =====================================================

    buttons.back.x =
        centerX -
        buttons.back.width / 2;

    buttons.back.y =
        570;

    drawButton(
        "VOLVER AL MENÚ",
        buttons.back
    );


    // =====================================================
    // ESCANEO
    // =====================================================

    const scanY =
        (time * 40) %
        canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 15,
            0,
            scanY + 15
        );

    scanGradient.addColorStop(
        0,
        "rgba(0, 255, 225, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(0, 255, 225, 0.045)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 15,
        canvas.width,
        30
    );

    ctx.restore();
}

function drawRanking() {

    const time = performance.now() / 1000;

    const centerX =
        canvas.width / 2;


    // =====================================================
    // FONDO
    // =====================================================

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#020708"
    );

    gradient.addColorStop(
        0.5,
        "#071417"
    );

    gradient.addColorStop(
        1,
        "#030406"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.07)";

    ctx.lineWidth = 1;

    const gridSize = 40;

    for (
        let x = 0;
        x < canvas.width;
        x += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // PARTÍCULAS
    // =====================================================

    ctx.save();

    for (
        let i = 0;
        i < 28;
        i++
    ) {

        const x =
            (i * 181) %
            canvas.width;

        const baseY =
            (i * 113) %
            canvas.height;

        const y =
            (
                baseY +
                Math.sin(
                    time * 1.1 + i
                ) * 16 +
                time * 6
            ) %
            canvas.height;

        ctx.shadowColor =
            "#7cff00";

        ctx.shadowBlur = 8;

        ctx.fillStyle =
            "rgba(124, 255, 0, 0.38)";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =====================================================
    // TÍTULO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.shadowColor =
        "#00ffe1";

    ctx.shadowBlur = 20;

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 38px Arial";

    ctx.fillText(
        "MUTATION // RANKING",
        centerX,
        55
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "CONTAINMENT PERFORMANCE DATABASE",
        centerX,
        78
    );

    ctx.restore();


    // =====================================================
    // PANEL
    // =====================================================

    const panelX = 45;
    const panelY = 100;
    const panelWidth = 870;
    const panelHeight = 390;

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.94)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.35)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // =====================================================
    // ESQUINAS
    // =====================================================

    ctx.strokeStyle =
        "#7cff00";

    ctx.lineWidth = 2;


    // Superior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 20
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 20,
        panelY
    );

    ctx.stroke();


    // Superior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 20,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 20
    );

    ctx.stroke();


    // =====================================================
    // ESTADO DE CONEXIÓN
    // =====================================================

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 10px Arial";

    ctx.fillText(
        "DATABASE // NODE.JS",
        panelX + 25,
        panelY + 24
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.beginPath();

    ctx.arc(
        panelX + 185,
        panelY + 20,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        rankingLoading
            ? "SYNCING..."
            : "ONLINE // JSON DATABASE",
        panelX + 198,
        panelY + 24
    );

    ctx.restore();


    // =====================================================
    // ENCABEZADOS
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 11px Arial";


    const columns = {

        position: 90,

        player: 210,

        score: 360,

        level: 470,

        enemies: 580,

        duration: 700,

        chain: 820
    };


    ctx.fillText(
        "POS",
        columns.position,
        155
    );

    ctx.fillText(
        "OPERATOR",
        columns.player,
        155
    );

    ctx.fillText(
        "SCORE",
        columns.score,
        155
    );

    ctx.fillText(
        "LEVEL",
        columns.level,
        155
    );

    ctx.fillText(
        "MUTATIONS",
        columns.enemies,
        155
    );

    ctx.fillText(
        "TIME",
        columns.duration,
        155
    );

    ctx.fillText(
        "CHAIN",
        columns.chain,
        155
    );

    ctx.restore();


    // =====================================================
    // LÍNEA DE ENCABEZADO
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.25)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        panelX + 20,
        170
    );

    ctx.lineTo(
        panelX + panelWidth - 20,
        170
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // CARGANDO
    // =====================================================

    if (rankingLoading) {

        ctx.save();

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#00ffe1";

        ctx.shadowColor =
            "#00ffe1";

        ctx.shadowBlur = 12;

        ctx.font =
            "bold 20px Arial";

        const pulse =
            Math.sin(time * 4) > 0;

        ctx.fillText(
            pulse
                ? "SYNCHRONIZING..."
                : "SYNCHRONIZING",
            centerX,
            270
        );

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#638080";

        ctx.font =
            "10px Arial";

        ctx.fillText(
            "CONNECTING TO CONTAINMENT DATABASE",
            centerX,
            295
        );

        ctx.restore();
    }


    // =====================================================
    // SIN DATOS
    // =====================================================

    else if (
        rankingCache.length === 0
    ) {

        ctx.save();

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#ff00d9";

        ctx.shadowColor =
            "#ff00d9";

        ctx.shadowBlur = 12;

        ctx.font =
            "bold 20px Arial";

        ctx.fillText(
            "NO EXPERIMENTS REGISTERED",
            centerX,
            270
        );

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#638080";

        ctx.font =
            "10px Arial";

        ctx.fillText(
            "COMPLETE AN EXPERIMENT TO GENERATE A RECORD",
            centerX,
            295
        );

        ctx.restore();
    }


    // =====================================================
    // DATOS DEL RANKING
    // =====================================================

    else {

        rankingCache.forEach(
            (entry, index) => {

                const y =
                    205 +
                    index * 52;


                // Línea de fila
                ctx.save();

                ctx.strokeStyle =
                    "rgba(0, 255, 225, 0.08)";

                ctx.lineWidth = 1;

                ctx.beginPath();

                ctx.moveTo(
                    panelX + 20,
                    y + 18
                );

                ctx.lineTo(
                    panelX + panelWidth - 20,
                    y + 18
                );

                ctx.stroke();

                ctx.restore();


                // Color de posición
                let positionColor =
                    "#ffffff";

                if (index === 0) {
                    positionColor =
                        "#7cff00";
                }

                if (index === 1) {
                    positionColor =
                        "#00ffe1";
                }

                if (index === 2) {
                    positionColor =
                        "#ff00d9";
                }


                ctx.save();

                ctx.textAlign =
                    "center";

                ctx.font =
                    "bold 16px Arial";

                ctx.fillStyle =
                    positionColor;

                ctx.shadowColor =
                    positionColor;

                ctx.shadowBlur =
                    index < 3
                        ? 8
                        : 0;

                ctx.fillText(
                    String(index + 1),
                    columns.position,
                    y
                );


                // Jugador
                ctx.shadowBlur = 0;

                ctx.fillStyle =
                    "#ffffff";

                ctx.font =
                    "bold 13px Arial";

                ctx.fillText(
                    String(
                        entry.player ||
                        "PLAYER"
                    ),
                    columns.player,
                    y
                );


                // Score
                ctx.fillStyle =
                    "#7cff00";

                ctx.font =
                    "bold 14px Arial";

                ctx.fillText(
                    String(
                        entry.score ?? 0
                    ),
                    columns.score,
                    y
                );


                // Nivel
                ctx.fillStyle =
                    "#00ffe1";

                ctx.font =
                    "bold 13px Arial";

                ctx.fillText(
                    String(
                        entry.level ?? 1
                    ),
                    columns.level,
                    y
                );


                // Mutaciones
                ctx.fillStyle =
                    "#ffffff";

                ctx.fillText(
                    String(
                        entry.enemiesDefeated ?? 0
                    ),
                    columns.enemies,
                    y
                );


                // Tiempo
                ctx.fillStyle =
                    "#b7caca";

                ctx.fillText(
                    formatDuration(
                        entry.duration ?? 0
                    ),
                    columns.duration,
                    y
                );


                // Cadena
                ctx.fillStyle =
                    "#ff00d9";

                ctx.fillText(
                    String(
                        entry.maxChain ?? 0
                    ),
                    columns.chain,
                    y
                );

                ctx.restore();
            }
        );
    }


    // =====================================================
    // PIE DEL PANEL
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#456060";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "SCORES STORED THROUGH NODE.JS // FETCH API // JSON",
        centerX,
        470
    );

    ctx.restore();


    // =====================================================
    // BOTÓN VOLVER
    // =====================================================

    buttons.back.x =
        centerX -
        buttons.back.width / 2;

    buttons.back.y =
        525;

    drawButton(
        "VOLVER AL MENÚ",
        buttons.back
    );


    // =====================================================
    // ESCANEO
    // =====================================================

    const scanY =
        (time * 40) %
        canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 15,
            0,
            scanY + 15
        );

    scanGradient.addColorStop(
        0,
        "rgba(0, 255, 225, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(0, 255, 225, 0.04)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 15,
        canvas.width,
        30
    );

    ctx.restore();
}

function formatDuration(seconds) {
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
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

function drawCredits() {

    const time =
        performance.now() / 1000;

    const centerX =
        canvas.width / 2;


    // =====================================================
    // FONDO
    // =====================================================

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#020708"
    );

    gradient.addColorStop(
        0.5,
        "#071417"
    );

    gradient.addColorStop(
        1,
        "#030406"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================================
    // REJILLA
    // =====================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.07)";

    ctx.lineWidth = 1;

    const gridSize = 40;

    for (
        let x = 0;
        x < canvas.width;
        x += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y < canvas.height;
        y += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    ctx.restore();


    // =====================================================
    // PARTÍCULAS
    // =====================================================

    ctx.save();

    for (
        let i = 0;
        i < 30;
        i++
    ) {

        const x =
            (i * 173) %
            canvas.width;

        const baseY =
            (i * 97) %
            canvas.height;

        const y =
            (
                baseY +
                Math.sin(
                    time * 1.2 + i
                ) * 16 +
                time * 7
            ) %
            canvas.height;

        ctx.shadowColor =
            "#7cff00";

        ctx.shadowBlur = 8;

        ctx.fillStyle =
            "rgba(124, 255, 0, 0.38)";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();


    // =====================================================
    // AURA CENTRAL
    // =====================================================

    const pulse =
        1 +
        Math.sin(time * 2.5) * 0.08;

    const aura =
        ctx.createRadialGradient(
            centerX,
            175,
            10,
            centerX,
            175,
            230 * pulse
        );

    aura.addColorStop(
        0,
        "rgba(124, 255, 0, 0.14)"
    );

    aura.addColorStop(
        0.45,
        "rgba(0, 255, 225, 0.06)"
    );

    aura.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
    );

    ctx.fillStyle =
        aura;

    ctx.fillRect(
        centerX - 250,
        0,
        500,
        430
    );


    // =====================================================
    // TÍTULO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.shadowColor =
        "#00ffe1";

    ctx.shadowBlur = 22;

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 42px Arial";

    ctx.fillText(
        "BLAST MAZE",
        centerX,
        70
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "bold 19px Arial";

    ctx.fillText(
        "// MUTATION",
        centerX,
        98
    );

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "PROJECT CREDITS // CONTAINMENT SYSTEM",
        centerX,
        118
    );

    ctx.restore();


    // =====================================================
    // PANEL CENTRAL
    // =====================================================

    const panelX = 150;
    const panelY = 145;
    const panelWidth = 660;
    const panelHeight = 330;

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.94)";

    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );

    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.35)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // =====================================================
    // ESQUINAS TECNOLÓGICAS
    // =====================================================

    ctx.strokeStyle =
        "#7cff00";

    ctx.lineWidth = 2;


    // Superior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + 22
    );

    ctx.lineTo(
        panelX,
        panelY
    );

    ctx.lineTo(
        panelX + 22,
        panelY
    );

    ctx.stroke();


    // Superior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 22,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + 22
    );

    ctx.stroke();


    // Inferior izquierda
    ctx.beginPath();

    ctx.moveTo(
        panelX,
        panelY + panelHeight - 22
    );

    ctx.lineTo(
        panelX,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + 22,
        panelY + panelHeight
    );

    ctx.stroke();


    // Inferior derecha
    ctx.beginPath();

    ctx.moveTo(
        panelX + panelWidth - 22,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight
    );

    ctx.lineTo(
        panelX + panelWidth,
        panelY + panelHeight - 22
    );

    ctx.stroke();

    ctx.restore();


    // =====================================================
    // ENCABEZADO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 11px Arial";

    ctx.fillText(
        "PROJECT INFORMATION",
        panelX + 30,
        panelY + 28
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.beginPath();

    ctx.arc(
        panelX + panelWidth - 30,
        panelY + 22,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();


    // =====================================================
    // DESARROLLO
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 18px Arial";

    ctx.fillText(
        "BLAST MAZE: MUTATION",
        centerX,
        panelY + 65
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "12px Arial";

    ctx.fillText(
        "Web Arcade Game",
        centerX,
        panelY + 87
    );


    // =====================================================
    // TECNOLOGÍAS
    // =====================================================

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "bold 11px Arial";

    ctx.fillText(
        "TECHNOLOGY STACK",
        centerX,
        panelY + 120
    );

    ctx.fillStyle =
        "#b7caca";

    ctx.font =
        "11px Arial";

    ctx.fillText(
        "HTML5  •  CSS3  •  JAVASCRIPT  •  CANVAS 2D",
        centerX,
        panelY + 143
    );

    ctx.fillText(
        "NODE.JS  •  FETCH API  •  JSON  •  GIT / GITHUB",
        centerX,
        panelY + 163
    );


    // =====================================================
    // EQUIPO
    // =====================================================

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 11px Arial";

    ctx.fillText(
        "DEVELOPMENT TEAM",
        centerX,
        panelY + 200
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "12px Arial";

    ctx.fillText(
        "Proyecto integrador académico",
        centerX,
        panelY + 223
    );

    ctx.fillStyle =
        "#638080";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "Desarrollo colaborativo // Diseño // Programación // Documentación",
        centerX,
        panelY + 244
    );


    // =====================================================
    // IDENTIFICACIÓN
    // =====================================================

    ctx.fillStyle =
        "#456060";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "BLAST MAZE MUTATION PROTOCOL",
        centerX,
        panelY + 278
    );

    ctx.fillText(
        "SYSTEM VERSION // ACADEMIC BUILD",
        centerX,
        panelY + 294
    );

    ctx.restore();


    // =====================================================
    // ESTADO DEL SISTEMA
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "● SYSTEM ONLINE // PROJECT CONTAINMENT ACTIVE",
        centerX,
        500
    );

    ctx.fillStyle =
        "#456060";

    ctx.font =
        "9px Arial";

    ctx.fillText(
        "HTML5 // CANVAS 2D // NODE.JS // MUTATION PROTOCOL",
        centerX,
        520
    );

    ctx.restore();


    // =====================================================
    // BOTÓN VOLVER
    // =====================================================

    buttons.back.x =
        centerX -
        buttons.back.width / 2;

    buttons.back.y =
        545;

    drawButton(
        "VOLVER AL MENÚ",
        buttons.back
    );


    // =====================================================
    // EFECTO DE ESCANEO
    // =====================================================

    const scanY =
        (time * 40) %
        canvas.height;

    ctx.save();

    const scanGradient =
        ctx.createLinearGradient(
            0,
            scanY - 15,
            0,
            scanY + 15
        );

    scanGradient.addColorStop(
        0,
        "rgba(0, 255, 225, 0)"
    );

    scanGradient.addColorStop(
        0.5,
        "rgba(0, 255, 225, 0.04)"
    );

    scanGradient.addColorStop(
        1,
        "rgba(0, 255, 225, 0)"
    );

    ctx.fillStyle =
        scanGradient;

    ctx.fillRect(
        0,
        scanY - 15,
        canvas.width,
        30
    );

    ctx.restore();
}

function draw() {
    drawLabBackground();

    const tileSize = mapGenerator.tileSize;

    // =====================================================
    // MAPA
    // =====================================================

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
                mapGenerator.getTile(x, y);

            if (tile === 0) {
                drawTileFloor(x, y);
            }

            if (tile === 1) {
                drawFixedWall(x, y);
            }

            if (tile === 2) {
                drawDestructibleBlock(x, y);
            }
        }
    }

    // Portal
    drawExit();

    // =====================================================
    // HUD SUPERIOR
    // =====================================================

    ctx.save();

    // Panel
    ctx.fillStyle =
        "rgba(2, 10, 12, 0.94)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        48
    );

    // Línea inferior
    ctx.strokeStyle =
        "rgba(0, 255, 225, 0.65)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        0,
        47
    );

    ctx.lineTo(
        canvas.width,
        47
    );

    ctx.stroke();


    // =====================================================
    // NIVEL
    // =====================================================

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "bold 12px Arial";

    ctx.textAlign =
        "left";

    ctx.fillText(
        "LEVEL",
        18,
        16
    );

    ctx.font =
        "bold 18px Arial";

    ctx.fillText(
        String(currentLevel).padStart(2, "0"),
        18,
        36
    );


    // =====================================================
    // SCORE
    // =====================================================

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "SCORE",
        90,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 16px Arial";

    ctx.fillText(
        String(player.score).padStart(6, "0"),
        90,
        36
    );


    // =====================================================
    // VIDAS
    // =====================================================

    ctx.fillStyle =
        "#ff3355";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "LIFE",
        205,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 17px Arial";

    ctx.fillText(
        String(player.lives),
        205,
        36
    );


    // =====================================================
    // BOMBAS
    // =====================================================

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "BOMB",
        265,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(
        player.bombs +
        "/" +
        player.maxBombs,
        265,
        36
    );


    // =====================================================
    // ALCANCE
    // =====================================================

    ctx.fillStyle =
        "#ff8c00";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "RANGE",
        345,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(
        String(player.range),
        345,
        36
    );


    // =====================================================
    // VELOCIDAD
    // =====================================================

    ctx.fillStyle =
        "#00ffe1";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "SPD",
        415,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(
        String(Math.round(player.speed)),
        415,
        36
    );


    // =====================================================
    // ENEMIGOS
    // =====================================================

    ctx.fillStyle =
        "#b000ff";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "MUTATIONS",
        480,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(
        String(totalEnemiesDefeated),
        480,
        36
    );


    // =====================================================
    // CADENA
    // =====================================================

    ctx.fillStyle =
        "#ff00d9";

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "CHAIN",
        575,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(
        String(maxChain),
        575,
        36
    );


    // =====================================================
    // TIEMPO
    // =====================================================

    const timeRatio =
        Math.max(
            0,
            Math.min(
                1,
                levelTime /
                Math.max(
                    60,
                    120 -
                    (currentLevel - 1) * 10
                )
            )
        );

    const timerColor =
        levelTime <= 15
            ? "#ff3355"
            : levelTime <= 30
                ? "#ff8c00"
                : "#7cff00";

    ctx.fillStyle =
        timerColor;

    ctx.font =
        "bold 12px Arial";

    ctx.fillText(
        "CONTAINMENT",
        660,
        16
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.textAlign =
        "right";

    ctx.fillText(
        Math.ceil(levelTime) + "s",
        canvas.width - 18,
        36
    );


    // =====================================================
    // BARRA DE CONTENCIÓN
    // =====================================================

    const barX = 755;
    const barY = 8;
    const barWidth = 145;
    const barHeight = 5;

    ctx.fillStyle =
        "rgba(255, 255, 255, 0.12)";

    ctx.fillRect(
        barX,
        barY,
        barWidth,
        barHeight
    );

    ctx.fillStyle =
        timerColor;

    ctx.shadowColor =
        timerColor;

    ctx.shadowBlur = 8;

    ctx.fillRect(
        barX,
        barY,
        barWidth * timeRatio,
        barHeight
    );

    ctx.shadowBlur = 0;

    ctx.restore();


    // =====================================================
    // JUGADOR
    // =====================================================

    drawPlayer();


    // =====================================================
    // ENEMIGOS
    // =====================================================

    for (const enemy of enemies) {
        drawEnemy(enemy);
    }


    // =====================================================
    // BOMBAS
    // =====================================================

    for (const bomb of bombs) {
        drawBomb(bomb);
    }


    // =====================================================
    // POWER-UPS
    // =====================================================

    for (const powerUp of powerUps) {
        drawPowerUp(powerUp);
    }


    // =====================================================
    // EXPLOSIONES
    // =====================================================

    for (const explosion of explosions) {
        drawExplosion(explosion);
    }


    // =====================================================
    // INDICADOR DE ESTADO
    // =====================================================

    ctx.save();

    ctx.fillStyle =
        "rgba(2, 10, 12, 0.88)";

    ctx.fillRect(
        12,
        canvas.height - 30,
        245,
        20
    );

    ctx.strokeStyle =
        "rgba(124, 255, 0, 0.35)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        12,
        canvas.height - 30,
        245,
        20
    );

    ctx.fillStyle =
        "#7cff00";

    ctx.font =
        "10px Arial";

    ctx.textAlign =
        "left";

    ctx.fillText(
        "● SYSTEM ONLINE",
        22,
        canvas.height - 17
    );

    ctx.fillStyle =
        "#638080";

    ctx.fillText(
        "  WASD / ARROWS   SPACE: BOMB   P: PAUSE",
        112,
        canvas.height - 17
    );

    ctx.restore();


    // =====================================================
    // INDICADOR DE NIVEL
    // =====================================================

    ctx.save();

    ctx.textAlign =
        "right";

    ctx.fillStyle =
        "#527070";

    ctx.font =
        "10px Arial";

    ctx.fillText(
        "BIO-ANOMALY CONTAINMENT // ACTIVE",
        canvas.width - 15,
        canvas.height - 17
    );

    ctx.restore();
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