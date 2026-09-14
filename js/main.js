import { Input } from "./core/Input.js";
import { GameLoop } from "./core/GameLoop.js";
import { Player } from "./entities/Player.js";
import { MapGenerator } from "./systems/MapGenerator.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";

const input = new Input();
const mapGenerator = new MapGenerator();
mapGenerator.generate();
const player = new Player(
    mapGenerator.tileSize,
    mapGenerator.tileSize
);
const collisionSystem = new CollisionSystem(mapGenerator);

console.log("Blast Maze iniciado correctamente");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function update(deltaTime) {
    let dx = 0;
    let dy = 0;

    if (input.isDown("KeyW") || input.isDown("ArrowUp")) {
        dy = -1;
    }

    if (input.isDown("KeyS") || input.isDown("ArrowDown")) {
        dy = 1;
    }

    if (input.isDown("KeyA") || input.isDown("ArrowLeft")) {
        dx = -1;
    }

    if (input.isDown("KeyD") || input.isDown("ArrowRight")) {
        dx = 1;
    }

    player.move(dx, dy, deltaTime, collisionSystem);

    input.endFrame();
}

function draw() {
    ctx.fillStyle = "#090914";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = mapGenerator.tileSize;

    for (let y = 0; y < mapGenerator.height; y++) {
        for (let x = 0; x < mapGenerator.width; x++) {
            const tile = mapGenerator.getTile(x, y);

            if (tile === 1) {
                ctx.fillStyle = "#00ffff";
                ctx.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }

            if (tile === 2) {
                ctx.fillStyle = "#7a00ff";
                ctx.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }
        }
    }

    ctx.fillStyle = "#00ffff";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BLAST MAZE", canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = "#00ffff";
    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );
}

const gameLoop = new GameLoop(update, draw);

gameLoop.start();