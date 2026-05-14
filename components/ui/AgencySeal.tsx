export default function AgencySeal({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" stroke="white" strokeWidth="2" fill="#111111" opacity="0.95" />
      <circle cx="100" cy="100" r="88" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" />

      {/* Circular text - top arc */}
      <path id="topArc" d="M 18,100 A 82,82 0 0,1 182,100" fill="none" />
      <text fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="3" fill="white">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          AUSVERSE INTELLIGENCE AGENCY
        </textPath>
      </text>

      {/* Circular text - bottom arc */}
      <path id="bottomArc" d="M 25,110 A 76,76 0 0,0 175,110" fill="none" />
      <text fontSize="9.5" fontFamily="JetBrains Mono, monospace" letterSpacing="3.5" fill="white" opacity="0.6">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          MOST WANTED DIVISION
        </textPath>
      </text>

      {/* Inner ring */}
      <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="0.75" fill="#0c0c0c" opacity="0.9" />

      {/* Shield */}
      <path
        d="M100 48 L130 62 L130 90 Q130 118 100 132 Q70 118 70 90 L70 62 Z"
        fill="#111111"
        stroke="white"
        strokeWidth="1.2"
      />

      {/* Eye inside shield */}
      <ellipse cx="100" cy="88" rx="15" ry="9" fill="none" stroke="white" strokeWidth="1" />
      <circle cx="100" cy="88" r="4.5" fill="white" opacity="0.9" />
      <circle cx="100" cy="88" r="1.8" fill="#0c0c0c" />

      {/* Rays */}
      <line x1="100" y1="75" x2="100" y2="71" stroke="white" strokeWidth="0.7" opacity="0.4" />
      <line x1="111" y1="80" x2="114" y2="77" stroke="white" strokeWidth="0.7" opacity="0.4" />
      <line x1="89" y1="80" x2="86" y2="77" stroke="white" strokeWidth="0.7" opacity="0.4" />
      <line x1="100" y1="101" x2="100" y2="105" stroke="white" strokeWidth="0.7" opacity="0.4" />

      {/* Side stars */}
      <text x="74" y="103" fontSize="8" fill="white" opacity="0.5" textAnchor="middle">★</text>
      <text x="126" y="103" fontSize="8" fill="white" opacity="0.5" textAnchor="middle">★</text>

      {/* Bottom banner */}
      <path d="M78 116 Q100 123 122 116 L122 121 Q100 129 78 121 Z" fill="white" opacity="0.08" stroke="white" strokeWidth="0.6" />
      <text x="100" y="120.5" fontSize="6.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="1.5" opacity="0.6">
        VIGILANCE
      </text>

      {/* Outer tick marks */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10 * Math.PI) / 180;
        const x1 = 100 + 90 * Math.cos(angle);
        const y1 = 100 + 90 * Math.sin(angle);
        const x2 = 100 + 94 * Math.cos(angle);
        const y2 = 100 + 94 * Math.sin(angle);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="0.6" opacity="0.25" />
        );
      })}
    </svg>
  );
}
