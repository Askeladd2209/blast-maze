export class GameLoop {
    constructor(update, draw) {
        this.update = update;
        this.draw = draw;
        this.running = false;
        this.lastTime = 0;
        this.animationFrameId = null;
    }

    start() {
        if (this.running) {
            return;
        }

        this.running = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(
            (time) => this.frame(time)
        );
    }

    stop() {
        this.running = false;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    frame(currentTime) {
        if (!this.running) {
            return;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.animationFrameId = requestAnimationFrame(
            (time) => this.frame(time)
        );
    }
}