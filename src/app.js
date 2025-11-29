// Import styles
import './css/non-critical.css';

// ==========================================================================
// Theme Management
// ==========================================================================

class ThemeManager {
    constructor() {
        this.theme = this.getInitialTheme();
        this.applyTheme(this.theme);
        this.bindEvents();
    }

    getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }

    bindEvents() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// ==========================================================================
// Syntax Highlighting (Prism is loaded via CDN in HTML)
// ==========================================================================

function initSyntaxHighlighting() {
    // Сохраняем оригинальный код для копирования
    const codeBlocks = document.querySelectorAll('code.language-typescript');
    codeBlocks.forEach(block => {
        if (!block.hasAttribute('data-original-code')) {
            block.setAttribute('data-original-code', block.textContent);
        }
    });

    // Prism уже загружен через CDN, просто применяем подсветку
    if (window.Prism) {
        window.Prism.highlightAll();
    }
}

// ==========================================================================
// Copy to Clipboard
// ==========================================================================

class ClipboardManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        const copyButtons = document.querySelectorAll('.copy-button');

        copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                await this.copyCode(e.currentTarget);
            });
        });
    }

    async copyCode(button) {
        const codeBlockId = button.getAttribute('data-code-block');
        const codeBlock = document.querySelector(`#${codeBlockId} code`);

        if (!codeBlock) {
            return;
        }

        try {
            // Используем оригинальный код из data-атрибута (без HTML тегов подсветки)
            const code = codeBlock.getAttribute('data-original-code') || codeBlock.textContent;
            await navigator.clipboard.writeText(code);

            this.showCopiedState(button);
        } catch (err) {
            console.error('Failed to copy code:', err);
            // Если clipboard API не доступен, просто показываем сообщение
            alert('Please copy the code manually (Ctrl+C / Cmd+C)');
        }
    }

    showCopiedState(button) {
        const originalText = button.querySelector('.copy-text').textContent;

        button.classList.add('copied');
        button.querySelector('.copy-text').textContent = 'Copied!';
        button.setAttribute('aria-label', 'Code copied to clipboard');

        setTimeout(() => {
            button.classList.remove('copied');
            button.querySelector('.copy-text').textContent = originalText;
            button.setAttribute('aria-label', 'Copy code to clipboard');
        }, 2000);
    }
}

// ==========================================================================
// Initialization
// ==========================================================================

function init() {
    // Initialize theme
    new ThemeManager();

    // Initialize syntax highlighting
    initSyntaxHighlighting();

    // Initialize clipboard functionality
    new ClipboardManager();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing purposes
export { ThemeManager, ClipboardManager };