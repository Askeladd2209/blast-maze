export class Explosion {
    constructor(x, y, range = 1) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.duration = 400;

        this.active = true;
        this.finished = false;
    }

    update(deltaTime) {
        if (!this.active) {
            return;
        }

        this.duration -= deltaTime;

        if (this.duration <= 0) {
            this.finish();
        }
    }

    finish() {
        this.active = false;
        this.finished = true;
    }

    reset(x, y, range = 1) {
        this.x = x;
        this.y = y;

        this.range = range;
        this.duration = 400;

        this.active = true;
        this.finished = false;
    }
}