/**
 * GitAudit CLI — Local File Scanner
 * Recursively walks a directory and yields files to analyze
 */

const fs = require('fs');
const path = require('path');
const { shouldIgnoreDir, isBinaryFile, getLanguage } = require('./languages');
const CONFIG = require('./config');

class LocalScanner {
    /**
     * Collect all analyzable file paths from a directory
     * @param {string} rootDir  Absolute path to scan
     * @returns {{ files: Array<{path: string, relativePath: string, size: number}>, skipped: number }}
     */
    scan(rootDir) {
        const results = [];
        let skipped = 0;
        const self = this;

        function walk(dir, rel) {
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return; // permission denied, etc.
            }

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = rel ? `${rel}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    if (!shouldIgnoreDir(entry.name)) {
                        walk(fullPath, relPath);
                    } else {
                        skipped++;
                    }
                } else if (entry.isFile()) {
                    if (isBinaryFile(fullPath)) {
                        skipped++;
                        continue;
                    }

                    const lang = getLanguage(fullPath);
                    if (lang.family === 'other') {
                        skipped++;
                        continue;
                    }

                    let size;
                    try {
                        size = fs.statSync(fullPath).size;
                    } catch {
                        skipped++;
                        continue;
                    }

                    if (size > CONFIG.AUDIT.MAX_FILE_SIZE) {
                        skipped++;
                        continue;
                    }

                    results.push({ path: fullPath, relativePath: relPath, size });
                }
            }
        }

        walk(rootDir, '');
        return { files: results, skipped };
    }

    /**
     * Read file content, returning null on error
     */
    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch {
            return null;
        }
    }
}

module.exports = LocalScanner;
