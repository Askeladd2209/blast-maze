import { Pathfinding } from "./Pathfinding.js";

export class MapGenerator {
    constructor(width = 21, height = 15) {
        this.width = width;
        this.height = height;
        this.tileSize = 40;

        this.map = [];

        this.playerSpawn = {
            x: 1,
            y: 1
        };

        this.exit = {
            x: 1,
            y: 1
        };

        this.pathfinding = new Pathfinding(this);
    }

 generate() {
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        this.createBaseMap();
        this.createWalls();
        this.createDestructibleBlocks();
        this.reservePlayerArea();

        const exit = this.findRandomValidExit();

        if (exit !== null) {
            this.exit = exit;

            return this.map;
        }
    }

    console.warn(
        "No se encontró una salida válida."
    );

    return this.map;
}

    createBaseMap() {
        this.map = [];

        for (let y = 0; y < this.height; y++) {
            const row = [];

            for (let x = 0; x < this.width; x++) {
                row.push(0);
            }

            this.map.push(row);
        }
    }

    createWalls() {
        for (let y = 0; y < this.height; y++) {
            this.map[y][0] = 1;
            this.map[y][this.width - 1] = 1;
        }

        for (let x = 0; x < this.width; x++) {
            this.map[0][x] = 1;
            this.map[this.height - 1][x] = 1;
        }

        for (let y = 2; y < this.height - 1; y += 2) {
            for (let x = 2; x < this.width - 1; x += 2) {
                this.map[y][x] = 1;
            }
        }
    }

    createDestructibleBlocks() {
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[y][x] !== 0) {
                    continue;
                }

                if (Math.random() < 0.35) {
                    this.map[y][x] = 2;
                }
            }
        }
    }

    reservePlayerArea() {
        const x = this.playerSpawn.x;
        const y = this.playerSpawn.y;

        this.map[y][x] = 0;
        this.map[y][x + 1] = 0;
        this.map[y + 1][x] = 0;
    }

    findRandomValidExit() {
    const minimumDistance = 12;

    const reachableCells =
        this.pathfinding.findReachableCells(
            this.playerSpawn.x,
            this.playerSpawn.y
        );

    const candidates = [];

    for (const cell of reachableCells) {
        const distance =
            Math.abs(
                cell.x - this.playerSpawn.x
            ) +
            Math.abs(
                cell.y - this.playerSpawn.y
            );

        if (distance < minimumDistance) {
            continue;
        }

        const neighbors = [
            { x: cell.x + 1, y: cell.y },
            { x: cell.x - 1, y: cell.y },
            { x: cell.x, y: cell.y + 1 },
            { x: cell.x, y: cell.y - 1 }
        ];

        for (const neighbor of neighbors) {
            if (
                neighbor.x <= 0 ||
                neighbor.x >= this.width - 1 ||
                neighbor.y <= 0 ||
                neighbor.y >= this.height - 1
            ) {
                continue;
            }

            if (this.map[neighbor.y][neighbor.x] !== 0) {
                continue;
            }

            candidates.push({
                x: neighbor.x,
                y: neighbor.y
            });
        }
    }

    if (candidates.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(
        Math.random() * candidates.length
    );

    const exit = candidates[randomIndex];

    this.map[exit.y][exit.x] = 2;

    return exit;
}
    getTile(x, y) {
        if (
            x < 0 ||
            x >= this.width ||
            y < 0 ||
            y >= this.height
        ) {
            return null;
        }

        return this.map[y][x];
    }

    setTile(x, y, value) {
        if (
            x < 0 ||
            x >= this.width ||
            y < 0 ||
            y >= this.height
        ) {
            return;
        }

        this.map[y][x] = value;
    }
}