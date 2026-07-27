/**
 * Timeline Component
 * Handles timeline rendering, clip interaction, and drag/drop
 */

class Timeline {
    constructor(options) {
        this.container = document.querySelector(options.container);
        this.editor = options.editor;
        this.clips = [];
        this.selectedClip = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.pixelsPerSecond = 50; // Zoom level

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        if (!this.container) return;

        // Render tracks with clips
        const videoTrack = this.container.querySelector('#track-video');
        const audioTrack = this.container.querySelector('#track-audio');

        if (videoTrack) {
            videoTrack.innerHTML = this.renderClips('video');
        }
        if (audioTrack) {
            audioTrack.innerHTML = this.renderClips('audio');
        }

        this.bindClipEvents();
    }

    renderClips(trackType) {
        // Filter clips by track type (would come from editor.clips)
        const clips = this.editor.clips.filter(clip => {
            // In real implementation, would filter by track type
            return true;
        });

        return clips.map(clip => {
            const duration = (clip.timeline_duration_ms / 1000) * this.pixelsPerSecond;
            const offset = (clip.timeline_start_ms / 1000) * this.pixelsPerSecond;

            return `
                <div class="clip" data-clip-id="${clip.id}" style="left: ${offset}px; width: ${duration}px;">
                    <div class="clip-label">${clip.media_asset?.filename || 'Clip'}</div>
                    <div class="clip-trim-handle left"></div>
                    <div class="clip-trim-handle right"></div>
                </div>
            `;
        }).join('');
    }

    bindClipEvents() {
        const clips = this.container.querySelectorAll('.clip');

        clips.forEach(clipEl => {
            // Click to select
            clipEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('clip-trim-handle')) {
                    return; // Trim handle clicked
                }
                const clipId = clipEl.dataset.clipId;
                const clip = this.editor.clips.find(c => c.id === clipId);
                this.selectClip(clip);
            });

            // Drag to move
            let isDragging = false;
            let dragStart = 0;

            clipEl.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('clip-trim-handle')) {
                    return;
                }
                isDragging = true;
                dragStart = e.clientX;
                clipEl.classList.add('dragging');
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - dragStart;
                const newLeft = parseFloat(clipEl.style.left) + deltaX;
                clipEl.style.left = `${Math.max(0, newLeft)}px`;
                dragStart = e.clientX;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    clipEl.classList.remove('dragging');
                    this.updateClipPosition(clipEl);
                }
            });

            // Trim handles
            const trimHandles = clipEl.querySelectorAll('.clip-trim-handle');
            trimHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startTrim(clipEl, handle, e);
                });
            });
        });
    }

    startTrim(clipEl, handle, e) {
        const isLeft = handle.classList.contains('left');
        const startWidth = parseFloat(clipEl.style.width);
        const startX = e.clientX;
        const startLeft = parseFloat(clipEl.style.left);

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;

            if (isLeft) {
                const newWidth = startWidth - deltaX;
                if (newWidth > 20) { // Minimum width
                    clipEl.style.left = `${startLeft + deltaX}px`;
                    clipEl.style.width = `${newWidth}px`;
                }
            } else {
                const newWidth = startWidth + deltaX;
                if (newWidth > 20) {
                    clipEl.style.width = `${newWidth}px`;
                }
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.updateClipTrim(clipEl);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    selectClip(clip) {
        // Remove active class from all clips
        this.container.querySelectorAll('.clip').forEach(el => {
            el.classList.remove('active');
        });

        // Add to selected clip
        if (clip) {
            const clipEl = this.container.querySelector(`[data-clip-id="${clip.id}"]`);
            if (clipEl) {
                clipEl.classList.add('active');
            }
        }

        this.selectedClip = clip;
        this.editor.selectClip(clip);
    }

    updateClipPosition(clipEl) {
        // Calculate new timeline position from pixel position
        const clipId = clipEl.dataset.clipId;
        const clip = this.editor.clips.find(c => c.id === clipId);

        if (clip) {
            const newStart = (parseFloat(clipEl.style.left) / this.pixelsPerSecond) * 1000;
            clip.timeline_start_ms = Math.round(newStart);

            // Submit operation to server
            this.editor.submitOperation('move_clip', {
                clip_id: clipId,
                timeline_start_ms: clip.timeline_start_ms,
            });
        }
    }

    updateClipTrim(clipEl) {
        const clipId = clipEl.dataset.clipId;
        const clip = this.editor.clips.find(c => c.id === clipId);

        if (clip) {
            const newDuration = (parseFloat(clipEl.style.width) / this.pixelsPerSecond) * 1000;
            clip.timeline_duration_ms = Math.round(newDuration);

            // Submit operation
            this.editor.submitOperation('trim_clip', {
                clip_id: clipId,
                timeline_duration_ms: clip.timeline_duration_ms,
            });
        }
    }

    bindEvents() {
        // Would bind additional timeline events here
    }

    setZoom(pixelsPerSecond) {
        this.pixelsPerSecond = pixelsPerSecond;
        this.render();
    }
}

window.Timeline = Timeline;
