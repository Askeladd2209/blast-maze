export class Explosion {
    constructor(x, y, range = 1, cells = []) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.cells = cells;
        this.duration = 400;

        this.active = true;
        this.finished = false;
        this.playerDamage = false;
    }

    update(deltaTime) {
        if (!this.active) {
            return;
        }

        this.duration -= deltaTime * 1000;

        if (this.duration <= 0) {
            this.finish();
        }
    }

    finish() {
        this.active = false;
        this.finished = true;
    }

    reset(x, y, range = 1, cells = []) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.cells = cells;
        this.duration = 400;

        this.active = true;
        this.finished = false;
        this.playerDamage = false;
    }
}