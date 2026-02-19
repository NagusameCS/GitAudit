/**
 * GitAudit CLI — Comprehensive Language Definitions
 * Covers every major programming language with language-specific analysis patterns
 */

const LANGUAGES = {
    // ─── Web / Frontend ────────────────────────────────────────────
    '.js':       { name: 'JavaScript',          family: 'js',      comment: '//' },
    '.mjs':      { name: 'JavaScript (ESM)',    family: 'js',      comment: '//' },
    '.cjs':      { name: 'JavaScript (CJS)',    family: 'js',      comment: '//' },
    '.jsx':      { name: 'React JSX',           family: 'js',      comment: '//' },
    '.ts':       { name: 'TypeScript',          family: 'ts',      comment: '//' },
    '.tsx':      { name: 'TypeScript React',    family: 'ts',      comment: '//' },
    '.vue':      { name: 'Vue',                 family: 'js',      comment: '//' },
    '.svelte':   { name: 'Svelte',              family: 'js',      comment: '//' },
    '.astro':    { name: 'Astro',               family: 'js',      comment: '//' },
    '.coffee':   { name: 'CoffeeScript',        family: 'coffee',  comment: '#'  },

    // ─── CSS / Styling ─────────────────────────────────────────────
    '.css':      { name: 'CSS',                 family: 'css',     comment: '/*' },
    '.scss':     { name: 'SCSS',                family: 'css',     comment: '//' },
    '.sass':     { name: 'Sass',                family: 'css',     comment: '//' },
    '.less':     { name: 'Less',                family: 'css',     comment: '//' },
    '.styl':     { name: 'Stylus',              family: 'css',     comment: '//' },

    // ─── Markup ────────────────────────────────────────────────────
    '.html':     { name: 'HTML',                family: 'html',    comment: '<!--' },
    '.htm':      { name: 'HTML',                family: 'html',    comment: '<!--' },
    '.xml':      { name: 'XML',                 family: 'xml',     comment: '<!--' },
    '.xhtml':    { name: 'XHTML',               family: 'html',    comment: '<!--' },
    '.svg':      { name: 'SVG',                 family: 'xml',     comment: '<!--' },
    '.pug':      { name: 'Pug',                 family: 'html',    comment: '//' },
    '.ejs':      { name: 'EJS',                 family: 'html',    comment: '<%#' },
    '.hbs':      { name: 'Handlebars',          family: 'html',    comment: '{{!' },
    '.mustache': { name: 'Mustache',            family: 'html',    comment: '{{!' },
    '.njk':      { name: 'Nunjucks',            family: 'html',    comment: '{#' },
    '.twig':     { name: 'Twig',                family: 'html',    comment: '{#' },
    '.erb':      { name: 'ERB',                 family: 'html',    comment: '<%#' },
    '.haml':     { name: 'Haml',                family: 'html',    comment: '-#' },
    '.slim':     { name: 'Slim',                family: 'html',    comment: '/' },
    '.blade.php':{ name: 'Blade',               family: 'html',    comment: '{{--' },
    '.jsp':      { name: 'JSP',                 family: 'html',    comment: '<%--' },

    // ─── Python ────────────────────────────────────────────────────
    '.py':       { name: 'Python',              family: 'python',  comment: '#'  },
    '.pyw':      { name: 'Python (Windows)',     family: 'python',  comment: '#'  },
    '.pyx':      { name: 'Cython',              family: 'python',  comment: '#'  },
    '.pxd':      { name: 'Cython Declaration',  family: 'python',  comment: '#'  },
    '.pyi':      { name: 'Python Stub',         family: 'python',  comment: '#'  },
    '.ipynb':    { name: 'Jupyter Notebook',    family: 'python',  comment: '#'  },

    // ─── Ruby ──────────────────────────────────────────────────────
    '.rb':       { name: 'Ruby',                family: 'ruby',    comment: '#'  },
    '.rake':     { name: 'Rake',                family: 'ruby',    comment: '#'  },
    '.gemspec':  { name: 'Gemspec',             family: 'ruby',    comment: '#'  },

    // ─── PHP ───────────────────────────────────────────────────────
    '.php':      { name: 'PHP',                 family: 'php',     comment: '//' },
    '.phtml':    { name: 'PHP Template',        family: 'php',     comment: '//' },

    // ─── JVM ───────────────────────────────────────────────────────
    '.java':     { name: 'Java',                family: 'java',    comment: '//' },
    '.kt':       { name: 'Kotlin',              family: 'kotlin',  comment: '//' },
    '.kts':      { name: 'Kotlin Script',       family: 'kotlin',  comment: '//' },
    '.scala':    { name: 'Scala',               family: 'scala',   comment: '//' },
    '.groovy':   { name: 'Groovy',              family: 'groovy',  comment: '//' },
    '.gradle':   { name: 'Gradle',              family: 'groovy',  comment: '//' },
    '.clj':      { name: 'Clojure',             family: 'clojure', comment: ';'  },
    '.cljs':     { name: 'ClojureScript',       family: 'clojure', comment: ';'  },

    // ─── .NET ──────────────────────────────────────────────────────
    '.cs':       { name: 'C#',                  family: 'csharp',  comment: '//' },
    '.csx':      { name: 'C# Script',           family: 'csharp',  comment: '//' },
    '.fs':       { name: 'F#',                  family: 'fsharp',  comment: '//' },
    '.fsx':      { name: 'F# Script',           family: 'fsharp',  comment: '//' },
    '.vb':       { name: 'Visual Basic',        family: 'vb',      comment: "'"  },
    '.razor':    { name: 'Razor',               family: 'csharp',  comment: '//' },
    '.cshtml':   { name: 'Razor HTML',          family: 'csharp',  comment: '//' },

    // ─── Systems ───────────────────────────────────────────────────
    '.c':        { name: 'C',                   family: 'c',       comment: '//' },
    '.h':        { name: 'C Header',            family: 'c',       comment: '//' },
    '.cpp':      { name: 'C++',                 family: 'cpp',     comment: '//' },
    '.cxx':      { name: 'C++',                 family: 'cpp',     comment: '//' },
    '.cc':       { name: 'C++',                 family: 'cpp',     comment: '//' },
    '.hpp':      { name: 'C++ Header',          family: 'cpp',     comment: '//' },
    '.hxx':      { name: 'C++ Header',          family: 'cpp',     comment: '//' },
    '.m':        { name: 'Objective-C',         family: 'objc',    comment: '//' },
    '.mm':       { name: 'Objective-C++',       family: 'objc',    comment: '//' },
    '.rs':       { name: 'Rust',                family: 'rust',    comment: '//' },
    '.go':       { name: 'Go',                  family: 'go',      comment: '//' },
    '.zig':      { name: 'Zig',                 family: 'zig',     comment: '//' },
    '.nim':      { name: 'Nim',                 family: 'nim',     comment: '#'  },
    '.v':        { name: 'V',                   family: 'vlang',   comment: '//' },
    '.d':        { name: 'D',                   family: 'd',       comment: '//' },
    '.ada':      { name: 'Ada',                 family: 'ada',     comment: '--' },
    '.adb':      { name: 'Ada Body',            family: 'ada',     comment: '--' },
    '.ads':      { name: 'Ada Spec',            family: 'ada',     comment: '--' },
    '.pas':      { name: 'Pascal',              family: 'pascal',  comment: '//' },
    '.pp':       { name: 'Pascal',              family: 'pascal',  comment: '//' },
    '.f':        { name: 'Fortran',             family: 'fortran', comment: '!' },
    '.f90':      { name: 'Fortran 90',          family: 'fortran', comment: '!' },
    '.f95':      { name: 'Fortran 95',          family: 'fortran', comment: '!' },
    '.f03':      { name: 'Fortran 2003',        family: 'fortran', comment: '!' },
    '.for':      { name: 'Fortran',             family: 'fortran', comment: '!' },
    '.cob':      { name: 'COBOL',               family: 'cobol',   comment: '*>' },
    '.cbl':      { name: 'COBOL',               family: 'cobol',   comment: '*>' },

    // ─── Swift / Apple ─────────────────────────────────────────────
    '.swift':    { name: 'Swift',               family: 'swift',   comment: '//' },

    // ─── Functional ────────────────────────────────────────────────
    '.hs':       { name: 'Haskell',             family: 'haskell', comment: '--' },
    '.lhs':      { name: 'Literate Haskell',    family: 'haskell', comment: '--' },
    '.ml':       { name: 'OCaml',               family: 'ocaml',   comment: '(*' },
    '.mli':      { name: 'OCaml Interface',     family: 'ocaml',   comment: '(*' },
    '.ex':       { name: 'Elixir',              family: 'elixir',  comment: '#'  },
    '.exs':      { name: 'Elixir Script',       family: 'elixir',  comment: '#'  },
    '.erl':      { name: 'Erlang',              family: 'erlang',  comment: '%'  },
    '.hrl':      { name: 'Erlang Header',       family: 'erlang',  comment: '%'  },
    '.elm':      { name: 'Elm',                 family: 'elm',     comment: '--' },
    '.gleam':    { name: 'Gleam',               family: 'gleam',   comment: '//' },
    '.rkt':      { name: 'Racket',              family: 'racket',  comment: ';'  },
    '.scm':      { name: 'Scheme',              family: 'scheme',  comment: ';'  },
    '.lisp':     { name: 'Common Lisp',         family: 'lisp',    comment: ';'  },
    '.cl':       { name: 'Common Lisp',         family: 'lisp',    comment: ';'  },

    // ─── Scripting ─────────────────────────────────────────────────
    '.sh':       { name: 'Shell',               family: 'shell',   comment: '#'  },
    '.bash':     { name: 'Bash',                family: 'shell',   comment: '#'  },
    '.zsh':      { name: 'Zsh',                 family: 'shell',   comment: '#'  },
    '.fish':     { name: 'Fish',                family: 'shell',   comment: '#'  },
    '.ps1':      { name: 'PowerShell',          family: 'powershell', comment: '#' },
    '.psm1':     { name: 'PowerShell Module',   family: 'powershell', comment: '#' },
    '.psd1':     { name: 'PowerShell Data',     family: 'powershell', comment: '#' },
    '.bat':      { name: 'Batch',               family: 'batch',   comment: 'REM' },
    '.cmd':      { name: 'Batch',               family: 'batch',   comment: 'REM' },
    '.lua':      { name: 'Lua',                 family: 'lua',     comment: '--' },
    '.pl':       { name: 'Perl',                family: 'perl',    comment: '#'  },
    '.pm':       { name: 'Perl Module',         family: 'perl',    comment: '#'  },
    '.r':        { name: 'R',                   family: 'r',       comment: '#'  },
    '.R':        { name: 'R',                   family: 'r',       comment: '#'  },
    '.rmd':      { name: 'R Markdown',          family: 'r',       comment: '#'  },
    '.jl':       { name: 'Julia',               family: 'julia',   comment: '#'  },
    '.tcl':      { name: 'Tcl',                 family: 'tcl',     comment: '#'  },
    '.awk':      { name: 'AWK',                 family: 'awk',     comment: '#'  },
    '.sed':      { name: 'Sed',                 family: 'sed',     comment: '#'  },

    // ─── Mobile ────────────────────────────────────────────────────
    '.dart':     { name: 'Dart',                family: 'dart',    comment: '//' },

    // ─── Data / Config ─────────────────────────────────────────────
    '.json':     { name: 'JSON',                family: 'json',    comment: null },
    '.jsonc':    { name: 'JSON with Comments',  family: 'json',    comment: '//' },
    '.json5':    { name: 'JSON5',               family: 'json',    comment: '//' },
    '.yaml':     { name: 'YAML',                family: 'yaml',    comment: '#'  },
    '.yml':      { name: 'YAML',                family: 'yaml',    comment: '#'  },
    '.toml':     { name: 'TOML',                family: 'toml',    comment: '#'  },
    '.ini':      { name: 'INI',                 family: 'ini',     comment: ';'  },
    '.cfg':      { name: 'Config',              family: 'ini',     comment: '#'  },
    '.conf':     { name: 'Config',              family: 'ini',     comment: '#'  },
    '.env':      { name: 'Environment',         family: 'env',     comment: '#'  },
    '.properties': { name: 'Properties',        family: 'properties', comment: '#' },
    '.csv':      { name: 'CSV',                 family: 'csv',     comment: null },

    // ─── Query ─────────────────────────────────────────────────────
    '.sql':      { name: 'SQL',                 family: 'sql',     comment: '--' },
    '.graphql':  { name: 'GraphQL',             family: 'graphql', comment: '#'  },
    '.gql':      { name: 'GraphQL',             family: 'graphql', comment: '#'  },
    '.prisma':   { name: 'Prisma',              family: 'prisma',  comment: '//' },

    // ─── Docs ──────────────────────────────────────────────────────
    '.md':       { name: 'Markdown',            family: 'markdown', comment: null },
    '.mdx':      { name: 'MDX',                 family: 'markdown', comment: null },
    '.rst':      { name: 'reStructuredText',    family: 'rst',     comment: '..' },
    '.tex':      { name: 'LaTeX',               family: 'latex',   comment: '%'  },
    '.txt':      { name: 'Plain Text',          family: 'text',    comment: null },
    '.adoc':     { name: 'AsciiDoc',            family: 'asciidoc', comment: '//' },

    // ─── Infrastructure / DevOps ───────────────────────────────────
    '.tf':       { name: 'Terraform',           family: 'hcl',     comment: '#'  },
    '.hcl':      { name: 'HCL',                 family: 'hcl',     comment: '#'  },
    '.tfvars':   { name: 'Terraform Vars',      family: 'hcl',     comment: '#'  },
    '.proto':    { name: 'Protocol Buffers',    family: 'proto',   comment: '//' },
    '.thrift':   { name: 'Thrift',              family: 'thrift',  comment: '//' },
    '.nix':      { name: 'Nix',                 family: 'nix',     comment: '#'  },
    '.dhall':    { name: 'Dhall',               family: 'dhall',   comment: '--' },

    // ─── WebAssembly ───────────────────────────────────────────────
    '.wat':      { name: 'WebAssembly Text',    family: 'wasm',    comment: ';;' },
    '.wast':     { name: 'WebAssembly Script',  family: 'wasm',    comment: ';;' },

    // ─── Smart Contracts ───────────────────────────────────────────
    '.sol':      { name: 'Solidity',            family: 'solidity', comment: '//' },
    '.vy':       { name: 'Vyper',               family: 'vyper',   comment: '#'  },
    '.move':     { name: 'Move',                family: 'move',    comment: '//' },

    // ─── Game Dev ──────────────────────────────────────────────────
    '.gd':       { name: 'GDScript',            family: 'gdscript', comment: '#' },
    '.gdshader': { name: 'Godot Shader',        family: 'shader',  comment: '//' },
    '.shader':   { name: 'Unity Shader',        family: 'shader',  comment: '//' },
    '.hlsl':     { name: 'HLSL',                family: 'shader',  comment: '//' },
    '.glsl':     { name: 'GLSL',                family: 'shader',  comment: '//' },
    '.wgsl':     { name: 'WGSL',                family: 'shader',  comment: '//' },
};

/**
 * Filename-based language detection (files without typical extensions)
 */
const FILENAME_LANGUAGES = {
    'Dockerfile':     { name: 'Dockerfile',       family: 'docker',    comment: '#' },
    'docker-compose.yml': { name: 'Docker Compose', family: 'yaml',   comment: '#' },
    'docker-compose.yaml': { name: 'Docker Compose', family: 'yaml',  comment: '#' },
    'Makefile':       { name: 'Makefile',          family: 'make',     comment: '#' },
    'GNUmakefile':    { name: 'Makefile',          family: 'make',     comment: '#' },
    'CMakeLists.txt': { name: 'CMake',             family: 'cmake',    comment: '#' },
    'Gemfile':        { name: 'Gemfile',           family: 'ruby',     comment: '#' },
    'Rakefile':       { name: 'Rakefile',          family: 'ruby',     comment: '#' },
    'Vagrantfile':    { name: 'Vagrantfile',       family: 'ruby',     comment: '#' },
    'Cargo.toml':     { name: 'Cargo Config',      family: 'toml',     comment: '#' },
    'Cargo.lock':     { name: 'Cargo Lock',        family: 'toml',     comment: '#' },
    'go.mod':         { name: 'Go Module',         family: 'go',       comment: '//' },
    'go.sum':         { name: 'Go Checksum',       family: 'text',     comment: null },
    'package.json':   { name: 'npm Config',        family: 'json',     comment: null },
    'tsconfig.json':  { name: 'TypeScript Config', family: 'json',     comment: null },
    'webpack.config.js': { name: 'Webpack Config', family: 'js',       comment: '//' },
    'vite.config.ts':    { name: 'Vite Config',    family: 'ts',       comment: '//' },
    'vite.config.js':    { name: 'Vite Config',    family: 'js',       comment: '//' },
    '.gitignore':     { name: 'Git Ignore',        family: 'gitignore', comment: '#' },
    '.dockerignore':  { name: 'Docker Ignore',     family: 'gitignore', comment: '#' },
    '.editorconfig':  { name: 'EditorConfig',      family: 'ini',      comment: '#' },
    '.eslintrc':      { name: 'ESLint Config',     family: 'json',     comment: null },
    '.prettierrc':    { name: 'Prettier Config',   family: 'json',     comment: null },
    'Pipfile':        { name: 'Pipfile',           family: 'toml',     comment: '#' },
    'Procfile':       { name: 'Procfile',          family: 'text',     comment: '#' },
    'Jenkinsfile':    { name: 'Jenkinsfile',       family: 'groovy',   comment: '//' },
    'justfile':       { name: 'Justfile',          family: 'make',     comment: '#' },
    'BUILD':          { name: 'Bazel',             family: 'python',   comment: '#' },
    'BUILD.bazel':    { name: 'Bazel',             family: 'python',   comment: '#' },
    'WORKSPACE':      { name: 'Bazel Workspace',   family: 'python',   comment: '#' },
    '.bazelrc':       { name: 'Bazel Config',      family: 'ini',      comment: '#' },
    'meson.build':    { name: 'Meson',             family: 'python',   comment: '#' },
    'SConstruct':     { name: 'SCons',             family: 'python',   comment: '#' },
    'SConscript':     { name: 'SCons',             family: 'python',   comment: '#' },
    'flake.nix':      { name: 'Nix Flake',         family: 'nix',      comment: '#' },
    'default.nix':    { name: 'Nix',               family: 'nix',      comment: '#' },
    'shell.nix':      { name: 'Nix Shell',         family: 'nix',      comment: '#' },
};

/**
 * Binary / non-analyzable extensions to skip
 */
const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.tiff', '.webp', '.avif',
    '.svg', // SVG can be analyzed but is often auto-generated
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.flac', '.ogg', '.webm', '.mkv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z', '.xz', '.zst',
    '.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.o', '.obj',
    '.class', '.jar', '.war', '.pyc', '.pyo', '.whl', '.egg',
    '.db', '.sqlite', '.sqlite3', '.mdb',
    '.bin', '.dat', '.iso', '.img', '.dmg',
    '.lock', // package-lock.json, yarn.lock, etc.
    '.map',  // source maps
    '.min.js', '.min.css', // minified bundles
]);

/**
 * Directories to always ignore
 */
const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg', '.bzr',
    'vendor', 'vendors', 'third_party', '3rdparty',
    'dist', 'build', 'out', 'output', '_build', 'target',
    '.next', '.nuxt', '.output', '.vercel', '.netlify',
    '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
    'venv', '.venv', 'env', '.env',  // Python virtual envs
    'coverage', '.nyc_output', '.coverage',
    'bin', 'obj',                      // .NET
    '.gradle', '.idea', '.vscode', '.vs',
    '.dart_tool', '.pub-cache',
    'Pods',                            // iOS CocoaPods
    '.terraform', '.terragrunt-cache',
    'zig-cache', 'zig-out',
    '.cargo',
    'elm-stuff',
    '_deps',                           // CMake deps
    'bower_components',
    '.cache', '.parcel-cache',
    'tmp', 'temp',
    '.turbo',
    '.nx',
    'deps', '_opam',                   // OCaml
]);

function getLanguage(filePath) {
    const path = require('path');
    const basename = path.basename(filePath);

    // Check filename-based detection first
    if (FILENAME_LANGUAGES[basename]) {
        return FILENAME_LANGUAGES[basename];
    }

    // Check compound extensions (e.g. .blade.php)
    const compoundExt = basename.includes('.') ?
        '.' + basename.split('.').slice(1).join('.') : '';
    if (compoundExt && LANGUAGES[compoundExt]) {
        return LANGUAGES[compoundExt];
    }

    // Standard extension
    const ext = path.extname(filePath).toLowerCase();
    if (LANGUAGES[ext]) {
        return LANGUAGES[ext];
    }

    return { name: 'Other', family: 'other', comment: null };
}

function shouldIgnoreDir(dirName) {
    return IGNORE_DIRS.has(dirName) || dirName.startsWith('.');
}

function isBinaryFile(filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    if (BINARY_EXTENSIONS.has(ext)) return true;

    // Check for known lock files
    if (basename === 'package-lock.json' || basename === 'yarn.lock' ||
        basename === 'pnpm-lock.yaml' || basename === 'composer.lock' ||
        basename === 'Gemfile.lock' || basename === 'Pipfile.lock' ||
        basename === 'poetry.lock' || basename === 'Cargo.lock') {
        return true;
    }

    // Check for minified files
    if (basename.endsWith('.min.js') || basename.endsWith('.min.css') ||
        basename.endsWith('.bundle.js') || basename.endsWith('.chunk.js')) {
        return true;
    }

    return false;
}

module.exports = {
    LANGUAGES,
    FILENAME_LANGUAGES,
    BINARY_EXTENSIONS,
    IGNORE_DIRS,
    getLanguage,
    shouldIgnoreDir,
    isBinaryFile,
};
