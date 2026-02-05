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
            
            // For GitHub Pages, we need a backend to exchange the code for a token
            // Show message to user
            ui.showAlert(
                'OAuth callback received. To complete authentication, you need to set up a backend service to exchange the code for an access token. ' +
                'For now, you can use the demo mode to explore GitAudit.'
            );
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
