# GitAudit CLI

> Comprehensive code analysis for **any** GitHub repository or local project — from your terminal.

The CLI companion to [GitAudit Web](https://nagusame.github.io/GitAudit). Supports **100+ languages & config formats** with language-specific rules for security, performance, code quality, and dead-code detection.

---

## Quick Start

```bash
# Install dependencies
cd cli
npm install

# Audit the current directory
node bin/gitaudit.js .

# Audit a GitHub repo
node bin/gitaudit.js owner/repo

# Audit a GitHub URL
node bin/gitaudit.js https://github.com/owner/repo
```

### Install Globally

```bash
cd cli
npm install -g .

# Now available everywhere
gitaudit .
gitaudit owner/repo
```

---

## Usage

```
gitaudit [target] [options]
```

| Argument | Description |
|----------|-------------|
| `target` | Local path, `owner/repo`, or full GitHub URL. Defaults to `.` |

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON instead of the formatted report |
| `--compact` | Compact one-line-per-issue display |
| `-o, --output <file>` | Save the JSON report to a file |
| `--severity <level>` | Minimum severity: `info` (default), `warning`, `critical` |
| `--type <type>` | Filter: `security`, `performance`, `quality`, `unused` |
| `--token <token>` | GitHub personal access token (or set `GITHUB_TOKEN` env var) |
| `--no-banner` | Skip the ASCII art banner |
| `-V, --version` | Print version |
| `-h, --help` | Show help |

### Examples

```bash
# Only show critical + warning issues
gitaudit . --severity warning

# Only security issues as JSON
gitaudit . --type security --json

# Audit remote repo and save report
gitaudit facebook/react -o react-report.json

# Use a token for private repos / higher rate limits
GITHUB_TOKEN=ghp_xxx gitaudit my-org/private-repo

# CI-friendly: exits with code 1 if critical issues found
gitaudit . --severity critical
```

---

## Supported Languages

The CLI includes first-class support for **100+ file types** organized by family:

| Family | Extensions |
|--------|-----------|
| **JavaScript / TypeScript** | `.js` `.mjs` `.cjs` `.jsx` `.ts` `.tsx` `.vue` `.svelte` `.astro` |
| **Python** | `.py` `.pyw` `.pyx` `.pyi` `.ipynb` |
| **Java / JVM** | `.java` `.kt` `.kts` `.scala` `.groovy` `.gradle` `.clj` `.cljs` |
| **C / C++** | `.c` `.h` `.cpp` `.cxx` `.cc` `.hpp` `.hxx` |
| **.NET** | `.cs` `.csx` `.fs` `.fsx` `.vb` `.razor` `.cshtml` |
| **Go** | `.go` `go.mod` |
| **Rust** | `.rs` `Cargo.toml` |
| **Ruby** | `.rb` `.rake` `.gemspec` `Gemfile` `Rakefile` |
| **PHP** | `.php` `.phtml` `.blade.php` |
| **Swift** | `.swift` |
| **Dart / Flutter** | `.dart` |
| **Shell** | `.sh` `.bash` `.zsh` `.fish` `.ps1` `.bat` `.cmd` |
| **Functional** | `.hs` `.ml` `.ex` `.exs` `.erl` `.elm` `.gleam` `.rkt` `.scm` `.lisp` |
| **Systems** | `.zig` `.nim` `.v` `.d` `.ada` `.pas` `.f90` `.cob` |
| **Web / Markup** | `.html` `.css` `.scss` `.sass` `.less` `.pug` `.ejs` `.hbs` `.njk` |
| **Data / Config** | `.json` `.yaml` `.yml` `.toml` `.ini` `.env` `.xml` `.csv` |
| **Infrastructure** | `.tf` `.hcl` `.proto` `Dockerfile` `docker-compose.yml` |
| **Smart Contracts** | `.sol` `.vy` `.move` |
| **Game Dev** | `.gd` `.shader` `.hlsl` `.glsl` `.wgsl` |
| **Docs** | `.md` `.mdx` `.rst` `.tex` `.adoc` |

Plus many more — see [src/languages.js](src/languages.js) for the full list.

---

## What It Checks

### 🔒 Security
- Exposed secrets (AWS, GitHub, OpenAI, Stripe, Slack, JWTs, DB connection strings, …)
- SQL injection (JS, Python, PHP, Ruby, Java, C#, Go)
- Dangerous functions (`eval`, `exec`, `pickle.loads`, `unserialize`, …)
- Shell injection, path traversal, unsafe deserialization
- Weak cryptography (MD5, SHA-1 across 8+ languages)
- XSS via innerHTML, hardcoded IPs
- Solidity-specific: `tx.origin`, reentrancy risks

### ⚡ Performance
- Nested loops (O(n²)), string concatenation in loops
- Sync I/O in Node.js, console.log statements
- Language-specific: `range(len())` in Python, `.clone()` in Rust, `StringBuilder` in Java/C#, `defer` in Go loops, `cat | grep` in shell, and more

### 📝 Code Quality
- Long lines (>120), long functions (>50 lines)
- Magic numbers, commented-out code, TODO/FIXME/HACK
- Empty catch/except/rescue blocks, deep nesting
- Bare `except:` in Python, `.unwrap()` in Rust, missing `set -e` in shell
- Dockerfile best practices, Terraform IAM wildcards

### 🧹 Dead Code
- Unused variables, unused imports (JS/TS, Python, Java, Go, Rust, C#)
- Duplicate code blocks

---

## CI Integration

```yaml
# GitHub Actions example
- name: Run GitAudit
  run: |
    cd cli && npm ci
    node bin/gitaudit.js .. --severity warning --json -o ../audit-report.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The CLI exits with code **1** when critical issues are found, making it suitable for CI gates.

---

## License

MIT — same as the main GitAudit project.
