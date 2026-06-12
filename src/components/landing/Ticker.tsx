const ITEMS = [
  "🐔 4,200 poultry farms",
  "🥚 Avg. 88% laying rate tracked",
  "⚗️ RationPro: ₵2.85/kg avg. feed cost",
  "💊 VetLine: 3,200 diagnoses this week",
  "🐣 Broiler avg. FCR: 1.84 across tracked flocks",
  "🌡️ Heat alert: Kumasi farms — check ventilation",
];

export default function Ticker() {
  const sequence = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden bg-flock-soil py-3">
      <div className="flex w-max animate-ticker whitespace-nowrap">
        {sequence.map((item, i) => (
          <span
            key={i}
            className="mx-6 font-sans text-[13px] text-flock-harvest"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
