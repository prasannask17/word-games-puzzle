import { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { generateWords } from "./lib/words.js";
import {
  generateWordSearch,
  hashString,
  validatePuzzle,
} from "./lib/wordSearch.js";
import { generateSudoku } from "./lib/sudoku.js";

function TopicInput({ value, onChange, disabled }) {
  return (
    <div className="topic-input-container">
      <label htmlFor="topics">Topics</label>
      <textarea
        id="topics"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="animals, space, human body, non metals, cars, planets"
        disabled={disabled}
        rows={4}
      />
    </div>
  );
}

function WordControls({
  status,
  isGenerating,
  hasPuzzles,
  onGenerate,
  onClear,
  onPrint,
}) {
  return (
    <div className="generate-controls">
      <div className="button-group">
        <button
          className="btn-primary"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {hasPuzzles ? "Regenerate" : "Generate Puzzle"}
        </button>
        {hasPuzzles && (
          <>
            <button
              className="btn-secondary"
              onClick={onPrint}
              disabled={isGenerating}
            >
              Download PDF / Print
            </button>
            <button
              className="btn-outline"
              onClick={onClear}
              disabled={isGenerating}
            >
              Clear
            </button>
          </>
        )}
      </div>
      {status && <div className="status-text">{status}</div>}
    </div>
  );
}

function PuzzleGrid({ puzzle }) {
  return (
    <div className="puzzle-grid">
      {puzzle.grid.map((row, rowIndex) => (
        <div className="puzzle-row" key={`row-${rowIndex}`}>
          {row.map((letter, colIndex) => (
            <div
              className="puzzle-cell"
              key={`cell-${rowIndex}-${colIndex}`}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WordList({ words }) {
  return (
    <div className="word-list">
      {words.map((word, index) => (
        <div className="word-item" key={index}>
          <span className="checkbox">□</span> {word}
        </div>
      ))}
    </div>
  );
}

function PuzzlePage({ puzzle, pageNumber, puzzleName }) {
  return (
    <div className="page puzzle-page">
      <div className="page-header">
        <div className="header-left">
          <span className="puzzle-label">{puzzleName || `PUZZLE ${pageNumber}`}</span>
        </div>
        <div className="header-center">
          <h1 className="topic-title">{puzzle.topic}</h1>
        </div>
        <div className="header-right" />
      </div>
      <div className="grid-container">
        <PuzzleGrid puzzle={puzzle} />
      </div>
      <div className="word-list-container">
        <WordList words={puzzle.words} />
      </div>
      <div className="page-footer">PAGE {pageNumber}</div>
    </div>
  );
}

function WordSolution({ puzzle, puzzleIndex }) {
  return (
    <div className="solution-container">
      <div className="solution-header">
        <span className="solution-topic">{puzzle.topic}</span>
        <span className="solution-page-ref">Page {puzzleIndex + 1}</span>
      </div>
      <div className="solution-grid-wrapper">
        <div className="puzzle-grid solution-grid">
          {puzzle.grid.map((row, rowIndex) => (
            <div className="puzzle-row" key={`srow-${rowIndex}`}>
              {row.map((letter, colIndex) => (
                <div
                  className="puzzle-cell"
                  key={`scell-${rowIndex}-${colIndex}`}
                >
                  {letter}
                </div>
              ))}
            </div>
          ))}
          <svg
            className="solution-overlay"
            viewBox="0 0 15 15"
            preserveAspectRatio="none"
          >
            {puzzle.placements.map((placement, index) => {
              const x1 = placement.startCol + 0.5;
              const y1 = placement.startRow + 0.5;
              const x2 = placement.endCol + 0.5;
              const y2 = placement.endRow + 0.5;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2;
              const length = Math.sqrt(dx * dx + dy * dy) + 0.8;
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              return (
                <rect
                  key={`rect-${index}`}
                  x={cx - length / 2}
                  y={cy - 0.4}
                  width={length}
                  height={0.8}
                  rx={0.4}
                  ry={0.4}
                  fill="none"
                  stroke="#000"
                  strokeWidth="0.08"
                  transform={`rotate(${angle} ${cx} ${cy})`}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function WordSolutionsPage({ puzzles, pageNumber, startIndex }) {
  return (
    <div className="page solution-page">
      <div className="solutions-header">
        <h2 className="solutions-page-title">ANSWERS</h2>
      </div>
      <div className="solutions-grid">
        {puzzles.map((puzzle, index) => (
          <WordSolution puzzle={puzzle} puzzleIndex={startIndex + index} key={index} />
        ))}
      </div>
      <div className="page-footer">PAGE {pageNumber}</div>
    </div>
  );
}

function WordPreview({ puzzles }) {
  if (puzzles.length === 0) return null;

  const solutionPages = [];
  for (let i = 0; i < puzzles.length; i += 4) {
    solutionPages.push(puzzles.slice(i, i + 4));
  }

  return (
    <div className="page-preview-container">
      <div className="print-area">
        {puzzles.map((puzzle, index) => (
          <PuzzlePage
            puzzle={puzzle}
            pageNumber={index + 1}
            key={`puzzle-${index}`}
          />
        ))}
        {solutionPages.map((page, index) => (
          <WordSolutionsPage
            puzzles={page}
            pageNumber={puzzles.length + index + 1}
            startIndex={index * 4}
            key={`solution-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function SudokuControls({
  count,
  setCount,
  difficulty,
  setDifficulty,
  customTitle,
  setCustomTitle,
  status,
  isGenerating,
  hasPuzzles,
  onGenerate,
  onClear,
  onPrint,
}) {
  return (
    <div className="sudoku-controls">
      <div className="control-group">
        <label htmlFor="sudoku-count">Number of Puzzles</label>
        <select
          id="sudoku-count"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          disabled={isGenerating}
          className="select-input"
        >
          <option value={1}>1 Puzzle</option>
          <option value={4}>4 Puzzles (1 solution page)</option>
          <option value={8}>8 Puzzles (2 solution pages)</option>
          <option value={12}>12 Puzzles (3 solution pages)</option>
          <option value={16}>16 Puzzles (4 solution pages)</option>
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="sudoku-diff">Difficulty Level</label>
        <select
          id="sudoku-diff"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          disabled={isGenerating}
          className="select-input"
        >
          <option value="easy">Easy (38 clues)</option>
          <option value="medium">Medium (32 clues)</option>
          <option value="hard">Hard (28 clues)</option>
          <option value="expert">Expert (24 clues)</option>
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="sudoku-title">Custom Header Title (Optional)</label>
        <input
          id="sudoku-title"
          type="text"
          value={customTitle}
          onChange={(event) => setCustomTitle(event.target.value)}
          placeholder={`SUDOKU - ${difficulty.toUpperCase()}`}
          disabled={isGenerating}
          className="text-input"
        />
      </div>

      <div className="button-group">
        <button
          className="btn-primary"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Sudoku Puzzles"}
        </button>
        {hasPuzzles && (
          <>
            <button
              className="btn-secondary"
              onClick={onPrint}
              disabled={isGenerating}
            >
              Download PDF (140x210)
            </button>
            <button
              className="btn-outline"
              onClick={onClear}
              disabled={isGenerating}
            >
              Clear
            </button>
          </>
        )}
      </div>
      {status && <div className="status-text">{status}</div>}
    </div>
  );
}

function SudokuGrid({ grid, size = "normal" }) {
  return (
    <div className={`sudoku-grid sudoku-grid-${size}`}>
      {grid.map((row, rowIndex) => (
        <div className="sudoku-row" key={`srow-${rowIndex}`}>
          {row.map((value, colIndex) => {
            const boxRight = (colIndex + 1) % 3 === 0 && colIndex < 8;
            const boxBottom = (rowIndex + 1) % 3 === 0 && rowIndex < 8;
            return (
              <div
                className={`sudoku-cell ${boxRight ? "border-box-right" : ""} ${
                  boxBottom ? "border-box-bottom" : ""
                }`}
                key={`scell-${rowIndex}-${colIndex}`}
              >
                {value !== 0 ? value : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SudokuPage({ puzzle, pageNumber }) {
  return (
    <div className="page sudoku-page">
      <div className="page-header">
        <div className="header-left">
          <span className="puzzle-label">PUZZLE {puzzle.id}</span>
        </div>
        <div className="header-center">
          <h1 className="topic-title">{puzzle.title}</h1>
        </div>
        <div className="header-right" />
      </div>
      <div className="sudoku-container">
        <SudokuGrid grid={puzzle.puzzleGrid} size="normal" />
      </div>
      <div className="page-footer">PAGE {pageNumber}</div>
    </div>
  );
}

function SudokuSolution({ puzzle, puzzleIndex }) {
  return (
    <div className="solution-container">
      <div className="solution-header">
        <span className="solution-topic">
          PUZZLE {puzzle.id} - {puzzle.difficulty.toUpperCase()}
        </span>
        <span className="solution-page-ref">Page {puzzleIndex + 1}</span>
      </div>
      <div className="sudoku-solution-wrapper">
        <SudokuGrid grid={puzzle.solutionGrid} size="compact" />
      </div>
    </div>
  );
}

function SudokuSolutionsPage({ puzzles, pageNumber, startIndex }) {
  return (
    <div className="page solution-page">
      <div className="solutions-header">
        <h2 className="solutions-page-title">SUDOKU ANSWERS</h2>
      </div>
      <div className="solutions-grid">
        {puzzles.map((puzzle, index) => (
          <SudokuSolution puzzle={puzzle} puzzleIndex={startIndex + index} key={`sudoku-sol-${puzzle.id}`} />
        ))}
      </div>
      <div className="page-footer">PAGE {pageNumber}</div>
    </div>
  );
}

function SudokuPreview({ puzzles }) {
  if (puzzles.length === 0) return null;

  const solutionPages = [];
  for (let i = 0; i < puzzles.length; i += 4) {
    solutionPages.push(puzzles.slice(i, i + 4));
  }

  return (
    <div className="page-preview-container">
      <div className="print-area">
        {puzzles.map((puzzle, index) => (
          <SudokuPage
            puzzle={puzzle}
            pageNumber={index + 1}
            key={`sudoku-page-${puzzle.id}`}
          />
        ))}
        {solutionPages.map((page, index) => (
          <SudokuSolutionsPage
            puzzles={page}
            pageNumber={puzzles.length + index + 1}
            startIndex={index * 4}
            key={`sudoku-solution-page-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("words");

  const [topics, setTopics] = useState("");
  const [puzzles, setPuzzles] = useState([]);
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [sudokuPuzzles, setSudokuPuzzles] = useState([]);
  const [sudokuCount, setSudokuCount] = useState(4);
  const [sudokuDifficulty, setSudokuDifficulty] = useState("medium");
  const [sudokuTitle, setSudokuTitle] = useState("");
  const [sudokuStatus, setSudokuStatus] = useState("");
  const [sudokuGenerating, setSudokuGenerating] = useState(false);
  const [sudokuError, setSudokuError] = useState(null);

  const handleGenerateWords = async () => {
    setError(null);
    const topicList = topics
      .split(/[,\n]/)
      .map((topic) => topic.trim())
      .filter((topic) => topic.length > 0);

    if (topicList.length === 0) {
      setError("Please enter at least one topic.");
      return;
    }

    setIsGenerating(true);
    setPuzzles([]);

    const generated = [];
    try {
      for (let index = 0; index < topicList.length; index++) {
        const topic = topicList[index];
        setStatus(
          `Generating words for "${topic}" (${index + 1}/${topicList.length})...`,
        );

        let words = [];

        try {
          words = await generateWords(topic);
        } catch (err) {
          console.error(`Word generation failed for "${topic}":`, err);
          throw new Error(
            `Unable to generate words for topic "${topic}". ${err.message || ""}`.trim(),
          );
        }

        if (words.length < 15) {
          throw new Error(
            `Unable to generate at least 15 words for topic "${topic}".`,
          );
        }

        setStatus(`Building puzzle for "${topic}"...`);

        let puzzle = null;
        let attempt = 0;
        while (!puzzle && attempt < 10) {
          attempt++;
          const seed = hashString(
            topic + Date.now().toString() + attempt.toString(),
          );
          try {
            const candidate = generateWordSearch(
              topic.toUpperCase(),
              words,
              seed,
            );
            if (validatePuzzle(candidate)) {
              puzzle = candidate;
            }
          } catch {
            // try the next seed
          }
        }

        if (!puzzle) {
          throw new Error(
            `Could not fit all words for topic "${topic}" into the grid after multiple attempts.`,
          );
        }

        generated.push(puzzle);
      }

      setStatus("Creating solutions...");
      setPuzzles(generated);
      setStatus("Ready");
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearWords = () => {
    setTopics("");
    setPuzzles([]);
    setStatus("");
    setError(null);
  };

  const handleGenerateSudoku = () => {
    setSudokuGenerating(true);
    setSudokuStatus("Generating Sudoku puzzles...");
    setSudokuError(null);

    setTimeout(() => {
      try {
        const generated = [];
        for (let id = 1; id <= sudokuCount; id++) {
          const title =
            sudokuTitle.trim() || `SUDOKU - ${sudokuDifficulty.toUpperCase()}`;
          generated.push(generateSudoku(id, sudokuDifficulty, title));
        }
        setSudokuPuzzles(generated);
        setSudokuStatus(
          `Generated ${sudokuCount} Sudoku puzzle(s)! Ready to export.`,
        );
      } catch (err) {
        setSudokuError(err.message || "Failed to generate Sudoku.");
        setSudokuStatus("");
      } finally {
        setSudokuGenerating(false);
      }
    }, 60);
  };

  const handleClearSudoku = () => {
    setSudokuPuzzles([]);
    setSudokuStatus("");
    setSudokuError(null);
  };

  const downloadPdf = async (filename) => {
    const pages = document.querySelectorAll(".page");
    if (pages.length === 0) return;

    const setActiveStatus = tab === "words" ? setStatus : setSudokuStatus;
    const setActiveError = tab === "words" ? setError : setSudokuError;
    const setActiveGenerating =
      tab === "words" ? setIsGenerating : setSudokuGenerating;

    setActiveGenerating(true);
    setActiveStatus("Generating PDF (140x210mm)...");

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [140, 210],
      });

      for (let index = 0; index < pages.length; index++) {
        const canvas = await html2canvas(pages[index], {
          scale: 3,
          useCORS: true,
        });
        const image = canvas.toDataURL("image/jpeg", 1);
        if (index > 0) {
          pdf.addPage([140, 210], "portrait");
        }
        pdf.addImage(image, "JPEG", 0, 0, 140, 210);
      }

      pdf.save(filename);
      setActiveStatus("PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      setActiveError("Failed to generate PDF: " + err.message);
      setActiveStatus("");
    } finally {
      setActiveGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar no-print">
        <nav className="sidebar-nav">
          <button
            className={`nav-tab ${tab === "words" ? "active" : ""}`}
            onClick={() => setTab("words")}
          >
            Word Search
          </button>
          <button
            className={`nav-tab ${tab === "sudoku" ? "active" : ""}`}
            onClick={() => setTab("sudoku")}
          >
            Sudoku
          </button>
        </nav>

        {tab === "words" ? (
          <>
            <header>
              <h1>WORD SEARCH GENERATOR</h1>
              <p>Create printable word-search puzzle books from any topic.</p>
            </header>
            <main>
              {error && <div className="error-message">{error}</div>}
              <TopicInput
                value={topics}
                onChange={setTopics}
                disabled={isGenerating}
              />
              <WordControls
                status={status}
                isGenerating={isGenerating}
                hasPuzzles={puzzles.length > 0}
                onGenerate={handleGenerateWords}
                onClear={handleClearWords}
                onPrint={() => downloadPdf("word-search-puzzles.pdf")}
              />
            </main>
          </>
        ) : (
          <>
            <header>
              <h1>SUDOKU GENERATOR</h1>
              <p>Create printable 9x9 Sudoku puzzle books with answer keys.</p>
            </header>
            <main>
              {sudokuError && (
                <div className="error-message">{sudokuError}</div>
              )}
              <SudokuControls
                count={sudokuCount}
                setCount={setSudokuCount}
                difficulty={sudokuDifficulty}
                setDifficulty={setSudokuDifficulty}
                customTitle={sudokuTitle}
                setCustomTitle={setSudokuTitle}
                status={sudokuStatus}
                isGenerating={sudokuGenerating}
                hasPuzzles={sudokuPuzzles.length > 0}
                onGenerate={handleGenerateSudoku}
                onClear={handleClearSudoku}
                onPrint={() => downloadPdf("sudoku-puzzles.pdf")}
              />
            </main>
          </>
        )}
      </div>

      <div className="preview-area">
        {tab === "words" ? (
          <WordPreview puzzles={puzzles} />
        ) : (
          <SudokuPreview puzzles={sudokuPuzzles} />
        )}
      </div>
    </div>
  );
}
