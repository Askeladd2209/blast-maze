export class AssetManager {
    constructor() {
        this.images = new Map();
    }

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => {
                this.images.set(key, image);
                resolve(image);
            };

            image.onerror = () => {
                reject(new Error(`No se pudo cargar la imagen: ${src}`));
            };

            image.src = src;
        });
    }

    getImage(key) {
        return this.images.get(key);
    }

    hasImage(key) {
        return this.images.has(key);
    }
}