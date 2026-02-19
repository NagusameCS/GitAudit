/**
 * GitAudit CLI — Configuration
 */

const CONFIG = {
    GITHUB_API_BASE: 'https://api.github.com',

    AUDIT: {
        // Maximum file size to analyze (1 MB)
        MAX_FILE_SIZE: 1024 * 1024,

        // Maximum files before warning
        MAX_FILES_WARN: 5000,

        // Batch size for GitHub API requests (avoid rate-limiting)
        GITHUB_BATCH_SIZE: 5,
    },

    SCORE_WEIGHTS: {
        security: 0.35,
        performance: 0.25,
        quality: 0.25,
        cleanliness: 0.15,
    },
};

module.exports = CONFIG;
