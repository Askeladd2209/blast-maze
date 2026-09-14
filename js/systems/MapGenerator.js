export class MapGenerator {
    constructor(width = 21, height = 15) {
        this.width = width;
        this.height = height;
        this.tileSize = 40;
        this.map = [];
    }

    generate() {
        this.map = [];

        for (let y = 0; y < this.height; y++) {
            const row = [];

            for (let x = 0; x < this.width; x++) {
                row.push(0);
            }

            this.map.push(row);
        }

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

        this.map[1][1] = 0;
        this.map[1][2] = 0;
        this.map[2][1] = 0;

        return this.map;
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