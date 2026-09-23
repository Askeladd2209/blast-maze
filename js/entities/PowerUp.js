export class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.type = type;

        this.active = true;
    }

    collect(player) {
        if (!this.active) {
            return false;
        }

        if (this.type === "bomb") {
            player.maxBombs++;
            player.bombs++;
        }

        if (this.type === "fire") {
            player.range++;
        }

        if (this.type === "speed") {
            player.speed += 20;
        }

        this.active = false;

        return true;
    }
}