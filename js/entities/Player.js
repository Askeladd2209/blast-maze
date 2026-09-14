export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.speed = 120;

        this.lives = 3;
        this.bombs = 5;
        this.maxBombs = 5;
        this.range = 2;

        this.score = 0;

        this.alive = true;

        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
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
        this.bombs = 5;
        this.maxBombs = 5;
        this.range = 2;

        this.alive = true;

        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
    }

    loseLife() {
    if (this.lives <= 0 || this.invulnerable) {
        return false;
    }

    this.lives--;

    this.invulnerable = true;
    this.invulnerabilityTimer = 2000; // 2 seconds of invulnerability

    if (this.lives === 0) {
        this.alive = false;
    }

    return true;
}

    update(deltaTime) {
    if (!this.invulnerable) {
        return;
    }

    this.invulnerabilityTimer -= deltaTime * 1000;

    if (this.invulnerabilityTimer <= 0) {
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
    }
}

    addScore(points) {
        this.score += points;
    }
}