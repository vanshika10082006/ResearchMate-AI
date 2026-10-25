import React, { useState } from "react";
import {
  Globe,
  Search,
  FileArchive,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Download,
  ExternalLink,
  BookOpen,
  Sparkles,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ─── Shared Result Card ──────────────────────────────────────────────────────
function PaperResultCard({ paper, onImport, importing }) {
  return (
    <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437]/80 hover:border-[#8083ff]/40 transition-all flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[#e5e1e4] line-clamp-2 leading-snug">
            {paper.title}
          </h4>
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5 text-[11px] text-[#908fa0]">
            {paper.authors?.slice(0, 3).join(", ")}
            {paper.year && (
              <span className="text-[#8083ff]">• {paper.year}</span>
            )}
            {paper.arxiv_id && (
              <a
                href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-0.5 text-[#7bd0ff] hover:text-white"
              >
                <ExternalLink className="w-2.5 h-2.5" /> arXiv
              </a>
            )}
          </div>
        </div>
        <button
          onClick={() => onImport(paper)}
          disabled={importing}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8083ff]/20 hover:bg-[#8083ff]/40 border border-[#8083ff]/40 text-[#c0c1ff] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Import
        </button>
      </div>
      {paper.abstract && (
        <p className="text-[11px] text-[#908fa0] leading-relaxed line-clamp-3">
          {paper.abstract}
        </p>
      )}
    </div>
  );
}

// ─── Success Banner ──────────────────────────────────────────────────────────
function SuccessBanner({ record, onDismiss, onViewInLibrary }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Imported successfully!</p>
        <p className="text-xs mt-0.5 text-emerald-400 truncate">
          {record.title} — {record.num_chunks} chunks indexed. Ready in your
          Library.
        </p>
      </div>
      {onViewInLibrary && (
        <button
          onClick={onViewInLibrary}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 transition-all cursor-pointer shrink-0"
        >
          View in Library →
        </button>
      )}
      <button
        onClick={onDismiss}
        className="text-emerald-400 hover:text-white text-xs cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Warning Banner ──────────────────────────────────────────────────────────
function WarningBanner({ message }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}

// ─── Error Banner ──────────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}

// ─── arXiv Connector Panel ────────────────────────────────────────────────────
function ArxivConnector({ onImportSuccess, onViewInLibrary }) {
  const [query, setQuery] = useState("");
  const [arxivId, setArxivId] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [success, setSuccess] = useState(null);
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/connectors/arxiv/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImportById = async (e) => {
    e.preventDefault();
    if (!arxivId.trim()) return;
    await doImport(arxivId.trim());
  };

  const handleImportFromResults = async (paper) => {
    await doImport(paper.arxiv_id);
  };

  const doImport = async (id) => {
    setImportingId(id);
    setError(null);
    setSuccess(null);
    setWarning(null);
    try {
      const res = await fetch(`${API_BASE}/connectors/arxiv/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arxiv_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data);
      if (onImportSuccess) onImportSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <SuccessBanner
          record={success}
          onDismiss={() => setSuccess(null)}
          onViewInLibrary={onViewInLibrary}
        />
      )}
      {warning && <WarningBanner message={warning} />}
      {error && <ErrorBanner message={error} />}

      {/* Import by ID */}
      <div className="p-5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/70">
        <h3 className="text-sm font-bold text-[#e5e1e4] mb-1 flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-[#8083ff]" /> Import by arXiv ID
        </h3>
        <p className="text-xs text-[#908fa0] mb-3">
          Paste an arXiv ID (e.g.{" "}
          <code className="text-[#8083ff]">1706.03762</code>) or full URL.
        </p>
        <form onSubmit={handleImportById} className="flex gap-2">
          <input
            type="text"
            value={arxivId}
            onChange={(e) => setArxivId(e.target.value)}
            placeholder="1706.03762  or  arxiv.org/abs/..."
            className="flex-1 bg-[#131315] border border-[#353437] rounded-xl px-3.5 py-2 text-sm text-[#e5e1e4] outline-none focus:border-[#8083ff] transition-all placeholder:text-[#908fa0] font-mono"
          />
          <button
            type="submit"
            disabled={!arxivId.trim() || importingId === arxivId.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8083ff] to-[#7bd0ff] text-[#0e0e10] font-semibold text-sm disabled:opacity-50 cursor-pointer transition-all hover:opacity-90"
          >
            {importingId === arxivId.trim() ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Import
          </button>
        </form>
      </div>

      {/* Keyword Search */}
      <div className="p-5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/70">
        <h3 className="text-sm font-bold text-[#e5e1e4] mb-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#7bd0ff]" /> Search arXiv Papers
        </h3>
        <p className="text-xs text-[#908fa0] mb-3">
          Search by keywords, topic, or author — then click Import on any
          result.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. diffusion models image generation"
            className="flex-1 bg-[#131315] border border-[#353437] rounded-xl px-3.5 py-2 text-sm text-[#e5e1e4] outline-none focus:border-[#7bd0ff] transition-all placeholder:text-[#908fa0]"
          />
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1b1d] hover:bg-[#353437] border border-[#353437] text-[#c7c4d7] font-semibold text-sm disabled:opacity-50 cursor-pointer transition-all"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </form>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((p, i) => (
              <PaperResultCard
                key={i}
                paper={p}
                onImport={handleImportFromResults}
                importing={importingId === p.arxiv_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── URL Connector Panel ──────────────────────────────────────────────────────
function UrlConnector({ onImportSuccess, onViewInLibrary }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setWarning(null);

    try {
      const res = await fetch(`${API_BASE}/connectors/url/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.warning) setWarning(data.warning);
        throw new Error(data.error || "Import failed");
      }
      setSuccess(data);
      if (data.warning) setWarning(data.warning);
      if (onImportSuccess) onImportSuccess(data);
      setUrl("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <SuccessBanner
          record={success}
          onDismiss={() => setSuccess(null)}
          onViewInLibrary={onViewInLibrary}
        />
      )}
      {warning && <WarningBanner message={warning} />}
      {error && <ErrorBanner message={error} />}

      <div className="p-5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/70">
        <h3 className="text-sm font-bold text-[#e5e1e4] mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" /> Import from URL
        </h3>
        <p className="text-xs text-[#908fa0] mb-3">
          Paste any blog post, preprint page, or open-access HTML article URL.
          Pages behind paywalls or requiring JavaScript may show a warning.
        </p>
        <form onSubmit={handleImport} className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/ai-paper-summary"
            className="w-full bg-[#131315] border border-[#353437] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e1e4] outline-none focus:border-emerald-400/60 transition-all placeholder:text-[#908fa0]"
          />
          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm disabled:opacity-50 cursor-pointer transition-all hover:opacity-90 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scraping &
                Indexing...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" /> Fetch & Index Page
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="p-4 rounded-xl bg-[#1c1b1d]/40 border border-[#353437]/40">
        <p className="text-xs font-semibold text-[#908fa0] mb-2 uppercase tracking-wider">
          Best Results With:
        </p>
        <ul className="space-y-1 text-xs text-[#908fa0]">
          <li>
            ✅ arXiv abstract pages:{" "}
            <code className="text-[#7bd0ff]">arxiv.org/abs/...</code>
          </li>
          <li>✅ Open access preprints & blog posts</li>
          <li>✅ Wikipedia & Stanford Encyclopedia of Philosophy articles</li>
          <li>❌ Nature, Springer, IEEE (paywalled — will warn)</li>
          <li>❌ React SPAs (JavaScript-rendered pages)</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Semantic Scholar Connector Panel ────────────────────────────────────────
function SemanticConnector({ onImportSuccess, onViewInLibrary }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importingTitle, setImportingTitle] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/connectors/semantic/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (paper) => {
    setImportingTitle(paper.title);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/connectors/semantic/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data);
      if (onImportSuccess) onImportSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setImportingTitle(null);
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <SuccessBanner
          record={success}
          onDismiss={() => setSuccess(null)}
          onViewInLibrary={onViewInLibrary}
        />
      )}
      {error && <ErrorBanner message={error} />}

      <div className="p-5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/70">
        <h3 className="text-sm font-bold text-[#e5e1e4] mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" /> Search Semantic
          Scholar
        </h3>
        <p className="text-xs text-[#908fa0] mb-3">
          Search 200M+ academic papers. Import any result — its abstract will be
          indexed immediately.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. BERT language model pre-training"
            className="flex-1 bg-[#131315] border border-[#353437] rounded-xl px-3.5 py-2 text-sm text-[#e5e1e4] outline-none focus:border-amber-400/60 transition-all placeholder:text-[#908fa0]"
          />
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-sm disabled:opacity-50 cursor-pointer transition-all"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </form>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((p, i) => (
              <PaperResultCard
                key={i}
                paper={p}
                onImport={handleImport}
                importing={importingTitle === p.title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ConnectorsPanel (tab switcher) ──────────────────────────────────────
export default function ConnectorsPanel({ onImportSuccess, onViewInLibrary }) {
  const [activeConnector, setActiveConnector] = useState("arxiv");

  const connectors = [
    { id: "arxiv", label: "arXiv", icon: "🔬", color: "text-[#c0c1ff]" },
    { id: "url", label: "Web URL", icon: "🌐", color: "text-emerald-400" },
    {
      id: "semantic",
      label: "Semantic Scholar",
      icon: "📚",
      color: "text-amber-400",
    },
  ];

  return (
    <div>
      {/* Connector type switcher */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-[#1c1b1d]/60 border border-[#353437]/60 rounded-xl w-fit">
        {connectors.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveConnector(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeConnector === c.id
                ? "bg-[#2a2a2c] text-[#e5e1e4] border border-[#464554]/50 shadow-sm"
                : "text-[#908fa0] hover:text-[#c7c4d7]"
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {activeConnector === "arxiv" && (
        <ArxivConnector
          onImportSuccess={onImportSuccess}
          onViewInLibrary={onViewInLibrary}
        />
      )}
      {activeConnector === "url" && (
        <UrlConnector
          onImportSuccess={onImportSuccess}
          onViewInLibrary={onViewInLibrary}
        />
      )}
      {activeConnector === "semantic" && (
        <SemanticConnector
          onImportSuccess={onImportSuccess}
          onViewInLibrary={onViewInLibrary}
        />
      )}
    </div>
  );
}
