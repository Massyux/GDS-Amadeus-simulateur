// CODEX ACCESS TEST
import { useEffect, useRef, useState } from "react";
import { createInitialState, processCommand } from "@simulateur/core";
import { createInMemoryStore } from "@simulateur/data";

export default function Terminal() {
  const [lines, setLines] = useState([
    "AMADEUS SELLING PLATFORM",
    "TRAINING MODE",
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
    setLines((prev) => [...prev, `> ${cmd}`]);
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
        setLines((prev) => [...prev, ...outputLines]);
      }
    } catch (error) {
      setLines((prev) => [...prev, "INVALID FORMAT"]);
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    storeRef.current.loadFromUrl?.().catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: "monospace", padding: 16 }}>
      <div
        style={{
          minHeight: 420,
          border: "1px solid #444",
          padding: 12,
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div>
          &gt;{" "}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
            style={{
              fontFamily: "monospace",
              width: "80%",
              border: "none",
              outline: "none",
              background: "transparent",
            }}
          />
        </div>
      </div>
    </div>
  );
}
