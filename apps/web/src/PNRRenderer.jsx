import TSTRenderer from "./TSTRenderer.jsx";

const HEADER_TITLE = "TST RLR SFP";
const HEADER_LEFT = "RP/PARA1210D/PARA1210D";
const HEADER_RIGHT = "AA/SU  26NOV14/1535Z  3I7NQ9";

function splitLine(line) {
  const match = line.match(/^\s*(\d{1,2})\s+(.*)$/);
  if (!match) return { no: null, text: line };
  return { no: match[1], text: match[2] };
}

export default function PNRRenderer({ lines, tsts }) {
  const filtered = (lines || []).filter((line) => !line.startsWith("TST "));
  const parsed = filtered.map(splitLine);
  const numbered = parsed.filter((line) => line.no !== null);
  const lastNo = numbered.length
    ? Math.max(...numbered.map((line) => Number(line.no)))
    : 0;
  const startIndex = lastNo + 1;

  return (
    <div className="pnr-block">
      <div className="pnr-header">
        <span className="pnr-title">{HEADER_TITLE}</span>
      </div>
      <div className="pnr-header">
        <span>{HEADER_LEFT}</span>
        <span>{HEADER_RIGHT}</span>
      </div>
      {parsed.map((line, idx) => {
        if (line.no === null) {
          return (
            <div className="pnr-line" key={`raw-${idx}`}>
              <span className="pnr-no"></span>
              <span className="pnr-text">{line.text}</span>
            </div>
          );
        }
        return (
          <div className="pnr-line" key={`pnr-${idx}`}>
            <span className="pnr-no">{line.no}</span>
            <span className="pnr-text">{line.text}</span>
          </div>
        );
      })}
      <TSTRenderer tsts={tsts} startIndex={startIndex} />
    </div>
  );
}
