/**
 * GitAudit Configuration
 * 
 * For GitHub Pages deployment, we use GitHub OAuth with a device flow
 * or GitHub Apps OAuth for authentication.
 * 
 * Note: For production, you'll need to:
 * 1. Create a GitHub OAuth App at https://github.com/settings/developers
 * 2. Set the callback URL to your GitHub Pages URL
 * 3. Replace the CLIENT_ID below with your app's client ID
 */

const CONFIG = {
    // GitHub App Configuration
    // App: https://github.com/apps/gitauditer
    GITHUB_CLIENT_ID: 'Iv23li0msqAaBhGTV9Pa',
    
    // GitHub Pages URL
    CALLBACK_URL: 'https://nagusame.github.io/GitAudit/callback.html',
    
    // GitHub API Base URL
    GITHUB_API_BASE: 'https://api.github.com',
    
    // GitAudit Repository Info (for creating branches with fixes)
    GITAUDIT_REPO: {
        owner: 'NagusameCS',
        repo: 'GitAudit'
    },
    
    // Audit Configuration
    AUDIT: {
        // Maximum file size to analyze (in bytes) - 1MB
        MAX_FILE_SIZE: 1024 * 1024,
        
        // File extensions to analyze
        SUPPORTED_EXTENSIONS: [
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
            '.py', '.rb', '.php', '.java', '.kt', '.go', '.rs',
            '.c', '.cpp', '.h', '.hpp', '.cs',
            '.html', '.css', '.scss', '.sass', '.less',
            '.json', '.yaml', '.yml', '.xml', '.toml',
            '.md', '.txt', '.sh', '.bash', '.zsh',
            '.sql', '.graphql', '.prisma',
            '.env', '.gitignore', '.dockerignore',
            'Dockerfile', 'Makefile', 'Gemfile', 'Cargo.toml', 'package.json'
        ],
        
        // Files/directories to skip
        IGNORE_PATTERNS: [
            'node_modules',
            'vendor',
            'dist',
            'build',
            '.git',
            '.next',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            '.nyc_output',
            'target',
            'bin',
            'obj'
        ],
        
        // Binary file extensions to skip
        BINARY_EXTENSIONS: [
            '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.mp3', '.mp4', '.wav', '.avi', '.mov',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.zip', '.tar', '.gz', '.rar', '.7z',
            '.exe', '.dll', '.so', '.dylib'
        ]
    },
    
    // Demo mode configuration
    DEMO: {
        enabled: false,
        sampleRepo: 'octocat/Hello-World'
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'gitaudit_access_token',
        USER_DATA: 'gitaudit_user_data',
        LAST_AUDIT: 'gitaudit_last_audit'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.AUDIT);
Object.freeze(CONFIG.DEMO);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.GITAUDIT_REPO);
