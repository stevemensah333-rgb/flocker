const ITEMS = [
  "⚗️ RationPro — formulate least-cost feed in seconds",
  "🥚 EggLedger — track profit per bird, per cycle",
  "🐔 Broiler target FCR: ~1.8",
  "🌡️ Heat stress? Boost ventilation & cool water access",
  "💊 VetLine — photo + symptoms → guidance + nearest agrovet",
  "🐣 Layer peak target: 90%+ lay rate at point-of-lay",
];


export default function Ticker() {
  const sequence = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-flock-harvest/15 bg-flock-soil py-3.5">
      <div className="flex w-max animate-ticker whitespace-nowrap">
        {sequence.map((item, i) => (
          <span
            key={i}
            className="mx-7 font-sans text-[13.5px] font-medium text-flock-harvest"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
