#!/usr/bin/env node
/**
 * GitAudit CLI — Entry Point
 *
 * Usage:
 *   gitaudit [path|owner/repo|https://github.com/...]  [options]
 *
 * Examples:
 *   gitaudit .                          # Audit current directory
 *   gitaudit ./my-project               # Audit a local folder
 *   gitaudit owner/repo                 # Audit GitHub repo
 *   gitaudit https://github.com/o/r     # Audit GitHub repo URL
 *   gitaudit . --json                   # Output raw JSON
 *   gitaudit . --compact                # Short one-line-per-issue output
 *   gitaudit . -o report.json           # Save JSON to file
 *   gitaudit . --severity warning       # Only show warnings+critical
 *   gitaudit . --type security          # Only security issues
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');

const AuditEngine = require('../src/audit-engine');
const LocalScanner = require('../src/local-scanner');
const GitHubAPI = require('../src/github-api');
const reporter = require('../src/reporter');
const { getLanguage } = require('../src/languages');
const CONFIG = require('../src/config');
const pkg = require('../package.json');

/* ── Program definition ──────────────────────────────────────── */

const program = new Command();
program
    .name('gitaudit')
    .description('GitAudit CLI — Comprehensive code analysis for any repository')
    .version(pkg.version)
    .argument('[target]', 'Local path, owner/repo, or GitHub URL (default: current dir)', '.')
    .option('--json', 'Output raw JSON instead of formatted report')
    .option('--compact', 'Compact one-line-per-issue output')
    .option('-o, --output <file>', 'Write JSON report to a file')
    .option('--severity <level>', 'Minimum severity to display: info, warning, critical', 'info')
    .option('--type <type>', 'Filter by issue type: security, performance, quality, unused')
    .option('--token <token>', 'GitHub personal access token (or set GITHUB_TOKEN env)')
    .option('--no-banner', 'Skip the ASCII banner')
    .action(run);

program.parse();

/* ── Main action ─────────────────────────────────────────────── */

async function run(target, opts) {
    if (opts.banner !== false) reporter.printBanner();

    const engine = new AuditEngine();
    let repoName;

    // Determine local vs remote
    const parsed = GitHubAPI.parseRepoUrl(target);
    const isLocal = !parsed || fs.existsSync(target);

    if (isLocal) {
        repoName = await runLocal(engine, target);
    } else {
        repoName = await runRemote(engine, parsed, opts.token);
    }

    // Generate report
    const report = engine.generateReport(repoName);

    // Apply filters
    filterReport(report, opts);

    // Output
    if (opts.json) {
        const json = JSON.stringify(report, null, 2);
        console.log(json);
    } else if (opts.compact) {
        reporter.printCompact(report);
    } else {
        reporter.printReport(report);
    }

    // Save to file
    if (opts.output) {
        fs.writeFileSync(opts.output, JSON.stringify(report, null, 2), 'utf-8');
        console.log(chalk.green(`  ✔ Report saved to ${opts.output}\n`));
    }

    // Exit code: 1 if critical issues
    if (report.statistics.criticalIssues > 0) process.exit(1);
}

/* ── Local audit ─────────────────────────────────────────────── */

async function runLocal(engine, target) {
    const absPath = path.resolve(target);
    if (!fs.existsSync(absPath)) {
        console.error(chalk.red(`  ✖ Path not found: ${absPath}`));
        process.exit(2);
    }

    const repoName = path.basename(absPath);
    const spinner = ora({ text: 'Scanning files...', color: 'cyan' }).start();

    const scanner = new LocalScanner();
    const { files, skipped } = scanner.scan(absPath);

    engine.statistics.totalFiles = files.length;
    spinner.text = `Found ${files.length} files (${skipped} skipped). Analyzing...`;

    let done = 0;
    for (const file of files) {
        const content = scanner.readFile(file.path);
        if (content === null) continue;
        try {
            engine.analyzeFile(file.relativePath, content);
        } catch (err) {
            // Silently skip files that cause analysis errors
        }
        done++;
        if (done % 50 === 0) {
            spinner.text = `Analyzing... ${done}/${files.length}`;
        }
    }

    spinner.succeed(`Analyzed ${engine.statistics.analyzedFiles} files (${engine.statistics.analyzedLines.toLocaleString()} lines)`);
    return repoName;
}

/* ── Remote (GitHub) audit ───────────────────────────────────── */

async function runRemote(engine, { owner, repo }, tokenOpt) {
    const repoName = `${owner}/${repo}`;
    const api = new GitHubAPI(tokenOpt);

    const spinner = ora({ text: `Connecting to GitHub: ${repoName}...`, color: 'cyan' }).start();

    let tree;
    try {
        tree = await api.getRepoTree(owner, repo);
    } catch (err) {
        spinner.fail(`Failed to fetch repository: ${err.message}`);
        process.exit(2);
    }

    if (!tree.tree) {
        spinner.fail('Unable to fetch repository tree');
        process.exit(2);
    }

    let defaultBranch;
    try {
        defaultBranch = await api.getDefaultBranch(owner, repo);
    } catch {
        defaultBranch = 'main';
    }

    // Filter to analyzable blobs
    const blobs = tree.tree.filter(item => {
        if (item.type !== 'blob') return false;
        const lang = getLanguage(item.path);
        return lang.family !== 'other' && (item.size || 0) <= CONFIG.AUDIT.MAX_FILE_SIZE;
    });

    engine.statistics.totalFiles = blobs.length;
    spinner.text = `Fetching ${blobs.length} files from ${repoName}...`;

    const batchSize = CONFIG.AUDIT.GITHUB_BATCH_SIZE;
    let done = 0;

    for (let i = 0; i < blobs.length; i += batchSize) {
        const batch = blobs.slice(i, i + batchSize);
        await Promise.all(batch.map(async (blob) => {
            try {
                const content = await api.getFileContent(owner, repo, blob.path, defaultBranch);
                engine.analyzeFile(blob.path, content);
            } catch {
                // Skip files that can't be fetched
            }
        }));
        done += batch.length;
        spinner.text = `Analyzing ${repoName}... ${done}/${blobs.length}`;
    }

    spinner.succeed(`Analyzed ${engine.statistics.analyzedFiles} files from ${repoName} (${engine.statistics.analyzedLines.toLocaleString()} lines)`);
    return repoName;
}

/* ── Filter helpers ──────────────────────────────────────────── */

function filterReport(report, opts) {
    const sevOrder = { info: 0, warning: 1, critical: 2 };
    const minSev = sevOrder[opts.severity] ?? 0;

    report.issues = report.issues.filter(issue => {
        if ((sevOrder[issue.severity] ?? 0) < minSev) return false;
        if (opts.type && issue.type !== opts.type) return false;
        return true;
    });
}
