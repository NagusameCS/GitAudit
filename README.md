# GitAudit 🛡️

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-success)](https://nagusame.github.io/GitAudit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Comprehensive code analysis powered by your browser.** GitAudit is a client-side repository analysis tool that helps you identify security vulnerabilities, performance issues, code quality problems, and unused code in any GitHub repository.

![GitAudit Screenshot](assets/screenshot.png)

## ✨ Features

### 🔒 Security Analysis
- Detect exposed API keys, secrets, and passwords
- Find hardcoded credentials (AWS, GitHub, OpenAI, Slack, etc.)
- Identify SQL injection vulnerabilities
- Flag dangerous `eval()` usage
- Detect potential XSS via innerHTML
- Find weak cryptographic algorithms (MD5, SHA1)
- Locate hardcoded IP addresses

### ⚡ Performance Optimization
- Identify inefficient loop patterns
- Suggest JIT-style optimizations (e.g., replace loop adding 1 ten times with adding 10)
- Detect synchronous file operations in Node.js
- Find nested loops with O(n²) complexity
- Flag string concatenation in loops
- Detect multiple array iterations that could be combined
- Find console statements that should be removed

### 📝 Code Quality
- Check for overly long lines (>120 chars)
- Detect long functions (>50 lines)
- Find magic numbers without named constants
- Locate TODO/FIXME/HACK comments
- Flag non-descriptive variable names
- Identify commented-out code
- Check for missing documentation on exported functions
- Detect empty catch blocks

### 🧹 Dead Code Detection
- Find unused variables and functions
- Identify unused imports
- Detect potentially dead files

### 📊 Comprehensive Reports
- Overall health score with breakdown by category
- Interactive file tree with issue highlighting
- Detailed issue descriptions with suggestions
- Code snippets with problematic lines highlighted
- Automatic fix suggestions
- Export reports as JSON

## 🚀 Getting Started

### Use GitAudit Online

Visit [https://nagusame.github.io/GitAudit](https://nagusame.github.io/GitAudit) to use GitAudit instantly.

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/NagusameCS/GitAudit.git
   cd GitAudit
   ```

2. Serve the files with any HTTP server:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js
   npx serve
   
   # Using PHP
   php -S localhost:8080
   ```

3. Open `http://localhost:8080` in your browser

### Configure GitHub OAuth (Optional)

To enable GitHub sign-in for accessing private repositories:

1. Create a GitHub OAuth App at [https://github.com/settings/developers](https://github.com/settings/developers)

2. Set the callback URL to your deployment URL + `/callback.html`

3. Update `js/config.js` with your Client ID:
   ```javascript
   GITHUB_CLIENT_ID: 'your_client_id_here',
   CALLBACK_URL: 'https://your-domain.com/callback.html',
   ```

4. For production, you'll need a backend proxy to exchange the OAuth code for an access token (to protect your client secret)

## 🏗️ Architecture

GitAudit runs entirely in the browser:

```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   UI        │  │  GitHub API │  │  Audit Engine   │  │
│  │  Controller │◄─┤   Wrapper   │◄─┤  (Analysis)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  GitHub REST API                         │
└─────────────────────────────────────────────────────────┘
```

- **100% Client-Side**: Your code never leaves your machine
- **No Backend Required**: All analysis happens in your browser
- **Privacy First**: No data is sent to any server except GitHub's API

## 📁 Project Structure

```
GitAudit/
├── index.html          # Main application page
├── callback.html       # OAuth callback handler
├── 404.html           # SPA routing fallback
├── _config.yml        # GitHub Pages config
├── .nojekyll          # Bypass Jekyll processing
├── css/
│   └── styles.css     # Application styles
├── js/
│   ├── config.js      # Configuration settings
│   ├── auth.js        # GitHub OAuth handling
│   ├── github-api.js  # GitHub API wrapper
│   ├── audit-engine.js # Core analysis engine
│   ├── ui.js          # UI controller
│   └── app.js         # Application entry point
└── assets/
    └── favicon.svg    # Application icon
```

## 🔧 Configuration

Edit `js/config.js` to customize:

```javascript
const CONFIG = {
    // GitHub OAuth (optional)
    GITHUB_CLIENT_ID: 'YOUR_GITHUB_CLIENT_ID',
    CALLBACK_URL: 'https://your-domain.com/callback.html',
    
    // Audit settings
    AUDIT: {
        MAX_FILE_SIZE: 1024 * 1024,  // 1MB max file size
        SUPPORTED_EXTENSIONS: [...],  // File types to analyze
        IGNORE_PATTERNS: [...],       // Directories to skip
    }
};
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Commit**: `git commit -m 'Add amazing feature'`
5. **Push**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Branch Naming Convention

When you use the "Create Branch with Fixes" feature, GitAudit creates branches in this repository following the pattern:
```
audit-fixes-{owner}-{repo}-{timestamp}
```

This helps track all audit fixes and contributes to the repository's branch count!

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GitHub REST API](https://docs.github.com/en/rest) for repository access
- [Font Awesome](https://fontawesome.com/) for icons
- The open-source community for inspiration

---

<p align="center">
  Made with ❤️ for better code quality
</p>