// CODEX ACCESS TEST
import { useEffect, useMemo, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore } from "@simulateur/data";
import PNRRenderer from "./PNRRenderer.jsx";

const AVAIL_ROW_RE = /^\s*(\d{1,2})\s+([A-Z0-9]{2})\s+(\d{3,4})\s+/;
const AVAIL_WRAP_RE = /^\s{5}\S/;
const TOKEN_RE = /([A-Z][0-9])/g;

function isAvailabilityRowStart(line) {
  return AVAIL_ROW_RE.test(line);
}

function isAvailabilityWrap(line) {
  return AVAIL_WRAP_RE.test(line);
}

function normalizeAirlineFilter(raw) {
  const cleaned = raw.replace(/\s+/g, "");
  if (!cleaned) return null;
  let candidate = null;
  if (cleaned.startsWith("A") && cleaned.length >= 3) {
    candidate = cleaned.slice(1, 3);
  } else if (cleaned.length >= 2) {
    candidate = cleaned.slice(-2);
  }
  if (!candidate || !/^[A-Z]{2}$/.test(candidate)) return null;
  return candidate;
}

function splitANFilter(cmd) {
  const upper = cmd.toUpperCase();
  const slashIndex = upper.indexOf("/");
  if (slashIndex === -1) return { baseCmd: cmd, filter: null };
  const baseCmd = cmd.slice(0, slashIndex);
  const raw = upper.slice(slashIndex + 1);
  const filter = normalizeAirlineFilter(raw);
  if (!filter) {
    return { baseCmd: cmd, filter: null };
  }
  return { baseCmd, filter };
}

function replaceLineNo(line, nextLineNo) {
  const replacement = String(nextLineNo);
  return line.replace(/^(\s*)\d{1,2}(\s+)/, `$1${replacement}$2`);
}

function tokenizeLine(line, tokens) {
  const segments = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match = null;
  while ((match = TOKEN_RE.exec(line))) {
    const token = match[1];
    const before = line.slice(lastIndex, match.index);
    if (before) segments.push({ type: "text", value: before });
    const code = token[0];
    const seats = Number.parseInt(token[1], 10);
    const index = tokens.length;
    tokens.push({ index, code, seats, raw: token });
    segments.push({ type: "token", value: token, index });
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    segments.push({ type: "text", value: line.slice(lastIndex) });
  }
  return segments;
}

function buildANEntries(lines, filter, groupId) {
  const entries = [];
  const header = lines.slice(0, 2);
  header.forEach((text) => entries.push({ type: "text", text }));

  const rows = [];
  let current = null;
  const tail = lines.slice(2);

  tail.forEach((line) => {
    if (isAvailabilityRowStart(line)) {
      if (current) rows.push(current);
      current = { line1: line, wraps: [] };
      return;
    }
    if (current && isAvailabilityWrap(line)) {
      current.wraps.push(line);
      return;
    }
    if (current) {
      rows.push(current);
      current = null;
    }
    entries.push({ type: "text", text: line });
  });

  if (current) rows.push(current);

  const parsedRows = rows
    .map((row) => {
      const match = row.line1.match(AVAIL_ROW_RE);
      if (!match) return null;
      return {
        line1: row.line1,
        wraps: row.wraps,
        originalLineNo: Number.parseInt(match[1], 10),
        airline: match[2],
      };
    })
    .filter(Boolean);

  const kept = filter
    ? parsedRows.filter((row) => row.airline === filter)
    : parsedRows;

  if (filter && kept.length === 0) {
    entries.push({ type: "text", text: "NO FLIGHTS" });
    return entries;
  }

  kept.forEach((row, index) => {
    const visibleLineNo = index + 1;
    const displayLine1 = replaceLineNo(row.line1, visibleLineNo);
    const tokens = [];
    const lineSegments = [];
    lineSegments.push(tokenizeLine(displayLine1, tokens));
    row.wraps.forEach((wrapLine) => {
      lineSegments.push(tokenizeLine(wrapLine, tokens));
    });
    entries.push({
      type: "anRow",
      anGroupId: groupId,
      rowIndex: index,
      visibleLineNo,
      originalLineNo: row.originalLineNo,
      airline: row.airline,
      tokens,
      lineSegments,
    });
  });

  return entries;
}

function defaultTokenIndex(row) {
  const firstAvailable = row.tokens.findIndex((token) => token.seats > 0);
  return firstAvailable === -1 ? 0 : firstAvailable;
}

function isNearBottom(scrollEl, threshold = 40) {
  const distance =
    scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
  return distance <= threshold;
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
  const [activeAnGroupId, setActiveAnGroupId] = useState(null);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const historyDraftRef = useRef("");
  const anGroupIdRef = useRef(0);
  const storeRef = useRef(null);
  const coreStateRef = useRef(createInitialState());

  if (!storeRef.current) {
    storeRef.current = createInMemoryStore();
  }

  const availRows = useMemo(() => {
    if (!activeAnGroupId) return [];
    return entries.filter(
      (entry) => entry.type === "anRow" && entry.anGroupId === activeAnGroupId
    );
  }, [entries, activeAnGroupId]);

  useEffect(() => {
    if (availRows.length === 0) {
      setSelectedAvailIndex(-1);
      setSelectedTokenIndex(0);
      return;
    }
    setSelectedAvailIndex((prev) => {
      if (prev >= 0 && prev < availRows.length) return prev;
      return 0;
    });
  }, [availRows.length]);

  useEffect(() => {
    if (selectedAvailIndex < 0 || selectedAvailIndex >= availRows.length) return;
    const row = availRows[selectedAvailIndex];
    if (!row || row.tokens.length === 0) {
      setSelectedTokenIndex(0);
      return;
    }
    if (selectedTokenIndex < 0 || selectedTokenIndex >= row.tokens.length) {
      setSelectedTokenIndex(defaultTokenIndex(row));
    }
  }, [availRows, selectedAvailIndex, selectedTokenIndex]);

  useEffect(() => {
    if (!autoFollow) return;
    if (!bottomAnchorRef.current) return;
    bottomAnchorRef.current.scrollIntoView({ block: "end" });
  }, [entries, autoFollow, value]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    storeRef.current.loadFromUrl?.().catch(() => {});
  }, []);

  function updateHistory(nextValue, nextPos) {
    setHistoryPos(nextPos);
    setValue(nextValue);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        const end = nextValue.length;
        el.setSelectionRange(end, end);
      }
    });
  }

  async function executeCommand(cmd, displayCmd, anFilter) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setEntries((prev) => [...prev, { type: "input", text: displayCmd }]);

    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === displayCmd) return prev;
      return [...prev, displayCmd];
    });
    setHistoryPos(-1);
    historyDraftRef.current = "";

    try {
      const cmdUpper = trimmed.toUpperCase();
      if (cmdUpper.startsWith("DAC") || cmdUpper.startsWith("DAN")) {
        await storeRef.current.loadFromUrl?.().catch(() => {});
      }
      const { events, state } = await processCommand(
        coreStateRef.current,
        trimmed,
        {
          locations: storeRef.current,
        }
      );
      coreStateRef.current = state;
      const outputLines = events
        .filter((event) => event.type === "print")
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
          if (cmdUpper.startsWith("AN")) {
            const hasHeader =
              outputLines[0]?.startsWith("AN") &&
              outputLines[1]?.includes("AVAILABILITY");
            if (hasHeader) {
              const groupId = anGroupIdRef.current + 1;
              anGroupIdRef.current = groupId;
              setActiveAnGroupId(groupId);
              return [...prev, ...buildANEntries(outputLines, anFilter, groupId)];
            }
            return [
              ...prev,
              ...outputLines.map((line) => ({ type: "text", text: line })),
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
    }
  }

  async function onEnter() {
    const cmd = value.trim();
    if (!cmd) return;
    const { baseCmd, filter } = splitANFilter(cmd);
    setValue("");
    await executeCommand(baseCmd, cmd, filter);
  }

  function handleANSelection(delta) {
    if (availRows.length === 0) return;
    setSelectedAvailIndex((prev) => {
      const next = Math.max(0, Math.min(availRows.length - 1, prev + delta));
      const row = availRows[next];
      if (row) setSelectedTokenIndex(defaultTokenIndex(row));
      return next;
    });
  }

  function handleTokenSelection(delta) {
    if (selectedAvailIndex < 0) return;
    const row = availRows[selectedAvailIndex];
    if (!row || row.tokens.length === 0) return;
    setSelectedTokenIndex((prev) => {
      const next = Math.max(0, Math.min(row.tokens.length - 1, prev + delta));
      return next;
    });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAutoFollow(isNearBottom(el));
  }

  async function handleDirectSS() {
    if (selectedAvailIndex < 0 || availRows.length === 0) return;
    const row = availRows[selectedAvailIndex];
    if (!row) return;
    const token = row.tokens[selectedTokenIndex];
    const classCode = token?.code || "Y";
    const cmd = `SS${row.originalLineNo}${classCode}1`;
    await executeCommand(cmd, cmd, null);
  }

  useEffect(() => {
    if (!availRows.length) {
      if (selectedAvailIndex !== -1) setSelectedAvailIndex(-1);
      return;
    }
    if (selectedAvailIndex < 0) {
      setSelectedAvailIndex(0);
      return;
    }
    if (selectedAvailIndex >= availRows.length) {
      setSelectedAvailIndex(availRows.length - 1);
    }
  }, [availRows, selectedAvailIndex]);

  useEffect(() => {
    if (!autoFollow) return;
    const anchor = caretAnchorRef.current;
    if (!anchor) return;
    requestAnimationFrame(() => {
      anchor.scrollIntoView({ block: "center" });
    });
  }, [autoFollow, entries, value]);

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
          if (entry.type === "input") {
            return (
              <div className="line prompt-line" key={`input-${i}`}>
                <span className="prompt-char">&gt;</span>
                <span className="prompt-gap" />
                <span className="prompt-text">{entry.text}</span>
              </div>
            );
          }
          if (entry.type === "anRow") {
            return (
              <div key={`an-${i}`}>
                {entry.lineSegments.map((segments, lineIdx) => (
                  <div className="line" key={`an-${i}-${lineIdx}`}>
                    {segments.map((segment, segIdx) => {
                      if (segment.type === "token") {
                        const isSelected =
                          entry.rowIndex === selectedAvailIndex &&
                          segment.index === selectedTokenIndex;
                        return (
                          <span
                            key={`seg-${i}-${lineIdx}-${segIdx}`}
                            className={
                              isSelected ? "token token-selected" : "token"
                            }
                          >
                            {segment.value}
                          </span>
                        );
                      }
                      return (
                        <span key={`seg-${i}-${lineIdx}-${segIdx}`}>
                          {segment.value}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div
              className={`line${
                i === selectedEntryIndex ? " selected-row" : ""
              }`}
              key={`line-${i}`}
            >
              {entry.text}
            </div>
          );
        })}
        <div className="line prompt-line">
          <span className="prompt-char">&gt;</span>
          <span className="prompt-gap" />
          <div className="prompt-input-wrap">
            <div className="prompt-ghost" aria-hidden="true">
              <span className="prompt-text">{value}</span>
              <span className="prompt-caret" />
            </div>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                if (historyPos !== -1) setHistoryPos(-1);
                setValue(e.target.value);
              }}
              onKeyDown={async (e) => {
                if (e.key === "End") {
                  setAutoFollow(true);
                  bottomAnchorRef.current?.scrollIntoView({ block: "end" });
                  e.preventDefault();
                  return;
                }
                if (e.altKey && e.key === "ArrowUp") {
                  if (history.length === 0) return;
                  if (historyPos === -1) {
                    historyDraftRef.current = value;
                    updateHistory(history[history.length - 1], history.length - 1);
                    e.preventDefault();
                    return;
                  }
                  const nextPos = Math.max(0, historyPos - 1);
                  updateHistory(history[nextPos], nextPos);
                  e.preventDefault();
                  return;
                }
                if (e.altKey && e.key === "ArrowDown") {
                  if (history.length === 0 || historyPos === -1) return;
                  const nextPos = historyPos + 1;
                  if (nextPos >= history.length) {
                    updateHistory(historyDraftRef.current, -1);
                    e.preventDefault();
                    return;
                  }
                  updateHistory(history[nextPos], nextPos);
                  e.preventDefault();
                  return;
                }
                if (!e.altKey && e.key === "ArrowUp") {
                  if (availRows.length > 0) {
                    handleANSelection(-1);
                    e.preventDefault();
                  }
                  return;
                }
                if (!e.altKey && e.key === "ArrowDown") {
                  if (availRows.length > 0) {
                    handleANSelection(1);
                    e.preventDefault();
                  }
                  return;
                }
                if (!e.altKey && e.key === "ArrowLeft") {
                  if (availRows.length > 0) {
                    handleTokenSelection(-1);
                    e.preventDefault();
                  }
                  return;
                }
                if (!e.altKey && e.key === "ArrowRight") {
                  if (availRows.length > 0) {
                    handleTokenSelection(1);
                    e.preventDefault();
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (value.trim() === "" && availRows.length > 0) {
                    e.preventDefault();
                    await handleDirectSS();
                    return;
                  }
                  await onEnter();
                }
              }}
              className="prompt-input"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
