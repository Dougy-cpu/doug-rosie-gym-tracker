const crackPaths = [
  { d: "M181 24 L174 49 L184 66 L168 88", phase: "early" },
  { d: "M174 49 L146 58 L126 76 L94 82", phase: "early" },
  { d: "M184 66 L211 54 L237 62 L268 49", phase: "early" },
  { d: "M168 88 L143 104 L118 102 L88 122", phase: "mid" },
  { d: "M168 88 L180 111 L163 132 L171 158", phase: "mid" },
  { d: "M168 88 L205 91 L223 111 L253 118", phase: "mid" },
  { d: "M146 58 L128 38 L102 31 L79 17", phase: "mid" },
  { d: "M211 54 L224 31 L249 25 L277 12", phase: "mid" },
  { d: "M88 122 L58 116 L35 132 L9 127", phase: "late" },
  { d: "M118 102 L105 139 L83 157 L72 191", phase: "late" },
  { d: "M171 158 L150 176 L147 207", phase: "late" },
  { d: "M171 158 L194 177 L201 215", phase: "late" },
  { d: "M253 118 L282 108 L309 123 L351 116", phase: "late" },
  { d: "M223 111 L244 144 L274 155 L290 194", phase: "late" },
  { d: "M205 91 L235 82 L261 90 L289 78", phase: "late" },
  { d: "M143 104 L122 120 L92 119", phase: "late" }
] as const;

const crackIntersections = [
  { cx: 174, cy: 49, phase: "early" },
  { cx: 184, cy: 66, phase: "early" },
  { cx: 168, cy: 88, phase: "mid" },
  { cx: 146, cy: 58, phase: "mid" },
  { cx: 211, cy: 54, phase: "mid" },
  { cx: 118, cy: 102, phase: "late" },
  { cx: 171, cy: 158, phase: "late" },
  { cx: 223, cy: 111, phase: "late" }
] as const;

export function CrackOverlay({ active }: { active: boolean }) {
  return (
    <span className={active ? "hold-crack-overlay active" : "hold-crack-overlay"} aria-hidden="true">
      <svg viewBox="0 0 360 220" preserveAspectRatio="none">
        <g className="crack-shadow-lines">
          {crackPaths.map((path, index) => (
            <path key={`shadow-${index}`} className={`crack-path crack-${path.phase}`} d={path.d} pathLength="1" />
          ))}
        </g>
        <g className="crack-hot-lines">
          {crackPaths.map((path, index) => (
            <path key={`hot-${index}`} className={`crack-path crack-${path.phase}`} d={path.d} pathLength="1" />
          ))}
        </g>
        <g className="crack-intersections">
          {crackIntersections.map((point, index) => (
            <circle key={index} className={`crack-spark crack-${point.phase}`} cx={point.cx} cy={point.cy} r="2.4" />
          ))}
        </g>
      </svg>
    </span>
  );
}

export function SparkLeak({ active }: { active: boolean }) {
  return (
    <span className={active ? "hold-spark-leak active" : "hold-spark-leak"} aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <i key={index} style={{ "--spark-index": index } as React.CSSProperties} />
      ))}
    </span>
  );
}
