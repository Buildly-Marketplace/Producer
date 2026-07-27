/**
 * Playback Controller
 * Handles video playback, seeking, and time display
 */

class PlaybackController {
    constructor(options) {
        this.videoElement = document.querySelector(options.videoElement);
        this.seekBar = document.querySelector(options.seekBar);
        this.timeDisplay = document.querySelector(options.timeDisplay);
        this.editor = options.editor;

        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;

        this.init();
    }

    init() {
        if (!this.videoElement) return;

        // Bind video events
        this.videoElement.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.videoElement.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.videoElement.addEventListener('play', () => this.onPlay());
        this.videoElement.addEventListener('pause', () => this.onPause());
        this.videoElement.addEventListener('ended', () => this.onEnded());

        // Bind control events
        document.getElementById('btn-play')?.addEventListener('click', () => this.play());
        document.getElementById('btn-pause')?.addEventListener('click', () => this.pause());

        if (this.seekBar) {
            this.seekBar.addEventListener('input', (e) => this.seek(parseFloat(e.target.value)));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                this.togglePlayback();
            }
        });
    }

    onLoadedMetadata() {
        this.duration = this.videoElement.duration;
        if (this.seekBar) {
            this.seekBar.max = this.duration;
        }
    }

    onTimeUpdate() {
        this.currentTime = this.videoElement.currentTime;
        this.updateTimeDisplay();

        if (this.seekBar) {
            this.seekBar.value = this.currentTime;
        }

        // Notify editor of time change
        if (this.editor) {
            this.editor.currentTime = this.currentTime * 1000; // Convert to ms
        }
    }

    onPlay() {
        this.isPlaying = true;
        document.getElementById('btn-play')?.classList.add('playing');
    }

    onPause() {
        this.isPlaying = false;
        document.getElementById('btn-play')?.classList.remove('playing');
    }

    onEnded() {
        this.isPlaying = false;
        this.pause();
    }

    play() {
        if (this.videoElement) {
            this.videoElement.play();
        }
    }

    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
        }
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    seek(time) {
        if (this.videoElement) {
            this.videoElement.currentTime = time;
        }
    }

    updateTimeDisplay() {
        if (!this.timeDisplay) return;

        const current = this.formatTime(this.currentTime);
        const total = this.formatTime(this.duration);
        this.timeDisplay.textContent = `${current} / ${total}`;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    setPlaybackRate(rate) {
        if (this.videoElement) {
            this.videoElement.playbackRate = rate;
        }
    }

    setVolume(volume) {
        if (this.videoElement) {
            this.videoElement.volume = Math.max(0, Math.min(1, volume));
        }
    }
}

window.PlaybackController = PlaybackController;
