import type { Product, ThreatResult, ThreatKey } from "../types";
import { THREATS, THREAT_NAMES } from "../types";
import { ThreatIndicator, EvidenceBadge } from "./ScoreCell";
import type { SortField, SortDir } from "../App";

interface Props {
  data: { product: Product; threats: ThreatResult }[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onSelect: (p: Product) => void;
}

export default function ThreatMatrix({
  data,
  onSelect,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
              Product
            </th>
            {THREATS.map((t) => (
              <th
                key={t}
                className="text-center py-2 px-2 font-medium text-gray-500 whitespace-nowrap"
              >
                <div className="text-[10px] text-gray-400">
                  {THREAT_NAMES[t]}
                </div>
                <div className="text-xs text-indigo-600 font-bold">{t}</div>
              </th>
            ))}
            <th className="text-center py-2 px-2 font-medium text-gray-500 text-[10px] whitespace-nowrap">
              Evidence
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ product: p, threats }) => (
            <tr
              key={p.name}
              className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
              onClick={() => onSelect(p)}
            >
              <td className="py-2 px-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                {p.name}
              </td>
              {THREATS.map((t) => {
                const level = threats[t as ThreatKey];
                return (
                  <td key={t} className="py-2 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <ThreatIndicator level={level} size="md" />
                      {t === "T3" && (
                        <span className="text-[9px] text-gray-400">
                          {threats.T3_detail}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center">
                <EvidenceBadge level={p.evidence_level} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No products match your filters.
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-6 items-center text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <ThreatIndicator level="full" /> Addressed
        </div>
        <div className="flex items-center gap-1.5">
          <ThreatIndicator level="partial" /> Partial
        </div>
        <div className="flex items-center gap-1.5">
          <ThreatIndicator level="none" /> Not addressed
        </div>
        <span className="text-gray-400">
          T3 split: L=Local (L1+L3) / R=Remote (L4+L6)
        </span>
      </div>
    </div>
  );
}
