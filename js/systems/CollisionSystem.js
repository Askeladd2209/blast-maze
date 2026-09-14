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
        const tileSize =
            this.mapGenerator.tileSize;

        return {
            x: Math.floor(x / tileSize),
            y: Math.floor(y / tileSize)
        };
    }

    isPositionWalkable(
        x,
        y,
        width,
        height
    ) {
        /*
         * Pequeño margen para evitar que una
         * entidad quede enganchada exactamente
         * en el borde de dos tiles.
         */

        const margin = 2;

        const left =
            x + margin;

        const right =
            x + width - 1 - margin;

        const top =
            y + margin;

        const bottom =
            y + height - 1 - margin;

        const points = [
            {
                x: left,
                y: top
            },
            {
                x: right,
                y: top
            },
            {
                x: left,
                y: bottom
            },
            {
                x: right,
                y: bottom
            }
        ];

        for (const point of points) {
            const tile =
                this.getTileFromPosition(
                    point.x,
                    point.y
                );

            if (
                !this.isWalkable(
                    tile.x,
                    tile.y
                )
            ) {
                return false;
            }
        }

        return true;
    }

    isWalkable(x, y) {
        if (
            !this.isInsideMap(
                x,
                y
            )
        ) {
            return false;
        }

        const tile =
            this.mapGenerator.getTile(
                x,
                y
            );

        return tile === 0;
    }
}