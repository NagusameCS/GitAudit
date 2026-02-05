/**
 * GitAudit GitHub API Module
 * Handles all interactions with the GitHub API
 */

class GitHubAPI {
    constructor() {
        this.baseUrl = CONFIG.GITHUB_API_BASE;
    }
    
    /**
     * Get headers for API requests
     */
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        const token = auth.getToken();
        if (token && token !== 'demo-token') {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    /**
     * Make API request with error handling
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API request failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    /**
     * Get user's repositories
     */
    async getUserRepos(page = 1, perPage = 30) {
        return this.request(`/user/repos?page=${page}&per_page=${perPage}&sort=updated&affiliation=owner`);
    }
    
    /**
     * Get all user's repositories (paginated)
     */
    async getAllUserRepos() {
        const repos = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const pageRepos = await this.getUserRepos(page);
            repos.push(...pageRepos);
            hasMore = pageRepos.length === 30;
            page++;
        }
        
        return repos;
    }
    
    /**
     * Get repository details
     */
    async getRepo(owner, repo) {
        return this.request(`/repos/${owner}/${repo}`);
    }
    
    /**
     * Get repository tree (all files and directories)
     */
    async getRepoTree(owner, repo, sha = 'HEAD', recursive = true) {
        const endpoint = `/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;
        return this.request(endpoint);
    }
    
    /**
     * Get file content
     */
    async getFileContent(owner, repo, path, ref = 'main') {
        try {
            const response = await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
            
            if (response.encoding === 'base64' && response.content) {
                // Decode base64 content
                return atob(response.content.replace(/\n/g, ''));
            }
            
            return response.content || '';
        } catch (error) {
            // Try to fetch raw content for large files
            try {
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
                const response = await fetch(rawUrl);
                if (response.ok) {
                    return await response.text();
                }
            } catch (rawError) {
                console.error('Failed to fetch raw content:', rawError);
            }
            throw error;
        }
    }
    
    /**
     * Get file blob (for large files)
     */
    async getBlob(owner, repo, sha) {
        const response = await this.request(`/repos/${owner}/${repo}/git/blobs/${sha}`);
        
        if (response.encoding === 'base64' && response.content) {
            return atob(response.content.replace(/\n/g, ''));
        }
        
        return response.content || '';
    }
    
    /**
     * Get default branch
     */
    async getDefaultBranch(owner, repo) {
        const repoData = await this.getRepo(owner, repo);
        return repoData.default_branch;
    }
    
    /**
     * Get branches
     */
    async getBranches(owner, repo) {
        return this.request(`/repos/${owner}/${repo}/branches`);
    }
    
    /**
     * Create a new branch
     */
    async createBranch(owner, repo, branchName, sourceSha) {
        return this.request(`/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: sourceSha
            })
        });
    }
    
    /**
     * Create or update file
     */
    async createOrUpdateFile(owner, repo, path, message, content, branch, sha = null) {
        const body = {
            message,
            content: btoa(content),
            branch
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Fork a repository
     */
    async forkRepo(owner, repo) {
        return this.request(`/repos/${owner}/${repo}/forks`, {
            method: 'POST'
        });
    }
    
    /**
     * Create a commit with multiple file changes
     */
    async createCommitWithChanges(owner, repo, branch, message, changes) {
        // Get the latest commit SHA
        const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
        const latestCommitSha = ref.object.sha;
        
        // Get the tree SHA
        const commit = await this.request(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`);
        const baseTreeSha = commit.tree.sha;
        
        // Create blobs for each file
        const tree = [];
        for (const change of changes) {
            const blob = await this.request(`/repos/${owner}/${repo}/git/blobs`, {
                method: 'POST',
                body: JSON.stringify({
                    content: change.content,
                    encoding: 'utf-8'
                })
            });
            
            tree.push({
                path: change.path,
                mode: '100644',
                type: 'blob',
                sha: blob.sha
            });
        }
        
        // Create new tree
        const newTree = await this.request(`/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree
            })
        });
        
        // Create commit
        const newCommit = await this.request(`/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            body: JSON.stringify({
                message,
                tree: newTree.sha,
                parents: [latestCommitSha]
            })
        });
        
        // Update branch reference
        await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            body: JSON.stringify({
                sha: newCommit.sha
            })
        });
        
        return newCommit;
    }
    
    /**
     * Parse repository URL to get owner and repo
     */
    parseRepoUrl(url) {
        // Handle various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/,
            /^([^\/]+)\/([^\/]+)$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, '')
                };
            }
        }
        
        return null;
    }
    
    /**
     * Check if repository exists and is accessible
     */
    async checkRepoAccess(owner, repo) {
        try {
            await this.getRepo(owner, repo);
            return { accessible: true };
        } catch (error) {
            return { 
                accessible: false, 
                error: error.message 
            };
        }
    }
    
    /**
     * Get repository languages
     */
    async getLanguages(owner, repo) {
        return this.request(`/repos/${owner}/${repo}/languages`);
    }
    
    /**
     * Get repository contributors
     */
    async getContributors(owner, repo) {
        return this.request(`/repos/${owner}/${repo}/contributors`);
    }
}

// Export singleton instance
const githubAPI = new GitHubAPI();
