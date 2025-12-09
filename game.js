/**
 * Classic Minesweeper Game - Retro Style
 * Классическая игра Сапёр в ретро стиле
 */

class Minesweeper {
    constructor() {
        // Game settings
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };

        this.currentDifficulty = 'easy';
        this.rows = 9;
        this.cols = 9;
        this.mines = 10;
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.questioned = [];
        this.gameStarted = false;
        this.gameOver = false;
        this.won = false;
        this.timer = 0;
        this.timerInterval = null;
        this.flagCount = 0;
        this.firstClick = true;

        // DOM elements
        this.gameField = document.getElementById('game-field');
        this.faceBtn = document.getElementById('face-btn');
        this.minesDigits = {
            100: document.getElementById('mines-100'),
            10: document.getElementById('mines-10'),
            1: document.getElementById('mines-1')
        };
        this.timerDigits = {
            100: document.getElementById('timer-100'),
            10: document.getElementById('timer-10'),
            1: document.getElementById('timer-1')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        // Face button - new game
        this.faceBtn.addEventListener('click', () => this.newGame());
        this.faceBtn.addEventListener('mousedown', () => {
            this.faceBtn.classList.add('pressed');
        });
        this.faceBtn.addEventListener('mouseup', () => {
            this.faceBtn.classList.remove('pressed');
        });
        this.faceBtn.addEventListener('mouseleave', () => {
            this.faceBtn.classList.remove('pressed');
        });

        // Menu items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const difficulty = e.target.dataset.difficulty;
                const action = e.target.dataset.action;

                if (difficulty) {
                    this.setDifficulty(difficulty);
                } else if (action === 'new') {
                    this.newGame();
                } else if (action === 'help') {
                    this.showHelp();
                } else if (action === 'about') {
                    this.showAbout();
                }
            });
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-ok').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.newGame();
            }
        });

        // Prevent context menu on game field
        this.gameField.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setDifficulty(difficulty) {
        if (this.difficulties[difficulty]) {
            this.currentDifficulty = difficulty;
            const settings = this.difficulties[difficulty];
            this.rows = settings.rows;
            this.cols = settings.cols;
            this.mines = settings.mines;
            this.newGame();
        }
    }

    newGame() {
        // Reset state
        this.gameStarted = false;
        this.gameOver = false;
        this.won = false;
        this.timer = 0;
        this.flagCount = 0;
        this.firstClick = true;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Initialize arrays
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.questioned = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));

        // Update display
        this.updateMinesCounter();
        this.updateTimer();
        this.setFace('normal');

        // Create grid
        this.createGrid();
    }

    placeMines(excludeRow, excludeCol) {
        // Place mines avoiding the first clicked cell and its neighbors
        let minesPlaced = 0;
        const excluded = this.getNeighbors(excludeRow, excludeCol);
        excluded.push([excludeRow, excludeCol]);

        while (minesPlaced < this.mines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            // Check if this position is excluded
            const isExcluded = excluded.some(([r, c]) => r === row && c === col);

            if (!isExcluded && this.board[row][col] !== -1) {
                this.board[row][col] = -1; // -1 represents a mine
                minesPlaced++;
            }
        }

        // Calculate numbers
        this.calculateNumbers();
    }

    calculateNumbers() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1) continue;

                let count = 0;
                const neighbors = this.getNeighbors(row, col);

                for (const [r, c] of neighbors) {
                    if (this.board[r][c] === -1) count++;
                }

                this.board[row][col] = count;
            }
        }
    }

    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    neighbors.push([r, c]);
                }
            }
        }
        return neighbors;
    }

    createGrid() {
        this.gameField.innerHTML = '';
        this.gameField.style.gridTemplateColumns = `repeat(${this.cols}, 16px)`;
        this.gameField.style.gridTemplateRows = `repeat(${this.rows}, 16px)`;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // Left click - reveal
                cell.addEventListener('mousedown', (e) => this.handleMouseDown(e, row, col));
                cell.addEventListener('mouseup', (e) => this.handleMouseUp(e, row, col));

                // Right click - flag
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleFlag(row, col);
                });

                this.gameField.appendChild(cell);
            }
        }
    }

    handleMouseDown(e, row, col) {
        if (this.gameOver) return;

        if (e.button === 0) { // Left click
            this.setFace('surprised');
        }
    }

    handleMouseUp(e, row, col) {
        if (this.gameOver) return;

        if (e.button === 0) { // Left click
            this.setFace('normal');
            this.revealCell(row, col);
        } else if (e.button === 1) { // Middle click - chord
            this.chord(row, col);
        }
    }

    revealCell(row, col) {
        if (this.gameOver) return;
        if (this.revealed[row][col]) return;
        if (this.flagged[row][col]) return;

        // First click - place mines and start timer
        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
            this.gameStarted = true;
        }

        // Remove question mark if present
        if (this.questioned[row][col]) {
            this.questioned[row][col] = false;
        }

        this.revealed[row][col] = true;
        const cell = this.getCell(row, col);
        cell.classList.add('revealed');

        // Hit a mine
        if (this.board[row][col] === -1) {
            cell.classList.add('mine-hit');
            cell.innerHTML = '<span class="mine-symbol"></span>';
            this.lose();
            return;
        }

        const value = this.board[row][col];
        if (value > 0) {
            cell.textContent = value;
            cell.classList.add(`num-${value}`);
        } else {
            // Empty cell - reveal neighbors
            this.revealNeighbors(row, col);
        }

        this.checkWin();
    }

    revealNeighbors(row, col) {
        const neighbors = this.getNeighbors(row, col);
        for (const [r, c] of neighbors) {
            if (!this.revealed[r][c] && !this.flagged[r][c]) {
                this.revealCell(r, c);
            }
        }
    }

    toggleFlag(row, col) {
        if (this.gameOver) return;
        if (this.revealed[row][col]) return;

        const cell = this.getCell(row, col);

        if (this.flagged[row][col]) {
            // Flag -> Question
            this.flagged[row][col] = false;
            this.questioned[row][col] = true;
            this.flagCount--;
            cell.classList.remove('flagged');
            cell.innerHTML = '';
            cell.classList.add('question');
        } else if (this.questioned[row][col]) {
            // Question -> Empty
            this.questioned[row][col] = false;
            cell.classList.remove('question');
        } else {
            // Empty -> Flag
            this.flagged[row][col] = true;
            this.flagCount++;
            cell.classList.add('flagged');
            cell.innerHTML = '<span class="flag"></span>';
        }

        this.updateMinesCounter();
    }

    chord(row, col) {
        if (!this.revealed[row][col]) return;
        if (this.board[row][col] <= 0) return;

        const neighbors = this.getNeighbors(row, col);
        let flagCount = 0;

        for (const [r, c] of neighbors) {
            if (this.flagged[r][c]) flagCount++;
        }

        if (flagCount === this.board[row][col]) {
            for (const [r, c] of neighbors) {
                if (!this.flagged[r][c] && !this.revealed[r][c]) {
                    this.revealCell(r, c);
                }
            }
        }
    }

    getCell(row, col) {
        return this.gameField.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    checkWin() {
        let unrevealedSafeCells = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.revealed[row][col] && this.board[row][col] !== -1) {
                    unrevealedSafeCells++;
                }
            }
        }

        if (unrevealedSafeCells === 0) {
            this.win();
        }
    }

    win() {
        this.gameOver = true;
        this.won = true;
        this.stopTimer();
        this.setFace('win');
        this.faceBtn.classList.add('win');

        // Flag all remaining mines
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1 && !this.flagged[row][col]) {
                    const cell = this.getCell(row, col);
                    cell.classList.add('flagged');
                    cell.innerHTML = '<span class="flag"></span>';
                }
            }
        }

        this.flagCount = this.mines;
        this.updateMinesCounter();
    }

    lose() {
        this.gameOver = true;
        this.stopTimer();
        this.setFace('lose');
        this.faceBtn.classList.add('lose');

        // Reveal all mines
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.getCell(row, col);

                if (this.board[row][col] === -1) {
                    if (!this.flagged[row][col] && !cell.classList.contains('mine-hit')) {
                        cell.classList.add('revealed', 'mine');
                        cell.innerHTML = '<span class="mine-symbol"></span>';
                    }
                } else if (this.flagged[row][col]) {
                    // Wrong flag
                    cell.classList.add('revealed');
                    cell.innerHTML = '<span class="wrong-flag"></span>';
                }
            }
        }
    }

    setFace(state) {
        const face = this.faceBtn.querySelector('.face');
        this.faceBtn.classList.remove('win', 'lose');

        switch (state) {
            case 'normal':
                face.textContent = '🙂';
                break;
            case 'surprised':
                face.textContent = '😮';
                break;
            case 'win':
                face.textContent = '😎';
                break;
            case 'lose':
                face.textContent = '😵';
                break;
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            if (this.timer > 999) this.timer = 999;
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        const time = Math.min(999, Math.max(0, this.timer));
        this.timerDigits[100].textContent = Math.floor(time / 100);
        this.timerDigits[10].textContent = Math.floor((time % 100) / 10);
        this.timerDigits[1].textContent = time % 10;
    }

    updateMinesCounter() {
        let remaining = this.mines - this.flagCount;
        const isNegative = remaining < 0;

        if (isNegative) {
            remaining = Math.abs(remaining);
            // For negative, show as -XX
            this.minesDigits[100].textContent = '-';
        } else {
            this.minesDigits[100].textContent = Math.floor(remaining / 100);
        }

        remaining = Math.min(99, remaining);
        this.minesDigits[10].textContent = Math.floor((remaining % 100) / 10);
        this.minesDigits[1].textContent = remaining % 10;
    }

    showHelp() {
        document.getElementById('modal-title').textContent = 'Как играть';
        document.getElementById('modal-content').innerHTML = `
            <p><strong>Цель игры:</strong> Открыть все клетки, не содержащие мины.</p>
            <p>&nbsp;</p>
            <p><strong>Управление:</strong></p>
            <p>• <strong>Левый клик</strong> - открыть клетку</p>
            <p>• <strong>Правый клик</strong> - поставить/снять флажок</p>
            <p>• <strong>Средний клик</strong> - открыть соседние клетки (если отмечено нужное количество мин)</p>
            <p>&nbsp;</p>
            <p><strong>Цифры:</strong></p>
            <p>Число в клетке показывает, сколько мин находится в соседних 8 клетках.</p>
            <p>&nbsp;</p>
            <p><strong>Подсказка:</strong></p>
            <p>Первый клик всегда безопасен!</p>
        `;
        document.getElementById('modal-overlay').classList.add('active');
    }

    showAbout() {
        document.getElementById('modal-title').textContent = 'О программе';
        document.getElementById('modal-content').innerHTML = `
            <p style="text-align: center;">
                <strong>Сапёр</strong><br>
                <small>Версия 1.0</small>
            </p>
            <p>&nbsp;</p>
            <p style="text-align: center;">
                Классическая игра в ретро стиле<br>
                Windows 95/98
            </p>
            <p>&nbsp;</p>
            <p style="text-align: center;">
                <small>© 2024</small>
            </p>
        `;
        document.getElementById('modal-overlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Minesweeper();
});
