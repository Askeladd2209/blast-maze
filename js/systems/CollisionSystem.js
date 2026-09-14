export class CollisionSystem {
    constructor(mapGenerator) {
        this.mapGenerator = mapGenerator;
    }

    isInsideMap(x, y) {
        return (
            x >= 0 &&
            x < this.mapGenerator.width &&
            y >= 0 &&
            y < this.mapGenerator.height
        );
    }

    getTileFromPosition(x, y) {
        const tileSize = this.mapGenerator.tileSize;

        return {
            x: Math.floor(x / tileSize),
            y: Math.floor(y / tileSize),
        };
    }

    isPositionWalkable(x, y, width, height) {
        const points = [
            { x: x, y: y },
            { x: x + width - 1, y: y },
            { x: x, y: y + height - 1 },
            { x: x + width - 1, y: y + height - 1 },
        ];

        for (const point of points) {
            const tile = this.getTileFromPosition(point.x, point.y);

            if (!this.isWalkable(tile.x, tile.y)) {
                return false;
            }
        }

        return true;
    }

    isWalkable(x, y) {
        if (!this.isInsideMap(x, y)) {
            return false;
        }

        const tile = this.mapGenerator.getTile(x, y);

        return tile === 0;
    }
}