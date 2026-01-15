// CODEX ACCESS TEST
import { useEffect, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore } from "@simulateur/data";
import PNRRenderer from "./PNRRenderer.jsx";

export default function Terminal() {
  const [entries, setEntries] = useState([
    { type: "text", text: "AMADEUS SELLING PLATFORM" },
    { type: "text", text: "TRAINING MODE" },
  ]);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createInMemoryStore();
  }
  const coreStateRef = useRef(createInitialState());

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

  return (
    <div className="terminal">
      <div className="screen">
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
          return (
            <div className="line" key={`line-${i}`}>
              {entry.text}
            </div>
          );
        })}
        <div className="line prompt">
          <span className="prompt-char">&gt;</span>{" "}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
            className="prompt-input"
          />
        </div>
      </div>
    </div>
  );
}
