
export type PageType = 'doc' | 'table' | 'board';

export interface Asset {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'image' | 'docx';
  content: string; // Extracted text content for AI RAG or Base64 for images
  url?: string; // Optional URL if we ever add external links
}

export interface Page {
  id: string;
  title: string;
  type: PageType;
  content: string; // Markdown for doc, JSON string for table/board data
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  pages: Page[];
  assets: Asset[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Table Types
export interface TableRow {
  id: string;
  [key: string]: string | number | boolean;
}

export interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'tag';
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

// Board Types
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

export interface TaskCard {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  todos: TodoItem[];
  comments: Comment[];
}

export interface BoardSection {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardData {
  sections: BoardSection[];
  cards: Record<string, TaskCard>;
}
