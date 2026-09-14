export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = null;
        this.muted = false;
    }

    loadSound(key, src) {
        const audio = new Audio(src);
        audio.preload = "auto";

        this.sounds.set(key, audio);

        return audio;
    }

    playSound(key) {
        if (this.muted) {
            return;
        }

        const sound = this.sounds.get(key);

        if (!sound) {
            return;
        }

        sound.currentTime = 0;
        sound.play();
    }

    playMusic(src, loop = true) {
        if (this.music) {
            this.music.pause();
        }

        this.music = new Audio(src);
        this.music.loop = loop;

        if (!this.muted) {
            this.music.play();
        }
    }

    stopMusic() {
        if (!this.music) {
            return;
        }

        this.music.pause();
        this.music.currentTime = 0;
    }

    setMuted(muted) {
        this.muted = muted;

        if (this.music) {
            this.music.muted = muted;
        }

        for (const sound of this.sounds.values()) {
            sound.muted = muted;
        }
    }
}