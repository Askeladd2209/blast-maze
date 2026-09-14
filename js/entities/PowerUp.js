export class PowerUp {
    constructor(x, y, type = "range") {
        this.x = x;
        this.y = y;

        this.type = type;
        this.active = true;
    }

    collect() {
        this.active = false;
    }

    reset(x, y, type = "range") {
        this.x = x;
        this.y = y;

        this.type = type;
        this.active = true;
    }
}