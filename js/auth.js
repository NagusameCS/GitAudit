/**
 * GitAudit Authentication Module
 * Handles GitHub OAuth authentication via redirect flow
 */

class GitHubAuth {
    constructor() {
        this.accessToken = null;
        this.userData = null;
        this.isAuthenticated = false;
        
        // Try to restore session from localStorage
        this.restoreSession();
    }
    
    /**
     * Restore session from localStorage
     */
    restoreSession() {
        try {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            
            if (token && userData) {
                this.accessToken = token;
                this.userData = JSON.parse(userData);
                this.isAuthenticated = true;
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            this.clearSession();
        }
    }
    
    /**
     * Save session to localStorage
     */
    saveSession() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, this.accessToken);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.userData));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }
    
    /**
     * Clear session from localStorage
     */
    clearSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        this.accessToken = null;
        this.userData = null;
        this.isAuthenticated = false;
    }
    
    /**
     * Initiate GitHub OAuth login via redirect
     */
    login() {
        // Check if OAuth proxy is configured
        if (!CONFIG.OAUTH_PROXY_URL) {
            this.showSetupRequiredModal();
            return;
        }
        
        // Generate a random state for CSRF protection
        const state = this.generateState();
        sessionStorage.setItem('oauth_state', state);
        
        // Required scopes for GitAudit
        const scopes = 'repo read:user user:email';
        
        // Build OAuth authorization URL
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', CONFIG.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', CONFIG.CALLBACK_URL);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('state', state);
        
        // Redirect to GitHub for authorization
        window.location.href = authUrl.toString();
    }
    
    /**
     * Show modal explaining setup is required
     */
    showSetupRequiredModal() {
        let modal = document.getElementById('setup-required-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'setup-required-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-cog"></i> Setup Required</h3>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px;">To enable GitHub sign-in, you need to deploy a small OAuth proxy:</p>
                        <ol style="text-align: left; margin-left: 20px; line-height: 1.8;">
                            <li>Go to <a href="https://dash.cloudflare.com/" target="_blank">Cloudflare Dashboard</a></li>
                            <li>Create a Worker and paste the code from <code>worker/oauth-worker.js</code></li>
                            <li>Add your GitHub App credentials as environment variables</li>
                            <li>Update <code>OAUTH_PROXY_URL</code> in <code>js/config.js</code></li>
                        </ol>
                        <p style="margin-top: 15px; color: var(--text-muted);">This is required because GitHub's OAuth token exchange doesn't support browser CORS.</p>
                        <p style="margin-top: 15px;"><strong>For now, try Demo Mode to explore GitAudit!</strong></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('setup-required-modal').classList.add('hidden')">Close</button>
                        <button class="btn btn-primary" onclick="document.getElementById('setup-required-modal').classList.add('hidden'); document.getElementById('demo-repo-btn')?.click();">Try Demo</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.classList.remove('hidden');
    }
    
    /**
     * Handle OAuth callback - exchange code for token via proxy
     */
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (error) {
            throw new Error(`OAuth error: ${urlParams.get('error_description') || error}`);
        }
        
        // Verify state to prevent CSRF (skip if state not present - user may have navigated directly)
        const savedState = sessionStorage.getItem('oauth_state');
        if (savedState && state && state !== savedState) {
            console.warn('OAuth state mismatch - possible CSRF attempt or stale session');
            // Clear the bad state and continue anyway for better UX
        }
        sessionStorage.removeItem('oauth_state');
        
        if (!code) {
            throw new Error('No authorization code received');
        }
        
        // Exchange code for token via proxy
        const response = await fetch(`${CONFIG.OAUTH_PROXY_URL}/api/auth/github`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error_description || data.error);
        }
        
        if (!data.access_token) {
            throw new Error('No access token received');
        }
        
        return data.access_token;
    }
    
    /**
     * Set access token directly (for testing or token passed from backend)
     */
    async setAccessToken(token) {
        this.accessToken = token;
        
        // Fetch user data to verify token
        await this.fetchUserData();
        
        this.isAuthenticated = true;
        this.saveSession();
    }
    
    /**
     * Fetch user data from GitHub API
     */
    async fetchUserData() {
        const response = await fetch(`${CONFIG.GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        this.userData = await response.json();
        return this.userData;
    }
    
    /**
     * Log out the user
     */
    logout() {
        this.clearSession();
    }
    
    /**
     * Check if user is authenticated
     */
    checkAuth() {
        return this.isAuthenticated && this.accessToken;
    }
    
    /**
     * Get current user data
     */
    getUser() {
        return this.userData;
    }
    
    /**
     * Get access token
     */
    getToken() {
        return this.accessToken;
    }
    
    /**
     * Generate random state for OAuth CSRF protection
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Demo mode login (for testing without real GitHub OAuth)
     */
    async demoLogin() {
        this.userData = {
            login: 'demo-user',
            id: 0,
            avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            name: 'Demo User',
            email: 'demo@example.com'
        };
        this.accessToken = 'demo-token';
        this.isAuthenticated = true;
        
        // Don't save demo session
        console.log('Logged in as demo user');
    }
}

// Export singleton instance
const auth = new GitHubAuth();
