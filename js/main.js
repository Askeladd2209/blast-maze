import { Input } from "./core/Input.js";
import { GameLoop } from "./core/GameLoop.js";
import { Player } from "./entities/Player.js";
import { Bomb } from "./entities/Bomb.js";
import { Explosion } from "./entities/Explosion.js";
import { Enemy } from "./entities/Enemy.js";
import { MapGenerator } from "./systems/MapGenerator.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { ExplosionSystem } from "./systems/ExplosionSystem.js";

const input = new Input();

const mapGenerator = new MapGenerator();

mapGenerator.generate();

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

const reachableCells =
    mapGenerator.pathfinding.findReachableCells(
        mapGenerator.playerSpawn.x,
        mapGenerator.playerSpawn.y
    );

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

const enemySpawn =
    enemySpawnCandidates[
        Math.floor(
            Math.random() *
            enemySpawnCandidates.length
        )
    ];

const rogue = new Enemy(
    enemySpawn.x *
        mapGenerator.tileSize,
    enemySpawn.y *
        mapGenerator.tileSize,
    "rogue"
);

rogue.setTarget(player);

enemies.push(rogue);

const hunterSpawnCandidates =
    enemySpawnCandidates.filter(
        cell =>
            cell.x !== enemySpawn.x ||
            cell.y !== enemySpawn.y
    );

const hunterSpawn =
    hunterSpawnCandidates[
        Math.floor(
            Math.random() *
            hunterSpawnCandidates.length
        )
    ];

const hunter = new Enemy(
    hunterSpawn.x *
        mapGenerator.tileSize,
    hunterSpawn.y *
        mapGenerator.tileSize,
    "hunter"
);

hunter.setTarget(player);

enemies.push(hunter);

const predictorSpawnCandidates =
    hunterSpawnCandidates.filter(
        cell =>
            cell.x !== hunterSpawn.x ||
            cell.y !== hunterSpawn.y
    );

const predictorSpawn =
    predictorSpawnCandidates[
        Math.floor(
            Math.random() *
            predictorSpawnCandidates.length
        )
    ];

const predictor = new Enemy(
    predictorSpawn.x *
        mapGenerator.tileSize,
    predictorSpawn.y *
        mapGenerator.tileSize,
    "predictor"
);

predictor.setTarget(player);

enemies.push(predictor);

console.log(
    "Blast Maze iniciado correctamente"
);

const canvas =
    document.getElementById(
        "gameCanvas"
    );

const ctx =
    canvas.getContext("2d");

function checkPlayerEnemyCollision(
    player,
    enemy
) {
    return (
        player.x <
            enemy.x + enemy.width &&
        player.x + player.width >
            enemy.x &&
        player.y <
            enemy.y + enemy.height &&
        player.y + player.height >
            enemy.y
    );
}

function update(deltaTime) {
    player.update(deltaTime);

    let dx = 0;
    let dy = 0;

    if (
        input.isDown("KeyW") ||
        input.isDown("ArrowUp")
    ) {
        dy = -1;
    }

    if (
        input.isDown("KeyS") ||
        input.isDown("ArrowDown")
    ) {
        dy = 1;
    }

    if (
        input.isDown("KeyA") ||
        input.isDown("ArrowLeft")
    ) {
        dx = -1;
    }

    if (
        input.isDown("KeyD") ||
        input.isDown("ArrowRight")
    ) {
        dx = 1;
    }

    player.move(
        dx,
        dy,
        deltaTime,
        collisionSystem
    );

    for (const enemy of enemies) {
        enemy.update(
            deltaTime,
            collisionSystem,
            mapGenerator
        );
    }

    for (const enemy of enemies) {
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
            }
        }
    }

    if (
        input.wasPressed("Space") &&
        player.bombs > 0
    ) {
        const tileSize =
            mapGenerator.tileSize;

        const bombX =
            Math.floor(
                player.x / tileSize
            ) * tileSize;

        const bombY =
            Math.floor(
                player.y / tileSize
            ) * tileSize;

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
        let i = bombs.length - 1;
        i >= 0;
        i--
    ) {
        const bomb = bombs[i];

        bomb.update(deltaTime);

        if (bomb.exploded) {
            const affectedCells =
                explosionSystem.calculateExplosion(
                    bomb.x /
                        mapGenerator.tileSize,
                    bomb.y /
                        mapGenerator.tileSize,
                    bomb.range
                );

            explosionSystem.destroyBlocks(
                affectedCells
            );

            console.log(
                "Explosión generada:",
                affectedCells
            );

            for (const otherBomb of bombs) {
                if (otherBomb === bomb) {
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
                    otherBomb.explode();

                    console.log(
                        "Bomba explotó en cadena:",
                        otherBombX,
                        otherBombY
                    );
                }
            }

            explosions.push(
                new Explosion(
                    bomb.x,
                    bomb.y,
                    bomb.range,
                    affectedCells
                )
            );

            if (
                Math.random() < 0.50 &&
                player.bombs <
                    player.maxBombs
            ) {
                player.bombs++;

                console.log(
                    "Bomba recuperada"
                );
            }

            bombs.splice(i, 1);
        }
    }

    for (const explosion of explosions) {
        explosion.update(deltaTime);

        if (!explosion.active) {
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
        }
    }

    input.endFrame();
}

function drawExit() {
    const exitTile =
        mapGenerator.getTile(
            mapGenerator.exit.x,
            mapGenerator.exit.y
        );

    if (exitTile !== 0) {
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
        performance.now() / 1000;

    const pulse =
        3 +
        Math.sin(time * 4) * 3;

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

            if (tile === 1) {
                ctx.fillStyle =
                    "#00ffff";

                ctx.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }

            if (tile === 2) {
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

    for (const enemy of enemies) {
        if (!enemy.alive) {
            continue;
        }

        if (enemy.type === "rogue") {
            ctx.fillStyle =
                "#ff3030";
        }

        if (enemy.type === "hunter") {
            ctx.fillStyle =
                "#ffff00";
        }

        if (enemy.type === "predictor") {
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

    for (const bomb of bombs) {
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

    for (const explosion of explosions) {
        if (!explosion.active) {
            continue;
        }

        for (const cell of explosion.cells) {
            ctx.fillStyle =
                "#ff00ff";

            ctx.fillRect(
                cell.x * tileSize,
                cell.y * tileSize,
                tileSize,
                tileSize
            );
        }
    }
}

const gameLoop =
    new GameLoop(
        update,
        draw
    );

gameLoop.start();