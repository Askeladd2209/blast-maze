export class Enemy {
    constructor(x, y, type = "rogue") {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.type = type;
        this.speed = 80;

        this.alive = true;
        this.state = "normal";

        this.target = null;
        this.path = [];

        this.direction = {
            x: 0,
            y: 0
        };

        this.directionTimer = 0;
        this.directionChangeInterval = 1000;

        this.pathTimer = 0;
        this.pathUpdateInterval = 500;

        this.chooseRandomDirection();
    }

    setType(type) {
        this.type = type;
    }

    setTarget(target) {
        this.target = target;
    }

    setPath(path) {
        this.path = path;
    }

    chooseRandomDirection() {
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        const randomIndex = Math.floor(
            Math.random() * directions.length
        );

        this.direction = directions[randomIndex];

        this.directionTimer =
            this.directionChangeInterval;
    }

    update(
        deltaTime,
        collisionSystem,
        mapGenerator
    ) {
        if (!this.alive) {
            return;
        }

        if (this.type === "rogue") {
            this.updateRogue(
                deltaTime,
                collisionSystem
            );
        }

        if (this.type === "hunter") {
            this.updateHunter(
                deltaTime,
                collisionSystem,
                mapGenerator
            );
        }
    }

    updateRogue(
        deltaTime,
        collisionSystem
    ) {
        this.directionTimer -=
            deltaTime * 1000;

        if (this.directionTimer <= 0) {
            this.chooseRandomDirection();
        }

        const newX =
            this.x +
            this.direction.x *
            this.speed *
            deltaTime;

        const newY =
            this.y +
            this.direction.y *
            this.speed *
            deltaTime;

        if (
            collisionSystem.isPositionWalkable(
                newX,
                newY,
                this.width,
                this.height
            )
        ) {
            this.x = newX;
            this.y = newY;
        } else {
            this.chooseRandomDirection();
        }
    }

    updateHunter(
        deltaTime,
        collisionSystem,
        mapGenerator
    ) {
        if (this.target === null) {
            return;
        }

        this.pathTimer -=
            deltaTime * 1000;

        if (this.pathTimer <= 0) {
            const tileSize =
                mapGenerator.tileSize;

            const enemyTileX =
                Math.floor(
                    this.x / tileSize
                );

            const enemyTileY =
                Math.floor(
                    this.y / tileSize
                );

            const playerTileX =
                Math.floor(
                    this.target.x / tileSize
                );

            const playerTileY =
                Math.floor(
                    this.target.y / tileSize
                );

            this.path =
                mapGenerator.pathfinding.findPathBFS(
                    enemyTileX,
                    enemyTileY,
                    playerTileX,
                    playerTileY
                );

            this.pathTimer =
                this.pathUpdateInterval;
        }

        if (this.path.length === 0) {
            return;
        }

        const nextTile =
            this.path[0];

        const tileSize =
            mapGenerator.tileSize;

        const targetX =
            nextTile.x * tileSize;

        const targetY =
            nextTile.y * tileSize;

        const deltaX =
            targetX - this.x;

        const deltaY =
            targetY - this.y;

        let directionX = 0;
        let directionY = 0;

        if (Math.abs(deltaX) > 2) {
            directionX =
                deltaX > 0 ? 1 : -1;
        }

        if (Math.abs(deltaY) > 2) {
            directionY =
                deltaY > 0 ? 1 : -1;
        }

        const newX =
            this.x +
            directionX *
            this.speed *
            deltaTime;

        const newY =
            this.y +
            directionY *
            this.speed *
            deltaTime;

        if (
            collisionSystem.isPositionWalkable(
                newX,
                newY,
                this.width,
                this.height
            )
        ) {
            this.x = newX;
            this.y = newY;
        }

        const distanceToNode =
            Math.abs(
                targetX - this.x
            ) +
            Math.abs(
                targetY - this.y
            );

        if (distanceToNode < 4) {
            this.x = targetX;
            this.y = targetY;

            this.path.shift();
        }
    }

    takeDamage() {
        this.alive = false;
    }

    reset(
        x,
        y,
        type = "rogue"
    ) {
        this.x = x;
        this.y = y;

        this.type = type;
        this.alive = true;
        this.state = "normal";

        this.target = null;
        this.path = [];

        this.direction = {
            x: 0,
            y: 0
        };

        this.directionTimer = 0;

        this.pathTimer = 0;

        this.chooseRandomDirection();
    }
}