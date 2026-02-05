/**
 * GitAudit UI Controller
 * Handles all UI interactions and updates
 */

class UIController {
    constructor() {
        this.currentReport = null;
        this.selectedFile = null;
        this.activeFilter = 'all';
    }
    
    /**
     * Initialize UI components
     */
    init() {
        this.bindEvents();
        this.checkAuthState();
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Login buttons
        document.getElementById('hero-login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('nav-login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        
        // Demo button
        document.getElementById('demo-btn')?.addEventListener('click', () => this.handleDemo());
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Repository search
        document.getElementById('repo-search')?.addEventListener('input', (e) => this.filterRepos(e.target.value));
        
        // External repo analysis
        document.getElementById('analyze-external')?.addEventListener('click', () => this.analyzeExternalRepo());
        document.getElementById('external-repo-url')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeExternalRepo();
        });
        
        // Cancel audit
        document.getElementById('cancel-audit')?.addEventListener('click', () => this.cancelAudit());
        
        // Results actions
        document.getElementById('new-audit-btn')?.addEventListener('click', () => this.showDashboard());
        document.getElementById('clone-with-fixes-btn')?.addEventListener('click', () => this.showCloneModal());
        document.getElementById('download-report-btn')?.addEventListener('click', () => this.downloadReport());
        
        // Modal
        document.getElementById('modal-close')?.addEventListener('click', () => this.hideCloneModal());
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideCloneModal());
        document.getElementById('modal-confirm')?.addEventListener('click', () => this.createBranchWithFixes());
        document.querySelector('.modal-overlay')?.addEventListener('click', () => this.hideCloneModal());
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterIssues(e.target.dataset.filter));
        });
        
        // Issues sort
        document.getElementById('issues-sort')?.addEventListener('change', (e) => this.sortIssues(e.target.value));
    }
    
    /**
     * Check authentication state
     */
    checkAuthState() {
        if (auth.checkAuth()) {
            this.showLoggedInState();
        } else {
            this.showLoggedOutState();
        }
    }
    
    /**
     * Handle login
     */
    handleLogin() {
        if (CONFIG.GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID') {
            // Show demo mode if OAuth not configured
            this.showAlert('OAuth not configured. Using demo mode. To enable GitHub login, set your OAuth Client ID in js/config.js');
            this.handleDemo();
        } else {
            auth.login();
        }
    }
    
    /**
     * Handle demo mode
     */
    async handleDemo() {
        await auth.demoLogin();
        this.showLoggedInState();
        this.showDashboard();
        this.loadDemoRepos();
    }
    
    /**
     * Handle logout
     */
    handleLogout() {
        auth.logout();
        this.showLoggedOutState();
        window.location.reload();
    }
    
    /**
     * Show logged in state
     */
    showLoggedInState() {
        const user = auth.getUser();
        
        // Update nav
        const navAuth = document.getElementById('nav-auth');
        if (navAuth) {
            navAuth.innerHTML = `
                <img src="${user.avatar_url}" alt="Avatar" class="avatar">
                <span>${user.login}</span>
            `;
        }
        
        // Update dashboard user info
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        if (userAvatar) userAvatar.src = user.avatar_url;
        if (userName) userName.textContent = user.name || user.login;
        
        // Hide hero, show dashboard
        this.showDashboard();
        this.loadUserRepos();
    }
    
    /**
     * Show logged out state
     */
    showLoggedOutState() {
        const navAuth = document.getElementById('nav-auth');
        if (navAuth) {
            navAuth.innerHTML = `
                <button class="btn btn-primary" id="nav-login-btn">
                    <i class="fab fa-github"></i> Sign In
                </button>
            `;
            document.getElementById('nav-login-btn')?.addEventListener('click', () => this.handleLogin());
        }
        
        // Show hero section
        this.showSection('hero-section');
    }
    
    /**
     * Show specific section
     */
    showSection(sectionId) {
        const sections = ['hero-section', 'dashboard', 'audit-progress', 'results'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.toggle('hidden', id !== sectionId);
            }
        });
    }
    
    /**
     * Show dashboard
     */
    showDashboard() {
        document.getElementById('hero-section')?.classList.add('hidden');
        document.getElementById('features')?.classList.add('hidden');
        document.getElementById('how-it-works')?.classList.add('hidden');
        this.showSection('dashboard');
    }
    
    /**
     * Switch tabs
     */
    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }
    
    /**
     * Load user repositories
     */
    async loadUserRepos() {
        const reposList = document.getElementById('repos-list');
        if (!reposList) return;
        
        reposList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading repositories...</span>
            </div>
        `;
        
        try {
            const repos = await githubAPI.getAllUserRepos();
            this.displayRepos(repos);
        } catch (error) {
            console.error('Failed to load repos:', error);
            reposList.innerHTML = `
                <div class="loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load repositories. Please try again.</span>
                </div>
            `;
        }
    }
    
    /**
     * Load demo repositories
     */
    loadDemoRepos() {
        const demoRepos = [
            { name: 'Hello-World', owner: { login: 'octocat' }, language: 'JavaScript', stargazers_count: 1500, updated_at: new Date().toISOString(), private: false },
            { name: 'Spoon-Knife', owner: { login: 'octocat' }, language: 'HTML', stargazers_count: 12000, updated_at: new Date().toISOString(), private: false },
            { name: 'git-consortium', owner: { login: 'octocat' }, language: 'Shell', stargazers_count: 500, updated_at: new Date().toISOString(), private: false }
        ];
        this.displayRepos(demoRepos);
    }
    
    /**
     * Display repositories
     */
    displayRepos(repos) {
        const reposList = document.getElementById('repos-list');
        if (!reposList) return;
        
        if (repos.length === 0) {
            reposList.innerHTML = `
                <div class="loading">
                    <i class="fas fa-folder-open"></i>
                    <span>No repositories found</span>
                </div>
            `;
            return;
        }
        
        reposList.innerHTML = repos.map(repo => `
            <div class="repo-item" data-owner="${repo.owner.login}" data-repo="${repo.name}">
                <div class="repo-info">
                    <div class="repo-name">
                        <i class="fas fa-${repo.private ? 'lock' : 'book'}"></i>
                        ${repo.name}
                    </div>
                    <div class="repo-meta">
                        ${repo.language ? `<span><i class="fas fa-circle" style="color: ${this.getLanguageColor(repo.language)}; font-size: 8px;"></i> ${repo.language}</span>` : ''}
                        <span><i class="far fa-star"></i> ${repo.stargazers_count || 0}</span>
                        <span>Updated ${this.timeAgo(repo.updated_at)}</span>
                    </div>
                </div>
                <button class="btn btn-primary">
                    <i class="fas fa-search"></i> Audit
                </button>
            </div>
        `).join('');
        
        // Add click events
        reposList.querySelectorAll('.repo-item').forEach(item => {
            item.querySelector('.btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.startAudit(item.dataset.owner, item.dataset.repo);
            });
        });
    }
    
    /**
     * Filter repositories
     */
    filterRepos(query) {
        const reposList = document.getElementById('repos-list');
        if (!reposList) return;
        
        const items = reposList.querySelectorAll('.repo-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const repoName = item.dataset.repo.toLowerCase();
            item.style.display = repoName.includes(lowerQuery) ? 'flex' : 'none';
        });
    }
    
    /**
     * Analyze external repository
     */
    async analyzeExternalRepo() {
        const urlInput = document.getElementById('external-repo-url');
        if (!urlInput) return;
        
        const url = urlInput.value.trim();
        if (!url) {
            this.showAlert('Please enter a repository URL');
            return;
        }
        
        const parsed = githubAPI.parseRepoUrl(url);
        if (!parsed) {
            this.showAlert('Invalid repository URL. Please use format: https://github.com/owner/repo');
            return;
        }
        
        // Check if repo is accessible
        const access = await githubAPI.checkRepoAccess(parsed.owner, parsed.repo);
        if (!access.accessible) {
            this.showAlert(`Cannot access repository: ${access.error}`);
            return;
        }
        
        this.startAudit(parsed.owner, parsed.repo);
    }
    
    /**
     * Start audit process
     */
    async startAudit(owner, repo) {
        // Show progress section
        this.showSection('audit-progress');
        
        // Update UI
        document.getElementById('auditing-repo-name').textContent = `${owner}/${repo}`;
        this.resetProgress();
        
        try {
            const report = await auditEngine.audit(owner, repo, (progress) => {
                this.updateProgress(progress);
            });
            
            this.currentReport = report;
            this.displayResults(report);
            
        } catch (error) {
            if (error.message !== 'Audit cancelled') {
                console.error('Audit failed:', error);
                this.showAlert(`Audit failed: ${error.message}`);
            }
            this.showDashboard();
        }
    }
    
    /**
     * Cancel ongoing audit
     */
    cancelAudit() {
        auditEngine.cancel();
    }
    
    /**
     * Reset progress UI
     */
    resetProgress() {
        const progressFill = document.querySelector('#audit-progress-bar .progress-fill');
        const progressText = document.getElementById('progress-text');
        const filesCount = document.getElementById('files-count');
        const linesCount = document.getElementById('lines-count');
        
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        if (filesCount) filesCount.textContent = '0';
        if (linesCount) linesCount.textContent = '0';
        
        // Reset status items
        document.querySelectorAll('.status-item').forEach((item, index) => {
            item.classList.remove('active', 'completed');
            if (index === 0) item.classList.add('active');
        });
    }
    
    /**
     * Update progress UI
     */
    updateProgress(progress) {
        const progressFill = document.querySelector('#audit-progress-bar .progress-fill');
        const progressText = document.getElementById('progress-text');
        const filesCount = document.getElementById('files-count');
        const linesCount = document.getElementById('lines-count');
        
        if (progressFill) progressFill.style.width = `${progress.percent}%`;
        if (progressText) progressText.textContent = `${Math.round(progress.percent)}%`;
        if (filesCount) filesCount.textContent = progress.filesProcessed.toLocaleString();
        if (linesCount) linesCount.textContent = progress.linesProcessed.toLocaleString();
        
        // Update status items based on progress
        const statusItems = document.querySelectorAll('.status-item');
        const phases = [0, 10, 30, 60, 80, 95];
        
        statusItems.forEach((item, index) => {
            if (progress.percent >= phases[index + 1]) {
                item.classList.remove('active');
                item.classList.add('completed');
            } else if (progress.percent >= phases[index]) {
                item.classList.add('active');
            }
        });
    }
    
    /**
     * Display results
     */
    displayResults(report) {
        this.showSection('results');
        
        // Update repository name
        document.getElementById('results-repo-name').textContent = report.repository;
        
        // Update scores
        this.updateScores(report.scores);
        
        // Update statistics
        this.updateStatistics(report.statistics);
        
        // Update file tree
        this.buildFileTree(report.files, report.issues);
        
        // Update issues list
        this.displayIssues(report.issues);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    /**
     * Update score displays
     */
    updateScores(scores) {
        // Overall score - show as letter grade
        const scoreValue = document.getElementById('overall-score-value');
        const scoreFill = document.getElementById('score-circle-fill');
        
        // Convert numeric score to letter grade
        const letterGrade = this.getLetterGrade(scores.overall);
        if (scoreValue) scoreValue.textContent = letterGrade;
        if (scoreFill) {
            // Circle circumference is 2 * π * r = 283
            const offset = 283 - (scores.overall / 100) * 283;
            scoreFill.style.strokeDashoffset = offset;
        }
        
        // Individual scores
        const scoreTypes = ['security', 'performance', 'quality', 'cleanliness'];
        scoreTypes.forEach(type => {
            const bar = document.getElementById(`${type}-score-bar`);
            const value = document.getElementById(`${type}-score`);
            
            if (bar) bar.style.width = `${scores[type]}%`;
            if (value) value.textContent = scores[type];
        });
    }
    
    /**
     * Convert numeric score to letter grade
     */
    getLetterGrade(score) {
        if (score >= 97) return 'A+';
        if (score >= 93) return 'A';
        if (score >= 90) return 'A-';
        if (score >= 87) return 'B+';
        if (score >= 83) return 'B';
        if (score >= 80) return 'B-';
        if (score >= 77) return 'C+';
        if (score >= 73) return 'C';
        if (score >= 70) return 'C-';
        if (score >= 67) return 'D+';
        if (score >= 63) return 'D';
        if (score >= 60) return 'D-';
        return 'F';
    }
    
    /**
     * Update statistics displays
     */
    updateStatistics(stats) {
        document.getElementById('stat-files').textContent = stats.analyzedFiles.toLocaleString();
        document.getElementById('stat-lines').textContent = stats.analyzedLines.toLocaleString();
        document.getElementById('stat-critical').textContent = stats.criticalIssues.toLocaleString();
        document.getElementById('stat-warnings').textContent = stats.warnings.toLocaleString();
        document.getElementById('stat-suggestions').textContent = stats.suggestions.toLocaleString();
    }
    
    /**
     * Build file tree
     */
    buildFileTree(files, issues) {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;
        
        // Group files by directory
        const tree = {};
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = index === parts.length - 1 ? { _file: file } : {};
                }
                current = current[part];
            });
        });
        
        // Count issues per file
        const issuesByFile = {};
        issues.forEach(issue => {
            if (!issuesByFile[issue.file]) {
                issuesByFile[issue.file] = { critical: 0, warning: 0, info: 0 };
            }
            issuesByFile[issue.file][issue.severity === 'critical' ? 'critical' : issue.severity === 'warning' ? 'warning' : 'info']++;
        });
        
        // Render tree
        const renderTree = (node, path = '') => {
            let html = '';
            
            Object.keys(node).sort().forEach(key => {
                if (key === '_file') return;
                
                const fullPath = path ? `${path}/${key}` : key;
                const item = node[key];
                const isFile = item._file;
                const issueCount = issuesByFile[fullPath];
                
                if (isFile) {
                    const severity = issueCount ? 
                        (issueCount.critical > 0 ? 'critical' : issueCount.warning > 0 ? 'warning' : 'info') : null;
                    const total = issueCount ? issueCount.critical + issueCount.warning + issueCount.info : 0;
                    
                    html += `
                        <div class="tree-item" data-path="${fullPath}">
                            <i class="fas fa-file-code"></i>
                            <span class="file-name">${key}</span>
                            ${total > 0 ? `<span class="issue-count ${severity}">${total}</span>` : ''}
                        </div>
                    `;
                } else {
                    html += `
                        <div class="tree-item" data-path="${fullPath}">
                            <i class="fas fa-folder"></i>
                            <span class="file-name">${key}</span>
                        </div>
                        <div class="tree-folder">
                            ${renderTree(item, fullPath)}
                        </div>
                    `;
                }
            });
            
            return html;
        };
        
        fileTree.innerHTML = renderTree(tree);
        
        // Add click events
        fileTree.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', () => {
                // Clear previous selection
                fileTree.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                // Filter issues by file
                this.selectedFile = item.dataset.path;
                this.filterIssuesByFile(item.dataset.path);
            });
        });
    }
    
    /**
     * Display issues
     */
    displayIssues(issues) {
        const issuesList = document.getElementById('issues-list');
        if (!issuesList) return;
        
        if (issues.length === 0) {
            issuesList.innerHTML = `
                <div class="loading">
                    <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                    <span>No issues found! Your code looks great.</span>
                </div>
            `;
            return;
        }
        
        issuesList.innerHTML = issues.map(issue => this.renderIssue(issue)).join('');
    }
    
    /**
     * Render single issue
     */
    renderIssue(issue) {
        const severityIcon = issue.severity === 'critical' ? 'exclamation-triangle' : 
                            issue.severity === 'warning' ? 'exclamation-circle' : 'info-circle';
        
        const codeHtml = issue.code ? (
            Array.isArray(issue.code) ? 
                issue.code.map(line => `
                    <div class="${line.highlight ? 'highlight' : ''}">
                        <span class="line-number">${line.number}</span>${this.escapeHtml(line.content)}
                    </div>
                `).join('') :
                `<div>${this.escapeHtml(issue.code)}</div>`
        ) : '';
        
        return `
            <div class="issue-item ${issue.severity}" data-type="${issue.type}" data-severity="${issue.severity}" data-file="${issue.file}">
                <div class="issue-header">
                    <div class="issue-title">
                        <i class="fas fa-${severityIcon}"></i>
                        ${this.escapeHtml(issue.title)}
                    </div>
                    <span class="issue-badge ${issue.type}">${issue.type}</span>
                </div>
                <div class="issue-location">${issue.file}:${issue.line}</div>
                <div class="issue-description">${this.escapeHtml(issue.description)}</div>
                ${codeHtml ? `<div class="issue-code">${codeHtml}</div>` : ''}
                ${issue.suggestion ? `
                    <div class="issue-suggestion">
                        <strong><i class="fas fa-lightbulb"></i> Suggestion</strong>
                        ${this.escapeHtml(issue.suggestion.text)}
                        ${issue.suggestion.code ? `<code>${this.escapeHtml(issue.suggestion.code)}</code>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Filter issues by type
     */
    filterIssues(filter) {
        this.activeFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Filter issue items
        const issues = document.querySelectorAll('.issue-item');
        issues.forEach(issue => {
            const severity = issue.dataset.severity;
            const matchesFilter = filter === 'all' || severity === filter;
            const matchesFile = !this.selectedFile || issue.dataset.file === this.selectedFile;
            issue.style.display = matchesFilter && matchesFile ? 'block' : 'none';
        });
    }
    
    /**
     * Filter issues by file
     */
    filterIssuesByFile(filePath) {
        const issues = document.querySelectorAll('.issue-item');
        issues.forEach(issue => {
            const matchesFilter = this.activeFilter === 'all' || issue.dataset.severity === this.activeFilter;
            const matchesFile = issue.dataset.file.startsWith(filePath);
            issue.style.display = matchesFilter && matchesFile ? 'block' : 'none';
        });
    }
    
    /**
     * Sort issues
     */
    sortIssues(sortBy) {
        const issuesList = document.getElementById('issues-list');
        if (!issuesList || !this.currentReport) return;
        
        let sortedIssues = [...this.currentReport.issues];
        
        switch (sortBy) {
            case 'severity':
                const severityOrder = { critical: 0, warning: 1, info: 2 };
                sortedIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
                break;
            case 'file':
                sortedIssues.sort((a, b) => a.file.localeCompare(b.file));
                break;
            case 'type':
                sortedIssues.sort((a, b) => a.type.localeCompare(b.type));
                break;
        }
        
        this.displayIssues(sortedIssues);
        this.filterIssues(this.activeFilter);
    }
    
    /**
     * Show clone modal
     */
    showCloneModal() {
        const modal = document.getElementById('clone-modal');
        const branchName = document.getElementById('branch-name');
        const fixesList = document.getElementById('fixes-list');
        
        if (!modal || !this.currentReport) return;
        
        // Generate branch name
        const repoName = this.currentReport.repository.replace('/', '-');
        branchName.value = `audit-fixes-${repoName}-${Date.now()}`;
        
        // List fixes that can be applied
        const fixableIssues = this.currentReport.issues.filter(i => i.suggestion && i.suggestion.code);
        
        if (fixableIssues.length === 0) {
            fixesList.innerHTML = '<div class="fix-item">No automatic fixes available</div>';
        } else {
            fixesList.innerHTML = fixableIssues.slice(0, 20).map(issue => `
                <div class="fix-item">
                    <input type="checkbox" checked data-issue-id="${issue.id}">
                    <span>${this.escapeHtml(issue.title)} - ${issue.file}:${issue.line}</span>
                </div>
            `).join('');
        }
        
        modal.classList.remove('hidden');
    }
    
    /**
     * Hide clone modal
     */
    hideCloneModal() {
        const modal = document.getElementById('clone-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    /**
     * Create branch with fixes
     */
    async createBranchWithFixes() {
        const branchName = document.getElementById('branch-name').value.trim();
        
        if (!branchName) {
            this.showAlert('Please enter a branch name');
            return;
        }
        
        if (!auth.checkAuth() || auth.getToken() === 'demo-token') {
            this.showAlert('Please sign in with GitHub to create branches');
            return;
        }
        
        // This would create a branch in the GitAudit repo with the fixes
        // For now, show a message
        this.showAlert(`Branch "${branchName}" would be created in NagusameCS/GitAudit with the selected fixes. This feature requires additional backend configuration.`);
        
        this.hideCloneModal();
    }
    
    /**
     * Download report
     */
    downloadReport() {
        if (!this.currentReport) return;
        
        const reportJson = JSON.stringify(this.currentReport, null, 2);
        const blob = new Blob([reportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gitaudit-report-${this.currentReport.repository.replace('/', '-')}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show alert message
     */
    showAlert(message) {
        // Simple alert - could be enhanced with a toast system
        alert(message);
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get language color
     */
    getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f1e05a',
            'TypeScript': '#3178c6',
            'Python': '#3572A5',
            'Java': '#b07219',
            'Ruby': '#701516',
            'Go': '#00ADD8',
            'Rust': '#dea584',
            'C++': '#f34b7d',
            'C': '#555555',
            'C#': '#178600',
            'PHP': '#4F5D95',
            'HTML': '#e34c26',
            'CSS': '#563d7c',
            'Shell': '#89e051',
            'Swift': '#F05138',
            'Kotlin': '#A97BFF'
        };
        return colors[language] || '#8b949e';
    }
    
    /**
     * Format time ago
     */
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }
}

// Export singleton instance
const ui = new UIController();
