export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.speed = 120;

        this.lives = 3;
        this.bombs = 1;
        this.range = 2;

        this.score = 0;

        this.alive = true;
    }

    move(dx, dy, deltaTime, collisionSystem) {
    const newX = this.x + dx * this.speed * deltaTime;
    const newY = this.y + dy * this.speed * deltaTime;

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
}

    reset(x, y) {
        this.x = x;
        this.y = y;

        this.lives = 3;
        this.bombs = 1;
        this.range = 2;

        this.alive = true;
    }

    loseLife() {
        if (this.lives > 0) {
            this.lives--;
        }

        if (this.lives === 0) {
            this.alive = false;
        }
    }

    addScore(points) {
        this.score += points;
    }
}