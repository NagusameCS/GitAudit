/**
 * GitAudit CLI — Terminal Reporter
 * Beautiful CLI output with colors, tables, and progress indicators
 */

const chalk = require('chalk');

/* ── Severity colours ─────────────────────────────────────────── */
const SEV = {
    critical: chalk.bgRed.white.bold(' CRITICAL '),
    warning:  chalk.bgYellow.black.bold(' WARNING  '),
    info:     chalk.bgCyan.black.bold('   INFO   '),
};

const TYPE_ICON = {
    security:    chalk.red('🔒'),
    performance: chalk.yellow('⚡'),
    quality:     chalk.blue('📝'),
    unused:      chalk.gray('🧹'),
};

/* ── Score bar ────────────────────────────────────────────────── */
function scoreColor(score) {
    if (score >= 80) return chalk.green;
    if (score >= 60) return chalk.yellow;
    return chalk.red;
}

function scoreBar(score, width = 20) {
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;
    const color = scoreColor(score);
    return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ` ${color.bold(score + '%')}`;
}

/* ── Public API ───────────────────────────────────────────────── */

function printBanner() {
    console.log(chalk.cyan.bold(`
   ______ _ _    ___             _ _ _
  / ____/(_) |_ /   | __  __ __| (_) |_
 / / __ / /| __// /| |/ / / // _ | | __|
/ /_/ // / | /_/ ___ / /_/ // __/ | | |_
\\____//_/  \\__/_/  |_\\__,_/ \\___|_|_|\\__|
`));
    console.log(chalk.gray('  Comprehensive code analysis — CLI Edition\n'));
}

function printProgress(percent, status) {
    const width = 30;
    const filled = Math.round((percent / 100) * width);
    const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled));
    process.stdout.write(`\r  ${bar}  ${Math.round(percent)}%  ${chalk.gray(status)}`.padEnd(100));
    if (percent >= 100) console.log();
}

function printReport(report) {
    const { scores, statistics, issues, summary } = report;

    // ── Summary ─────────────────────────────────────────────
    console.log();
    console.log(chalk.bold.underline('  Audit Report: ') + chalk.cyan.bold(report.repository));
    console.log(chalk.gray(`  ${report.timestamp}\n`));
    console.log(`  ${chalk.gray(summary)}\n`);

    // ── Scores ──────────────────────────────────────────────
    console.log(chalk.bold('  ┌─────────────────────────────────────────┐'));
    console.log(chalk.bold('  │            Overall Score                │'));
    console.log(chalk.bold('  │  ') + scoreBar(scores.overall, 30) + chalk.bold('       │'));
    console.log(chalk.bold('  ├─────────────────────────────────────────┤'));
    console.log(`  │  Security     ${scoreBar(scores.security, 18)}   │`);
    console.log(`  │  Performance  ${scoreBar(scores.performance, 18)}   │`);
    console.log(`  │  Quality      ${scoreBar(scores.quality, 18)}   │`);
    console.log(`  │  Cleanliness  ${scoreBar(scores.cleanliness, 18)}   │`);
    console.log(chalk.bold('  └─────────────────────────────────────────┘'));
    console.log();

    // ── Statistics ───────────────────────────────────────────
    console.log(chalk.bold('  Statistics'));
    console.log(chalk.gray('  ─────────────────────────────'));
    console.log(`  Files analyzed  : ${chalk.white.bold(statistics.analyzedFiles)}`);
    console.log(`  Lines analyzed  : ${chalk.white.bold(statistics.analyzedLines.toLocaleString())}`);
    console.log(`  Total issues    : ${chalk.white.bold(statistics.totalIssues)}`);
    console.log(`  Critical        : ${chalk.red.bold(statistics.criticalIssues)}`);
    console.log(`  Warnings        : ${chalk.yellow.bold(statistics.warnings)}`);
    console.log(`  Suggestions     : ${chalk.cyan.bold(statistics.suggestions)}`);
    console.log();

    // ── Language breakdown ───────────────────────────────────
    const langs = Object.entries(statistics.languages).sort((a, b) => b[1] - a[1]);
    if (langs.length) {
        console.log(chalk.bold('  Languages'));
        console.log(chalk.gray('  ─────────────────────────────'));
        for (const [lang, count] of langs.slice(0, 15)) {
            const pct = ((count / statistics.analyzedFiles) * 100).toFixed(1);
            console.log(`  ${chalk.white(lang.padEnd(25))} ${String(count).padStart(4)} files  (${pct}%)`);
        }
        if (langs.length > 15) {
            console.log(chalk.gray(`  ... and ${langs.length - 15} more`));
        }
        console.log();
    }

    // ── Issues ──────────────────────────────────────────────
    if (issues.length === 0) {
        console.log(chalk.green.bold('  ✔ No issues found. Great job!\n'));
        return;
    }

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    const sorted = [...issues].sort((a, b) =>
        (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

    console.log(chalk.bold(`  Issues (${issues.length})`));
    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────'));

    for (const issue of sorted) {
        const icon = TYPE_ICON[issue.type] || '';
        const sev = SEV[issue.severity] || issue.severity;
        console.log(`\n  ${sev}  ${icon}  ${chalk.white.bold(issue.title)}`);
        console.log(`  ${chalk.gray('File:')} ${chalk.cyan(issue.file)}${issue.line ? chalk.gray(':' + issue.line) : ''}`);
        console.log(`  ${chalk.gray(issue.description)}`);

        // Code snippet
        if (issue.code && Array.isArray(issue.code)) {
            for (const ln of issue.code) {
                const prefix = ln.highlight ? chalk.red('→') : ' ';
                const num = String(ln.number).padStart(4);
                const line = ln.highlight
                    ? chalk.white.bold(ln.content)
                    : chalk.gray(ln.content);
                console.log(`    ${prefix} ${chalk.gray(num)} │ ${line}`);
            }
        } else if (typeof issue.code === 'string') {
            console.log(chalk.gray(`    ${issue.code}`));
        }

        if (issue.suggestion) {
            console.log(`  ${chalk.green('💡 ' + issue.suggestion.text)}`);
        }
    }

    console.log();
}

function printCompact(report) {
    const { scores, statistics, issues } = report;
    console.log();
    console.log(chalk.bold(`GitAudit: ${report.repository}`) + chalk.gray(` — ${statistics.analyzedFiles} files, ${statistics.analyzedLines.toLocaleString()} lines`));
    console.log(`Score: ${scoreColor(scores.overall).bold(scores.overall + '%')}  |  🔒 ${scores.security}%  ⚡ ${scores.performance}%  📝 ${scores.quality}%  🧹 ${scores.cleanliness}%`);

    if (issues.length === 0) {
        console.log(chalk.green('✔ No issues found.'));
        return;
    }

    const crit = issues.filter(i => i.severity === 'critical');
    const warn = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');

    if (crit.length) {
        console.log(chalk.red(`\n  Critical (${crit.length}):`));
        for (const i of crit) console.log(`    ${chalk.red('✖')} ${i.file}:${i.line} — ${i.title}`);
    }
    if (warn.length) {
        console.log(chalk.yellow(`\n  Warnings (${warn.length}):`));
        for (const i of warn) console.log(`    ${chalk.yellow('!')} ${i.file}:${i.line} — ${i.title}`);
    }
    if (info.length) {
        console.log(chalk.cyan(`\n  Info (${info.length}):`));
        for (const i of info.slice(0, 20)) console.log(`    ${chalk.cyan('·')} ${i.file}:${i.line} — ${i.title}`);
        if (info.length > 20) console.log(chalk.gray(`    ... and ${info.length - 20} more`));
    }
    console.log();
}

module.exports = {
    printBanner,
    printProgress,
    printReport,
    printCompact,
    scoreColor,
};
