/**
 * GitAudit Main Application
 * Entry point and initialization
 */

(function() {
    'use strict';
    
    // Initialize application when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('GitAudit initializing...');
        
        // Initialize UI controller
        ui.init();
        
        // Handle OAuth callback if on callback page
        handleOAuthCallback();
        
        // Add gradient definition for score circle
        addSVGGradient();
        
        console.log('GitAudit ready!');
    });
    
    /**
     * Handle OAuth callback
     */
    function handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            // We have an auth code, handle the callback
            console.log('OAuth callback detected');
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Check if proxy is configured
            if (!CONFIG.OAUTH_PROXY_URL) {
                ui.showAlert(
                    'OAuth proxy not configured. Please deploy the Cloudflare Worker from worker/oauth-worker.js and update OAUTH_PROXY_URL in js/config.js'
                );
                return;
            }
            
            // Exchange code for token via proxy
            try {
                ui.showAlert('Completing sign in...', 'info');
                const token = await auth.handleCallback();
                await auth.setAccessToken(token);
                ui.hideAlert();
                ui.showAuthenticatedUI();
                ui.showAlert('Successfully signed in!', 'success');
            } catch (error) {
                console.error('OAuth callback error:', error);
                ui.showAlert(`Sign in failed: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * Add SVG gradient definition for score circle
     */
    function addSVGGradient() {
        const svgNS = 'http://www.w3.org/2000/svg';
        
        const scoreCircle = document.querySelector('.score-circle svg');
        if (!scoreCircle) return;
        
        // Create defs element
        const defs = document.createElementNS(svgNS, 'defs');
        
        // Create linear gradient
        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.setAttribute('id', 'score-gradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
        
        // Add color stops
        const stop1 = document.createElementNS(svgNS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#58a6ff');
        
        const stop2 = document.createElementNS(svgNS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#3fb950');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        
        // Insert at beginning of SVG
        scoreCircle.insertBefore(defs, scoreCircle.firstChild);
    }
    
    /**
     * Global error handler
     */
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    /**
     * Handle unhandled promise rejections
     */
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
    });
    
})();
