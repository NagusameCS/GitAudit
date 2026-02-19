/**
 * GitAudit CLI — Audit Engine
 * Comprehensive, language-aware code analysis that works for every language
 *
 * Ported from the web client audit-engine.js with massively expanded
 * language-specific rules so every family gets meaningful coverage.
 */

const { getLanguage } = require('./languages');

class AuditEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.issues = [];
        this.files = [];
        this.statistics = {
            totalFiles: 0,
            totalLines: 0,
            analyzedFiles: 0,
            analyzedLines: 0,
            languages: {},
        };
        this.scores = {
            security: 100,
            performance: 100,
            quality: 100,
            cleanliness: 100,
            overall: 100,
        };
    }

    /* ─────────────────────────────────────────────────────────────
       Public entry: analyse a single file
       ───────────────────────────────────────────────────────────── */

    analyzeFile(relativePath, content) {
        const lang = getLanguage(relativePath);
        const lines = content.split('\n');

        this.statistics.analyzedFiles++;
        this.statistics.analyzedLines += lines.length;
        this.statistics.languages[lang.name] =
            (this.statistics.languages[lang.name] || 0) + 1;

        this.files.push({
            path: relativePath,
            language: lang.name,
            family: lang.family,
            lines: lines.length,
            size: content.length,
        });

        // Run all analysis passes
        this.runSecurityAnalysis(relativePath, content, lines, lang);
        this.runPerformanceAnalysis(relativePath, content, lines, lang);
        this.runQualityAnalysis(relativePath, content, lines, lang);
        this.runUnusedCodeAnalysis(relativePath, content, lines, lang);
    }

    /* =============================================================
       SECURITY ANALYSIS
       ============================================================= */

    runSecurityAnalysis(path, content, lines, lang) {
        // ── Universal secret detection ──────────────────────────
        const secretPatterns = [
            { pattern: /['"`](?:api[_-]?key|apikey)['"`]\s*[:=]\s*['"`]([^'"`]{8,})['"`]/gi, type: 'API Key' },
            { pattern: /['"`](?:secret|password|passwd|pwd)['"`]\s*[:=]\s*['"`]([^'"`]{4,})['"`]/gi, type: 'Secret/Password' },
            { pattern: /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*['"`]?([A-Z0-9]{16,})['"`]?/gi, type: 'AWS Credentials' },
            { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, type: 'AWS Access Key ID' },
            { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: 'GitHub Personal Access Token' },
            { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, type: 'GitHub Fine-grained Token' },
            { pattern: /gho_[a-zA-Z0-9]{36}/g, type: 'GitHub OAuth Token' },
            { pattern: /ghs_[a-zA-Z0-9]{36}/g, type: 'GitHub Server Token' },
            { pattern: /sk-[a-zA-Z0-9]{48}/g, type: 'OpenAI API Key' },
            { pattern: /sk-ant-[a-zA-Z0-9-]{80,}/g, type: 'Anthropic API Key' },
            { pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g, type: 'Slack Token' },
            { pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g, type: 'Private Key' },
            { pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s'"`]+/gi, type: 'MongoDB Connection String' },
            { pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s'"`]+/gi, type: 'PostgreSQL Connection String' },
            { pattern: /mysql:\/\/[^:]+:[^@]+@[^\s'"`]+/gi, type: 'MySQL Connection String' },
            { pattern: /redis:\/\/[^:]*:[^@]+@[^\s'"`]+/gi, type: 'Redis Connection String' },
            { pattern: /amqp:\/\/[^:]+:[^@]+@[^\s'"`]+/gi, type: 'AMQP Connection String' },
            { pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, type: 'SendGrid API Key' },
            { pattern: /sq0[a-z]{3}-[0-9A-Za-z_-]{22,}/g, type: 'Square Token' },
            { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, type: 'Stripe Secret Key' },
            { pattern: /pk_live_[0-9a-zA-Z]{24,}/g, type: 'Stripe Publishable Key' },
            { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, type: 'JWT Token (hardcoded)' },
        ];

        this._matchAll(path, content, lines, secretPatterns, 'security', 'critical',
            (type) => `Exposed ${type}`,
            (type) => `A ${type.toLowerCase()} appears to be hardcoded. This is a serious security risk.`,
            'Move to environment variables or a secrets manager.');

        // ── SQL injection (multi-language) ──────────────────────
        const sqlFamilies = ['js', 'ts', 'python', 'ruby', 'php', 'java', 'kotlin',
            'csharp', 'go', 'rust', 'perl', 'elixir', 'groovy', 'scala'];
        if (sqlFamilies.includes(lang.family)) {
            this._runSqlInjection(path, content, lines, lang);
        }

        // ── eval / exec ─────────────────────────────────────────
        this._runDangerousFunctions(path, content, lines, lang);

        // ── XSS (HTML / JS families) ────────────────────────────
        if (['js', 'ts', 'html', 'php'].includes(lang.family)) {
            this._matchPattern(path, content, lines,
                /\.innerHTML\s*=\s*(?!['"`]<)/g,
                'security', 'warning', 'Potential XSS via innerHTML',
                'Dynamic content assigned to innerHTML can cause XSS.',
                'Use textContent or a sanitizer like DOMPurify.');
        }

        // ── Weak crypto ─────────────────────────────────────────
        const weakCrypto = [
            { pattern: /crypto\.createHash\s*\(\s*['"`]md5['"`]/gi, algo: 'MD5 (Node)' },
            { pattern: /crypto\.createHash\s*\(\s*['"`]sha1['"`]/gi, algo: 'SHA-1 (Node)' },
            { pattern: /hashlib\.md5/gi, algo: 'MD5 (Python)' },
            { pattern: /hashlib\.sha1/gi, algo: 'SHA-1 (Python)' },
            { pattern: /Digest::MD5/gi, algo: 'MD5 (Ruby)' },
            { pattern: /Digest::SHA1/gi, algo: 'SHA-1 (Ruby)' },
            { pattern: /md5\s*\(/gi, algo: 'MD5 (PHP)' },
            { pattern: /sha1\s*\(/gi, algo: 'SHA-1 (PHP)' },
            { pattern: /MessageDigest\.getInstance\s*\(\s*['"`]MD5['"`]/gi, algo: 'MD5 (Java)' },
            { pattern: /MessageDigest\.getInstance\s*\(\s*['"`]SHA-?1['"`]/gi, algo: 'SHA-1 (Java)' },
            { pattern: /md5\.New\(\)/gi, algo: 'MD5 (Go)' },
            { pattern: /sha1\.New\(\)/gi, algo: 'SHA-1 (Go)' },
            { pattern: /MD5\.Create\(\)/gi, algo: 'MD5 (C#)' },
            { pattern: /SHA1\.Create\(\)/gi, algo: 'SHA-1 (C#)' },
            { pattern: /Md5::compute/gi, algo: 'MD5 (Rust)' },
            { pattern: /CC_MD5\b/g, algo: 'MD5 (C/Obj-C)' },
            { pattern: /CC_SHA1\b/g, algo: 'SHA-1 (C/Obj-C)' },
        ];
        for (const { pattern, algo } of weakCrypto) {
            this._matchPattern(path, content, lines, pattern,
                'security', 'warning', `Weak Crypto: ${algo}`,
                `${algo} is cryptographically weak. Do not use for security-sensitive operations.`,
                'Use SHA-256 or stronger (e.g. Argon2 for passwords).');
        }

        // ── Hardcoded IPs ───────────────────────────────────────
        const ipPat = /['"`](\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})['"`]/g;
        let m;
        while ((m = ipPat.exec(content)) !== null) {
            if (!m[1].startsWith('127.') && !m[1].startsWith('0.') &&
                m[1] !== '255.255.255.255' && m[1] !== '0.0.0.0') {
                this.addIssue({
                    type: 'security', severity: 'info',
                    title: 'Hardcoded IP Address',
                    description: 'IP addresses should be externally configured.',
                    file: path, line: this._lineAt(content, m.index),
                    code: this._ctx(lines, this._lineAt(content, m.index)),
                    suggestion: { text: 'Use environment variables or configuration files.' },
                });
            }
        }

        // ── Deserialization risks ───────────────────────────────
        const deserial = [
            { pattern: /pickle\.loads?\s*\(/g, lang: 'python', title: 'Unsafe Pickle Deserialization' },
            { pattern: /yaml\.load\s*\([^)]*\)\s*(?!.*Loader)/g, lang: 'python', title: 'Unsafe YAML Load (use safe_load)' },
            { pattern: /Marshal\.load/g, lang: 'ruby', title: 'Unsafe Marshal.load' },
            { pattern: /unserialize\s*\(/g, lang: 'php', title: 'Unsafe unserialize()' },
            { pattern: /ObjectInputStream/g, lang: 'java', title: 'Java Deserialization Risk' },
            { pattern: /BinaryFormatter\.Deserialize/g, lang: 'csharp', title: 'Unsafe BinaryFormatter Deserialization' },
            { pattern: /unsafe\s*\{/g, lang: 'rust', title: 'Unsafe Rust Block' },
        ];
        for (const d of deserial) {
            if (d.lang === 'all' || lang.family === d.lang ||
                ['js', 'ts'].includes(lang.family) && d.lang === 'js') {
                this._matchPattern(path, content, lines, d.pattern,
                    'security', 'warning', d.title,
                    'Deserialization of untrusted data can lead to remote code execution.',
                    'Validate and sanitize input. Use safe alternatives.');
            }
        }

        // ── Shell injection ─────────────────────────────────────
        const shellInj = [
            { pattern: /child_process.*exec\s*\(/g, family: ['js', 'ts'] },
            { pattern: /os\.system\s*\(/g, family: ['python'] },
            { pattern: /subprocess\.call\s*\(\s*[^[\]]/g, family: ['python'] },
            { pattern: /system\s*\(\s*\$/g, family: ['ruby'] },
            { pattern: /exec\s*\(\s*\$/g, family: ['php'] },
            { pattern: /Runtime\.getRuntime\(\)\.exec/g, family: ['java', 'kotlin'] },
            { pattern: /os\/exec.*Command\(/g, family: ['go'] },
            { pattern: /std::process::Command::new\(/g, family: ['rust'] },
            { pattern: /Process\.Start\(/g, family: ['csharp'] },
        ];
        for (const si of shellInj) {
            if (si.family.includes(lang.family)) {
                this._matchPattern(path, content, lines, si.pattern,
                    'security', 'warning', 'Potential Shell Injection',
                    'Dynamic shell command execution can lead to command injection.',
                    'Use parameterized APIs or proper input sanitization.');
            }
        }

        // ── Path traversal ──────────────────────────────────────
        const pathTrav = [
            { pattern: /\.\.\//g, families: ['js', 'ts', 'python', 'ruby', 'php', 'java', 'go', 'rust', 'csharp'] },
        ];
        // Only flag when it appears in file-reading context
        const fileReadCtx = /(?:readFile|open|fopen|File\.read|os\.path|path\.join).*\.\.\//g;
        this._matchPattern(path, content, lines, fileReadCtx,
            'security', 'warning', 'Potential Path Traversal',
            'Use of ../ in file operations can allow directory traversal attacks.',
            'Validate and normalize file paths. Use path.resolve() or equivalent.');
    }

    /* =============================================================
       PERFORMANCE ANALYSIS
       ============================================================= */

    runPerformanceAnalysis(path, content, lines, lang) {
        const fam = lang.family;

        // ── Nested loops (universal) ────────────────────────────
        const nestedLoop = /(?:for|while)\s*[\s(][^{}]*\{[^{}]*(?:for|while)\s*[\s(][^{}]*\{/g;
        this._matchPattern(path, content, lines, nestedLoop,
            'performance', 'info', 'Nested Loop (O(n²) potential)',
            'Nested loops can cause quadratic complexity on large datasets.',
            'Consider hash maps, Sets, or algorithmic optimizations.');

        // ── String concatenation in loops ────────────────────────
        if (['js', 'ts', 'java', 'csharp', 'python', 'ruby', 'php', 'go'].includes(fam)) {
            const strConcat = /(?:for|while)\s*[\s(][^{}]*\{[^}]*(?:\+=\s*['"`]|['"`]\s*\+\s*['"`])/g;
            this._matchPattern(path, content, lines, strConcat,
                'performance', 'warning', 'String Concatenation in Loop',
                'Building strings by concatenation in loops is inefficient.',
                fam === 'java' ? 'Use StringBuilder.' :
                    fam === 'csharp' ? 'Use StringBuilder.' :
                        fam === 'go' ? 'Use strings.Builder or bytes.Buffer.' :
                            fam === 'python' ? 'Collect in a list and join.' :
                                'Collect parts and join at the end.');
        }

        // ── Synchronous I/O (Node.js) ───────────────────────────
        if (['js', 'ts'].includes(fam)) {
            this._matchPattern(path, content, lines,
                /(?:readFileSync|writeFileSync|appendFileSync|existsSync|statSync|readdirSync|mkdirSync|rmdirSync|unlinkSync|copyFileSync)\b/g,
                'performance', 'warning', 'Synchronous I/O',
                'Synchronous file operations block the event loop.',
                'Use async alternatives: fs.promises.*');

            // Chained .filter/.map
            this._matchPattern(path, content, lines,
                /\.(?:filter|map)\([^)]+\)\s*\.(?:filter|map)\(/g,
                'performance', 'info', 'Multiple Array Iterations',
                'Chained filter/map iterates the array multiple times.',
                'Consider combining into a single reduce pass.');

            // console.log
            this._matchPattern(path, content, lines,
                /console\.(log|debug|info)\s*\(/g,
                'performance', 'info', 'Console Statement',
                'Console statements should be removed in production.',
                'Use a structured logging library with log levels.');
        }

        // ── Python-specific perf ────────────────────────────────
        if (fam === 'python') {
            this._matchPattern(path, content, lines,
                /\bimport\s+time[\s\S]*?time\.sleep/g,
                'performance', 'info', 'Blocking time.sleep()',
                'time.sleep() blocks the thread. In async code use asyncio.sleep().',
                'Use asyncio.sleep() in async contexts.');

            this._matchPattern(path, content, lines,
                /for\s+\w+\s+in\s+range\s*\(\s*len\s*\(/g,
                'performance', 'info', 'range(len()) Anti-Pattern',
                'Iterating with range(len(x)) is un-Pythonic.',
                'Use enumerate() or direct iteration.');

            this._matchPattern(path, content, lines,
                /\+\s*=\s*\[/g,
                'performance', 'info', 'List Concatenation with +=',
                'Repeated list concatenation may be slower than extend().',
                'Use list.extend() or list comprehension.');

            this._matchPattern(path, content, lines,
                /\bglobal\s+\w/g,
                'performance', 'warning', 'Global Variable Usage',
                'Global variables hurt readability and can cause state bugs.',
                'Refactor into function parameters or class attributes.');
        }

        // ── Java-specific perf ──────────────────────────────────
        if (['java', 'kotlin'].includes(fam)) {
            this._matchPattern(path, content, lines,
                /new\s+String\s*\(/g,
                'performance', 'info', 'Unnecessary String Constructor',
                'new String() is redundant. Use the literal directly.',
                'Use string literals directly.');

            this._matchPattern(path, content, lines,
                /System\.out\.println/g,
                'performance', 'info', 'System.out.println in Code',
                'Use a logging framework (SLF4J/Logback) instead of System.out.',
                'Replace with logger.info() / logger.debug().');

            this._matchPattern(path, content, lines,
                /\.size\(\)\s*==\s*0/g,
                'performance', 'info', 'Use isEmpty() Instead of size()==0',
                '.isEmpty() is more readable and sometimes more efficient.',
                'Replace with .isEmpty().');
        }

        // ── Go-specific perf ────────────────────────────────────
        if (fam === 'go') {
            this._matchPattern(path, content, lines,
                /fmt\.Sprintf\s*\(\s*"%s"/g,
                'performance', 'info', 'fmt.Sprintf for Simple Concat',
                'Using fmt.Sprintf for simple string concatenation is slower than +.',
                'Use string concatenation or strings.Builder.');

            this._matchPattern(path, content, lines,
                /defer\s+\w+\.(?:Close|Unlock)\(\)\s*\n[\s\S]*?(?:for|range)/g,
                'performance', 'warning', 'Defer in Hot Loop',
                'Deferred calls in loops accumulate until the function returns.',
                'Call Close/Unlock directly inside the loop body.');
        }

        // ── Rust-specific perf ──────────────────────────────────
        if (fam === 'rust') {
            this._matchPattern(path, content, lines,
                /\.clone\(\)/g,
                'performance', 'info', 'Potential Unnecessary Clone',
                '.clone() copies data. Consider borrowing if ownership is not needed.',
                'Prefer references (&T) over cloning where possible.');

            this._matchPattern(path, content, lines,
                /\.collect::<Vec<[^>]+>>\(\)\s*\.iter\(\)/g,
                'performance', 'info', 'Collect-then-Iterate',
                'Collecting to a Vec only to iterate again wastes allocation.',
                'Chain iterator adaptors before collecting.');
        }

        // ── C/C++-specific perf ─────────────────────────────────
        if (['c', 'cpp'].includes(fam)) {
            this._matchPattern(path, content, lines,
                /malloc\s*\([^)]+\)(?!.*free)/g,
                'performance', 'warning', 'Potential Memory Leak',
                'malloc without a corresponding free can cause memory leaks.',
                'Ensure every malloc has a matching free (or use RAII in C++).');

            this._matchPattern(path, content, lines,
                /strcpy\s*\(/g,
                'performance', 'warning', 'Unsafe strcpy()',
                'strcpy() does not check buffer size and can cause overflow.',
                'Use strncpy() or strlcpy() instead.');

            this._matchPattern(path, content, lines,
                /sprintf\s*\(/g,
                'performance', 'warning', 'Unsafe sprintf()',
                'sprintf() does not check buffer size.',
                'Use snprintf() instead.');
        }

        // ── C#-specific perf ────────────────────────────────────
        if (fam === 'csharp') {
            this._matchPattern(path, content, lines,
                /\+\s*=\s*"[^"]*"\s*;/g,
                'performance', 'info', 'String Concatenation (use StringBuilder)',
                'Repeated += with strings creates many intermediate allocations.',
                'Use StringBuilder for building strings in loops.');

            this._matchPattern(path, content, lines,
                /Console\.WriteLine/g,
                'performance', 'info', 'Console.WriteLine in Code',
                'Use ILogger / Serilog instead of Console.WriteLine in production.',
                'Replace with structured logging.');
        }

        // ── Ruby-specific perf ──────────────────────────────────
        if (fam === 'ruby') {
            this._matchPattern(path, content, lines,
                /\.each\s+do[^}]*\.each\s+do/g,
                'performance', 'info', 'Nested .each Loops',
                'Nested .each loops may indicate O(n²) complexity.',
                'Consider using Hash lookups or Set for membership tests.');
        }

        // ── PHP-specific perf ───────────────────────────────────
        if (fam === 'php') {
            this._matchPattern(path, content, lines,
                /count\s*\(\s*\$\w+\s*\)\s*[><=]/g,
                'performance', 'info', 'count() in Loop Condition',
                'count() in loop conditions is called every iteration.',
                'Cache the count before the loop.');

            this._matchPattern(path, content, lines,
                /\bvar_dump\s*\(/g,
                'performance', 'info', 'var_dump() in Code',
                'var_dump() should not be in production code.',
                'Remove or use a proper logging library.');
        }

        // ── Swift-specific perf ─────────────────────────────────
        if (fam === 'swift') {
            this._matchPattern(path, content, lines,
                /\.count\s*[><=!]+\s*0/g,
                'performance', 'info', 'Use .isEmpty Instead of .count',
                '.isEmpty is O(1) while .count may be O(n) for some collections.',
                'Replace .count == 0 with .isEmpty.');
        }

        // ── Dart / Flutter ──────────────────────────────────────
        if (fam === 'dart') {
            this._matchPattern(path, content, lines,
                /print\s*\(/g,
                'performance', 'info', 'print() in Code',
                'print() should be replaced with a logging package in production.',
                'Use the logging package or debugPrint().');
        }

        // ── Elixir-specific ─────────────────────────────────────
        if (fam === 'elixir') {
            this._matchPattern(path, content, lines,
                /IO\.inspect/g,
                'performance', 'info', 'IO.inspect in Code',
                'IO.inspect is for debugging. Remove before production.',
                'Use Logger instead of IO.inspect.');
        }

        // ── Shell-specific ──────────────────────────────────────
        if (fam === 'shell') {
            this._matchPattern(path, content, lines,
                /\bcat\s+[^\|]+\|\s*grep\b/g,
                'performance', 'info', 'Useless Use of cat',
                'cat piped to grep is unnecessary.',
                'Use grep <pattern> <file> directly.');
        }
    }

    /* =============================================================
       CODE QUALITY ANALYSIS
       ============================================================= */

    runQualityAnalysis(path, content, lines, lang) {
        const fam = lang.family;

        // ── Long lines (universal, >120 chars) ──────────────────
        lines.forEach((line, i) => {
            if (line.length > 120 && !line.trim().startsWith('//') &&
                !line.trim().startsWith('#') && !line.includes('http')) {
                this.addIssue({
                    type: 'quality', severity: 'info',
                    title: 'Line Too Long',
                    description: `Line ${i + 1} is ${line.length} chars (>120).`,
                    file: path, line: i + 1,
                    code: line.substring(0, 80) + '...',
                });
            }
        });

        // ── Long functions (brace-based languages) ──────────────
        if (['js', 'ts', 'java', 'kotlin', 'csharp', 'cpp', 'c', 'go', 'rust',
            'swift', 'dart', 'php', 'scala', 'groovy'].includes(fam)) {
            this._detectLongFunctions(path, lines);
        }

        // ── Long functions (indentation-based: Python) ──────────
        if (fam === 'python') {
            this._detectLongPythonFunctions(path, lines);
        }

        // ── Long functions (Ruby: def...end) ────────────────────
        if (fam === 'ruby') {
            this._detectLongRubyFunctions(path, lines);
        }

        // ── TODO / FIXME / HACK (universal) ─────────────────────
        const commentPrefixes = lang.comment ? [lang.comment] : ['//','#','--',';','%'];
        const todoRe = /\b(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)\b[:\s]*(.*)/gi;
        let m;
        while ((m = todoRe.exec(content)) !== null) {
            const ln = this._lineAt(content, m.index);
            const tag = m[1].toUpperCase();
            this.addIssue({
                type: 'quality',
                severity: ['FIXME', 'HACK', 'BUG'].includes(tag) ? 'warning' : 'info',
                title: `${tag} Comment`,
                description: m[2].trim() || '(no description)',
                file: path, line: ln,
                code: this._ctx(lines, ln),
            });
        }

        // ── Magic numbers (brace / C-like languages) ────────────
        if (['js', 'ts', 'java', 'kotlin', 'csharp', 'cpp', 'c', 'go', 'rust',
            'swift', 'dart', 'php', 'scala'].includes(fam)) {
            this._detectMagicNumbers(path, content, lines);
        }

        // ── Commented-out code (universal) ──────────────────────
        this._detectCommentedCode(path, content, lines, lang);

        // ── Empty catch / except blocks ─────────────────────────
        if (['js', 'ts', 'java', 'kotlin', 'csharp', 'cpp', 'swift', 'dart', 'php'].includes(fam)) {
            this._matchPattern(path, content, lines,
                /catch\s*\([^)]*\)\s*\{\s*\}/g,
                'quality', 'warning', 'Empty Catch Block',
                'Empty catch blocks silently swallow errors.',
                'At minimum log the error.');
        }
        if (fam === 'python') {
            this._matchPattern(path, content, lines,
                /except(?:\s+\w+)?:\s*\n\s+pass\b/g,
                'quality', 'warning', 'Bare except: pass',
                'Silently passing on exceptions hides bugs.',
                'Log the error or handle it explicitly.');
        }
        if (fam === 'ruby') {
            this._matchPattern(path, content, lines,
                /rescue\s*(?:=>?\s*\w+)?\s*\n\s*end/g,
                'quality', 'warning', 'Empty rescue Block',
                'Empty rescue blocks hide errors.',
                'Log or re-raise the exception.');
        }

        // ── Deep nesting detection (universal, brace-based) ─────
        if (lang.comment === '//') {
            this._detectDeepNesting(path, lines);
        }

        // ── Python-specific quality ─────────────────────────────
        if (fam === 'python') {
            this._matchPattern(path, content, lines,
                /except\s*:/g,
                'quality', 'warning', 'Bare except Clause',
                'Catching all exceptions makes debugging hard.',
                'Catch specific exceptions (e.g., except ValueError:).');

            this._matchPattern(path, content, lines,
                /\bfrom\s+\w+\s+import\s+\*/g,
                'quality', 'warning', 'Wildcard Import',
                'from x import * pollutes the namespace.',
                'Import specific names.');
        }

        // ── Go-specific quality ─────────────────────────────────
        if (fam === 'go') {
            // err not checked
            this._matchPattern(path, content, lines,
                /\w+,\s*_\s*:?=\s*\w+/g,
                'quality', 'info', 'Ignored Error Value',
                'Discarding errors with _ can hide bugs.',
                'Check returned errors.');
        }

        // ── Rust-specific quality ───────────────────────────────
        if (fam === 'rust') {
            this._matchPattern(path, content, lines,
                /\.unwrap\(\)/g,
                'quality', 'warning', 'Use of .unwrap()',
                '.unwrap() panics on None/Err. Use proper error handling.',
                'Use ? operator, unwrap_or, or match.');
        }

        // ── Shell-specific quality ──────────────────────────────
        if (fam === 'shell') {
            // Missing set -e / set -euo pipefail at top
            if (lines.length > 2 && !content.includes('set -e')) {
                this.addIssue({
                    type: 'quality', severity: 'warning',
                    title: 'Missing set -e',
                    description: 'Script does not use set -e. Errors may go unnoticed.',
                    file: path, line: 1,
                    code: this._ctx(lines, 1),
                    suggestion: { text: 'Add "set -euo pipefail" near the top of the script.' },
                });
            }

            this._matchPattern(path, content, lines,
                /\beval\s+/g,
                'quality', 'warning', 'eval in Shell Script',
                'eval in shell scripts is dangerous and error-prone.',
                'Avoid eval; use arrays or other safe constructs.');
        }

        // ── Dockerfile quality ──────────────────────────────────
        if (lang.family === 'docker') {
            this._matchPattern(path, content, lines,
                /^RUN\s+apt-get\s+install(?!.*--no-install-recommends)/gm,
                'quality', 'info', 'Missing --no-install-recommends',
                'apt-get install without --no-install-recommends increases image size.',
                'Add --no-install-recommends to apt-get install.');

            if (!content.match(/^FROM\s+\S+:\S+/m) || content.match(/^FROM\s+\S+:latest/m)) {
                this.addIssue({
                    type: 'quality', severity: 'warning',
                    title: 'Untagged or :latest Base Image',
                    description: 'Using :latest or no tag makes builds non-reproducible.',
                    file: path, line: 1,
                    code: this._ctx(lines, 1),
                    suggestion: { text: 'Pin the image to a specific version tag.' },
                });
            }
        }

        // ── Terraform / HCL quality ─────────────────────────────
        if (lang.family === 'hcl') {
            this._matchPattern(path, content, lines,
                /"\*"/g,
                'quality', 'warning', 'Overly Permissive IAM',
                'Using "*" as a resource in IAM policies is overly permissive.',
                'Scope IAM policies to specific resources.');
        }

        // ── Solidity-specific quality ───────────────────────────
        if (fam === 'solidity') {
            this._matchPattern(path, content, lines,
                /tx\.origin/g,
                'security', 'critical', 'Use of tx.origin',
                'tx.origin for authorization is vulnerable to phishing attacks.',
                'Use msg.sender instead of tx.origin.');

            this._matchPattern(path, content, lines,
                /\.call\{value:/g,
                'security', 'warning', 'Low-level .call{value:}',
                'Low-level calls can be risky. Check for reentrancy.',
                'Use the checks-effects-interactions pattern and/or ReentrancyGuard.');
        }
    }

    /* =============================================================
       UNUSED CODE / DEAD CODE ANALYSIS
       ============================================================= */

    runUnusedCodeAnalysis(path, content, lines, lang) {
        const fam = lang.family;

        // ── Unused variables (JS/TS-style) ──────────────────────
        if (['js', 'ts'].includes(fam)) {
            this._unusedVarsJS(path, content, lines);
        }

        // ── Unused imports (JS/TS) ──────────────────────────────
        if (['js', 'ts'].includes(fam)) {
            this._unusedImportsJS(path, content, lines);
        }

        // ── Python unused imports ───────────────────────────────
        if (fam === 'python') {
            this._unusedImportsPython(path, content, lines);
        }

        // ── Java unused imports ─────────────────────────────────
        if (['java', 'kotlin'].includes(fam)) {
            this._unusedImportsJava(path, content, lines);
        }

        // ── Go unused imports ───────────────────────────────────
        if (fam === 'go') {
            this._unusedImportsGo(path, content, lines);
        }

        // ── Rust unused imports ─────────────────────────────────
        if (fam === 'rust') {
            this._unusedImportsRust(path, content, lines);
        }

        // ── C# using statements ─────────────────────────────────
        if (fam === 'csharp') {
            this._unusedUsingsCSharp(path, content, lines);
        }

        // ── Empty catch (already in quality) ────────────────────

        // ── Duplicate code hint (universal) ─────────────────────
        this._duplicateLines(path, lines);
    }

    /* =============================================================
       HELPER: Pattern matching utilities
       ============================================================= */

    _matchAll(path, content, lines, patterns, type, severity, titleFn, descFn, suggestion) {
        for (const { pattern, type: patType } of patterns) {
            let m;
            while ((m = pattern.exec(content)) !== null) {
                const ln = this._lineAt(content, m.index);
                this.addIssue({
                    type, severity,
                    title: titleFn(patType),
                    description: descFn(patType),
                    file: path, line: ln,
                    code: this._ctx(lines, ln),
                    suggestion: { text: suggestion },
                });
            }
        }
    }

    _matchPattern(path, content, lines, pattern, type, severity, title, description, suggestion) {
        let m;
        while ((m = pattern.exec(content)) !== null) {
            const ln = this._lineAt(content, m.index);
            // Skip matches inside regex literals or pattern definitions (avoids self-flagging)
            const line = lines[ln - 1] || '';
            if (this._isInsidePattern(line)) continue;
            this.addIssue({
                type, severity, title, description,
                file: path, line: ln,
                code: this._ctx(lines, ln),
                suggestion: suggestion ? { text: suggestion } : undefined,
            });
        }
    }

    /* ── SQL Injection (multi-language) ────────────────────────── */

    _runSqlInjection(path, content, lines, lang) {
        const fam = lang.family;
        const pats = [];

        if (['js', 'ts'].includes(fam)) {
            pats.push(/`(?:SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{[^}]+\}[^`]*`/gi);
            pats.push(/(?:query|execute)\s*\(\s*['"`].*\+\s*\w+/gi);
        }
        if (fam === 'python') {
            pats.push(/(?:execute|cursor\.execute)\s*\(\s*f?['"].*(?:%s|%d|\{).*['"]/gi);
            pats.push(/(?:execute|cursor\.execute)\s*\(\s*['"].*['"]\s*%\s*/gi);
        }
        if (fam === 'php') {
            pats.push(/(?:mysql_query|mysqli_query|pg_query)\s*\(\s*['"].*\$\w+/gi);
        }
        if (fam === 'ruby') {
            pats.push(/(?:execute|find_by_sql)\s*\(\s*['"].*#\{/gi);
        }
        if (['java', 'kotlin'].includes(fam)) {
            pats.push(/(?:Statement|executeQuery|executeUpdate)\s*\(\s*['"].*\+\s*\w+/gi);
        }
        if (fam === 'csharp') {
            pats.push(/(?:SqlCommand|ExecuteReader|ExecuteNonQuery)\s*\([\s\S]*?\+\s*\w+/gi);
        }
        if (fam === 'go') {
            pats.push(/(?:Query|Exec)\s*\(\s*(?:fmt\.Sprintf|".*"\s*\+)/gi);
        }

        for (const p of pats) {
            this._matchPattern(path, content, lines, p,
                'security', 'critical', 'Potential SQL Injection',
                'String interpolation/concatenation in SQL queries can cause SQL injection.',
                'Use parameterized queries or prepared statements.');
        }
    }

    /* ── Dangerous function detection ────────────────────────────  */

    _runDangerousFunctions(path, content, lines, lang) {
        const fam = lang.family;
        const funcs = [];

        if (['js', 'ts'].includes(fam)) {
            funcs.push({ pattern: /\beval\s*\(/g, name: 'eval()' });
            funcs.push({ pattern: /\bnew\s+Function\s*\(/g, name: 'new Function()' });
        }
        if (fam === 'python') {
            funcs.push({ pattern: /\beval\s*\(/g, name: 'eval()' });
            funcs.push({ pattern: /\bexec\s*\(/g, name: 'exec()' });
            funcs.push({ pattern: /\b__import__\s*\(/g, name: '__import__()' });
        }
        if (fam === 'php') {
            funcs.push({ pattern: /\beval\s*\(/g, name: 'eval()' });
            funcs.push({ pattern: /\bpreg_replace\s*\(\s*['"]\/.*\/e/g, name: 'preg_replace /e' });
            funcs.push({ pattern: /\bassert\s*\(\s*\$/g, name: 'assert() with variable' });
        }
        if (fam === 'ruby') {
            funcs.push({ pattern: /\beval\s*[( ]/g, name: 'eval()' });
            funcs.push({ pattern: /\bsend\s*\(\s*params/g, name: 'send() with params' });
        }

        for (const { pattern, name } of funcs) {
            this._matchPattern(path, content, lines, pattern,
                'security', 'critical', `Dangerous Function: ${name}`,
                `${name} can execute arbitrary code and is a major security risk.`,
                'Avoid dynamic code execution. Use safe alternatives.');
        }
    }

    /* ── Long function detection (brace-based) ───────────────────  */

    _detectLongFunctions(path, lines) {
        let depth = 0;
        let funcStart = -1;
        let funcName = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (funcStart === -1) {
                const m = line.match(/(?:function\s+(\w+)|(?:const|let|var|val|fun|func|fn|def|void|int|string|bool|auto|pub)\s+(\w+)\s*(?:\([^)]*\)|=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)))/);
                if (m) {
                    funcStart = i;
                    funcName = m[1] || m[2] || 'anonymous';
                    depth = 0;
                }
            }
            if (funcStart !== -1) {
                depth += (line.match(/{/g) || []).length;
                depth -= (line.match(/}/g) || []).length;
                if (depth <= 0 && i > funcStart) {
                    const len = i - funcStart + 1;
                    if (len > 50) {
                        this.addIssue({
                            type: 'quality', severity: 'warning',
                            title: 'Long Function',
                            description: `"${funcName}" is ${len} lines. Consider splitting it.`,
                            file: path, line: funcStart + 1,
                            code: `function ${funcName}() { ... } // ${len} lines`,
                            suggestion: { text: 'Extract logical blocks into smaller functions.' },
                        });
                    }
                    funcStart = -1;
                }
            }
        }
    }

    _detectLongPythonFunctions(path, lines) {
        let funcStart = -1;
        let funcIndent = 0;
        let funcName = '';

        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(/^(\s*)def\s+(\w+)/);
            if (m) {
                // Close previous
                if (funcStart !== -1) {
                    const len = i - funcStart;
                    if (len > 50) {
                        this.addIssue({
                            type: 'quality', severity: 'warning',
                            title: 'Long Function',
                            description: `"${funcName}" is ${len} lines.`,
                            file: path, line: funcStart + 1,
                            code: `def ${funcName}(...): # ${len} lines`,
                            suggestion: { text: 'Break into smaller functions.' },
                        });
                    }
                }
                funcStart = i;
                funcIndent = m[1].length;
                funcName = m[2];
            } else if (funcStart !== -1 && lines[i].trim() !== '' &&
                lines[i].search(/\S/) <= funcIndent && !lines[i].match(/^\s*#/) &&
                !lines[i].match(/^\s*@/)) {
                const len = i - funcStart;
                if (len > 50) {
                    this.addIssue({
                        type: 'quality', severity: 'warning',
                        title: 'Long Function',
                        description: `"${funcName}" is ${len} lines.`,
                        file: path, line: funcStart + 1,
                        code: `def ${funcName}(...): # ${len} lines`,
                        suggestion: { text: 'Break into smaller functions.' },
                    });
                }
                funcStart = -1;
            }
        }
    }

    _detectLongRubyFunctions(path, lines) {
        let funcStart = -1;
        let funcName = '';
        let depth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^def\s+(\w+)/)) {
                funcStart = i;
                funcName = line.match(/^def\s+(\w+)/)[1];
                depth = 1;
            } else if (funcStart !== -1) {
                if (line.match(/^(?:def|class|module|do|if|unless|case|begin|while|until|for)\b/)) depth++;
                if (line === 'end') depth--;
                if (depth === 0) {
                    const len = i - funcStart + 1;
                    if (len > 50) {
                        this.addIssue({
                            type: 'quality', severity: 'warning',
                            title: 'Long Method',
                            description: `"${funcName}" is ${len} lines.`,
                            file: path, line: funcStart + 1,
                            code: `def ${funcName} ... end # ${len} lines`,
                            suggestion: { text: 'Extract into smaller methods.' },
                        });
                    }
                    funcStart = -1;
                }
            }
        }
    }

    /* ── Deep nesting detection ──────────────────────────────────  */

    _detectDeepNesting(path, lines) {
        let depth = 0;
        for (let i = 0; i < lines.length; i++) {
            depth += (lines[i].match(/{/g) || []).length;
            depth -= (lines[i].match(/}/g) || []).length;
            if (depth > 5) {
                this.addIssue({
                    type: 'quality', severity: 'warning',
                    title: 'Deep Nesting',
                    description: `Nesting depth ${depth} at line ${i + 1}. Hard to read/maintain.`,
                    file: path, line: i + 1,
                    code: this._ctx(lines, i + 1),
                    suggestion: { text: 'Use early returns, guard clauses, or extract helper functions.' },
                });
                break; // Only report once per file
            }
        }
    }

    /* ── Magic numbers ───────────────────────────────────────────  */

    _detectMagicNumbers(path, content, lines) {
        const re = /(?<![.\w'"\\])(\d{2,})(?![.\w'"`])/g;
        const common = new Set([80, 443, 8080, 3000, 5000, 8000, 8443,
            200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503,
            100, 1000, 1024, 10, 16, 32, 64, 128, 256, 512, 60, 24, 365,
            0xFF, 0xFFFF]);
        let m;
        let count = 0;
        while ((m = re.exec(content)) !== null && count < 10) {
            const num = parseInt(m[1], 10);
            if (isNaN(num) || common.has(num) || num <= 10) continue;
            const ln = this._lineAt(content, m.index);
            const line = lines[ln - 1] || '';
            if (line.trim().startsWith('//') || line.trim().startsWith('#') ||
                line.trim().startsWith('*') || /(?:const|let|var|final|val)\s/.test(line)) continue;
            this.addIssue({
                type: 'quality', severity: 'info',
                title: 'Magic Number',
                description: `${num} appears without a named constant.`,
                file: path, line: ln,
                code: this._ctx(lines, ln),
                suggestion: { text: 'Extract into a named constant for clarity.' },
            });
            count++;
        }
    }

    /* ── Commented-out code ──────────────────────────────────────  */

    _detectCommentedCode(path, content, lines, lang) {
        const keywords = /\b(function|class|if|else|for|while|return|import|export|const|let|var|def|end|do|begin|module|require|include|use|package|pub|fn|impl|struct|enum)\b/;
        let count = 0;
        for (let i = 0; i < lines.length && count < 5; i++) {
            const trimmed = lines[i].trim();
            const isComment =
                (trimmed.startsWith('//') && !trimmed.startsWith('///')) ||
                (trimmed.startsWith('#') && !trimmed.startsWith('#!') && !trimmed.startsWith('#include')) ||
                (trimmed.startsWith('--') && lang.comment === '--');
            if (isComment) {
                const body = trimmed.replace(/^(?:\/\/|#|--)/, '').trim();
                if (keywords.test(body) && body.length > 5 &&
                    !body.startsWith('TODO') && !body.startsWith('FIXME') &&
                    !body.startsWith('NOTE') && !body.startsWith('HACK')) {
                    this.addIssue({
                        type: 'quality', severity: 'info',
                        title: 'Commented-out Code',
                        description: 'Remove dead code; rely on version control history.',
                        file: path, line: i + 1,
                        code: this._ctx(lines, i + 1),
                    });
                    count++;
                }
            }
        }
    }

    /* ── Unused imports / variables helpers ───────────────────────  */

    _unusedVarsJS(path, content, lines) {
        const defs = new Map();
        const defRe = /(?:const|let|var)\s+(\w+)\s*=/g;
        let m;
        while ((m = defRe.exec(content)) !== null) {
            defs.set(m[1], this._lineAt(content, m.index));
        }
        for (const [name, line] of defs) {
            const re = new RegExp(`\\b${name}\\b`, 'g');
            const matches = content.match(re) || [];
            if (matches.length <= 1 && name !== '_' && !name.startsWith('_')) {
                this.addIssue({
                    type: 'unused', severity: 'warning',
                    title: 'Potentially Unused Variable',
                    description: `"${name}" is defined but not used elsewhere in this file.`,
                    file: path, line,
                    code: this._ctx(lines, line),
                    suggestion: { text: 'Remove or prefix with _ if intentional.' },
                });
            }
        }
    }

    _unusedImportsJS(path, content, lines) {
        const re = /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g;
        let m;
        while ((m = re.exec(content)) !== null) {
            const names = (m[1] || m[2]).split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim());
            for (const name of names) {
                if (!name) continue;
                const uses = (content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
                if (uses <= 1) {
                    this.addIssue({
                        type: 'unused', severity: 'warning',
                        title: 'Unused Import',
                        description: `"${name}" is imported but never used.`,
                        file: path, line: this._lineAt(content, m.index),
                        code: this._ctx(lines, this._lineAt(content, m.index)),
                        suggestion: { text: 'Remove unused imports.' },
                    });
                }
            }
        }
    }

    _unusedImportsPython(path, content, lines) {
        const re = /^(?:from\s+\S+\s+)?import\s+(.+)/gm;
        let m;
        while ((m = re.exec(content)) !== null) {
            const names = m[1].split(',').map(s => {
                const parts = s.trim().split(/\s+as\s+/);
                return parts[parts.length - 1].trim();
            });
            for (const name of names) {
                if (!name || name === '*') continue;
                const uses = (content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
                if (uses <= 1) {
                    this.addIssue({
                        type: 'unused', severity: 'warning',
                        title: 'Unused Import',
                        description: `"${name}" is imported but not used.`,
                        file: path, line: this._lineAt(content, m.index),
                        code: this._ctx(lines, this._lineAt(content, m.index)),
                        suggestion: { text: 'Remove unused imports.' },
                    });
                }
            }
        }
    }

    _unusedImportsJava(path, content, lines) {
        const re = /^import\s+(?:static\s+)?([^;]+);/gm;
        let m;
        while ((m = re.exec(content)) !== null) {
            const fullImport = m[1].trim();
            const simpleName = fullImport.split('.').pop();
            if (simpleName === '*') continue;
            const uses = (content.match(new RegExp(`\\b${simpleName}\\b`, 'g')) || []).length;
            if (uses <= 1) {
                this.addIssue({
                    type: 'unused', severity: 'warning',
                    title: 'Unused Import',
                    description: `"${fullImport}" appears unused.`,
                    file: path, line: this._lineAt(content, m.index),
                    code: this._ctx(lines, this._lineAt(content, m.index)),
                    suggestion: { text: 'Remove unused imports.' },
                });
            }
        }
    }

    _unusedImportsGo(path, content, lines) {
        const re = /import\s*\(\s*([\s\S]*?)\)/g;
        let m;
        while ((m = re.exec(content)) !== null) {
            const block = m[1];
            const importLines = block.split('\n');
            for (const il of importLines) {
                const im = il.trim().match(/(?:(\w+)\s+)?"([^"]+)"/);
                if (!im) continue;
                const alias = im[1] || im[2].split('/').pop();
                if (alias === '_') continue;
                const uses = (content.match(new RegExp(`\\b${alias}\\b`, 'g')) || []).length;
                if (uses <= 1) {
                    this.addIssue({
                        type: 'unused', severity: 'warning',
                        title: 'Unused Import',
                        description: `"${im[2]}" appears unused.`,
                        file: path, line: this._lineAt(content, m.index),
                        code: this._ctx(lines, this._lineAt(content, m.index)),
                        suggestion: { text: 'Remove unused imports (Go compiler enforces this).' },
                    });
                }
            }
        }
    }

    _unusedImportsRust(path, content, lines) {
        const re = /use\s+([^;]+);/g;
        let m;
        while ((m = re.exec(content)) !== null) {
            const full = m[1].trim();
            const simpleName = full.split('::').pop().replace(/[{}]/g, '').trim();
            if (!simpleName || simpleName === '*' || simpleName === 'self') continue;
            const uses = (content.match(new RegExp(`\\b${simpleName}\\b`, 'g')) || []).length;
            if (uses <= 1) {
                this.addIssue({
                    type: 'unused', severity: 'warning',
                    title: 'Unused Import',
                    description: `"${full}" appears unused.`,
                    file: path, line: this._lineAt(content, m.index),
                    code: this._ctx(lines, this._lineAt(content, m.index)),
                    suggestion: { text: 'Remove unused use statements.' },
                });
            }
        }
    }

    _unusedUsingsCSharp(path, content, lines) {
        const re = /^using\s+([\w.]+);/gm;
        let m;
        while ((m = re.exec(content)) !== null) {
            const ns = m[1].trim();
            const simpleName = ns.split('.').pop();
            // This is a rough heuristic — usings bring in namespaces not individual types
            // We just check if anything from that namespace is referenced
            const uses = (content.match(new RegExp(`\\b${simpleName}\\b`, 'g')) || []).length;
            if (uses <= 1 && !ns.startsWith('System')) {
                this.addIssue({
                    type: 'unused', severity: 'info',
                    title: 'Potentially Unused using',
                    description: `"using ${ns}" may be unused.`,
                    file: path, line: this._lineAt(content, m.index),
                    code: this._ctx(lines, this._lineAt(content, m.index)),
                    suggestion: { text: 'Remove unnecessary using directives.' },
                });
            }
        }
    }

    /* ── Duplicate lines detection ───────────────────────────────  */

    _duplicateLines(path, lines) {
        if (lines.length < 10) return;
        const seen = new Map();
        for (let i = 0; i < lines.length - 3; i++) {
            const block = lines.slice(i, i + 4).map(l => l.trim()).join('|');
            if (block.replace(/\s/g, '').length < 20) continue; // skip trivial blocks
            if (seen.has(block)) {
                this.addIssue({
                    type: 'unused', severity: 'info',
                    title: 'Duplicate Code Block',
                    description: `Lines ${i + 1}-${i + 4} duplicate lines ${seen.get(block) + 1}-${seen.get(block) + 4}.`,
                    file: path, line: i + 1,
                    code: this._ctx(lines, i + 1),
                    suggestion: { text: 'Extract duplicated logic into a shared function.' },
                });
                return; // Only report once per file
            }
            seen.set(block, i);
        }
    }

    /* =============================================================
       SCORING & REPORT
       ============================================================= */

    calculateScores() {
        const byType = { security: [], performance: [], quality: [], unused: [] };
        for (const issue of this.issues) {
            const bucket = byType[issue.type] || byType.quality;
            bucket.push(issue);
        }

        const calc = (issues, maxPenalty) => {
            let penalty = 0;
            for (const i of issues) {
                if (i.severity === 'critical') penalty += 15;
                else if (i.severity === 'warning') penalty += 5;
                else penalty += 1;
            }
            return Math.max(0, 100 - Math.min(penalty, maxPenalty));
        };

        this.scores.security = calc(byType.security, 60);
        this.scores.performance = calc(byType.performance, 40);
        this.scores.quality = calc(byType.quality, 40);
        this.scores.cleanliness = calc(byType.unused, 30);
        this.scores.overall = Math.round(
            this.scores.security * 0.35 +
            this.scores.performance * 0.25 +
            this.scores.quality * 0.25 +
            this.scores.cleanliness * 0.15
        );
    }

    generateReport(repoName) {
        this.calculateScores();

        return {
            repository: repoName,
            timestamp: new Date().toISOString(),
            statistics: {
                ...this.statistics,
                totalIssues: this.issues.length,
                criticalIssues: this.issues.filter(i => i.severity === 'critical').length,
                warnings: this.issues.filter(i => i.severity === 'warning').length,
                suggestions: this.issues.filter(i => i.severity === 'info').length,
            },
            scores: this.scores,
            issues: this.issues,
            files: this.files,
            summary: this._summary(),
        };
    }

    _summary() {
        const crit = this.issues.filter(i => i.severity === 'critical').length;
        const warn = this.issues.filter(i => i.severity === 'warning').length;
        let s = `Analyzed ${this.statistics.analyzedFiles} files (${this.statistics.analyzedLines.toLocaleString()} lines). `;
        if (crit) s += `${crit} critical issue${crit > 1 ? 's' : ''} need immediate attention. `;
        if (warn) s += `${warn} warning${warn > 1 ? 's' : ''} to review. `;
        if (this.scores.overall >= 80) s += 'Overall the codebase is in good shape.';
        else if (this.scores.overall >= 60) s += 'Room for improvement.';
        else s += 'Significant attention needed.';
        return s;
    }

    /* ── Core helpers ────────────────────────────────────────────  */

    addIssue(issue) {
        const dup = this.issues.some(i =>
            i.file === issue.file && i.line === issue.line && i.title === issue.title);
        if (!dup) {
            this.issues.push({ id: this.issues.length + 1, ...issue });
        }
    }

    _lineAt(content, index) {
        return content.substring(0, index).split('\n').length;
    }

    _ctx(lines, lineNumber, around = 1) {
        const start = Math.max(0, lineNumber - around - 1);
        const end = Math.min(lines.length, lineNumber + around);
        return lines.slice(start, end).map((l, i) => ({
            number: start + i + 1,
            content: l,
            highlight: start + i + 1 === lineNumber,
        }));
    }

    /**
     * Heuristic: detect if a source line is a regex/pattern definition
     * so the engine doesn't flag its own rules (or rules from other
     * linting/audit tools).  Looks for common indicators that the match
     * lives inside a regex literal, RegExp constructor, or a known
     * pattern-definition object.
     */
    _isInsidePattern(line) {
        const trimmed = line.trim();
        // Line contains a regex literal with flags (/ ... /gi etc)
        if (/\/[^/]+\/[gimsuy]{0,6}/.test(trimmed) &&
            /pattern|push\s*\(\s*\{|pats\.push|funcs\.push/.test(trimmed)) return true;
        // Object literal defining a pattern
        if (/^\{?\s*pattern\s*:/.test(trimmed)) return true;
        // Variable assigned a regex literal
        if (/(?:const|let|var)\s+\w+(?:Pat(?:tern)?|Re(?:gex)?)\s*=\s*\//.test(trimmed)) return true;
        // RegExp constructor
        if (/new\s+RegExp\s*\(/.test(trimmed)) return true;
        // push() of an object with a pattern key
        if (/\.push\s*\(\s*\{.*pattern\s*:/.test(trimmed)) return true;
        // Array/object literal with regex: { pattern: / ... / }
        if (/\{\s*pattern\s*:\s*\//.test(trimmed)) return true;
        return false;
    }
}

module.exports = AuditEngine;
