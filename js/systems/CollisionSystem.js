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

    isWalkable(x, y) {
        if (!this.isInsideMap(x, y)) {
            return false;
        }

        const tile = this.mapGenerator.getTile(x, y);

        return tile === 0;
    }
}