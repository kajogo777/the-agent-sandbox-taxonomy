const REPO_URL = "https://github.com/kajogo777/the-agent-sandbox-taxonomy";

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Hero */}
      <section className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-4">
          7 · 7 · 3
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          The Agent Sandbox Taxonomy
        </h2>
        <p className="mt-2 text-gray-500 text-sm max-w-xl mx-auto">
          An open framework for evaluating AI agent sandboxes. It decomposes
          sandboxing into <strong>7 defense layers</strong>, maps them against{" "}
          <strong>7 threat categories</strong>, and scores each mechanism on{" "}
          <strong>3 dimensions</strong> — producing comparable fingerprints for
          any product.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Read the full specification on GitHub →
        </a>
      </section>

      {/* The Problem */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">The Problem</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          When someone says "we sandbox our agents," that could mean anything
          from a Docker container with no security hardening to a
          hardware-isolated microVM with default-deny egress and credential
          proxying. The taxonomy provides a{" "}
          <strong>shared vocabulary</strong> for describing what any sandbox does
          and doesn't do.
        </p>
      </section>

      {/* 7 Defense Layers */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          7 Defense Layers
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Every sandbox enforces some combination of these layers. No sandbox
          covers all seven equally. Most cover two or three well and ignore the
          rest.
        </p>
        <div className="space-y-2">
          {DEFENSE_LAYERS.map((l) => (
            <div
              key={l.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="shrink-0 w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {l.id}
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {l.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {l.question}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>Key insight:</strong> Lower layers are foundational. Strong L1
          makes L3 easier. But upper layers cannot be derived from lower ones —
          a microVM with perfect L1 but no L4 still lets the agent exfiltrate
          secrets via a single outbound request.
        </div>
      </section>

      {/* 7 Threats */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          7 Threat Categories
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Agents can cause seven categories of harm. Sandboxes exist to contain
          them. Threats don't respect layer boundaries — a single destructive
          operation might involve reading a credential (L3/L5), making a network
          request (L4), and executing a destructive API call (L6).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THREAT_CATEGORIES.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="shrink-0 w-8 h-8 rounded-md bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                {t.id}
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {t.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Scoring Dimensions */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          3 Evaluation Dimensions
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Each layer is rated on three dimensions, producing a fingerprint that
          makes comparison instant.
        </p>

        {/* Strength */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Strength (S: 0–4)
          </h4>
          <div className="space-y-1.5">
            {STRENGTH_SCALE.map((s) => (
              <div key={s.score} className="flex items-center gap-2">
                <span
                  className={`shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${s.style}`}
                >
                  {s.score}
                </span>
                <div>
                  <span className="text-xs font-semibold text-gray-800">
                    {s.label}
                  </span>
                  <span className="text-xs text-gray-500 ml-1.5">
                    — {s.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Granularity */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Granularity (G: 0–3)
          </h4>
          <div className="space-y-1.5">
            {GRANULARITY_SCALE.map((g) => (
              <div key={g.score} className="flex items-center gap-2">
                <span className="shrink-0 w-7 h-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {g.score}
                </span>
                <div>
                  <span className="text-xs font-semibold text-gray-800">
                    {g.label}
                  </span>
                  <span className="text-xs text-gray-500 ml-1.5">
                    — {g.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portability */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Portability
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            Tags answering: what OS does it run on, and what infrastructure does
            it need?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PORT_TAGS.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-600"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The Fingerprint */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          The Fingerprint
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Every product gets a CVSS-inspired vector string showing its strength
          at each layer. Score cards show <code className="text-indigo-600">S.G</code> per layer.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
          <div className="text-gray-400 text-xs mb-2"># Full form</div>
          <div className="text-emerald-400">
            L1:4/L2:4/L3:4/L4:0/L5:2/L6:—/L7:2
          </div>
          <div className="text-gray-400 text-xs mt-3 mb-2"># Score card</div>
          <div className="text-amber-300">
            4.1 / 4.2 / 4.1 / 0.0 / 2.2 / — / 2.1
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <strong className="text-gray-800">0</strong> — layer operates but
            unenforced (wide open)
          </div>
          <div>
            <strong className="text-gray-800">—</strong> — layer not addressed
            (outside scope)
          </div>
        </div>
      </section>

      {/* Composition */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Why Composition Is Necessary
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          No single product covers all seven layers well. Products that focus on
          L1–L3 (the isolation boundary) complement products that focus on L4–L7
          (behavior governance, credentials, observability). The stacking rule is
          simple: <strong>take the maximum strength at each layer.</strong>
        </p>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs leading-relaxed">
          <div className="text-gray-500">
            {"                     L1/L2/L3/L4/L5/L6/L7"}
          </div>
          <div className="text-blue-400">
            {"  Cloud Platform      4/ 4/ 4/ 2/ 1/ —/ 1  "}
            <span className="text-gray-500">← strong box, weak upper</span>
          </div>
          <div className="text-violet-400">
            {"+ Policy Tool         2/ 0/ 2/ 2/ 3/ 2/ 3  "}
            <span className="text-gray-500">← no box, governs behavior</span>
          </div>
          <div className="text-gray-500">
            {"──────────────────────────────────────────"}
          </div>
          <div className="text-emerald-400 font-bold">
            {"= Composed (max)     4/ 4/ 4/ 2/ 3/ 2/ 3  "}
            <span className="text-gray-500 font-normal">← gaps filled</span>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-gray-800 mt-5 mb-2">
          Composition Patterns
        </h4>
        <div className="space-y-2">
          {COMPOSITION_PATTERNS.map((p) => (
            <div
              key={p.name}
              className="p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <div className="text-sm font-semibold text-gray-900">
                {p.name}
              </div>
              <div className="text-xs text-gray-500 italic">{p.tagline}</div>
              <div className="text-xs text-gray-600 mt-1">{p.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          <strong>Anti-pattern:</strong> A cloud platform with excellent L1/L2/L3
          but default (unrestricted) network access and raw credentials as env
          vars. The agent runs in a perfect microVM but can still exfiltrate
          credentials, delete cloud resources, and reach internal services.{" "}
          <strong>
            This is the most common configuration in practice and a false sense
            of security.
          </strong>
        </div>
      </section>

      {/* Sandboxes vs Alignment */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Sandboxes ≠ Agent Alignment
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Prompt injection, hallucination, misalignment — these are reasons an
          agent might <em>decide</em> to do something harmful. They are{" "}
          <strong>vectors</strong>, not threats. The taxonomy deliberately
          excludes them because sandboxes control what an agent{" "}
          <strong>can</strong> do, not what it <strong>chooses</strong> to do.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs leading-relaxed text-gray-600 border border-gray-200">
          <div className="text-gray-400 mb-1">
            Prompt injection, hallucination, bad context...
          </div>
          <div className="text-gray-400 mb-1">
            {"         ↓"}
          </div>
          <div className="text-amber-600 font-semibold mb-1">
            {"  Agent Alignment  ← why the agent decided"}
          </div>
          <div className="text-gray-400 mb-1">
            {"         ↓"}
          </div>
          <div className="text-gray-500 mb-1">
            {"  Agent attempts harmful action"}
          </div>
          <div className="text-gray-400 mb-1">
            {"         ↓"}
          </div>
          <div className="text-indigo-600 font-semibold">
            {"  Sandbox boundary  ← what the agent can do (this taxonomy)"}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-8">
        <p className="text-sm text-gray-500 mb-3">
          Use the <strong>Score Cards</strong> tab to explore products, the{" "}
          <strong>Threat Coverage</strong> tab to see what's defended, and the{" "}
          <strong>Compose</strong> tab to build your stack.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Full specification, ast-probe, and contributing guidelines on GitHub
        </a>
      </section>
    </div>
  );
}

// ── Static data ──────────────────────────────────────────────────────

const DEFENSE_LAYERS = [
  {
    id: "L1",
    name: "Compute Isolation",
    question: "What separates the agent's execution from the host system?",
  },
  {
    id: "L2",
    name: "Resource Limits",
    question: "Is it constrained in CPU, memory, disk, time?",
  },
  {
    id: "L3",
    name: "Filesystem Boundary",
    question: "What can it read, write, and delete on disk?",
  },
  {
    id: "L4",
    name: "Network Boundary",
    question: "What external systems can it communicate with?",
  },
  {
    id: "L5",
    name: "Credential & Secret Management",
    question: "Can the agent see, use, or exfiltrate credentials?",
  },
  {
    id: "L6",
    name: "Action Governance",
    question: "Can you control what operations it performs?",
  },
  {
    id: "L7",
    name: "Observability & Audit",
    question: "Can you see what the agent did, when, and why?",
  },
];

const THREAT_CATEGORIES = [
  {
    id: "T1",
    name: "Data Exfiltration",
    example: "Reads SSH keys, sends via outbound request",
  },
  {
    id: "T2",
    name: "Supply Chain Compromise",
    example: "Malicious install script exfiltrates env vars",
  },
  {
    id: "T3",
    name: "Destructive Operations",
    example: "rm -rf /, cloud resource deletion, kubectl delete namespace",
  },
  {
    id: "T4",
    name: "Lateral Movement",
    example: "Scans local network, hits cloud metadata endpoint",
  },
  {
    id: "T5",
    name: "Persistence",
    example: "Writes cron job on host, modifies shell init files",
  },
  {
    id: "T6",
    name: "Privilege Escalation",
    example: "Exploits kernel CVE, container escape",
  },
  {
    id: "T7",
    name: "Denial of Service",
    example: "Fork bomb, memory bomb, disk filling",
  },
];

const STRENGTH_SCALE = [
  {
    score: 0,
    label: "None",
    desc: "No enforcement at this layer",
    style: "bg-red-50 border-red-200 text-red-600",
  },
  {
    score: 1,
    label: "Cooperative",
    desc: "Process can circumvent or opt out",
    style: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    score: 2,
    label: "Software-enforced",
    desc: "Separate process enforces; can't bypass from inside",
    style: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    score: 3,
    label: "Kernel-enforced",
    desc: "OS kernel enforces; irreversible once applied",
    style: "bg-violet-50 border-violet-200 text-violet-700",
  },
  {
    score: 4,
    label: "Structural",
    desc: "Attack surface doesn't exist inside the sandbox",
    style: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

const GRANULARITY_SCALE = [
  { score: 0, label: "None", desc: "No control" },
  { score: 1, label: "Binary", desc: "On/off" },
  { score: 2, label: "Allowlist/Blocklist", desc: "Lists of permitted or denied resources" },
  { score: 3, label: "Per-resource policy", desc: "Fine-grained rules per resource, action, and context" },
];

const PORT_TAGS = [
  "any-os",
  "linux",
  "mac",
  "cloud",
  "cloud-managed",
  "docker",
  "k8s",
  "kvm",
];

const COMPOSITION_PATTERNS = [
  {
    name: "Platform + Policy Layer",
    tagline: "Strong box, smart guardrails",
    desc: "Cloud sandbox (L1–L3) + policy tool (L4–L7). Full-stack coverage.",
  },
  {
    name: "OS-Level Wrapper + Policy Sidecar",
    tagline: "Lightweight local protection",
    desc: "Kernel-level process wrapper (L1/L3/L5) + policy sidecar (L4/L6/L7). Zero cost, no cloud.",
  },
  {
    name: "Built-in Sandbox + Cloud Fallback",
    tagline: "Local for speed, cloud for untrusted",
    desc: "Agent's built-in sandbox for trusted work + cloud platform for untrusted operations.",
  },
  {
    name: "K8s-Native Stack",
    tagline: "Enterprise, self-hosted, policy-driven",
    desc: "Sandbox CRD (L1/L2/L3) + NetworkPolicy (L4) + policy engine (L6) + secrets manager (L5) + monitoring (L7).",
  },
];
