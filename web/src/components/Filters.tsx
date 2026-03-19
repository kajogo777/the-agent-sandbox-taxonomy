import { LAYERS, LAYER_SHORT } from "../types";

interface FiltersProps {
  search: string;
  onSearch: (v: string) => void;
  minStrength: Record<string, number>;
  onMinStrength: (v: Record<string, number>) => void;
  portFilter: string[];
  onPortFilter: (v: string[]) => void;
  allPortTags: string[];
  evidenceFilter: string[];
  onEvidenceFilter: (v: string[]) => void;
  allEvidence: string[];
}

export default function Filters({
  search,
  onSearch,
  minStrength,
  onMinStrength,
  portFilter,
  onPortFilter,
  allPortTags,
  evidenceFilter,
  onEvidenceFilter,
  allEvidence,
}: FiltersProps) {
  const hasFilters =
    search ||
    Object.keys(minStrength).length > 0 ||
    portFilter.length > 0 ||
    evidenceFilter.length > 0;

  return (
    <div className="mb-6 space-y-3">
      {/* Search + clear */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              onSearch("");
              onMinStrength({});
              onPortFilter([]);
              onEvidenceFilter([]);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Layer minimum strength filters */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-2 items-center min-w-max">
          <span className="text-xs font-medium text-gray-500 shrink-0">
            Min strength:
          </span>
        {LAYERS.map((l) => (
          <div key={l} className="flex items-center gap-1">
            <label className="text-xs text-gray-500">{LAYER_SHORT[l]}</label>
            <select
              value={minStrength[l] ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === 0) {
                  const next = { ...minStrength };
                  delete next[l];
                  onMinStrength(next);
                } else {
                  onMinStrength({ ...minStrength, [l]: v });
                }
              }}
              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
            >
              <option value={0}>any</option>
              <option value={1}>≥1</option>
              <option value={2}>≥2</option>
              <option value={3}>≥3</option>
              <option value={4}>4</option>
            </select>
          </div>
        ))}
        </div>
      </div>

      {/* Tag filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-medium text-gray-500 shrink-0">
            Platform:
          </span>
          {allPortTags.map((tag) => {
            const active = portFilter.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  onPortFilter(
                    active
                      ? portFilter.filter((t) => t !== tag)
                      : [...portFilter, tag]
                  )
                }
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  active
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-medium text-gray-500 shrink-0">
            Evidence:
          </span>
          {allEvidence.map((ev) => {
            const active = evidenceFilter.includes(ev);
            return (
              <button
                key={ev}
                onClick={() =>
                  onEvidenceFilter(
                    active
                      ? evidenceFilter.filter((e) => e !== ev)
                      : [...evidenceFilter, ev]
                  )
                }
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  active
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {ev}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
