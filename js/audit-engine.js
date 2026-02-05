/**
 * GitAudit Audit Engine
 * Comprehensive code analysis engine that runs entirely client-side
 */

class AuditEngine {
    constructor() {
        this.issues = [];
        this.files = [];
        this.statistics = {
            totalFiles: 0,
            totalLines: 0,
            analyzedFiles: 0,
            analyzedLines: 0,
            languages: {}
        };
        this.scores = {
            security: 100,
            performance: 100,
            quality: 100,
            cleanliness: 100,
            overall: 100
        };
        this.progressCallback = null;
        this.cancelled = false;
    }
    
    /**
     * Run full audit on a repository
     */
    async audit(owner, repo, onProgress) {
        this.reset();
        this.progressCallback = onProgress;
        
        try {
            // Phase 1: Fetch repository structure
            await this.updateProgress(0, 'Fetching repository structure...');
            const tree = await githubAPI.getRepoTree(owner, repo);
            
            if (!tree.tree) {
                throw new Error('Unable to fetch repository structure');
            }
            
            // Filter files to analyze
            const filesToAnalyze = tree.tree.filter(item => 
                item.type === 'blob' && this.shouldAnalyze(item.path)
            );
            
            this.statistics.totalFiles = filesToAnalyze.length;
            
            // Phase 2: Analyze each file
            await this.updateProgress(10, 'Analyzing files...');
            
            const defaultBranch = await githubAPI.getDefaultBranch(owner, repo);
            const batchSize = 5; // Process files in batches to avoid rate limiting
            
            for (let i = 0; i < filesToAnalyze.length && !this.cancelled; i += batchSize) {
                const batch = filesToAnalyze.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (file) => {
                    try {
                        const content = await githubAPI.getFileContent(owner, repo, file.path, defaultBranch);
                        await this.analyzeFile(file.path, content);
                    } catch (error) {
                        console.warn(`Failed to analyze ${file.path}:`, error);
                    }
                }));
                
                const progress = 10 + ((i / filesToAnalyze.length) * 70);
                await this.updateProgress(progress, `Analyzing files... (${Math.min(i + batchSize, filesToAnalyze.length)}/${filesToAnalyze.length})`);
            }
            
            if (this.cancelled) {
                throw new Error('Audit cancelled');
            }
            
            // Phase 3: Cross-file analysis
            await this.updateProgress(80, 'Performing cross-file analysis...');
            await this.crossFileAnalysis();
            
            // Phase 4: Calculate scores
            await this.updateProgress(90, 'Calculating scores...');
            this.calculateScores();
            
            // Phase 5: Generate report
            await this.updateProgress(95, 'Generating report...');
            const report = this.generateReport(owner, repo);
            
            await this.updateProgress(100, 'Complete!');
            
            return report;
            
        } catch (error) {
            console.error('Audit failed:', error);
            throw error;
        }
    }
    
    /**
     * Reset audit state
     */
    reset() {
        this.issues = [];
        this.files = [];
        this.statistics = {
            totalFiles: 0,
            totalLines: 0,
            analyzedFiles: 0,
            analyzedLines: 0,
            languages: {}
        };
        this.scores = {
            security: 100,
            performance: 100,
            quality: 100,
            cleanliness: 100,
            overall: 100
        };
        this.cancelled = false;
    }
    
    /**
     * Cancel ongoing audit
     */
    cancel() {
        this.cancelled = true;
    }
    
    /**
     * Update progress
     */
    async updateProgress(percent, status) {
        if (this.progressCallback) {
            this.progressCallback({
                percent,
                status,
                filesProcessed: this.statistics.analyzedFiles,
                linesProcessed: this.statistics.analyzedLines
            });
        }
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    /**
     * Check if file should be analyzed
     */
    shouldAnalyze(path) {
        // Check ignore patterns
        for (const pattern of CONFIG.AUDIT.IGNORE_PATTERNS) {
            if (path.includes(pattern)) {
                return false;
            }
        }
        
        // Check binary extensions
        for (const ext of CONFIG.AUDIT.BINARY_EXTENSIONS) {
            if (path.toLowerCase().endsWith(ext)) {
                return false;
            }
        }
        
        // Check supported extensions
        const extension = this.getExtension(path);
        return CONFIG.AUDIT.SUPPORTED_EXTENSIONS.some(ext => 
            path.endsWith(ext) || path === ext
        );
    }
    
    /**
     * Get file extension
     */
    getExtension(path) {
        const parts = path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
    }
    
    /**
     * Get language from file extension
     */
    getLanguage(path) {
        const ext = this.getExtension(path).toLowerCase();
        const languageMap = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript (React)',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript (React)',
            '.vue': 'Vue',
            '.svelte': 'Svelte',
            '.py': 'Python',
            '.rb': 'Ruby',
            '.php': 'PHP',
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.go': 'Go',
            '.rs': 'Rust',
            '.c': 'C',
            '.cpp': 'C++',
            '.h': 'C/C++ Header',
            '.hpp': 'C++ Header',
            '.cs': 'C#',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.sass': 'Sass',
            '.less': 'Less',
            '.json': 'JSON',
            '.yaml': 'YAML',
            '.yml': 'YAML',
            '.xml': 'XML',
            '.toml': 'TOML',
            '.md': 'Markdown',
            '.sh': 'Shell',
            '.bash': 'Bash',
            '.sql': 'SQL',
            '.graphql': 'GraphQL'
        };
        
        return languageMap[ext] || 'Other';
    }
    
    /**
     * Analyze a single file
     */
    async analyzeFile(path, content) {
        const lines = content.split('\n');
        const language = this.getLanguage(path);
        
        // Update statistics
        this.statistics.analyzedFiles++;
        this.statistics.analyzedLines += lines.length;
        this.statistics.languages[language] = (this.statistics.languages[language] || 0) + 1;
        
        // Store file info
        this.files.push({
            path,
            language,
            lines: lines.length,
            size: content.length
        });
        
        // Run all analyzers
        await this.runSecurityAnalysis(path, content, lines);
        await this.runPerformanceAnalysis(path, content, lines, language);
        await this.runQualityAnalysis(path, content, lines, language);
        await this.runUnusedCodeAnalysis(path, content, lines, language);
    }
    
    /**
     * Security Analysis
     */
    async runSecurityAnalysis(path, content, lines) {
        // Check for exposed secrets/API keys
        const secretPatterns = [
            { pattern: /['"`](?:api[_-]?key|apikey)['"`]\s*[:=]\s*['"`]([^'"`]+)['"`]/gi, type: 'API Key' },
            { pattern: /['"`](?:secret|password|passwd|pwd)['"`]\s*[:=]\s*['"`]([^'"`]+)['"`]/gi, type: 'Secret/Password' },
            { pattern: /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*['"`]?([A-Z0-9]+)['"`]?/gi, type: 'AWS Credentials' },
            { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, type: 'AWS Access Key ID' },
            { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: 'GitHub Personal Access Token' },
            { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, type: 'GitHub Fine-grained Token' },
            { pattern: /sk-[a-zA-Z0-9]{48}/g, type: 'OpenAI API Key' },
            { pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g, type: 'Slack Token' },
            { pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g, type: 'Private Key' },
            { pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s]+/gi, type: 'MongoDB Connection String' },
            { pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s]+/gi, type: 'PostgreSQL Connection String' },
            { pattern: /mysql:\/\/[^:]+:[^@]+@[^\s]+/gi, type: 'MySQL Connection String' }
        ];
        
        for (const { pattern, type } of secretPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'security',
                    severity: 'critical',
                    title: `Exposed ${type}`,
                    description: `A ${type.toLowerCase()} appears to be hardcoded in the source code. This is a serious security risk as it can be exposed in version control.`,
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Move this to environment variables or a secure secrets manager.',
                        code: `// Use environment variable\nconst apiKey = process.env.${type.toUpperCase().replace(/[^A-Z]/g, '_')};`
                    }
                });
            }
        }
        
        // Check for SQL injection vulnerabilities
        const sqlInjectionPatterns = [
            /(?:query|execute)\s*\(\s*['"`].*\$\{.*\}.*['"`]/gi,
            /(?:query|execute)\s*\(\s*['"`].*\+\s*\w+\s*\+.*['"`]/gi,
            /`SELECT.*\$\{.*\}.*`/gi,
            /`INSERT.*\$\{.*\}.*`/gi,
            /`UPDATE.*\$\{.*\}.*`/gi,
            /`DELETE.*\$\{.*\}.*`/gi
        ];
        
        for (const pattern of sqlInjectionPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'security',
                    severity: 'critical',
                    title: 'Potential SQL Injection',
                    description: 'String concatenation or template literals used in SQL query. This can lead to SQL injection attacks.',
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Use parameterized queries or prepared statements.',
                        code: `// Use parameterized query\nawait db.query('SELECT * FROM users WHERE id = ?', [userId]);`
                    }
                });
            }
        }
        
        // Check for eval usage
        if (/\beval\s*\(/g.test(content)) {
            let match;
            const evalPattern = /\beval\s*\(/g;
            while ((match = evalPattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'security',
                    severity: 'critical',
                    title: 'Use of eval()',
                    description: 'eval() executes arbitrary code and is a major security risk, especially with user input.',
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Avoid eval(). Use JSON.parse() for JSON data or Function constructor as last resort.',
                        code: '// Parse JSON\nconst data = JSON.parse(jsonString);'
                    }
                });
            }
        }
        
        // Check for innerHTML with user input
        const innerHTMLPattern = /\.innerHTML\s*=\s*(?!['"`])/g;
        let match;
        while ((match = innerHTMLPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'security',
                severity: 'warning',
                title: 'Potential XSS via innerHTML',
                description: 'Using innerHTML with dynamic content can lead to Cross-Site Scripting (XSS) attacks.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 1),
                suggestion: {
                    text: 'Use textContent for plain text or sanitize HTML input.',
                    code: '// Safe alternative\nelement.textContent = userInput;\n// Or sanitize HTML\nelement.innerHTML = DOMPurify.sanitize(htmlContent);'
                }
            });
        }
        
        // Check for weak crypto
        const weakCryptoPatterns = [
            { pattern: /crypto\.createHash\s*\(\s*['"`]md5['"`]/gi, algo: 'MD5' },
            { pattern: /crypto\.createHash\s*\(\s*['"`]sha1['"`]/gi, algo: 'SHA1' },
            { pattern: /hashlib\.md5/gi, algo: 'MD5 (Python)' },
            { pattern: /hashlib\.sha1/gi, algo: 'SHA1 (Python)' }
        ];
        
        for (const { pattern, algo } of weakCryptoPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'security',
                    severity: 'warning',
                    title: `Weak Cryptographic Algorithm: ${algo}`,
                    description: `${algo} is considered cryptographically weak and should not be used for security-sensitive operations.`,
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Use SHA-256 or stronger algorithms.',
                        code: "const hash = crypto.createHash('sha256').update(data).digest('hex');"
                    }
                });
            }
        }
        
        // Check for hardcoded IP addresses
        const ipPattern = /['"`](\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})['"`]/g;
        while ((match = ipPattern.exec(content)) !== null) {
            if (!match[1].startsWith('127.') && !match[1].startsWith('0.') && match[1] !== '255.255.255.255') {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'security',
                    severity: 'info',
                    title: 'Hardcoded IP Address',
                    description: 'IP addresses should be configured externally for flexibility and security.',
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Move IP addresses to configuration or environment variables.',
                        code: 'const serverIP = process.env.SERVER_IP || config.serverIP;'
                    }
                });
            }
        }
    }
    
    /**
     * Performance Analysis
     */
    async runPerformanceAnalysis(path, content, lines, language) {
        // Check for inefficient loops
        const inefficientLoopPatterns = [
            {
                pattern: /for\s*\([^)]*\.length[^)]*\)/g,
                title: 'Array length accessed in loop condition',
                description: 'Accessing .length in each iteration can be slightly inefficient for large arrays.',
                suggestion: {
                    text: 'Cache the length before the loop.',
                    code: 'const len = array.length;\nfor (let i = 0; i < len; i++) { ... }'
                }
            }
        ];
        
        for (const { pattern, title, description, suggestion } of inefficientLoopPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'performance',
                    severity: 'info',
                    title,
                    description,
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion
                });
            }
        }
        
        // Check for consecutive array operations that could be combined
        const chainableOperations = /\.(?:filter|map)\([^)]+\)\s*\.(?:filter|map)\([^)]+\)/g;
        let match;
        while ((match = chainableOperations.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'info',
                title: 'Multiple Array Iterations',
                description: 'Chained filter/map operations iterate the array multiple times. Consider using reduce for a single pass.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 2),
                suggestion: {
                    text: 'Combine operations with reduce for better performance on large arrays.',
                    code: 'const result = array.reduce((acc, item) => {\n  if (condition) acc.push(transform(item));\n  return acc;\n}, []);'
                }
            });
        }
        
        // Check for synchronous file operations in Node.js
        const syncFsPatterns = /(?:readFileSync|writeFileSync|appendFileSync|existsSync|statSync|readdirSync)/g;
        while ((match = syncFsPatterns.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'warning',
                title: 'Synchronous File System Operation',
                description: 'Synchronous file operations block the event loop and can cause performance issues in production.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 1),
                suggestion: {
                    text: 'Use asynchronous versions with async/await.',
                    code: 'const data = await fs.promises.readFile(path, "utf-8");'
                }
            });
        }
        
        // Check for nested loops with O(n²) or worse complexity
        const nestedLoopPattern = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)\s*\{/g;
        while ((match = nestedLoopPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'info',
                title: 'Nested Loop Detected',
                description: 'Nested loops can lead to O(n²) complexity. Consider if this can be optimized.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 4),
                suggestion: {
                    text: 'Consider using hash maps, Sets, or different algorithms to reduce complexity.',
                    code: '// Example: Use a Set for O(1) lookups\nconst itemSet = new Set(items);\narray.filter(x => itemSet.has(x));'
                }
            });
        }
        
        // Check for redundant operations in loops (JIT-style optimization suggestions)
        this.detectRedundantLoopOperations(path, content, lines);
        
        // Check for string concatenation in loops
        const stringConcatInLoop = /(?:for|while)\s*\([^)]*\)\s*\{[^}]*(?:\+=\s*['"`]|['"`]\s*\+\s*['"`])/g;
        while ((match = stringConcatInLoop.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'warning',
                title: 'String Concatenation in Loop',
                description: 'String concatenation in loops creates many intermediate strings. Use array.join() for better performance.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 3),
                suggestion: {
                    text: 'Collect strings in an array and join at the end.',
                    code: 'const parts = [];\nfor (...) { parts.push(str); }\nconst result = parts.join("");'
                }
            });
        }
        
        // Check for console.log in production code
        const consolePattern = /console\.(log|debug|info)\s*\(/g;
        while ((match = consolePattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'info',
                title: 'Console Statement',
                description: 'Console statements should be removed or disabled in production code.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 1),
                suggestion: {
                    text: 'Use a proper logging library with log levels or remove console statements.',
                    code: '// Use a logging library\nlogger.debug("message");'
                }
            });
        }
    }
    
    /**
     * Detect redundant operations that could be simplified (JIT-style)
     */
    detectRedundantLoopOperations(path, content, lines) {
        // Pattern: Loop that just increments by 1 each iteration
        const incrementPattern = /for\s*\(\s*(?:let|var)\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\+\+\s*\)\s*\{[^{}]*(\w+)\s*(?:\+\+|\+=\s*1)[^{}]*\}/g;
        let match;
        while ((match = incrementPattern.exec(content)) !== null) {
            const start = parseInt(match[2]);
            const end = parseInt(match[3]);
            const iterations = end - start;
            const lineNumber = this.getLineNumber(content, match.index);
            
            this.addIssue({
                type: 'performance',
                severity: 'info',
                title: 'Simplifiable Loop Operation',
                description: `This loop runs ${iterations} times and increments a counter by 1 each time. This can be simplified.`,
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 3),
                suggestion: {
                    text: `Replace the loop with a direct addition of ${iterations}.`,
                    code: `${match[4]} += ${iterations}; // Instead of looping ${iterations} times`
                }
            });
        }
        
        // Pattern: Repeated identical operations
        const repeatedOpPattern = /(\w+\([^)]*\));\s*(?:\1;\s*){2,}/g;
        while ((match = repeatedOpPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'performance',
                severity: 'info',
                title: 'Repeated Identical Operation',
                description: 'The same function call is repeated multiple times. Consider if this is intentional.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 2),
                suggestion: {
                    text: 'If the operation is expensive and returns the same result, cache it.',
                    code: 'const result = expensiveOperation();\n// Use result multiple times'
                }
            });
        }
    }
    
    /**
     * Code Quality Analysis
     */
    async runQualityAnalysis(path, content, lines, language) {
        // Check for very long lines
        lines.forEach((line, index) => {
            if (line.length > 120 && !line.trim().startsWith('//') && !line.includes('http')) {
                this.addIssue({
                    type: 'quality',
                    severity: 'info',
                    title: 'Line Too Long',
                    description: `Line exceeds 120 characters (${line.length} chars). Consider breaking it up for readability.`,
                    file: path,
                    line: index + 1,
                    code: line.substring(0, 80) + '...'
                });
            }
        });
        
        // Check for very long functions
        this.detectLongFunctions(path, content, lines, language);
        
        // Check for magic numbers
        const magicNumberPattern = /(?<![.\w])(?<!['"`])(\d{2,})(?!['"`])(?![.\w])/g;
        let match;
        while ((match = magicNumberPattern.exec(content)) !== null) {
            const num = parseInt(match[1]);
            // Ignore common numbers like ports, status codes, etc.
            const commonNumbers = [80, 443, 8080, 3000, 5000, 200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 100, 1000];
            if (!commonNumbers.includes(num) && num > 10) {
                const lineNumber = this.getLineNumber(content, match.index);
                const line = lines[lineNumber - 1] || '';
                
                // Skip if it's in a comment or string definition
                if (!line.includes('const') && !line.includes('let') && !line.includes('var') && 
                    !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                    this.addIssue({
                        type: 'quality',
                        severity: 'info',
                        title: 'Magic Number',
                        description: `The number ${num} appears without explanation. Consider using a named constant.`,
                        file: path,
                        line: lineNumber,
                        code: this.getCodeContext(lines, lineNumber, 1),
                        suggestion: {
                            text: 'Define a named constant for clarity.',
                            code: `const MEANINGFUL_NAME = ${num};\n// Use MEANINGFUL_NAME instead`
                        }
                    });
                }
            }
        }
        
        // Check for missing error handling
        const asyncWithoutCatch = /async\s+(?:function\s+\w+|\(\w*\))\s*(?:=>)?\s*\{[^{}]*await\s+[^{}]*\}/g;
        // This is a simplified check - would need more sophisticated parsing for accuracy
        
        // Check for TODO/FIXME/HACK comments
        const todoPatterns = [
            { pattern: /\/\/\s*TODO[:\s](.+)/gi, type: 'TODO' },
            { pattern: /\/\/\s*FIXME[:\s](.+)/gi, type: 'FIXME' },
            { pattern: /\/\/\s*HACK[:\s](.+)/gi, type: 'HACK' },
            { pattern: /\/\/\s*XXX[:\s](.+)/gi, type: 'XXX' },
            { pattern: /#\s*TODO[:\s](.+)/gi, type: 'TODO (Python)' }
        ];
        
        for (const { pattern, type } of todoPatterns) {
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'quality',
                    severity: type === 'FIXME' || type === 'HACK' ? 'warning' : 'info',
                    title: `${type} Comment Found`,
                    description: match[1].trim(),
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 0)
                });
            }
        }
        
        // Check for poor naming (very short variable names in production code)
        const shortVarPattern = /(?:let|const|var)\s+([a-z])\s*=/g;
        while ((match = shortVarPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            // Ignore common short names in loops
            if (!['i', 'j', 'k', 'x', 'y', 'z', 'e', '_'].includes(match[1])) {
                this.addIssue({
                    type: 'quality',
                    severity: 'info',
                    title: 'Non-descriptive Variable Name',
                    description: `Single-letter variable "${match[1]}" is not descriptive. Use meaningful names for clarity.`,
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Use descriptive names that explain the variable\'s purpose.',
                        code: '// Example: const userCount = 5; instead of const c = 5;'
                    }
                });
            }
        }
        
        // Check for commented-out code
        const commentedCodePatterns = [
            /\/\/\s*(?:const|let|var|function|if|for|while|return|import|export)\s+/g,
            /\/\*[\s\S]*?(?:const|let|var|function|if|for|while|return)\s+[\s\S]*?\*\//g
        ];
        
        for (const pattern of commentedCodePatterns) {
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = this.getLineNumber(content, match.index);
                this.addIssue({
                    type: 'quality',
                    severity: 'info',
                    title: 'Commented-out Code',
                    description: 'Commented-out code should be removed. Use version control to track old code.',
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1)
                });
            }
        }
        
        // Check for lack of JSDoc/comments on exported functions
        this.checkDocumentation(path, content, lines, language);
    }
    
    /**
     * Detect long functions
     */
    detectLongFunctions(path, content, lines, language) {
        const functionPatterns = [
            /(?:function\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?function|(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g
        ];
        
        let braceCount = 0;
        let inFunction = false;
        let functionStart = 0;
        let functionName = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Simple function detection (would need proper parsing for accuracy)
            if (!inFunction) {
                const funcMatch = line.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=.*(?:function|=>))/);
                if (funcMatch) {
                    inFunction = true;
                    functionStart = i;
                    functionName = funcMatch[1] || funcMatch[2] || 'anonymous';
                    braceCount = 0;
                }
            }
            
            if (inFunction) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                
                if (braceCount === 0 && i > functionStart) {
                    const functionLength = i - functionStart + 1;
                    if (functionLength > 50) {
                        this.addIssue({
                            type: 'quality',
                            severity: 'warning',
                            title: 'Long Function',
                            description: `Function "${functionName}" is ${functionLength} lines long. Consider breaking it into smaller functions.`,
                            file: path,
                            line: functionStart + 1,
                            code: `function ${functionName}() { ... } // ${functionLength} lines`,
                            suggestion: {
                                text: 'Extract logical blocks into separate, well-named functions.',
                                code: '// Break into smaller functions\nfunction processData() { ... }\nfunction validateInput() { ... }'
                            }
                        });
                    }
                    inFunction = false;
                }
            }
        }
    }
    
    /**
     * Check for documentation
     */
    checkDocumentation(path, content, lines, language) {
        // Check for exported functions without JSDoc
        const exportPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
        let match;
        
        while ((match = exportPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            const prevLine = lines[lineNumber - 2] || '';
            
            if (!prevLine.includes('*/') && !prevLine.includes('//')) {
                this.addIssue({
                    type: 'quality',
                    severity: 'info',
                    title: 'Missing Documentation',
                    description: `Exported function "${match[1]}" lacks documentation. Add JSDoc for better maintainability.`,
                    file: path,
                    line: lineNumber,
                    code: this.getCodeContext(lines, lineNumber, 1),
                    suggestion: {
                        text: 'Add JSDoc documentation.',
                        code: `/**\n * Description of ${match[1]}\n * @param {type} param - Description\n * @returns {type} Description\n */`
                    }
                });
            }
        }
    }
    
    /**
     * Unused Code Analysis
     */
    async runUnusedCodeAnalysis(path, content, lines, language) {
        // Track defined but unused variables
        const definitions = new Map();
        const usages = new Set();
        
        // Find variable definitions
        const defPatterns = [
            /(?:const|let|var)\s+(\w+)\s*=/g,
            /function\s+(\w+)\s*\(/g,
            /(\w+)\s*:\s*(?:function|\([^)]*\)\s*=>)/g
        ];
        
        for (const pattern of defPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1];
                const lineNumber = this.getLineNumber(content, match.index);
                definitions.set(name, { line: lineNumber, used: false });
            }
        }
        
        // Find usages (simplified - proper static analysis would be more accurate)
        definitions.forEach((info, name) => {
            // Count occurrences of the variable name
            const regex = new RegExp(`\\b${name}\\b`, 'g');
            const matches = content.match(regex) || [];
            
            // If it appears more than once (definition + usage), it's used
            if (matches.length > 1) {
                info.used = true;
            }
        });
        
        // Report unused variables
        definitions.forEach((info, name) => {
            if (!info.used && name !== '_' && !name.startsWith('_')) {
                this.addIssue({
                    type: 'unused',
                    severity: 'warning',
                    title: 'Potentially Unused Variable',
                    description: `"${name}" appears to be defined but not used in this file.`,
                    file: path,
                    line: info.line,
                    code: this.getCodeContext(lines, info.line, 1),
                    suggestion: {
                        text: 'Remove unused variables or prefix with underscore if intentionally unused.',
                        code: `// Remove or prefix with _\nconst _${name} = value;`
                    }
                });
            }
        });
        
        // Check for unused imports
        const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
        let match;
        while ((match = importPattern.exec(content)) !== null) {
            const imports = (match[1] || match[2]).split(',').map(s => s.trim().split(' as ').pop().trim());
            
            for (const imp of imports) {
                if (imp) {
                    const usageRegex = new RegExp(`\\b${imp}\\b`, 'g');
                    const usages = content.match(usageRegex) || [];
                    
                    // Import statement counts as one usage
                    if (usages.length <= 1) {
                        const lineNumber = this.getLineNumber(content, match.index);
                        this.addIssue({
                            type: 'unused',
                            severity: 'warning',
                            title: 'Unused Import',
                            description: `"${imp}" is imported but never used.`,
                            file: path,
                            line: lineNumber,
                            code: this.getCodeContext(lines, lineNumber, 0),
                            suggestion: {
                                text: 'Remove the unused import.',
                                code: '// Remove unused import'
                            }
                        });
                    }
                }
            }
        }
        
        // Check for empty catch blocks
        const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
        while ((match = emptyCatchPattern.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            this.addIssue({
                type: 'quality',
                severity: 'warning',
                title: 'Empty Catch Block',
                description: 'Empty catch blocks silently swallow errors. At minimum, log the error.',
                file: path,
                line: lineNumber,
                code: this.getCodeContext(lines, lineNumber, 1),
                suggestion: {
                    text: 'Handle or log the error.',
                    code: 'catch (error) {\n  console.error("Error:", error);\n  // Handle appropriately\n}'
                }
            });
        }
    }
    
    /**
     * Cross-file analysis
     */
    async crossFileAnalysis() {
        // Track exports and imports across files
        const exports = new Map();
        const imports = new Map();
        
        // This is a simplified version - full implementation would track actual module resolution
        
        // Look for files that might be dead (not imported anywhere)
        const allPaths = this.files.map(f => f.path);
        const referencedFiles = new Set();
        
        for (const file of this.files) {
            // Check if this file is imported by any other file
            const filename = file.path.split('/').pop().replace(/\.[^.]+$/, '');
            
            // Check if any issue references this file
            const isReferenced = allPaths.some(p => {
                if (p === file.path) return false;
                // Would need to parse actual imports for accuracy
                return false;
            });
        }
        
        // Check for duplicate code patterns (simplified)
        // Full implementation would use proper AST comparison
    }
    
    /**
     * Calculate overall scores
     */
    calculateScores() {
        const securityIssues = this.issues.filter(i => i.type === 'security');
        const performanceIssues = this.issues.filter(i => i.type === 'performance');
        const qualityIssues = this.issues.filter(i => i.type === 'quality');
        const unusedIssues = this.issues.filter(i => i.type === 'unused');
        
        // Calculate scores based on issue count and severity
        const calculateScore = (issues, maxPenalty = 50) => {
            let penalty = 0;
            issues.forEach(issue => {
                switch (issue.severity) {
                    case 'critical': penalty += 15; break;
                    case 'warning': penalty += 5; break;
                    case 'info': penalty += 1; break;
                }
            });
            return Math.max(0, 100 - Math.min(penalty, maxPenalty));
        };
        
        this.scores.security = calculateScore(securityIssues, 60);
        this.scores.performance = calculateScore(performanceIssues, 40);
        this.scores.quality = calculateScore(qualityIssues, 40);
        this.scores.cleanliness = calculateScore(unusedIssues, 30);
        
        // Overall score is weighted average
        this.scores.overall = Math.round(
            (this.scores.security * 0.35) +
            (this.scores.performance * 0.25) +
            (this.scores.quality * 0.25) +
            (this.scores.cleanliness * 0.15)
        );
    }
    
    /**
     * Generate final report
     */
    generateReport(owner, repo) {
        return {
            repository: `${owner}/${repo}`,
            timestamp: new Date().toISOString(),
            statistics: {
                ...this.statistics,
                totalIssues: this.issues.length,
                criticalIssues: this.issues.filter(i => i.severity === 'critical').length,
                warnings: this.issues.filter(i => i.severity === 'warning').length,
                suggestions: this.issues.filter(i => i.severity === 'info').length
            },
            scores: this.scores,
            issues: this.issues,
            files: this.files,
            summary: this.generateSummary()
        };
    }
    
    /**
     * Generate summary text
     */
    generateSummary() {
        const criticalCount = this.issues.filter(i => i.severity === 'critical').length;
        const warningCount = this.issues.filter(i => i.severity === 'warning').length;
        
        let summary = `Analyzed ${this.statistics.analyzedFiles} files with ${this.statistics.analyzedLines.toLocaleString()} lines of code. `;
        
        if (criticalCount > 0) {
            summary += `Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} that require immediate attention. `;
        }
        
        if (warningCount > 0) {
            summary += `Identified ${warningCount} warning${warningCount > 1 ? 's' : ''} that should be reviewed. `;
        }
        
        if (this.scores.overall >= 80) {
            summary += 'Overall, the codebase is in good shape.';
        } else if (this.scores.overall >= 60) {
            summary += 'The codebase has room for improvement.';
        } else {
            summary += 'The codebase needs significant attention.';
        }
        
        return summary;
    }
    
    /**
     * Add an issue to the list
     */
    addIssue(issue) {
        // Prevent duplicate issues
        const isDuplicate = this.issues.some(i => 
            i.file === issue.file && 
            i.line === issue.line && 
            i.title === issue.title
        );
        
        if (!isDuplicate) {
            this.issues.push({
                id: this.issues.length + 1,
                ...issue
            });
        }
    }
    
    /**
     * Get line number from character index
     */
    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }
    
    /**
     * Get code context around a line
     */
    getCodeContext(lines, lineNumber, contextLines = 2) {
        const start = Math.max(0, lineNumber - contextLines - 1);
        const end = Math.min(lines.length, lineNumber + contextLines);
        
        return lines.slice(start, end).map((line, i) => ({
            number: start + i + 1,
            content: line,
            highlight: start + i + 1 === lineNumber
        }));
    }
}

// Export singleton instance
const auditEngine = new AuditEngine();
