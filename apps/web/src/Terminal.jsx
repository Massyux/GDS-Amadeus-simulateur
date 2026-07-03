// CODEX ACCESS TEST
import { useEffect, useMemo, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore, createLocationProvider } from "@simulateur/data";
import PNRRenderer from "./PNRRenderer.jsx";

const NEAR_BOTTOM_THRESHOLD_PX = 40;
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
  if (!filter) return { baseCmd: cmd, filter: null };
  return { baseCmd, filter };
}

function tokenizeLine(line, tokens) {
  const segments = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match = null;
  while ((match = TOKEN_RE.exec(line))) {
    const token = match[1];
    const before = line.slice(lastIndex, match.index);
    if (before) segments.push({ type: "text", text: before });
    const code = token[0];
    const seats = Number.parseInt(token[1], 10);
    const tokenIndex = tokens.length;
    tokens.push({ index: tokenIndex, code, seats, raw: token });
    segments.push({ type: "token", text: token, tokenIndex });
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    segments.push({ type: "text", text: line.slice(lastIndex) });
  }
  return segments;
}

// Regroupe les lignes d'un AN en blocs { line1, wraps }, applique le filtre
// compagnie et conserve le lineNo original du moteur (nécessaire pour SS,
// distinct du numéro affiché si des lignes ont été filtrées).
function buildANEntries(lines, filter, groupId) {
  const entries = [];
  lines.slice(0, 2).forEach((text) => entries.push({ type: "text", text }));

  const rows = [];
  let current = null;
  lines.slice(2).forEach((line) => {
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
        lineNo: Number.parseInt(match[1], 10),
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
    const tokens = [];
    const lineSegments = [tokenizeLine(row.line1, tokens)];
    row.wraps.forEach((wrapLine) => {
      lineSegments.push(tokenizeLine(wrapLine, tokens));
    });
    entries.push({
      type: "anRow",
      anGroupId: groupId,
      rowIndex: index,
      lineNo: row.lineNo,
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
  const [activeAnGroupId, setActiveAnGroupId] = useState(null);
  const [selectedAvailIndex, setSelectedAvailIndex] = useState(-1);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [prevAnGroupId, setPrevAnGroupId] = useState(activeAnGroupId);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const historyDraftRef = useRef("");
  const anGroupIdRef = useRef(0);
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createInMemoryStore();
  }
  const locationProviderRef = useRef(null);
  if (!locationProviderRef.current) {
    locationProviderRef.current = createLocationProvider(storeRef.current);
  }
  const coreStateRef = useRef(createInitialState());

  const availRows = useMemo(() => {
    if (!activeAnGroupId) return [];
    return entries.filter(
      (entry) => entry.type === "anRow" && entry.anGroupId === activeAnGroupId
    );
  }, [entries, activeAnGroupId]);

  // Nouveau lot AN : on repart sur la première ligne dès ce rendu (pattern
  // "adjust state during rendering" de React, pas un effet -- évite un
  // rendu de plus avec l'ancienne sélection avant que l'effet ne se déclenche).
  let nextAvailIndex = selectedAvailIndex;
  let nextTokenIndex = selectedTokenIndex;
  if (activeAnGroupId !== prevAnGroupId) {
    setPrevAnGroupId(activeAnGroupId);
    nextAvailIndex = availRows.length > 0 ? 0 : -1;
    nextTokenIndex = availRows.length > 0 ? defaultTokenIndex(availRows[0]) : 0;
    setSelectedAvailIndex(nextAvailIndex);
    setSelectedTokenIndex(nextTokenIndex);
  }

  // Sélection "effective" dérivée à chaque rendu (bornée à la plage
  // courante, token recalculé s'il est sorti des clous) : pas besoin d'un
  // effet pour la maintenir synchronisée avec availRows.
  const effectiveAvailIndex =
    availRows.length === 0
      ? -1
      : Math.min(Math.max(nextAvailIndex, 0), availRows.length - 1);
  const effectiveRow =
    effectiveAvailIndex >= 0 ? availRows[effectiveAvailIndex] : null;
  const effectiveTokenIndex = effectiveRow
    ? nextTokenIndex >= 0 && nextTokenIndex < effectiveRow.tokens.length
      ? nextTokenIndex
      : defaultTokenIndex(effectiveRow)
    : 0;

  async function executeCommand(cmd, displayText = cmd, anFilter = null) {
    const trimmedCmd = cmd.trim();
    setEntries((prev) => [...prev, { type: "input", text: `> ${displayText}` }]);
    if (!trimmedCmd) return;

    try {
      const cmdUpper = trimmedCmd.toUpperCase();
      if (cmdUpper.startsWith("DAC") || cmdUpper.startsWith("DAN")) {
        await storeRef.current.loadFromUrl?.().catch(() => {});
      }
      const { events, state } = await processCommand(
        coreStateRef.current,
        trimmedCmd,
        {
          deps: {
            locations: locationProviderRef.current,
          },
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
          }
          return [
            ...prev,
            ...outputLines.map((line) => ({ type: "text", text: line })),
          ];
        });
      }
      setHistory((prev) => {
        if (!displayText) return prev;
        if (prev.length > 0 && prev[prev.length - 1] === displayText) return prev;
        return [...prev, displayText];
      });
      setHistoryPos(-1);
    } catch {
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
    const { baseCmd, filter } = splitANFilter(cmd);
    await executeCommand(baseCmd, cmd, filter);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    storeRef.current.loadFromUrl?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoFollow) return;
    bottomAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [autoFollow, entries]);

  function handleScroll() {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const nearBottom = isNearBottom(scrollEl);
    setAutoFollow(nearBottom);
  }

  function moveAvailSelection(delta) {
    if (availRows.length === 0) return;
    const next = Math.max(
      0,
      Math.min(availRows.length - 1, effectiveAvailIndex + delta)
    );
    setSelectedAvailIndex(next);
    setSelectedTokenIndex(defaultTokenIndex(availRows[next]));
  }

  function moveTokenSelection(delta) {
    if (!effectiveRow || effectiveRow.tokens.length === 0) return;
    const next = Math.max(
      0,
      Math.min(effectiveRow.tokens.length - 1, effectiveTokenIndex + delta)
    );
    setSelectedTokenIndex(next);
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
          if (entry.type === "anRow") {
            const isSelectedRow =
              entry.anGroupId === activeAnGroupId &&
              entry.rowIndex === effectiveAvailIndex;
            return (
              <div key={`an-${i}`}>
                {entry.lineSegments.map((segments, lineIdx) => (
                  <div className="line" key={`an-${i}-${lineIdx}`}>
                    {segments.map((segment, segIndex) => {
                      if (segment.type === "token") {
                        const isSelectedToken =
                          isSelectedRow &&
                          segment.tokenIndex === effectiveTokenIndex;
                        return (
                          <span
                            key={`token-${i}-${lineIdx}-${segIndex}`}
                            className={`avail-token${
                              isSelectedToken ? " selected" : ""
                            }`}
                          >
                            {segment.text}
                          </span>
                        );
                      }
                      return (
                        <span key={`text-${i}-${lineIdx}-${segIndex}`}>
                          {segment.text}
                        </span>
                      );
                    })}
                  </div>
                ))}
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
                  effectiveAvailIndex >= 0 &&
                  value.length === 0
                ) {
                  e.preventDefault();
                  moveTokenSelection(-1);
                  return;
                }
                if (
                  !e.altKey &&
                  e.key === "ArrowRight" &&
                  availRows.length > 0 &&
                  effectiveAvailIndex >= 0 &&
                  value.length === 0
                ) {
                  e.preventDefault();
                  moveTokenSelection(1);
                  return;
                }
                if (!e.altKey && e.key === "ArrowUp" && availRows.length > 0) {
                  e.preventDefault();
                  moveAvailSelection(-1);
                  return;
                }
                if (!e.altKey && e.key === "ArrowDown" && availRows.length > 0) {
                  e.preventDefault();
                  moveAvailSelection(1);
                  return;
                }
                if (e.key === "End") {
                  setAutoFollow(true);
                  bottomAnchorRef.current?.scrollIntoView({ block: "end" });
                  return;
                }
                if (e.key === "Enter") {
                  if (effectiveRow && value.trim() === "") {
                    const token =
                      effectiveRow.tokens[effectiveTokenIndex] ??
                      effectiveRow.tokens[0] ??
                      null;
                    if (token) {
                      e.preventDefault();
                      const nextValue = `SS${effectiveRow.lineNo}${token.code}1`;
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
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
