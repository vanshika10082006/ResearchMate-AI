import React, { useState, useEffect } from "react";
import Header from "./components/Header.jsx";
import HeroSection from "./components/HeroSection.jsx";
import UploadSection from "./components/UploadSection.jsx";
import ComparePapersCard from "./components/ComparePapersCard.jsx";
import ActiveIngestionCard from "./components/ActiveIngestionCard.jsx";
import RecentPapersList from "./components/RecentPapersList.jsx";
import LibraryView from "./components/LibraryView.jsx";
import SkillsHub from "./components/SkillsHub.jsx";
import Footer from "./components/Footer.jsx";
import Modals from "./components/Modals.jsx";
import WorkspaceView from "./components/Workspace/WorkspaceView.jsx";
import FloatingChatWidget from "./components/FloatingChatWidget.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function App() {
  // Navigation & Search State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Real Uploaded Papers List
  const [papers, setPapers] = useState(() => {
    try {
      const saved = localStorage.getItem("researchmate_papers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Upload State
  const [activeUpload, setActiveUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Workspace State
  const [activeWorkspacePaper, setActiveWorkspacePaper] = useState(null);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState("insights"); // "insights" | "chat"

  // Modals (kept for backward compatibility or simple use cases if needed, but we will route primarily to workspace)
  const [selectedPaperForInsights, setSelectedPaperForInsights] =
    useState(null);
  const [selectedPaperForChat, setSelectedPaperForChat] = useState(null);

  // Global Persistent Chat State
  const [globalChatPaper, setGlobalChatPaper] = useState(null);
  const [isChatPoppedOut, setIsChatPoppedOut] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    if (activeWorkspacePaper) {
      setGlobalChatPaper(activeWorkspacePaper);
      setIsChatVisible(true);
      // Dock it initially when opening a workspace, unless they already popped it out explicitly
    } else if (!isChatPoppedOut) {
      // If we close workspace and it's NOT popped out, hide it
      setIsChatVisible(false);
    }
  }, [activeWorkspacePaper]);

  // Backend Status
  const [serverStatus, setServerStatus] = useState("checking"); // 'online' | 'offline' | 'checking'
  const [toast, setToast] = useState(null);

  // Persist papers in local storage
  useEffect(() => {
    try {
      localStorage.setItem("researchmate_papers", JSON.stringify(papers));
    } catch {
      // ignore
    }
  }, [papers]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Check Backend Health
  const checkHealth = async () => {
    setServerStatus("checking");
    try {
      const res = await fetch(`${API_BASE}/health`, { method: "GET" });
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync papers from backend storage on startup
  useEffect(() => {
    fetch(`${API_BASE}/documents`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data.documents)) return;
        setPapers(data.documents);
      })
      .catch((err) => console.log("Failed to sync backend docs:", err));
  }, []);

  const handleImportSuccess = (record) => {
    const newPaper = {
      id: record.document_id,
      document_id: record.document_id,
      title: record.title || record.filename,
      fileName: record.filename,
      numChunks: record.num_chunks,
      fileSize: `${record.source || "Cloud"} Import`,
      uploadedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setPapers((prev) => {
      if (prev.some((p) => p.document_id === newPaper.document_id)) return prev;
      return [newPaper, ...prev];
    });
    showToast(`Imported "${newPaper.title}" (${record.num_chunks} chunks)`);
  };

  // Real File Upload Handler
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const file = fileArray[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please select a valid PDF file.");
      return;
    }

    setIsUploading(true);
    setActiveUpload({
      fileName: file.name,
      progress: 25,
      stage: "Uploading and parsing PDF text...",
    });

    const formData = new FormData();
    formData.append("file", file);

    try {
      setActiveUpload((prev) => ({
        ...prev,
        progress: 50,
        stage: "Generating vector embeddings & FAISS index...",
      }));

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setActiveUpload((prev) => ({
        ...prev,
        progress: 85,
        stage: "Extracting paper title via LLM...",
      }));

      // Extract title
      let paperTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      try {
        const titleRes = await fetch(`${API_BASE}/title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: data.document_id,
            model: selectedModel,
          }),
        });
        const titleData = await titleRes.json();
        if (
          titleRes.ok &&
          titleData.title &&
          typeof titleData.title === "string"
        ) {
          const raw = titleData.title.trim();
          if (
            raw.length > 0 &&
            !raw.toLowerCase().includes("gemini_api_key") &&
            !raw.toLowerCase().includes("api error") &&
            !raw.toLowerCase().includes("error:") &&
            !raw.toLowerCase().includes("please set")
          ) {
            paperTitle = raw;
          }
        }
      } catch {
        // use fallback title
      }

      const newPaper = {
        id: data.document_id,
        document_id: data.document_id,
        title: paperTitle,
        fileName: data.filename,
        numChunks: data.num_chunks,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setPapers((prev) => [newPaper, ...prev]);
      setActiveUpload({
        fileName: file.name,
        progress: 100,
        stage: "Processing complete!",
      });
      showToast(`Indexed "${newPaper.title}" (${data.num_chunks} chunks)`);
    } catch (err) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setActiveUpload(null), 1500);
    }
  };

  // Delete Paper Handler
  const handleDeletePaper = async (paperId) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${paperId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      setPapers((prev) =>
        prev.filter((paper) => (paper.document_id || paper.id) !== paperId),
      );
      showToast("Paper deleted from storage.");
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // Export Synthesis Report
  const handleExportInsights = () => {
    if (papers.length === 0) return;
    const report = `# ResearchMate AI — Literature Collection Report
Generated: ${new Date().toLocaleString()}
Total Indexed Manuscripts: ${papers.length}

${papers
  .map(
    (p, i) => `### ${i + 1}. ${p.title}
- File Name: ${p.fileName}
- Document ID: ${p.document_id}
- Vector Chunks Indexed: ${p.numChunks}
- Ingested: ${p.uploadedAt}
`,
  )
  .join("\n")}
`;

    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ResearchMate_Collection_Report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Collection report exported to Markdown.");
  };

  // Filtered papers by search query
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const filteredPapers = papers.filter((p) => {
    const title = (p.title || p.filename || "").toLowerCase();
    const fileName = (p.fileName || p.filename || "").toLowerCase();
    return (
      title.includes(normalizedSearchQuery) ||
      fileName.includes(normalizedSearchQuery)
    );
  });

  const totalChunks = papers.reduce((acc, p) => acc + (p.numChunks || 0), 0);

  const rootHeightClass = activeWorkspacePaper
    ? "h-screen overflow-hidden"
    : "min-h-screen";

  return (
    <div
      className={`${rootHeightClass} bg-[#131315] text-[#e5e1e4] flex flex-col`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#201f21] border border-[#8083ff]/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs text-[#e5e1e4] flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-ping" />
          <span>{toast}</span>
        </div>
      )}

      {/* Global Header */}
      {!activeWorkspacePaper && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          serverStatus={serverStatus}
          onCheckHealth={checkHealth}
        />
      )}

      {/* Main View */}
      {activeWorkspacePaper ? (
        <main className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
          <WorkspaceView
            paper={activeWorkspacePaper}
            availablePapers={papers}
            onSelectPaper={setActiveWorkspacePaper}
            initialTab={workspaceInitialTab}
            onClose={() => setActiveWorkspacePaper(null)}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            serverStatus={serverStatus}
            onDeletePaper={(paperId) => {
              handleDeletePaper(paperId);
              setActiveWorkspacePaper(null);
            }}
            isChatPoppedOut={isChatPoppedOut}
            isChatVisible={isChatVisible}
            onToggleChat={() => setIsChatVisible(!isChatVisible)}
          />
        </main>
      ) : (
        <>
          <main className="w-full pt-20 sm:pt-24 pb-12 flex-1">
            {activeTab === "dashboard" && (
              <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8">
                <div className="relative w-full overflow-hidden">
                  {/* Ambient Glows */}
                  <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#8083ff]/10 rounded-full blur-3xl pointer-events-none -z-10" />
                  <div className="absolute top-48 right-1/4 w-[28rem] h-[28rem] bg-[#00a6e0]/10 rounded-full blur-3xl pointer-events-none -z-10" />

                  <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
                    {/* Hero Section */}
                    <HeroSection
                      totalPapers={papers.length}
                      totalChunks={totalChunks}
                      serverStatus={serverStatus}
                    />

                    {/* Upload Zone & Ingestion Progress */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 flex flex-col gap-6">
                        <UploadSection
                          onFileUpload={handleFileUpload}
                          isUploading={isUploading}
                        />
                      </div>
                      <div className="lg:col-span-4 sticky top-24">
                        <ActiveIngestionCard
                          activeUpload={activeUpload}
                          totalPapers={papers.length}
                        />
                      </div>
                    </div>

                    {/* Full-width Paper Comparison */}
                    <ComparePapersCard
                      indexedPapers={papers}
                      showToast={showToast}
                      selectedLanguage={selectedLanguage}
                    />

                    {/* Papers List */}
                    <RecentPapersList
                      papers={filteredPapers}
                      onOpenInsights={(paper) => {
                        setActiveWorkspacePaper(paper);
                        setWorkspaceInitialTab("insights");
                      }}
                      onOpenChat={(paper) => {
                        setActiveWorkspacePaper(paper);
                        setWorkspaceInitialTab("chat");
                      }}
                      onDeletePaper={handleDeletePaper}
                      onExportInsights={handleExportInsights}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Library Tab */}
            {activeTab === "library" && (
              <div className="px-4 sm:px-6 lg:px-8">
                <LibraryView
                  papers={filteredPapers}
                  onOpenInsights={(p) => {
                    setActiveWorkspacePaper(p);
                    setWorkspaceInitialTab("insights");
                  }}
                  onOpenChat={(p) => {
                    setActiveWorkspacePaper(p);
                    setWorkspaceInitialTab("chat");
                  }}
                  onDeletePaper={handleDeletePaper}
                  onUpload={() => setActiveTab("dashboard")}
                />
              </div>
            )}

            {activeTab === "skills" && (
              <SkillsHub
                onImportSuccess={handleImportSuccess}
                setActiveTab={setActiveTab}
              />
            )}
          </main>

          {/* Footer */}
          <Footer />
        </>
      )}

      {/* Real Modals */}
      <Modals
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedPaperForInsights={selectedPaperForInsights}
        onCloseInsights={() => setSelectedPaperForInsights(null)}
        selectedPaperForChat={selectedPaperForChat}
        onCloseChat={() => setSelectedPaperForChat(null)}
        onDocumentUnavailable={(paper) => {
          handleDeletePaper(paper.id);
          setSelectedPaperForInsights(null);
          setSelectedPaperForChat(null);
        }}
      />

      {/* Global Floating Chat */}
      <FloatingChatWidget
        paper={globalChatPaper}
        availablePapers={papers}
        onSelectPaper={setActiveWorkspacePaper}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedLanguage={selectedLanguage}
        isPoppedOut={isChatPoppedOut}
        setIsPoppedOut={setIsChatPoppedOut}
        isVisible={isChatVisible}
        setIsVisible={setIsChatVisible}
      />
    </div>
  );
}
