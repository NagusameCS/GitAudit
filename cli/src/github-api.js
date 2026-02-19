/**
 * GitAudit CLI — GitHub API Client
 * Mirrors the web version's github-api.js but uses node-fetch
 */

const fetch = require('node-fetch');
const CONFIG = require('./config');

class GitHubAPI {
    constructor(token) {
        this.baseUrl = CONFIG.GITHUB_API_BASE;
        this.token = token || process.env.GITHUB_TOKEN || null;
    }

    getHeaders() {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const msg = body.message || `GitHub API ${response.status}`;
            if (response.status === 403 && body.message && body.message.includes('rate limit')) {
                throw new Error('GitHub API rate limit exceeded. Set a GITHUB_TOKEN to raise the limit.');
            }
            throw new Error(msg);
        }
        return response.json();
    }

    async getRepo(owner, repo) {
        return this.request(`/repos/${owner}/${repo}`);
    }

    async getRepoTree(owner, repo) {
        const endpoint = `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
        return this.request(endpoint);
    }

    async getDefaultBranch(owner, repo) {
        const data = await this.getRepo(owner, repo);
        return data.default_branch;
    }

    async getFileContent(owner, repo, path, ref = 'main') {
        try {
            const data = await this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`);
            if (data.encoding === 'base64' && data.content) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return data.content || '';
        } catch (err) {
            // Fallback to raw.githubusercontent for large files
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
            const res = await fetch(rawUrl, { headers: this.getHeaders() });
            if (res.ok) return res.text();
            throw err;
        }
    }

    /**
     * Parse owner/repo from various URL formats
     */
    static parseRepoUrl(input) {
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/,
            /^([^\/\s]+)\/([^\/\s]+)$/,
        ];
        for (const p of patterns) {
            const m = input.match(p);
            if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
        }
        return null;
    }
}

module.exports = GitHubAPI;
