
# POPO - The Second Brain 🐥

**POPO** is a Notion-like Personal Knowledge Management (PKM) workspace integrated with a powerful AI agent. It allows users to organize notes, manage tasks, analyze data tables, and chat with their own data (PDFs, Docs, Images) using Google's Gemini API.

It features a **Local-First** architecture (data stays in your browser via IndexedDB) and includes an **Autonomous Deep Research Agent** capable of planning and executing web searches to generate comprehensive reports.

---

## 🚀 Key Features

*   **Workspace Organization**: Manage Projects, Documents, Databases (Tables), and Task Boards (Kanban).
*   **AI Chat (RAG)**: Chat with your project data. The AI reads your uploaded PDFs, DOCX files, and Notes to answer context-aware questions.
*   **Deep Research Agent**: An autonomous agent that plans research strategies, performs live Google Searches, and writes cited reports.
*   **Agentic Capabilities**: The AI can autonomously create database tables in your project based on search results.
*   **Rich Asset Support**: Drag-and-drop support for PDF, DOCX, and Images with automatic text extraction.
*   **Privacy Focused**: Data is stored locally in the browser using IndexedDB. Cross-device sync is handled via Export/Import of JSON backups.
*   **Markdown Support**: Full Markdown rendering for notes and chat responses.

---

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Provider**: Google Gemini API (`@google/genai` SDK)
*   **Storage**: IndexedDB (Browser Native)
*   **File Parsing**: `pdfjs-dist` (PDFs), `mammoth` (DOCX)
*   **Icons**: Lucide React

---

## 📂 Codebase Architecture

### 1. Core Logic (`App.tsx`)
The root component acting as the central controller.
*   **State Management**: Handles the active Project, Page, and View (Dashboard/Project).
*   **File Processing**: Contains the logic to parse uploaded files (`handleUploadAsset`). It converts binary files (PDF/DOCX) into raw text strings stored in the `Asset` object for the AI to read later.
*   **CRUD Operations**: Manages creating/deleting/renaming projects and assets.

### 2. The AI Brain (`services/geminiService.ts`)
This is the most critical file handling intelligence. It implements two major workflows:

**A. Client-Side RAG (Retrieval Augmented Generation)**
Instead of using a vector database, this app uses a smart client-side chunking algorithm:
1.  **Chunking (`chunkProjectData`)**: Splits all project pages and assets into manageably sized text chunks (~2000 chars). It intelligently parses JSON from Tables/Boards into readable text descriptions.
2.  **Scoring (`calculateRelevance`)**: When a user asks a question, the system tokenizes the query and scores all chunks based on keyword frequency and exact matches.
3.  **Context Injection**: The top 6 most relevant chunks are injected into the System Prompt, allowing Gemini to answer based on your specific files.

**B. Deep Research Agent (`runDeepResearch`)**
A multi-step agentic workflow:
1.  **Planner**: The model analyzes the user request and generates 3-4 specific Google Search queries.
2.  **Execution Loop**: It iterates through these queries, calls the `googleSearch` tool, and aggregates the results.
3.  **Synthesizer**: A final model call reads all gathered context and writes a structured Markdown report with citations.

### 3. Data Persistence (`services/db.ts`)
A wrapper around the browser's **IndexedDB**.
*   **`saveProjectsToDB`**: Serializes the entire application state (including Base64 images and large text) into the local database.
*   **`exportDatabase`**: Dumps the DB into a JSON file for backup.

### 4. Components
*   **`ChatInterface.tsx`**: The UI for the chat. It handles the Model Selector (Gemini 2.5 Flash vs Pro), renders Markdown messages, and manages the Deep Research state.
*   **`DocEditor.tsx`**: A dual-mode text editor (Write/Preview) supporting rich markdown and image pasting.
*   **`BoardView.tsx`**: A Kanban board for task management. It serializes the board state (Columns/Cards) into a JSON string to be stored in the `Page` model.
*   **`TableView.tsx`**: A dynamic spreadsheet editor allowing column/row manipulation.

---

## ⚙️ Setup & Installation

1.  **Environment Variables**:
    You need a valid Google Gemini API Key.
    Create a `.env` file (or assume process.env injection in your build environment):
    ```env
    API_KEY=your_gemini_api_key_here
    ```

2.  **Install Dependencies**:
    (If using a local Node environment)
    ```bash
    npm install react react-dom lucide-react @google/genai pdfjs-dist mammoth
    ```

3.  **Run Application**:
    ```bash
    npm run dev
    ```

4.  **Login**:
    The application is secured with a simple PIN.
    **Default PIN:** `121988`

---

## 🧠 How the AI Context Works

When you upload a file (e.g., "Contract.pdf"):
1.  `App.tsx` reads the file array buffer.
2.  `pdfjs-dist` extracts raw text layer.
3.  The text is saved to `project.assets[i].content`.
4.  When you chat, `geminiService.ts` grabs this text, chunks it, and feeds relevant parts to Gemini 2.5.

When you use the **Task Board**:
1.  You drag cards to "Done".
2.  The board state is saved as JSON.
3.  When you ask "What tasks are done?", `geminiService` parses the JSON and converts it to a string: *"Column Done contains task: 'Fix Bug'..."*.
4.  Gemini reads this string and answers: "You have completed the 'Fix Bug' task."

---

## 🔄 Data Sync

Since Supabase cloud sync was removed in favor of privacy/offline-capability:
1.  Click **Export** in the sidebar to download your workspace `.json`.
2.  Send the file to another device.
3.  Click **Import** on the new device to restore your workspace.
