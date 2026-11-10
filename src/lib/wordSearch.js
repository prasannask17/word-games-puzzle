export const GRID_SIZE = 15;

export const DIRECTIONS = [
  "horizontal",
  "horizontal-reverse",
  "vertical",
  "vertical-reverse",
  "diagonal-down",
  "diagonal-down-reverse",
  "diagonal-up",
  "diagonal-up-reverse",
];

function seededRandom(seed) {
  let value = seed;
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function offsetCell(row, col, offset, direction) {
  let r = row;
  let c = col;
  switch (direction) {
    case "horizontal":
      c += offset;
      break;
    case "horizontal-reverse":
      c -= offset;
      break;
    case "vertical":
      r += offset;
      break;
    case "vertical-reverse":
      r -= offset;
      break;
    case "diagonal-down":
      r += offset;
      c += offset;
      break;
    case "diagonal-down-reverse":
      r -= offset;
      c -= offset;
      break;
    case "diagonal-up":
      r -= offset;
      c += offset;
      break;
    case "diagonal-up-reverse":
      r += offset;
      c -= offset;
      break;
  }
  return { r, c };
}

function canPlace(grid, word, row, col, direction) {
  for (let i = 0; i < word.length; i++) {
    const { r, c } = offsetCell(row, col, i, direction);
    if (
      r < 0 ||
      r >= GRID_SIZE ||
      c < 0 ||
      c >= GRID_SIZE ||
      (grid[r][c] !== "" && grid[r][c] !== word[i])
    ) {
      return false;
    }
  }
  return true;
}

function placeWord(grid, word, row, col, direction, placements) {
  const end = offsetCell(row, col, word.length - 1, direction);
  placements.push({
    word,
    startRow: row,
    startCol: col,
    endRow: end.r,
    endCol: end.c,
    direction,
  });
  for (let i = 0; i < word.length; i++) {
    const { r, c } = offsetCell(row, col, i, direction);
    grid[r][c] = word[i];
  }
}

export function generateWordSearch(topic, words, seed) {
  const random = seededRandom(seed);
  const grid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(""));
  const placements = [];
  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const direction = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
      const row = Math.floor(random() * GRID_SIZE);
      const col = Math.floor(random() * GRID_SIZE);
      if (canPlace(grid, word, row, col, direction)) {
        placeWord(grid, word, row, col, direction, placements);
        placed = true;
      }
    }
    if (!placed) {
      throw new Error(`Failed to place word: ${word}`);
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === "") {
        const code = Math.floor(random() * 26) + 65;
        grid[r][c] = String.fromCharCode(code);
      }
    }
  }

  return { topic, words, grid, placements, seed };
}

export function validatePuzzle(puzzle) {
  if (
    puzzle.grid.length !== GRID_SIZE ||
    puzzle.grid.some((row) => row.length !== GRID_SIZE) ||
    puzzle.words.length < 15 ||
    puzzle.words.length > 16 ||
    puzzle.placements.length !== puzzle.words.length
  ) {
    return false;
  }

  for (const placement of puzzle.placements) {
    let r = placement.startRow;
    let c = placement.startCol;
    for (let i = 0; i < placement.word.length; i++) {
      if (
        r < 0 ||
        r >= GRID_SIZE ||
        c < 0 ||
        c >= GRID_SIZE ||
        puzzle.grid[r][c] !== placement.word[i]
      ) {
        return false;
      }
      switch (placement.direction) {
        case "horizontal":
          c++;
          break;
        case "horizontal-reverse":
          c--;
          break;
        case "vertical":
          r++;
          break;
        case "vertical-reverse":
          r--;
          break;
        case "diagonal-down":
          r++;
          c++;
          break;
        case "diagonal-down-reverse":
          r--;
          c--;
          break;
        case "diagonal-up":
          r--;
          c++;
          break;
        case "diagonal-up-reverse":
          r++;
          c--;
          break;
      }
    }
  }
  return true;
}
