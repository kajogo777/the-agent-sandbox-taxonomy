import { useState, useMemo } from "react";
import type { Product, ThreatKey } from "../types";
import { LAYERS, LAYER_SHORT, THREATS, THREAT_NAMES } from "../types";
import { composeProducts, computeThreats, getFingerprint } from "../scoring";
import { ScoreCell, StrengthBar, ThreatIndicator } from "./ScoreCell";

interface Props {
  products: Product[];
}

export default function Composer({ products }: Props) {
  const [pickA, setPickA] = useState<string>(products[0]?.name ?? "");
  const [pickB, setPickB] = useState<string>(products[1]?.name ?? "");

  const productA = products.find((p) => p.name === pickA);
  const productB = products.find((p) => p.name === pickB);

  const composed = useMemo(() => {
    if (!productA || !productB) return null;
    return composeProducts(productA, productB);
  }, [productA, productB]);

  // Build a fake Product for threat computation
  const composedProduct = useMemo(() => {
    if (!composed || !productA || !productB) return null;
    const fake: Product = {
      name: `${productA.name} + ${productB.name}`,
      portability: [
        ...new Set([...productA.portability, ...productB.portability]),
      ],
      layers: {} as Product["layers"],
      notes: "",
      last_reviewed: null,
      evidence_level: "composed",
    };
    for (const l of LAYERS) {
      fake.layers[l] = {
        s: composed[l].s,
        g: composed[l].g,
        note: "",
      };
    }
    return fake;
  }, [composed, productA, productB]);

  const threatsA = productA ? computeThreats(productA) : null;
  const threatsB = productB ? computeThreats(productB) : null;
  const threatsComposed = composedProduct
    ? computeThreats(composedProduct)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Select two products to compose
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Composition takes the <strong>maximum strength</strong> at each layer.
          Gaps in one product are filled by the other.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Product A
            </label>
            <select
              value={pickA}
              onChange={(e) => setPickA(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {products.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-lg font-bold text-gray-400 text-center sm:pb-2">+</div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Product B
            </label>
            <select
              value={pickB}
              onChange={(e) => setPickB(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {products.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {productA && productB && composed && composedProduct && (
        <>
          {/* Fingerprint comparison */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">
                Fingerprint Comparison
              </h3>
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 w-32 sm:w-48 sticky left-0 bg-white z-10">
                      &nbsp;
                    </th>
                    {LAYERS.map((l) => (
                      <th
                        key={l}
                        className="text-center py-2 px-1 font-medium"
                      >
                        <div className="text-[10px] text-gray-400">
                          {LAYER_SHORT[l]}
                        </div>
                        <div className="text-xs text-indigo-600 font-bold">
                          {l}
                        </div>
                      </th>
                    ))}
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs hidden sm:table-cell">
                      Fingerprint
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Product A */}
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 px-3 font-medium text-gray-700 text-xs sticky left-0 bg-white z-10">
                      {productA.name}
                    </td>
                    {LAYERS.map((l) => (
                      <td key={l} className="py-1.5 px-1 w-16">
                        <ScoreCell
                          s={productA.layers[l]?.s ?? null}
                          g={productA.layers[l]?.g ?? null}
                          layer={l}
                        />
                        <StrengthBar s={productA.layers[l]?.s ?? null} />
                      </td>
                    ))}
                    <td className="py-1.5 px-3 font-mono text-xs text-gray-500 hidden sm:table-cell">
                      {getFingerprint(productA)}
                    </td>
                  </tr>
                  {/* Product B */}
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 px-3 font-medium text-gray-700 text-xs sticky left-0 bg-white z-10">
                      {productB.name}
                    </td>
                    {LAYERS.map((l) => (
                      <td key={l} className="py-1.5 px-1 w-16">
                        <ScoreCell
                          s={productB.layers[l]?.s ?? null}
                          g={productB.layers[l]?.g ?? null}
                          layer={l}
                        />
                        <StrengthBar s={productB.layers[l]?.s ?? null} />
                      </td>
                    ))}
                    <td className="py-1.5 px-3 font-mono text-xs text-gray-500 hidden sm:table-cell">
                      {getFingerprint(productB)}
                    </td>
                  </tr>
                  {/* Composed */}
                  <tr className="bg-indigo-50/50 border-t-2 border-indigo-200">
                    <td className="py-2 px-3 font-bold text-indigo-700 text-xs sticky left-0 bg-indigo-50/50 z-10">
                      ✦ Composed (max)
                    </td>
                    {LAYERS.map((l) => (
                      <td key={l} className="py-2 px-1 w-16">
                        <ScoreCell
                          s={composed[l].s}
                          g={composed[l].g}
                          layer={l}
                        />
                        <StrengthBar s={composed[l].s} />
                      </td>
                    ))}
                    <td className="py-2 px-3 font-mono text-xs font-bold text-indigo-700 hidden sm:table-cell">
                      {getFingerprint(composedProduct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Threat comparison */}
          {threatsA && threatsB && threatsComposed && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">
                  Threat Coverage Comparison
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-500 w-48">
                        &nbsp;
                      </th>
                      {THREATS.map((t) => (
                        <th
                          key={t}
                          className="text-center py-2 px-2 font-medium"
                        >
                          <div className="text-[10px] text-gray-400">
                            {THREAT_NAMES[t]}
                          </div>
                          <div className="text-xs text-indigo-600 font-bold">
                            {t}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-700 text-xs">
                        {productA.name}
                      </td>
                      {THREATS.map((t) => (
                        <td key={t} className="py-2 px-2 text-center">
                          <ThreatIndicator
                            level={threatsA[t as ThreatKey]}
                            size="md"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-700 text-xs">
                        {productB.name}
                      </td>
                      {THREATS.map((t) => (
                        <td key={t} className="py-2 px-2 text-center">
                          <ThreatIndicator
                            level={threatsB[t as ThreatKey]}
                            size="md"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50/50 border-t-2 border-indigo-200">
                      <td className="py-2 px-3 font-bold text-indigo-700 text-xs">
                        ✦ Composed
                      </td>
                      {THREATS.map((t) => (
                        <td key={t} className="py-2 px-2 text-center">
                          <ThreatIndicator
                            level={threatsComposed[t as ThreatKey]}
                            size="md"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gaps analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Gap Analysis
            </h3>
            <div className="space-y-1">
              {LAYERS.map((l) => {
                const s = composed[l].s;
                if (s !== null && s > 0) return null;
                return (
                  <div
                    key={l}
                    className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1"
                  >
                    <span className="font-bold">{l}</span>
                    <span>
                      {s === null
                        ? "Not addressed by either product"
                        : "No enforcement (S:0)"}
                    </span>
                  </div>
                );
              })}
              {LAYERS.every(
                (l) => composed[l].s !== null && composed[l].s! > 0
              ) && (
                <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                  ✓ All layers covered — no gaps in the composed stack
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
