/**
 * Splice Editor - Main Editor Application
 *
 * Manages the entire editor UI including:
 * - Timeline rendering and interaction
 * - Media library management
 * - Playback control
 * - Job submission and monitoring
 * - Export workflow
 */

class SpliceEditor {
    constructor(options) {
        this.projectId = options.projectId;
        this.apiBaseUrl = options.apiBaseUrl;
        this.csrfToken = options.csrfToken;

        this.project = null;
        this.clips = [];
        this.mediaAssets = [];
        this.jobs = [];
        this.selectedClip = null;
        this.isPlaying = false;
        this.currentTime = 0;

        this.init();
    }

    async init() {
        console.log('Initializing Splice Editor...');

        // Load project data
        await this.loadProject();

        // Initialize UI
        this.initializeUI();
        this.bindEvents();
        this.renderTimeline();
        this.renderMediaLibrary();
        this.pollJobs();

        console.log('Splice Editor ready');
    }

    async loadProject() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects/${this.projectId}/`);
            if (!response.ok) throw new Error('Failed to load project');
            this.project = await response.json();
        } catch (error) {
            console.error('Error loading project:', error);
            this.showError('Failed to load project');
        }
    }

    initializeUI() {
        // Initialize modals
        this.settingsModal = new Modal('settings-modal');
        this.exportModal = new Modal('export-modal');
        this.progressModal = new Modal('progress-modal');

        // Initialize timeline
        this.timeline = new Timeline({
            container: '#timeline',
            editor: this,
        });

        // Initialize playback
        this.playback = new PlaybackController({
            videoElement: '#main-video',
            seekBar: '#seek-bar',
            timeDisplay: '#time-display',
            editor: this,
        });
    }

    bindEvents() {
        // Header buttons
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-export').addEventListener('click', () => this.showExport());

        // Media library
        document.getElementById('btn-add-media').addEventListener('click', () => this.addMedia());

        // Settings modal
        document.getElementById('close-settings').addEventListener('click', () => this.settingsModal.close());
        document.getElementById('cancel-settings').addEventListener('click', () => this.settingsModal.close());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        // Export modal
        document.getElementById('close-export').addEventListener('click', () => this.exportModal.close());
        document.getElementById('cancel-export').addEventListener('click', () => this.exportModal.close());
        document.getElementById('start-export').addEventListener('click', () => this.startExport());

        // Export preset change
        document.getElementById('export-preset').addEventListener('change', (e) => {
            const customSettings = document.getElementById('custom-settings');
            customSettings.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async addMedia() {
        const fileInput = document.getElementById('file-input');
        fileInput.click();

        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            for (let file of files) {
                await this.importMedia(file);
            }
        });
    }

    async importMedia(file) {
        try {
            // Show upload progress
            console.log(`Importing ${file.name}...`);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);

            // Upload via API
            const response = await fetch(`${this.apiBaseUrl}/media/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const asset = await response.json();
            this.mediaAssets.push(asset);
            this.renderMediaLibrary();

            this.showSuccess(`${file.name} imported successfully`);
        } catch (error) {
            console.error('Error importing media:', error);
            this.showError(`Failed to import ${file.name}`);
        }
    }

    renderMediaLibrary() {
        const list = document.getElementById('media-list');
        list.innerHTML = '';

        this.mediaAssets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'media-item';
            item.innerHTML = `
                <div class="media-thumbnail">
                    🎬 ${asset.filename.substring(0, 20)}
                </div>
                <div class="media-info">
                    <div class="media-info-row">
                        <span>${asset.filename}</span>
                    </div>
                    <div class="media-info-row">
                        <span class="media-duration">${this.formatDuration(asset.duration_ms || 0)}</span>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => this.selectMedia(asset));
            list.appendChild(item);
        });
    }

    renderTimeline() {
        if (this.timeline) {
            this.timeline.render();
        }
    }

    selectMedia(asset) {
        // Mark selected in UI
        document.querySelectorAll('.media-item').forEach(el => {
            el.classList.remove('active');
        });
        event.currentTarget?.classList.add('active');
    }

    selectClip(clip) {
        this.selectedClip = clip;
        this.updateProperties();
        this.timeline.selectClip(clip);
    }

    updateProperties() {
        if (!this.selectedClip) {
            document.getElementById('clip-properties').innerHTML = 'No clip selected';
            return;
        }

        const props = document.getElementById('clip-properties');
        props.innerHTML = `
            <div class="property-group">
                <label>Name</label>
                <div class="property-value">${this.selectedClip.media_asset?.filename || 'Unknown'}</div>
            </div>
            <div class="property-group">
                <label>Duration</label>
                <div class="property-value">${this.formatDuration(this.selectedClip.timeline_duration_ms || 0)}</div>
            </div>
            <div class="property-group">
                <label>Start</label>
                <div class="property-value">${this.formatDuration(this.selectedClip.timeline_start_ms || 0)}</div>
            </div>
            <div class="property-group">
                <label>Source Trim</label>
                <div class="property-value">
                    ${this.formatDuration(this.selectedClip.source_start_ms || 0)} -
                    ${this.formatDuration(this.selectedClip.source_end_ms || 0)}
                </div>
            </div>
        `;
    }

    showSettings() {
        // Populate from project data
        document.getElementById('processing-mode').value = this.project.processing_mode || 'hybrid';
        document.getElementById('allow-cloud-upload').checked = this.project.allow_cloud_upload || false;
        this.settingsModal.show();
    }

    async saveSettings() {
        try {
            const data = {
                processing_mode: document.getElementById('processing-mode').value,
                allow_cloud_upload: document.getElementById('allow-cloud-upload').checked,
            };

            const response = await fetch(`${this.apiBaseUrl}/projects/${this.projectId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            this.project = await response.json();
            this.settingsModal.close();
            this.showSuccess('Settings saved');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showExport() {
        this.exportModal.show();
    }

    async startExport() {
        try {
            const exportType = document.querySelector('input[name="export-type"]:checked').value;
            const preset = document.getElementById('export-preset').value;

            // Create render plan
            const planResponse = await fetch(`${this.apiBaseUrl}/render-plans/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    project_id: this.projectId,
                    revision: this.project.current_revision,
                }),
            });

            if (!planResponse.ok) throw new Error('Failed to create render plan');
            const plan = await planResponse.json();

            // Submit job
            const jobResponse = await fetch(`${this.apiBaseUrl}/jobs/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    project_id: this.projectId,
                    job_type: exportType === 'audio' ? 'render_audio' : 'render_video',
                    input_data: {
                        render_plan_id: plan.id,
                        output_format: preset,
                    },
                }),
            });

            if (!jobResponse.ok) throw new Error('Failed to submit job');
            const job = await jobResponse.json();

            this.jobs.push(job);
            this.exportModal.close();
            this.showJobProgress(job.id);
        } catch (error) {
            console.error('Error starting export:', error);
            this.showError('Failed to start export');
        }
    }

    showJobProgress(jobId) {
        this.progressModal.show();
        this.monitorJob(jobId);
    }

    async monitorJob(jobId) {
        const updateProgress = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/jobs/${jobId}/`);
                const job = await response.json();

                // Update progress bar
                const progressFill = document.getElementById('progress-fill');
                progressFill.style.width = `${job.progress_percent}%`;
                document.getElementById('progress-text').textContent = `${job.progress_percent}%`;

                // Update status
                const statusText = document.getElementById('job-status');
                statusText.textContent = job.get_status_display || job.status;
                statusText.className = `job-status ${job.status}`;

                // Check if complete
                if (job.status === 'completed') {
                    clearInterval(updateProgress);
                    this.showSuccess('Export completed!');
                    setTimeout(() => this.progressModal.close(), 2000);
                } else if (job.status === 'failed') {
                    clearInterval(updateProgress);
                    this.showError(`Export failed: ${job.error_message}`);
                }

                // Update job in list
                const idx = this.jobs.findIndex(j => j.id === jobId);
                if (idx !== -1) {
                    this.jobs[idx] = job;
                    this.renderJobs();
                }
            } catch (error) {
                console.error('Error monitoring job:', error);
                clearInterval(updateProgress);
            }
        }, 1000);
    }

    pollJobs() {
        // Poll for job updates every 2 seconds
        setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/jobs/`);
                const jobs = await response.json();
                this.jobs = jobs;
                this.renderJobs();
            } catch (error) {
                console.error('Error polling jobs:', error);
            }
        }, 2000);
    }

    renderJobs() {
        const list = document.getElementById('job-list');
        const empty = document.getElementById('jobs-empty');

        if (this.jobs.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = this.jobs.map(job => `
            <div class="job-item">
                <div class="job-status ${job.status}">${job.get_job_type_display || job.job_type}</div>
                <div class="job-status-text">${job.get_status_display || job.status}</div>
                <div class="job-progress">
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${job.progress_percent}%"></div>
                    </div>
                </div>
                <div class="property-value">${job.progress_percent}%</div>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    undo() {
        // Submit undo operation
        this.submitOperation('undo', {});
    }

    redo() {
        // Submit redo operation
        this.submitOperation('redo', {});
    }

    async submitOperation(type, payload) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects/${this.projectId}/operations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    operation_type: type,
                    payload: payload,
                    client_revision: this.project.current_revision,
                }),
            });

            if (!response.ok) throw new Error('Operation failed');
            this.project = await response.json();
            this.renderTimeline();
            this.showSuccess(`${type} successful`);
        } catch (error) {
            console.error('Error:', error);
            this.showError(`${type} failed`);
        }
    }

    handleKeyboard(event) {
        if (event.ctrlKey || event.metaKey) {
            if (event.key === 'z') {
                event.preventDefault();
                this.undo();
            } else if (event.key === 'y' || (event.shiftKey && event.key === 'z')) {
                event.preventDefault();
                this.redo();
            }
        } else if (event.key === ' ') {
            event.preventDefault();
            this.playback?.togglePlayback();
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }

    showSuccess(message) {
        console.log(`✓ ${message}`);
        // Show toast notification
    }

    showError(message) {
        console.error(`✗ ${message}`);
        // Show error toast
    }
}

// Modal helper class
class Modal {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
    }

    show() {
        this.element?.classList.remove('hidden');
    }

    close() {
        this.element?.classList.add('hidden');
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.editorApp) {
        window.editorApp.init();
    }
});
