import type { Product, ThreatResult } from "../types";
import { LAYERS, LAYER_SHORT } from "../types";
import { ScoreCell, StrengthBar, EvidenceBadge } from "./ScoreCell";
import type { SortField, SortDir } from "../App";

interface Props {
  data: { product: Product; threats: ThreatResult }[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onSelect: (p: Product) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-0.5">↕</span>;
  return (
    <span className="text-indigo-500 ml-0.5">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export default function HeatmapTable({
  data,
  sortField,
  sortDir,
  onSort,
  onSelect,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th
              className="text-left py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50 z-10"
              onClick={() => onSort("name")}
            >
              Product
              <SortIcon active={sortField === "name"} dir={sortDir} />
            </th>
            {LAYERS.map((l) => (
              <th
                key={l}
                className="text-center py-2 px-1 font-medium text-gray-500 cursor-pointer hover:text-gray-700 whitespace-nowrap"
                onClick={() => onSort(l)}
              >
                <div className="text-[10px] text-gray-400">
                  {LAYER_SHORT[l]}
                </div>
                <div className="text-xs text-indigo-600 font-bold">{l}</div>
                <SortIcon active={sortField === l} dir={sortDir} />
              </th>
            ))}
            <th
              className="text-center py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700 whitespace-nowrap"
              onClick={() => onSort("evidence")}
            >
              <div className="text-[10px]">Evidence</div>
              <SortIcon active={sortField === "evidence"} dir={sortDir} />
            </th>
            <th className="text-center py-2 px-2 font-medium text-gray-400 text-[10px] whitespace-nowrap">
              Reviewed
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ product: p }) => (
            <tr
              key={p.name}
              className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
              onClick={() => onSelect(p)}
            >
              <td className="py-1.5 px-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                {p.name}
              </td>
              {LAYERS.map((l) => (
                <td key={l} className="py-1.5 px-1 w-16">
                  <ScoreCell
                    s={p.layers[l]?.s ?? null}
                    g={p.layers[l]?.g ?? null}
                    layer={l}
                  />
                  <StrengthBar s={p.layers[l]?.s ?? null} />
                </td>
              ))}
              <td className="py-1.5 px-2 text-center">
                <EvidenceBadge level={p.evidence_level} />
              </td>
              <td className="py-1.5 px-2 text-center text-[10px] text-gray-400 whitespace-nowrap">
                {p.last_reviewed ?? "Pending"}
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
    </div>
  );
}
