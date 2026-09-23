export class Enemy {
    constructor(x, y, type = "rogue") {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.type = type;
        this.speed = 80;

        this.alive = true;
        this.states = {
            NORMAL: "normal",
            VULNERABLE: "vulnerable",
            DEFEATED: "defeated"
        };

        this.state = this.states.NORMAL;
        this.vulnerableTimer = 0;

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

    changeState(newState) {
            this.state = newState;
        }

        defeat() {
            this.changeState(this.states.DEFEATED);
            this.alive = false;
        }

        setVulnerable(duration = 3000) {
            if (this.state === this.states.DEFEATED) {
                return;
            }

            this.changeState(this.states.VULNERABLE);
            this.vulnerableTimer = duration;
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

        if (this.state === this.states.VULNERABLE) {
            this.vulnerableTimer -=
                deltaTime * 1000;

            if (this.vulnerableTimer <= 0) {
                this.vulnerableTimer = 0;
                this.changeState(this.states.NORMAL);
            }

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

        if (this.type === "predictor") {
            this.updatePredictor(
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

        const reachedNode =
            this.moveTowardPathNode(
                nextTile,
                deltaTime,
                collisionSystem,
                mapGenerator
            );

        if (reachedNode) {
            this.path.shift();
        }
    }

    calculatePredictedPosition(
        mapGenerator
    ) {
        if (this.target === null) {
            return null;
        }

        const predictionTiles = 3;

        const predictionDistance =
            predictionTiles *
            mapGenerator.tileSize;

        return {
            x:
                this.target.x +
                this.target.direction.x *
                predictionDistance,

            y:
                this.target.y +
                this.target.direction.y *
                predictionDistance
        };
    }

    getPredictedTile(
        mapGenerator
    ) {
        const predictedPosition =
            this.calculatePredictedPosition(
                mapGenerator
            );

        if (predictedPosition === null) {
            return null;
        }

        const tileSize =
            mapGenerator.tileSize;

        return {
            x: Math.floor(
                predictedPosition.x /
                tileSize
            ),

            y: Math.floor(
                predictedPosition.y /
                tileSize
            )
        };
    }

    calculatePredictorPath(
        collisionSystem,
        mapGenerator
    ) {
        if (this.target === null) {
            return [];
        }

        const predictedTile =
            this.getPredictedTile(
                mapGenerator
            );

        if (predictedTile === null) {
            return [];
        }

        const enemyTileX =
            Math.floor(
                this.x /
                mapGenerator.tileSize
            );

        const enemyTileY =
            Math.floor(
                this.y /
                mapGenerator.tileSize
            );

        if (
            !mapGenerator.pathfinding.isWalkable(
                predictedTile.x,
                predictedTile.y
            )
        ) {
            return [];
        }

        return mapGenerator.pathfinding.findPathBFS(
            enemyTileX,
            enemyTileY,
            predictedTile.x,
            predictedTile.y
        );
    }

    updatePredictor(
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
            this.path =
                this.calculatePredictorPath(
                    collisionSystem,
                    mapGenerator
                );

            this.pathTimer =
                this.pathUpdateInterval;
        }

        if (this.path.length === 0) {
            return;
        }

        const nextTile =
            this.path[0];

        const reachedNode =
            this.moveTowardPathNode(
                nextTile,
                deltaTime,
                collisionSystem,
                mapGenerator
            );

        if (reachedNode) {
            this.path.shift();
        }
    }

    moveTowardPathNode(
    nextTile,
    deltaTime,
    collisionSystem,
    mapGenerator
) {
    const tileSize =
        mapGenerator.tileSize;

    const targetX =
        nextTile.x * tileSize;

    const targetY =
        nextTile.y * tileSize;

    const distanceX =
        targetX - this.x;

    const distanceY =
        targetY - this.y;

    const movement =
        this.speed * deltaTime;

    let newX = this.x;
    let newY = this.y;

    /*
     * BFS trabaja con cuatro direcciones.
     * Por lo tanto, solamente avanzamos
     * sobre un eje a la vez.
     */

    if (Math.abs(distanceX) > 0) {
        const stepX =
            Math.min(
                movement,
                Math.abs(distanceX)
            );

        newX =
            this.x +
            Math.sign(distanceX) *
            stepX;
    } else if (Math.abs(distanceY) > 0) {
        const stepY =
            Math.min(
                movement,
                Math.abs(distanceY)
            );

        newY =
            this.y +
            Math.sign(distanceY) *
            stepY;
    }

    /*
     * Comprobar la nueva posición
     * antes de aplicarla.
     */

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

    /*
     * Si llegamos al nodo, hacemos una
     * alineación exacta con la cuadrícula.
     */

    const remainingDistance =
        Math.abs(
            targetX - this.x
        ) +
        Math.abs(
            targetY - this.y
        );

    if (remainingDistance <= 0.01) {
        this.x = targetX;
        this.y = targetY;

        return true;
    }

    return false;
}

    takeDamage() {
    if (!this.alive) {
        return false;
    }

    if (this.state === this.states.NORMAL) {
        this.setVulnerable();

        return false;
    }

    if (this.state === this.states.VULNERABLE) {
        this.defeat();

        return true;
    }

    return false;
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
        this.states = this.states.NORMAL;

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