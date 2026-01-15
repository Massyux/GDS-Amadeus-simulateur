export default function TSTRenderer({ tsts, startIndex }) {
  if (!tsts || tsts.length === 0) return null;
  let lineNo = startIndex;
  return (
    <>
      {tsts.map((tst) => {
        const pax = tst.paxCounts || {};
        const paxParts = [`ADT*${pax.ADT || 0}`];
        if (pax.CHD) paxParts.push(`CHD*${pax.CHD}`);
        if (pax.INF) paxParts.push(`INF*${pax.INF}`);
        const text = `TST ${tst.id}  PAX ${paxParts.join(" ")}  EUR ${
          tst.total
        }  VC ${tst.validatingCarrier}  STATUS ${tst.status}`;
        const currentNo = lineNo;
        lineNo += 1;
        return (
          <div className="pnr-line" key={`tst-${tst.id}`}>
            <span className="pnr-no">{currentNo}</span>
            <span className="pnr-text">{text}</span>
          </div>
        );
      })}
    </>
  );
}
