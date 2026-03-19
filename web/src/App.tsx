import { useState, useMemo } from "react";
import products from "virtual:products";
import type { Product } from "./types";
import { LAYERS } from "./types";
import { computeThreats } from "./scoring";
import Header from "./components/Header";
import Filters from "./components/Filters";
import HeatmapTable from "./components/HeatmapTable";
import ThreatMatrix from "./components/ThreatMatrix";
import ProductDetail from "./components/ProductDetail";
import Composer from "./components/Composer";
import About from "./components/About";

export type SortField = "name" | typeof LAYERS[number] | "evidence";
export type SortDir = "asc" | "desc";

export default function App() {
  const [search, setSearch] = useState("");
  const [minStrength, setMinStrength] = useState<Record<string, number>>({});
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<"heatmap" | "threats" | "compose" | "about">("heatmap");

  // All unique portability tags
  const allPortTags = useMemo(() => {
    const s = new Set<string>();
    (products as Product[]).forEach((p) => p.portability.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, []);

  const allEvidence = useMemo(() => {
    const s = new Set<string>();
    (products as Product[]).forEach((p) => s.add(p.evidence_level));
    return Array.from(s).sort();
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = (products as Product[]).filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (portFilter.length > 0 && !portFilter.some((t) => p.portability.includes(t))) return false;
      if (evidenceFilter.length > 0 && !evidenceFilter.includes(p.evidence_level)) return false;
      for (const [layer, min] of Object.entries(minStrength)) {
        const s = p.layers[layer]?.s ?? 0;
        if ((s ?? 0) < min) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "evidence") {
        cmp = a.evidence_level.localeCompare(b.evidence_level);
      } else {
        const aS = a.layers[sortField]?.s ?? -1;
        const bS = b.layers[sortField]?.s ?? -1;
        cmp = (aS ?? -1) - (bS ?? -1);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [search, minStrength, portFilter, evidenceFilter, sortField, sortDir]);

  const productsWithThreats = useMemo(
    () => filtered.map((p) => ({ product: p, threats: computeThreats(p) })),
    [filtered]
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-2 sm:px-4 pb-16">
        {/* Tabs */}
        <div className="flex gap-0.5 sm:gap-1 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
          {(
            [
              ["heatmap", "Score Cards"],
              ["threats", "Threats"],
              ["compose", "Compose"],
              ["about", "About"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto hidden sm:flex items-center text-xs text-gray-400 pr-2">
            {filtered.length} / {(products as Product[]).length} products
          </div>
        </div>

        {tab !== "compose" && tab !== "about" && (
          <Filters
            search={search}
            onSearch={setSearch}
            minStrength={minStrength}
            onMinStrength={setMinStrength}
            portFilter={portFilter}
            onPortFilter={setPortFilter}
            allPortTags={allPortTags}
            evidenceFilter={evidenceFilter}
            onEvidenceFilter={setEvidenceFilter}
            allEvidence={allEvidence}
          />
        )}

        {tab === "heatmap" && (
          <HeatmapTable
            data={productsWithThreats}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onSelect={setSelectedProduct}
          />
        )}

        {tab === "threats" && (
          <ThreatMatrix
            data={productsWithThreats}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onSelect={setSelectedProduct}
          />
        )}

        {tab === "compose" && (
          <Composer products={products as Product[]} />
        )}

        {tab === "about" && <About />}

        {selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            threats={computeThreats(selectedProduct)}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </main>
    </div>
  );
}
