export class ExplosionSystem {
    constructor(mapGenerator) {
        this.mapGenerator = mapGenerator;
    }

    calculateExplosion(x, y, range) {
        const cells = [];

        cells.push({ x, y });

        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        for (const direction of directions) {
            for (let distance = 1; distance <= range; distance++) {
                const cellX = x + direction.x * distance;
                const cellY = y + direction.y * distance;

                if (
                    cellX < 0 ||
                    cellX >= this.mapGenerator.width ||
                    cellY < 0 ||
                    cellY >= this.mapGenerator.height
                ) {
                    break;
                }

                cells.push({
                    x: cellX,
                    y: cellY
                });
            }
        }

        return cells;
    }
}