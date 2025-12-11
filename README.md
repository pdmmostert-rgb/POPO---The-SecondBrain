

# POPO - The Local-First Second Brain 🐥

**POPO** is a Notion-like Personal Knowledge Management (PKM) workspace integrated with a powerful AI agent. It is designed to be the ultimate local-first solution for organizing notes, managing tasks, and conducting deep research without privacy concerns or subscription lock-ins.

---

## 👋 The "Vibe": Why I Built This

As a founder and builder, my digital life is fragmented. I have market research in 50 open Chrome tabs, confidential business plans in local PDFs, and tasks scattered across different apps.

I tried doing research, project management, and task tracking with various apps, but they didn't work for my workflow:

*   **ChatGPT**: I used the "Projects" feature, but it often suffers from context leaks between different projects. Crucially, it lacks robust task and project management options.
*   **Notion**: It has a steep learning curve, rigid data structures, and puts its AI features behind a paid plan.
*   **The "Data Hostage" Problem**: Many apps lock your data behind a subscription. If you stop paying, you lose access or functionality. That is too hectic for a serious workflow.

Something needed to be done.

---

## 🚀 Our Solution

**POPO** solves these major problems by combining the best of structured organization with autonomous AI, all while keeping your data strictly on your machine.

### 1. Local-First & Privacy-Centric
Your data is stored locally using **IndexedDB** in your browser. Nobody can take your data hostage. There are no cloud servers reading your private documents.

### 2. Notion-like Organization
Organize your data in a structured way.
*   **Docs**: Rich text editing with Markdown support.
*   **Databases**: Flexible tables for structured data.
*   **Task Boards**: Full Kanban support (like Trello/Notion) to manage your projects.

### 3. Context Isolation
There is no context leak. When you chat with the AI about "Project A", it only retrieves context from "Project A". Your "Project B" plans remain invisible to the current session.

### 4. Local-First RAG (Chat with Data)
Drag and drop **PDFs**, **DOCX**, and **Images**. The app parses and processes these files locally in your browser. When you chat, the AI answers using your private data combined with its general knowledge.

### 5. Autonomous Deep Research Agent
Unlike standard chatbots, POPO’s agent can **plan**. It breaks down complex goals (e.g., *"Find gaps & opportunities in the real estate market of India"*) into sub-tasks, performs live Google Searches, and synthesizes findings into structured, cited reports.

### 6. Open Source & Modifiable
Built with standard web technologies (React 19, Tailwind) and the Google Gemini API. Anyone can modify the data structures or features to fit their exact needs using Google AI Studio.

---

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Provider**: Google Gemini API (`@google/genai` SDK)
*   **Storage**: IndexedDB (Browser Native)
*   **File Parsing**: `pdfjs-dist` (PDFs), `mammoth` (DOCX)
*   **Icons**: Lucide React

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

## 🧠 How the AI Context Works

**1. File Ingestion**
When you upload a file (e.g., "Contract.pdf"):
*   `App.tsx` reads the file array buffer.
*   `pdfjs-dist` extracts raw text layer.
*   The text is saved to `project.assets[i].content` in your local database.

**2. Client-Side Chunking**
When you chat, `geminiService.ts` grabs this text, chunks it into manageable pieces, and feeds the most relevant parts to the **Gemini 2.5 Flash/Pro** model based on your query.

**3. Structured Data Context**
When you use a **Task Board**:
*   You drag cards to "Done".
*   The board state is saved as JSON.
*   If you ask *"What tasks are done?"*, the system parses the JSON into a text description for the AI.
*   Gemini reads this and answers: *"You have completed the 'Fix Bug' task."*

---

## ⚙️ Setup & Installation

1.  **Get an API Key**:
    You need a valid [Google Gemini API Key](https://aistudio.google.com/).
    *Note: The key is stored locally in your browser and used only for your requests.*

2.  **Install Dependencies**:
    (If running locally)
    ```bash
    npm install react react-dom lucide-react @google/genai pdfjs-dist mammoth
    ```

3.  **Run Application**:
    ```bash
    npm run dev
    ```

4.  **Login**:
    The application is secured with a simple local PIN to prevent accidental access on shared devices.
    *   **Default PIN**: `121988` (You can reset this by clearing your browser data).

---

## 🔄 Data Backup & Sync

Since we prioritize privacy over cloud sync:
1.  Click **Export** in the sidebar to download your entire workspace as a `.json` file.
2.  Send the file to another device.
3.  Click **Import** on the new device to restore your workspace.

