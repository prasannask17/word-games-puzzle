function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValid(grid, row, col, value) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === value) return false;
  }
  for (let i = 0; i < 9; i++) {
    if (grid[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === value) return false;
    }
  }
  return true;
}

function solve(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const value of candidates) {
          if (isValid(grid, row, col, value)) {
            grid[row][col] = value;
            if (solve(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid, counter = { val: 0 }) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        for (let value = 1; value <= 9; value++) {
          if (isValid(grid, row, col, value)) {
            grid[row][col] = value;
            countSolutions(grid, counter);
            grid[row][col] = 0;
            if (counter.val >= 2) return;
          }
        }
        return;
      }
    }
  }
  counter.val++;
}

export function generateSudoku(id, difficulty = "medium", title) {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(solution);

  const puzzle = solution.map((row) => [...row]);

  let clues = 32;
  if (difficulty === "easy") clues = 38;
  else if (difficulty === "medium") clues = 32;
  else if (difficulty === "hard") clues = 28;
  else if (difficulty === "expert") clues = 24;

  const cellsToRemove = 81 - clues;
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }

  const shuffled = shuffle(cells);
  let removed = 0;
  for (const [row, col] of shuffled) {
    if (removed >= cellsToRemove) break;
    const value = puzzle[row][col];
    puzzle[row][col] = 0;
    const copy = puzzle.map((r) => [...r]);
    const counter = { val: 0 };
    countSolutions(copy, counter);
    if (counter.val !== 1) {
      puzzle[row][col] = value;
    } else {
      removed++;
    }
  }

  const resolvedTitle = title || `SUDOKU - ${difficulty.toUpperCase()}`;
  return {
    id,
    title: resolvedTitle,
    difficulty,
    puzzleGrid: puzzle,
    solutionGrid: solution,
  };
}
