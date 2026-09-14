export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.speed = 160;

        this.lives = 3;
        this.bombs = 1;
        this.range = 2;

        this.score = 0;

        this.alive = true;
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