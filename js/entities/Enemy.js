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

    update(deltaTime, collisionSystem) {
        if (!this.alive) {
            return;
        }

        this.directionTimer -= deltaTime * 1000;

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

    takeDamage() {
        this.alive = false;
    }

    reset(x, y, type = "rogue") {
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

        this.chooseRandomDirection();
    }
}