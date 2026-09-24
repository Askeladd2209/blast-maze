export class Player {

    constructor(x, y) {

        this.x = x;
        this.y = y;

        this.width = 32;
        this.height = 32;

        this.speed = 120;

        this.direction = {
            x: 0,
            y: 0
        };

        this.facing = "down";

        this.lives = 3;

        this.bombs = 5;
        this.maxBombs = 5;

        this.range = 2;

        this.score = 0;

        this.alive = true;

        this.invulnerable = false;
        this.invulnerabilityTimer = 0;

        // =========================
        // ANIMACIÓN
        // =========================

        this.animationState = "idle";

        this.currentFrame = 0;

        this.animationTimer = 0;

        this.animationSpeed = 0.12;

        this.animationStateTimer = 0;

        this.animationRows = {

            idle: 0,

            down: 1,

            up: 2,

            left: 3,

            right: 4,

            hit: 5,

            death: 6

        };

        this.animationFrameCounts = {

            idle: 4,

            down: 4,

            up: 4,

            left: 4,

            right: 4,

            hit: 4,

            death: 6

        };

    }

    move(
        dx,
        dy,
        deltaTime,
        collisionSystem
    ) {

        this.direction.x = dx;
        this.direction.y = dy;

        // =========================
        // ACTUALIZAR DIRECCIÓN VISUAL
        // =========================

        if (dx !== 0 || dy !== 0) {

            if (Math.abs(dx) > Math.abs(dy)) {

                if (dx > 0) {
                    this.facing = "right";
                } else {
                    this.facing = "left";
                }

            } else {

                if (dy > 0) {
                    this.facing = "down";
                } else {
                    this.facing = "up";
                }
            }
        }

        const newX =
            this.x +
            dx *
            this.speed *
            deltaTime;

        const newY =
            this.y +
            dy *
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

            this.direction.x = 0;
            this.direction.y = 0;
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

        this.facing = "down";

        this.animationState = "idle";

        this.currentFrame = 0;

        this.animationTimer = 0;

        this.animationStateTimer = 0;
    }

    loseLife() {

        if (
            this.lives <= 0 ||
            this.invulnerable
        ) {

            return false;
        }

        this.lives--;

        this.invulnerable = true;

        this.invulnerabilityTimer = 2000;

        // =========================
        // ANIMACIÓN DE DAÑO
        // =========================

        this.animationState = "hit";

        this.currentFrame = 0;

        this.animationTimer = 0;

        this.animationStateTimer = 0.48;

        if (this.lives === 0) {

            this.alive = false;

            // =========================
            // ANIMACIÓN DE MUERTE
            // =========================

            this.animationState = "death";

            this.currentFrame = 0;

            this.animationTimer = 0;

            this.animationStateTimer = 0.72;
        }

        return true;
    }

    update(deltaTime) {

        // =========================
        // INVULNERABILIDAD
        // =========================

        if (this.invulnerable) {

            this.invulnerabilityTimer -=
                deltaTime * 1000;

            if (
                this.invulnerabilityTimer <= 0
            ) {

                this.invulnerable = false;

                this.invulnerabilityTimer = 0;
            }
        }

        // =========================
        // ANIMACIÓN ESPECIAL
        // =========================

        if (
            this.animationState === "hit" ||
            this.animationState === "death"
        ) {

            this.animationStateTimer -=
                deltaTime;

            this.animationTimer +=
                deltaTime;

            const frameCount =
                this.animationFrameCounts[
                    this.animationState
                ];

            if (
                this.animationTimer >=
                this.animationSpeed
            ) {

                this.animationTimer = 0;

                this.currentFrame++;

                if (
                    this.currentFrame >=
                    frameCount
                ) {

                    this.currentFrame =
                        frameCount - 1;
                }
            }

            if (
                this.animationState === "hit" &&
                this.animationStateTimer <= 0
            ) {

                this.animationState =
                    this.getMovementAnimation();

                this.currentFrame = 0;

                this.animationTimer = 0;
            }

            return;
        }

        // =========================
        // ANIMACIÓN DE MOVIMIENTO
        // =========================

        const moving =
            this.direction.x !== 0 ||
            this.direction.y !== 0;

        const newState =
            moving
                ? this.getMovementAnimation()
                : "idle";

        if (
            this.animationState !==
            newState
        ) {

            this.animationState =
                newState;

            this.currentFrame = 0;

            this.animationTimer = 0;
        }

        if (moving) {

            this.animationTimer +=
                deltaTime;

            if (
                this.animationTimer >=
                this.animationSpeed
            ) {

                this.animationTimer = 0;

                this.currentFrame++;

                const frameCount =
                    this.animationFrameCounts[
                        this.animationState
                    ];

                this.currentFrame %=
                    frameCount;
            }

        } else {

            this.currentFrame = 0;

            this.animationTimer = 0;
        }
    }

    getMovementAnimation() {

        if (
            this.facing === "up"
        ) {

            return "up";
        }

        if (
            this.facing === "down"
        ) {

            return "down";
        }

        if (
            this.facing === "left"
        ) {

            return "left";
        }

        if (
            this.facing === "right"
        ) {

            return "right";
        }

        return "idle";
    }

    addScore(points) {

        this.score += points;
    }
}