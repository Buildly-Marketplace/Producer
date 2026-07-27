/**
 * API Client for Splice
 * Handles all communication with the backend REST API
 */

class SpliceAPI {
    constructor(baseUrl, csrfToken) {
        this.baseUrl = baseUrl;
        this.csrfToken = csrfToken;
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return response.json();
    }

    // Projects
    getProject(projectId) {
        return this.request('GET', `/projects/${projectId}/`);
    }

    updateProject(projectId, data) {
        return this.request('PATCH', `/projects/${projectId}/`, data);
    }

    // Media
    uploadMedia(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);

        return fetch(`${this.baseUrl}/media/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.csrfToken,
            },
            body: formData,
        }).then(r => r.json());
    }

    // Jobs
    getJobs() {
        return this.request('GET', '/jobs/');
    }

    getJob(jobId) {
        return this.request('GET', `/jobs/${jobId}/`);
    }

    submitJob(data) {
        return this.request('POST', '/jobs/', data);
    }

    updateJob(jobId, data) {
        return this.request('PATCH', `/jobs/${jobId}/`, data);
    }

    // Render Plans
    createRenderPlan(data) {
        return this.request('POST', '/render-plans/', data);
    }

    getRenderPlan(planId) {
        return this.request('GET', `/render-plans/${planId}/`);
    }

    getRenderBlueprint(planId) {
        return this.request('GET', `/render-plans/${planId}/blueprint/`);
    }

    // Operations
    submitOperation(projectId, data) {
        return this.request('POST', `/projects/${projectId}/operations/`, data);
    }
}

// Export for global access
window.SpliceAPI = SpliceAPI;
