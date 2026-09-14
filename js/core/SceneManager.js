export class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
    }

    add(name, scene) {
        this.scenes.set(name, scene);
    }

    change(name) {
        const nextScene = this.scenes.get(name);

        if (!nextScene) {
            throw new Error(`La escena no existe: ${name}`);
        }

        if (this.currentScene && this.currentScene.exit) {
            this.currentScene.exit();
        }

        this.currentScene = nextScene;

        if (this.currentScene.enter) {
            this.currentScene.enter();
        }
    }

    update(deltaTime) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(deltaTime);
        }
    }

    draw(context) {
        if (this.currentScene && this.currentScene.draw) {
            this.currentScene.draw(context);
        }
    }

    handleInput(input) {
        if (this.currentScene && this.currentScene.handleInput) {
            this.currentScene.handleInput(input);
        }
    }
}