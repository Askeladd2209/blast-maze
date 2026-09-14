export class MapGenerator {
    constructor(width = 21, height = 15) {
        this.width = width;
        this.height = height;
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