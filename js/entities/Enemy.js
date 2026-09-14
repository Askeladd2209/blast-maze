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
    }
}