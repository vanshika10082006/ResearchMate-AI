# Connecting ResearchMate AI to Claude & Other LLMs (MCP Server)

ResearchMate AI includes a native **Model Context Protocol (MCP)** server. This allows **Claude Desktop**, **Claude Code**, **Cursor**, **Windsurf**, and any other MCP-compatible AI client to directly query, search, and analyze your indexed research papers!

---

## What Claude Can Do With ResearchMate AI

Once connected, Claude has access to these native tools:
1. `list_papers`: Lists all papers in your ResearchMate library with document IDs, titles, and chunk counts.
2. `search_papers`: Performs semantic vector search across your papers using FAISS and MiniLM embeddings to retrieve exact relevant passages and page/section numbers.
3. `ask_paper`: Executes full RAG question answering grounded in your papers.
4. `summarize_paper`: Generates academic summaries of specific papers.
5. `get_paper_insights`: Extracts research gaps, proposed future work, citation analysis, and technical keywords.
6. `compare_papers`: Performs structured side-by-side comparative analysis of two papers.

---

## 1. Setting up Claude Desktop

Claude Desktop configuration file location:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json` (e.g. `C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json`)
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Open the file (create it if it does not exist) and add the following configuration:

```json
{
  "mcpServers": {
    "researchmate": {
      "command": "C:\\Users\\ma\\Downloads\\researchmate-ai (1)\\researchmate-ai\\backend\\.venv\\Scripts\\python.exe",
      "args": [
        "C:\\Users\\ma\\Downloads\\researchmate-ai (1)\\researchmate-ai\\backend\\mcp_server.py"
      ],
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
    }
  }
}
```

*Note: Replace paths with your actual project location if you move the folder.*

### How to use in Claude Desktop:
1. Restart Claude Desktop.
2. Click the hammer icon (🔨) in the bottom-right corner of the chat input to see the `ResearchMate AI` tools.
3. Ask Claude questions like:
   - *"What papers do I have in my ResearchMate library?"*
   - *"Search my research papers for discussions on attention mechanisms or RAG architecture."*
   - *"Summarize paper `c56cf052-a59c-49de-b733-c40c0367a4c4` and tell me its main research gaps."*

---

## 2. Setting up Cursor

To connect Cursor to ResearchMate:
1. In Cursor, open **Settings** (`Ctrl+,`) -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in:
   - **Name**: `researchmate`
   - **Type**: `command`
   - **Command**: `C:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\backend\.venv\Scripts\python.exe C:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\backend\mcp_server.py`

Or add it directly to `.cursor/mcp.json` in your workspace root:
```json
{
  "mcpServers": {
    "researchmate": {
      "command": "C:\\Users\\ma\\Downloads\\researchmate-ai (1)\\researchmate-ai\\backend\\.venv\\Scripts\\python.exe",
      "args": [
        "C:\\Users\\ma\\Downloads\\researchmate-ai (1)\\researchmate-ai\\backend\\mcp_server.py"
      ]
    }
  }
}
```

---

## 3. Running Standalone for Testing

You can run or test the MCP server directly using Python:
```bash
cd backend
.venv\Scripts\python.exe mcp_server.py
```
It starts over standard I/O (stdio) transport waiting for JSON-RPC messages from MCP clients.
