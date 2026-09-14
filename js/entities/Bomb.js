export class Bomb {
    constructor(x, y, range = 2) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.timer = 2000;

        this.active = true;
        this.exploded = false;
    }

    update(deltaTime) {
        if (!this.active) {
            return;
        }

        this.timer -= deltaTime * 1000;

        if (this.timer <= 0) {
            this.explode();
        }
    }

    explode() {
        this.active = false;
        this.exploded = true;
    }

    reset(x, y, range = 2) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.timer = 2000;

        this.active = true;
        this.exploded = false;
    }
}