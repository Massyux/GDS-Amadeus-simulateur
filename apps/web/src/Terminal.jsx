// CODEX ACCESS TEST
import { useEffect, useMemo, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore } from "@simulateur/data";
import PNRRenderer from "./PNRRenderer.jsx";

const NEAR_BOTTOM_THRESHOLD_PX = 40;
const AVAIL_TOKEN_REGEX = /^[A-Z]\d+$/;

function isAvailabilityRow(line) {
  return /^\s*\d{1,2}\s+[A-Z0-9]{2}\s+\d{3,4}\b/.test(line);
}

function extractAvailabilityRows(entries) {
  const rows = [];
  entries.forEach((entry, index) => {
    if (entry.type !== "text") return;
    if (!isAvailabilityRow(entry.text)) return;
    const match = entry.text.match(/^\s*(\d{1,2})\s+/);
    if (!match) return;
    const tokens = getAvailabilityTokens(entry.text);
    rows.push({
      lineNo: Number.parseInt(match[1], 10),
      raw: entry.text,
      entryIndex: index,
      tokens,
    });
  });
  return rows;
}

function getAvailabilityTokens(line) {
  return line
    .split(/\s+/)
    .filter((part) => part.length > 0 && AVAIL_TOKEN_REGEX.test(part));
}

function tokenizeAvailabilityLine(line) {
  const parts = line.split(/(\s+)/);
  let tokenIndex = 0;
  return parts.map((part) => {
    if (AVAIL_TOKEN_REGEX.test(part)) {
      const segment = { type: "token", text: part, tokenIndex };
      tokenIndex += 1;
      return segment;
    }
    return { type: "text", text: part };
  });
}

function isNearBottom(scrollEl, thresholdPx = NEAR_BOTTOM_THRESHOLD_PX) {
  return (
    scrollEl.scrollHeight -
      scrollEl.scrollTop -
      scrollEl.clientHeight <
    thresholdPx
  );
}

export default function Terminal() {
  const [entries, setEntries] = useState([
    { type: "text", text: "AMADEUS SELLING PLATFORM" },
    { type: "text", text: "TRAINING MODE" },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [historyPos, setHistoryPos] = useState(-1);
  const [autoFollow, setAutoFollow] = useState(true);
  const [selectedAvailIndex, setSelectedAvailIndex] = useState(-1);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const historyDraftRef = useRef("");
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createInMemoryStore();
  }
  const coreStateRef = useRef(createInitialState());
  const availRows = useMemo(() => extractAvailabilityRows(entries), [entries]);
  const selectedEntryIndex =
    selectedAvailIndex >= 0 && availRows[selectedAvailIndex]
      ? availRows[selectedAvailIndex].entryIndex
      : -1;

  async function executeCommand(commandText) {
    const cmd = commandText.trim();
    setEntries((prev) => [...prev, { type: "input", text: `> ${cmd}` }]);
    if (!cmd) return;

    try {
      const cmdUpper = cmd.toUpperCase();
      if (cmdUpper.startsWith("DAC") || cmdUpper.startsWith("DAN")) {
        await storeRef.current.loadFromUrl?.().catch(() => {});
      }
      const { events, state } = await processCommand(
        coreStateRef.current,
        cmd,
        {
          locations: storeRef.current,
        }
      );
      coreStateRef.current = state;
      const outputLines = events
        .filter((event) => event.type === "print" || event.type === "error")
        .map((event) => event.text);
      if (outputLines.length > 0) {
        setEntries((prev) => {
          if (cmdUpper === "RT") {
            return [
              ...prev,
              {
                type: "pnr",
                lines: outputLines,
                tsts: coreStateRef.current.tsts,
              },
            ];
          }
          return [
            ...prev,
            ...outputLines.map((line) => ({ type: "text", text: line })),
          ];
        });
      }
      setHistory((prev) => {
        if (!cmd) return prev;
        if (prev.length > 0 && prev[prev.length - 1] === cmd) return prev;
        return [...prev, cmd];
      });
      setHistoryPos(-1);
    } catch (error) {
      setEntries((prev) => [
        ...prev,
        { type: "text", text: "INVALID FORMAT" },
      ]);
    } finally {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  async function onEnter() {
    const cmd = value.trim();
    setValue("");
    await executeCommand(cmd);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    storeRef.current.loadFromUrl?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!availRows.length) {
      if (selectedAvailIndex !== -1) setSelectedAvailIndex(-1);
      if (selectedTokenIndex !== 0) setSelectedTokenIndex(0);
      return;
    }
    if (selectedAvailIndex < 0) {
      setSelectedAvailIndex(0);
      if (selectedTokenIndex !== 0) setSelectedTokenIndex(0);
      return;
    }
    if (selectedAvailIndex >= availRows.length) {
      setSelectedAvailIndex(availRows.length - 1);
    }
    const tokens = availRows[selectedAvailIndex]?.tokens ?? [];
    if (tokens.length === 0) {
      if (selectedTokenIndex !== 0) setSelectedTokenIndex(0);
      return;
    }
    if (selectedTokenIndex >= tokens.length) {
      setSelectedTokenIndex(tokens.length - 1);
    }
  }, [availRows, selectedAvailIndex, selectedTokenIndex]);

  useEffect(() => {
    if (!autoFollow) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    requestAnimationFrame(() => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    });
  }, [autoFollow, entries]);

  function handleScroll() {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const nearBottom = isNearBottom(scrollEl);
    setAutoFollow(nearBottom);
  }

  function moveHistory(delta) {
    if (history.length === 0) return;
    if (historyPos === -1) {
      historyDraftRef.current = value;
      const nextPos = delta < 0 ? history.length - 1 : -1;
      if (nextPos >= 0) {
        setHistoryPos(nextPos);
        const nextValue = history[nextPos];
        setValue(nextValue);
        moveCaretToEnd(nextValue);
      }
      return;
    }
    const nextPos = historyPos + delta;
    if (nextPos < 0) return;
    if (nextPos >= history.length) {
      setHistoryPos(-1);
      const nextValue = historyDraftRef.current;
      setValue(nextValue);
      moveCaretToEnd(nextValue);
      return;
    }
    setHistoryPos(nextPos);
    const nextValue = history[nextPos];
    setValue(nextValue);
    moveCaretToEnd(nextValue);
  }

  function moveCaretToEnd(nextValue) {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const len = nextValue.length;
      input.setSelectionRange(len, len);
    });
  }

  return (
    <div className="terminal">
      <div className="screen" ref={scrollRef} onScroll={handleScroll}>
        {entries.map((entry, i) => {
          if (entry.type === "pnr") {
            return (
              <PNRRenderer
                key={`pnr-${i}`}
                lines={entry.lines}
                tsts={entry.tsts}
              />
            );
          }
          if (entry.type === "text" && isAvailabilityRow(entry.text)) {
            const segments = tokenizeAvailabilityLine(entry.text);
            const isSelectedRow = i === selectedEntryIndex;
            return (
              <div className="line" key={`line-${i}`}>
                {segments.map((segment, segIndex) => {
                  if (segment.type === "token") {
                    const isSelectedToken =
                      isSelectedRow && segment.tokenIndex === selectedTokenIndex;
                    return (
                      <span
                        key={`token-${i}-${segIndex}`}
                        className={`avail-token${
                          isSelectedToken ? " selected" : ""
                        }`}
                      >
                        {segment.text}
                      </span>
                    );
                  }
                  return (
                    <span key={`text-${i}-${segIndex}`}>{segment.text}</span>
                  );
                })}
              </div>
            );
          }
          return (
            <div className="line" key={`line-${i}`}>
              {entry.text}
            </div>
          );
        })}
        <div className="line prompt">
          <span className="prompt-char">&gt;</span>{" "}
          <span className="prompt-field">
            <span className="prompt-ghost">
              {value}
              <span className="caret-block" />
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (historyPos !== -1) setHistoryPos(-1);
              }}
              onKeyDown={(e) => {
                if (e.altKey && e.key === "ArrowUp") {
                  e.preventDefault();
                  moveHistory(-1);
                  return;
                }
                if (e.altKey && e.key === "ArrowDown") {
                  e.preventDefault();
                  moveHistory(1);
                  return;
                }
                if (
                  !e.altKey &&
                  e.key === "ArrowLeft" &&
                  availRows.length > 0 &&
                  selectedAvailIndex >= 0 &&
                  value.length === 0
                ) {
                  const tokens = availRows[selectedAvailIndex]?.tokens ?? [];
                  if (tokens.length === 0) return;
                  e.preventDefault();
                  setSelectedTokenIndex((prev) => Math.max(0, prev - 1));
                  return;
                }
                if (
                  !e.altKey &&
                  e.key === "ArrowRight" &&
                  availRows.length > 0 &&
                  selectedAvailIndex >= 0 &&
                  value.length === 0
                ) {
                  const tokens = availRows[selectedAvailIndex]?.tokens ?? [];
                  if (tokens.length === 0) return;
                  e.preventDefault();
                  setSelectedTokenIndex((prev) =>
                    Math.min(tokens.length - 1, prev + 1)
                  );
                  return;
                }
                if (!e.altKey && e.key === "ArrowUp" && availRows.length > 0) {
                  e.preventDefault();
                  const nextIndex = Math.max(
                    0,
                    selectedAvailIndex === -1 ? 0 : selectedAvailIndex - 1
                  );
                  if (nextIndex !== selectedAvailIndex) {
                    setSelectedAvailIndex(nextIndex);
                    setSelectedTokenIndex(0);
                  }
                  return;
                }
                if (!e.altKey && e.key === "ArrowDown" && availRows.length > 0) {
                  e.preventDefault();
                  const nextIndex = Math.min(
                    availRows.length - 1,
                    selectedAvailIndex === -1 ? 0 : selectedAvailIndex + 1
                  );
                  if (nextIndex !== selectedAvailIndex) {
                    setSelectedAvailIndex(nextIndex);
                    setSelectedTokenIndex(0);
                  }
                  return;
                }
                if (e.key === "End") {
                  setAutoFollow(true);
                  const scrollEl = scrollRef.current;
                  if (scrollEl) {
                    requestAnimationFrame(() => {
                      scrollEl.scrollTop = scrollEl.scrollHeight;
                    });
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (
                    selectedAvailIndex >= 0 &&
                    availRows[selectedAvailIndex] &&
                    value.trim() === ""
                  ) {
                    const tokens = availRows[selectedAvailIndex].tokens ?? [];
                    const token =
                      tokens[selectedTokenIndex] ?? tokens[0] ?? null;
                    if (token) {
                      e.preventDefault();
                      const nextValue = `SS${availRows[selectedAvailIndex].lineNo}${token[0]}1`;
                      executeCommand(nextValue);
                      return;
                    }
                  }
                  onEnter();
                  return;
                }
                if (
                  e.key.length === 1 &&
                  /[A-Z]/i.test(e.key) &&
                  /^SS\d+[A-Z]\d+$/.test(value)
                ) {
                  e.preventDefault();
                  const nextValue = value.replace(
                    /^SS(\d+)[A-Z](\d+)$/,
                    `SS$1${e.key.toUpperCase()}$2`
                  );
                  setValue(nextValue);
                  moveCaretToEnd(nextValue);
                }
              }}
              className="prompt-input"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
