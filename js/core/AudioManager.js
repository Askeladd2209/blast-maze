export class AudioManager {

    constructor() {

        this.context = null;

        this.masterGain = null;

        this.enabled = true;

        this.musicEnabled = true;

        this.effectsEnabled = true;

        this.musicOscillators = [];

        this.currentMusic = null;
    }

    // =====================================================
    // INICIALIZAR AUDIO
    // =====================================================

    init() {

        if (this.context) {
            return;
        }

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {

            console.warn(
                "Web Audio API no disponible."
            );

            this.enabled = false;

            return;
        }

        this.context =
            new AudioContext();

        this.masterGain =
            this.context.createGain();

        this.masterGain.gain.value =
            0.18;

        this.masterGain.connect(
            this.context.destination
        );
    }

    // =====================================================
    // REANUDAR AUDIO
    // =====================================================

    resume() {

        if (!this.context) {
            this.init();
        }

        if (
            this.context &&
            this.context.state === "suspended"
        ) {

            this.context.resume();
        }
    }

    // =====================================================
    // CREAR TONO
    // =====================================================

    playTone(
        frequency,
        duration,
        type = "sine",
        volume = 0.08
    ) {

        if (
            !this.enabled ||
            !this.effectsEnabled
        ) {
            return;
        }

        this.resume();

        if (!this.context) {
            return;
        }

        const oscillator =
            this.context.createOscillator();

        const gain =
            this.context.createGain();

        oscillator.type =
            type;

        oscillator.frequency.setValueAtTime(
            frequency,
            this.context.currentTime
        );

        gain.gain.setValueAtTime(
            0,
            this.context.currentTime
        );

        gain.gain.linearRampToValueAtTime(
            volume,
            this.context.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.context.currentTime +
            duration
        );

        oscillator.connect(gain);

        gain.connect(
            this.masterGain
        );

        oscillator.start();

        oscillator.stop(
            this.context.currentTime +
            duration
        );
    }

    // =====================================================
    // BOMBA
    // =====================================================

    playBomb() {

        this.playTone(
            90,
            0.16,
            "square",
            0.07
        );

        setTimeout(() => {

            this.playTone(
                130,
                0.12,
                "square",
                0.05
            );

        }, 70);
    }

    // =====================================================
    // EXPLOSIÓN
    // =====================================================

    playExplosion() {

        if (
            !this.enabled ||
            !this.effectsEnabled
        ) {
            return;
        }

        this.resume();

        if (!this.context) {
            return;
        }

        const oscillator =
            this.context.createOscillator();

        const gain =
            this.context.createGain();

        oscillator.type =
            "sawtooth";

        oscillator.frequency.setValueAtTime(
            120,
            this.context.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            35,
            this.context.currentTime + 0.35
        );

        gain.gain.setValueAtTime(
            0.12,
            this.context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.context.currentTime + 0.35
        );

        oscillator.connect(gain);

        gain.connect(
            this.masterGain
        );

        oscillator.start();

        oscillator.stop(
            this.context.currentTime + 0.35
        );
    }

    // =====================================================
    // POWER-UP
    // =====================================================

    playPowerUp() {

        this.playTone(
            523.25,
            0.12,
            "sine",
            0.07
        );

        setTimeout(() => {

            this.playTone(
                659.25,
                0.12,
                "sine",
                0.07
            );

        }, 90);

        setTimeout(() => {

            this.playTone(
                783.99,
                0.18,
                "sine",
                0.08
            );

        }, 180);
    }

    // =====================================================
    // ENEMIGO
    // =====================================================

    playEnemyHit() {

        this.playTone(
            220,
            0.10,
            "square",
            0.06
        );

        setTimeout(() => {

            this.playTone(
                110,
                0.14,
                "square",
                0.05
            );

        }, 60);
    }

    // =====================================================
    // DAÑO DEL JUGADOR
    // =====================================================

    playPlayerHit() {

        this.playTone(
            180,
            0.18,
            "sawtooth",
            0.08
        );

        setTimeout(() => {

            this.playTone(
                90,
                0.22,
                "sawtooth",
                0.06
            );

        }, 80);
    }

    // =====================================================
    // NUEVO NIVEL
    // =====================================================

    playLevelUp() {

        const notes = [
            392,
            523.25,
            659.25,
            783.99
        ];

        notes.forEach(
            (frequency, index) => {

                setTimeout(() => {

                    this.playTone(
                        frequency,
                        0.18,
                        "sine",
                        0.07
                    );

                }, index * 100);
            }
        );
    }

    // =====================================================
    // GAME OVER
    // =====================================================

    playGameOver() {

        this.playTone(
            392,
            0.25,
            "sawtooth",
            0.07
        );

        setTimeout(() => {

            this.playTone(
                293.66,
                0.30,
                "sawtooth",
                0.07
            );

        }, 180);

        setTimeout(() => {

            this.playTone(
                196,
                0.45,
                "sawtooth",
                0.08
            );

        }, 380);
    }

    // =====================================================
    // SONIDO DE MENÚ
    // =====================================================

    playMenuSelect() {

        this.playTone(
            440,
            0.08,
            "square",
            0.04
        );
    }

    // =====================================================
    // SONIDO DE PAUSA
    // =====================================================

    playPause() {

        this.playTone(
            330,
            0.12,
            "sine",
            0.04
        );
    }

    // =====================================================
    // MÚSICA
    // =====================================================

    startMusic(type = "menu") {

        if (
            !this.enabled ||
            !this.musicEnabled
        ) {
            return;
        }

        this.stopMusic();

        this.resume();

        if (!this.context) {
            return;
        }

        this.currentMusic =
            type;

        const notes =
            type === "gameplay"

                ? [
                    110,
                    130.81,
                    146.83,
                    164.81
                ]

                : [
                    164.81,
                    196,
                    220,
                    246.94
                ];

        notes.forEach(
            (frequency, index) => {

                const oscillator =
                    this.context.createOscillator();

                const gain =
                    this.context.createGain();

                oscillator.type =
                    "triangle";

                oscillator.frequency.value =
                    frequency;

                gain.gain.value =
                    0.018;

                oscillator.connect(gain);

                gain.connect(
                    this.masterGain
                );

                oscillator.start();

                this.musicOscillators.push({
                    oscillator,
                    gain,
                    index
                });
            }
        );
    }

    // =====================================================
    // DETENER MÚSICA
    // =====================================================

    stopMusic() {

        for (
            const item
            of this.musicOscillators
        ) {

            try {

                item.oscillator.stop();

            } catch (error) {

                // Ya estaba detenido.
            }
        }

        this.musicOscillators = [];

        this.currentMusic = null;
    }

    // =====================================================
    // ACTIVAR / DESACTIVAR
    // =====================================================

    setEnabled(enabled) {

        this.enabled =
            enabled;

        if (!enabled) {

            this.stopMusic();
        }
    }

    setMusicEnabled(enabled) {

        this.musicEnabled =
            enabled;

        if (!enabled) {

            this.stopMusic();
        }
    }

    setEffectsEnabled(enabled) {

        this.effectsEnabled =
            enabled;
    }
}