export class AssetManager {

    constructor() {

        this.images = new Map();

        this.loaded = false;

    }

    loadImage(name, path) {

        return new Promise(
            (resolve, reject) => {

                const image =
                    new Image();

                image.onload = () => {

                    this.images.set(
                        name,
                        image
                    );

                    resolve(image);

                };

                image.onerror = () => {

                    reject(
                        new Error(
                            `No se pudo cargar el asset: ${path}`
                        )
                    );

                };

                image.src = path;

            }
        );

    }

    getImage(name) {

        return this.images.get(name);

    }

    hasImage(name) {

        return this.images.has(name);

    }

    async loadAll() {

        const assets = {

            player:
                "./assets/sprites/player.png",

            enemies:
                "./assets/sprites/enemies.png",

            bombs:
                "./assets/sprites/bombs.png",

            explosions:
                "./assets/sprites/explosions.png",

            blocks:
                "./assets/sprites/blocks.png",

            powerups:
                "./assets/sprites/powerups.png",

            exit:
                "./assets/sprites/exit.png",

            tiles:
                "./assets/sprites/tiles.png"

        };

        const entries =
            Object.entries(
                assets
            );

        for (
            const [name, path]
            of entries
        ) {

            await this.loadImage(
                name,
                path
            );

        }

        this.loaded = true;

        console.log(
            "Blast Maze: todos los assets fueron cargados correctamente."
        );

        return this.images;

    }

}