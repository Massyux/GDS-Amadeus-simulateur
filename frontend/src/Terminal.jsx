import { useEffect, useRef, useState } from "react";

export default function Terminal() {
  const [lines, setLines] = useState([
    "AMADEUS SELLING PLATFORM",
    "TRAINING MODE",
  ]);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  function print(t) {
    setLines((prev) => [...prev, String(t)]);
  }

  async function onEnter() {
    const cmd = value.trim();
    setLines((prev) => [...prev, `> ${cmd}`]);
    setValue("");
    if (!cmd) return;

    const c = cmd.toUpperCase();

    // mini commandes pour tester l'UI
    if (c === "JD") {
      print(new Date().toDateString().toUpperCase());
      return;
    }
    if (c === "HELP" || c === "HE") {
      print("AVAILABLE COMMANDS");
      print("JD  DATE");
      print("HELP HELP");
      print("AN/NM/RF/... (à brancher juste après)");
      return;
    }

    print("OK");
  }

  useEffect(() => {
    inputRef.current?.focus();
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
