/**
 * GitAudit Authentication Module
 * Handles GitHub Device Flow authentication (works without backend)
 */

class GitHubAuth {
    constructor() {
        this.accessToken = null;
        this.userData = null;
        this.isAuthenticated = false;
        this.deviceFlowPolling = null;
        
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
     * Initiate GitHub Device Flow authentication
     * This works entirely client-side without a backend!
     */
    async login() {
        try {
            // Step 1: Request device and user verification codes
            const deviceCodeResponse = await fetch('https://github.com/login/device/code', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: CONFIG.GITHUB_CLIENT_ID,
                    scope: 'repo read:user user:email'
                })
            });
            
            if (!deviceCodeResponse.ok) {
                throw new Error('Failed to initiate device flow');
            }
            
            const deviceData = await deviceCodeResponse.json();
            
            // Show user the code and verification URL
            this.showDeviceFlowModal(deviceData);
            
            // Step 2: Poll for the access token
            await this.pollForAccessToken(deviceData);
            
        } catch (error) {
            console.error('Login failed:', error);
            this.hideDeviceFlowModal();
            throw error;
        }
    }
    
    /**
     * Show modal with device flow instructions
     */
    showDeviceFlowModal(deviceData) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('device-flow-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'device-flow-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-github"></i> Sign in with GitHub</h3>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <p style="margin-bottom: 20px;">To sign in, open this URL in your browser:</p>
                        <a href="${deviceData.verification_uri}" target="_blank" class="btn btn-secondary" style="margin-bottom: 20px; display: inline-block;">
                            <i class="fas fa-external-link-alt"></i> ${deviceData.verification_uri}
                        </a>
                        <p style="margin-bottom: 10px;">And enter this code:</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 20px; background: var(--secondary-color); border-radius: 8px; margin-bottom: 20px; font-family: var(--font-mono);" id="device-code">
                            ${deviceData.user_code}
                        </div>
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${deviceData.user_code}')">
                            <i class="fas fa-copy"></i> Copy Code
                        </button>
                        <p style="margin-top: 20px; color: var(--text-muted); font-size: 13px;">
                            <i class="fas fa-spinner fa-spin"></i> Waiting for authorization...
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="device-flow-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('device-flow-cancel').addEventListener('click', () => {
                this.cancelDeviceFlow();
            });
        }
        
        modal.classList.remove('hidden');
    }
    
    /**
     * Hide device flow modal
     */
    hideDeviceFlowModal() {
        const modal = document.getElementById('device-flow-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    /**
     * Cancel device flow polling
     */
    cancelDeviceFlow() {
        if (this.deviceFlowPolling) {
            clearInterval(this.deviceFlowPolling);
            this.deviceFlowPolling = null;
        }
        this.hideDeviceFlowModal();
    }
    
    /**
     * Poll for access token after user authorizes
     */
    async pollForAccessToken(deviceData) {
        const interval = deviceData.interval || 5;
        const expiresAt = Date.now() + (deviceData.expires_in * 1000);
        
        return new Promise((resolve, reject) => {
            this.deviceFlowPolling = setInterval(async () => {
                // Check if expired
                if (Date.now() > expiresAt) {
                    this.cancelDeviceFlow();
                    reject(new Error('Authorization timed out. Please try again.'));
                    return;
                }
                
                try {
                    const response = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: CONFIG.GITHUB_CLIENT_ID,
                            device_code: deviceData.device_code,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.access_token) {
                        // Success!
                        this.cancelDeviceFlow();
                        await this.setAccessToken(data.access_token);
                        this.hideDeviceFlowModal();
                        resolve(data.access_token);
                        
                        // Refresh the page to show logged in state
                        window.location.reload();
                    } else if (data.error === 'authorization_pending') {
                        // User hasn't authorized yet, keep polling
                    } else if (data.error === 'slow_down') {
                        // We're polling too fast, GitHub will tell us to slow down
                    } else if (data.error) {
                        this.cancelDeviceFlow();
                        reject(new Error(data.error_description || data.error));
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, interval * 1000);
        });
    }
    
    /**
     * Handle OAuth callback (fallback method)
     */
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
            throw new Error(`OAuth error: ${urlParams.get('error_description') || error}`);
        }
        
        if (!code) {
            throw new Error('No authorization code received');
        }
        
        return code;
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
