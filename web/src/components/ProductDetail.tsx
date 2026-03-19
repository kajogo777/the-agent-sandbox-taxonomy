import type { Product, ThreatResult, ThreatKey, LayerKey } from "../types";
import {
  LAYERS,
  LAYER_NAMES,
  THREATS,
  THREAT_NAMES,
  STRENGTH_LABELS,
  EVIDENCE_LABELS,
} from "../types";
import { getFingerprint } from "../scoring";
import { ScoreCell, ThreatIndicator } from "./ScoreCell";

interface Props {
  product: Product;
  threats: ThreatResult;
  onClose: () => void;
}

export default function ProductDetail({ product, threats, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-12 px-0 sm:px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-white rounded-t-xl sm:rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
            <code className="text-xs text-indigo-600 font-mono mt-1 block">
              {getFingerprint(product)}
            </code>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div>
              <span className="text-gray-500">Evidence:</span>{" "}
              <span className="font-medium">
                {EVIDENCE_LABELS[product.evidence_level] ??
                  product.evidence_level}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Reviewed:</span>{" "}
              <span className="font-medium">
                {product.last_reviewed ?? "Pending"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Portability:</span>{" "}
              {product.portability.map((t) => (
                <span
                  key={t}
                  className="inline-block ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Layer scores */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Layer Scores
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left py-1 pr-2">Layer</th>
                  <th className="text-center py-1 w-16">S.G</th>
                  <th className="text-left py-1 pl-3 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {LAYERS.map((l) => {
                  const layer = product.layers[l];
                  return (
                    <tr key={l} className="border-b border-gray-50 align-top">
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span className="font-bold text-indigo-600 text-xs">
                          {l}
                        </span>{" "}
                        <span className="text-gray-500 text-xs">
                          {LAYER_NAMES[l]}
                        </span>
                      </td>
                      <td className="py-2 w-16">
                        <ScoreCell
                          s={layer?.s ?? null}
                          g={layer?.g ?? null}
                          layer={l as LayerKey}
                        />
                      </td>
                      <td className="py-2 pl-3 text-xs text-gray-600 leading-relaxed hidden sm:table-cell">
                        {layer?.note || (
                          <span className="text-gray-400 italic">
                            Not addressed
                          </span>
                        )}
                        {layer?.s !== null &&
                          layer?.s !== undefined &&
                          layer.s > 0 && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              ({STRENGTH_LABELS[layer.s]})
                            </span>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Threat coverage */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Threat Coverage
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THREATS.map((t) => {
                const level = threats[t as ThreatKey];
                return (
                  <div
                    key={t}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <ThreatIndicator level={level} size="md" />
                    <div>
                      <span className="font-bold text-indigo-600">{t}</span>{" "}
                      {THREAT_NAMES[t]}
                      {t === "T3" && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({threats.T3_detail})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {product.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Notes
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {product.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
