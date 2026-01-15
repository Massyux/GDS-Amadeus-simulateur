// CODEX ACCESS TEST
import { useEffect, useMemo, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore } from "@simulateur/data";
import PNRRenderer from "./PNRRenderer.jsx";

function isAvailabilityRow(line) {
  return /^\s*\d{1,2}\s+[A-Z0-9]{2}\s+\d{3,4}\b/.test(line);
}

function parseAvailabilityRow(line) {
  const match = line.match(
    /^\s*(\d{1,2})\s+([A-Z0-9]{2})\s+(\d{3,4})\s+(.*)$/
  );
  if (!match) return null;
  const lineNo = Number.parseInt(match[1], 10);
  const prefix = `${match[1]}  ${match[2]} ${match[3]}  `;
  const rest = match[4];
  const cutIndex = rest.indexOf(" /");
  const splitIndex = cutIndex !== -1 ? cutIndex : rest.indexOf("/");
  const tokensPart = splitIndex === -1 ? rest : rest.slice(0, splitIndex);
  const suffix = splitIndex === -1 ? "" : rest.slice(splitIndex);
  const tokens = tokensPart
    .trim()
    .split(/\s+/)
    .map((token) => {
      const code = token.slice(0, 1);
      const seats = Number.parseInt(token.slice(1), 10);
      return { code, seats: Number.isNaN(seats) ? 0 : seats, raw: token };
    });
  if (tokens.length === 0) return null;
  return {
    kind: "anRow",
    lineNo,
    prefix,
    tokens,
    suffix,
  };
}

function extractAvailabilityRows(entries) {
  const rows = [];
  entries.forEach((entry, index) => {
    if (entry.type !== "text") return;
    if (!isAvailabilityRow(entry.text)) return;
    const parsed = parseAvailabilityRow(entry.text);
    if (!parsed) return;
    rows.push({
      ...parsed,
      raw: entry.text,
      entryIndex: index,
    });
  });
  return rows;
}

function isNearBottom(scrollEl, thresholdPx = 40) {
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
  const caretAnchorRef = useRef(null);
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
  const selectedToken =
    selectedAvailIndex >= 0 && availRows[selectedAvailIndex]
      ? availRows[selectedAvailIndex].tokens[selectedTokenIndex]
      : null;

  async function onEnter() {
    const cmd = value.trim();
    setEntries((prev) => [...prev, { type: "input", text: `> ${cmd}` }]);
    setValue("");
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    storeRef.current.loadFromUrl?.().catch(() => {});
  }, []);

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
    if (!availRows.length || selectedAvailIndex < 0) return;
    const tokens = availRows[selectedAvailIndex].tokens;
    const firstAvailableIndex = tokens.findIndex((token) => token.seats > 0);
    setSelectedTokenIndex(firstAvailableIndex === -1 ? 0 : firstAvailableIndex);
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

  function moveCaretToEnd(nextValue) {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const len = nextValue.length;
      input.setSelectionRange(len, len);
    });
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
          const anRow = isAvailabilityRow(entry.text)
            ? parseAvailabilityRow(entry.text)
            : null;
          if (anRow) {
            const isSelectedRow = i === selectedEntryIndex;
            return (
              <div
                className={`line${isSelectedRow ? " selected-row" : ""}`}
                key={`line-${i}`}
              >
                {anRow.prefix}
                {anRow.tokens.map((token, idx) => {
                  const isSelectedToken =
                    isSelectedRow && idx === selectedTokenIndex;
                  return (
                    <span
                      key={`${anRow.lineNo}-${token.raw}-${idx}`}
                      className={isSelectedToken ? "token-selected" : ""}
                    >
                      {token.raw}
                      {idx < anRow.tokens.length - 1 ? " " : ""}
                    </span>
                  );
                })}
                {anRow.suffix}
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
          <span className="prompt-char">&gt;</span>
          <span className="prompt-gap" />
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
                if (!e.altKey && e.key === "ArrowUp" && availRows.length > 0) {
                  e.preventDefault();
                  setSelectedAvailIndex((prev) =>
                    Math.max(0, prev === -1 ? 0 : prev - 1)
                  );
                  return;
                }
                if (!e.altKey && e.key === "ArrowDown" && availRows.length > 0) {
                  e.preventDefault();
                  setSelectedAvailIndex((prev) =>
                    Math.min(availRows.length - 1, prev + 1)
                  );
                  return;
                }
                if (!e.altKey && e.key === "ArrowLeft" && availRows.length > 0) {
                  e.preventDefault();
                  setSelectedTokenIndex((prev) => Math.max(0, prev - 1));
                  return;
                }
                if (
                  !e.altKey &&
                  e.key === "ArrowRight" &&
                  availRows.length > 0
                ) {
                  e.preventDefault();
                  setSelectedTokenIndex((prev) => {
                    const maxIndex = availRows[selectedAvailIndex]
                      ? availRows[selectedAvailIndex].tokens.length - 1
                      : 0;
                    return Math.min(maxIndex, prev + 1);
                  });
                  return;
                }
                if (e.key === "End" || (e.ctrlKey && e.key === "End")) {
                  setAutoFollow(true);
                  const anchor = caretAnchorRef.current;
                  if (anchor) {
                    anchor.scrollIntoView({ block: "center" });
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (
                    selectedAvailIndex >= 0 &&
                    availRows[selectedAvailIndex] &&
                    value.trim() === ""
                  ) {
                    e.preventDefault();
                    const code =
                      selectedToken && selectedToken.code
                        ? selectedToken.code
                        : "Y";
                    const nextValue = `SS${availRows[selectedAvailIndex].lineNo}${code}1`;
                    setValue(nextValue);
                    moveCaretToEnd(nextValue);
                    return;
                  }
                  onEnter();
                  return;
                }
              }}
              className="prompt-input"
            />
            <span ref={caretAnchorRef} className="caret-anchor" />
          </span>
        </div>
      </div>
    </div>
  );
}
