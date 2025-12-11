
import { GoogleGenAI, Chat, FunctionDeclaration, Type, Tool } from "@google/genai";
import { Project, Page, BoardData } from '../types';

let chatSession: Chat | null = null;
let aiClient: GoogleGenAI | null = null;
let currentProject: Project | null = null; // Store reference to current project for dynamic retrieval
let pageCreator: ((title: string, content: string, type: 'table') => void) | null = null;

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

const getAiClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

// Register callback to create pages from the AI service
export const registerPageCreator = (fn: (title: string, content: string, type: 'table') => void) => {
    pageCreator = fn;
};

// --- CLIENT SIDE RAG IMPLEMENTATION ---

// Reduced stop words list to be less aggressive
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an'
]);

interface TextChunk {
  source: string;
  type: 'page' | 'asset';
  content: string;
}

// Helper to clean and tokenize text for scoring
const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

// Break project data into chunks for retrieval
const chunkProjectData = (project: Project): TextChunk[] => {
  const chunks: TextChunk[] = [];
  const CHUNK_SIZE = 2000; // Increased chunk size for better context

  // Chunk Pages
  project.pages.forEach(page => {
    let contentToChunk = page.content;

    // Special handling for structured pages to make them readable for LLM
    if (page.type === 'table') {
        contentToChunk = `Table Page: ${page.title}\n${page.content}`;
    } else if (page.type === 'board') {
        try {
            const boardData: BoardData = JSON.parse(page.content);
            let boardText = `Task Board Page: "${page.title}"\n`;
            
            if (boardData.sections && boardData.cards) {
                boardData.sections.forEach((section) => {
                    boardText += `\n--- Column/Status: ${section.title} ---\n`;
                    if (section.cardIds.length === 0) {
                        boardText += `(No tasks)\n`;
                    }
                    section.cardIds.forEach((cardId) => {
                        const card = boardData.cards[cardId];
                        if (card) {
                            boardText += `\n• Task: ${card.title}\n`;
                            if (card.description) boardText += `  Description: ${card.description}\n`;
                            if (card.deadline) boardText += `  Deadline: ${card.deadline}\n`;
                            if (card.todos && card.todos.length > 0) {
                                boardText += `  Checklist: ${card.todos.map(t => `${t.done ? '[x]' : '[ ]'} ${t.text}`).join(', ')}\n`;
                            }
                            if (card.comments && card.comments.length > 0) {
                                boardText += `  Comments: ${card.comments.map(c => `"${c.text}"`).join(' | ')}\n`;
                            }
                        }
                    });
                });
            }
            contentToChunk = boardText;
        } catch (e) {
             // Fallback if JSON parse fails
             contentToChunk = `Task Board: ${page.title}\n${page.content}`;
        }
    }
    
    // Split content by rough paragraph/size
    if (contentToChunk.length < CHUNK_SIZE) {
        chunks.push({
            source: `Page: ${page.title}`,
            type: 'page',
            content: contentToChunk
        });
    } else {
        for (let i = 0; i < contentToChunk.length; i += CHUNK_SIZE) {
           chunks.push({
               source: `Page: ${page.title}`,
               type: 'page',
               content: contentToChunk.slice(i, i + CHUNK_SIZE)
           });
        }
    }
  });

  // Chunk Assets
  project.assets?.forEach(asset => {
     const content = asset.content;
     if (content.length < CHUNK_SIZE) {
         chunks.push({
            source: `File: ${asset.name}`,
            type: 'asset',
            content: content
        });
     } else {
         for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            chunks.push({
                source: `File: ${asset.name}`,
                type: 'asset',
                content: content.slice(i, i + CHUNK_SIZE)
            });
         }
     }
  });

  return chunks;
};

// Simple keyword scoring (Jaccard-ish)
const calculateRelevance = (queryTokens: string[], chunkContent: string): number => {
  const chunkTokens = tokenize(chunkContent);
  const chunkTokenSet = new Set(chunkTokens);
  
  let matches = 0;
  for (const q of queryTokens) {
    if (chunkTokenSet.has(q)) matches++;
    else if (chunkContent.toLowerCase().includes(q)) matches += 0.5; // Partial match bonus
  }
  
  return matches;
};

const getRelevantContext = (project: Project, query: string): string => {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return ""; 

  const chunks = chunkProjectData(project);
  
  // Score chunks
  const scoredChunks = chunks.map(chunk => ({
    chunk,
    score: calculateRelevance(queryTokens, chunk.content)
  }));

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top chunks. If query is specific, we want high relevance.
  // If query is broad, we might get low scores, but that's okay.
  const topChunks = scoredChunks.filter(c => c.score > 0).slice(0, 6); 
  
  if (topChunks.length === 0) return "";

  let context = `=== RELEVANT PROJECT CONTEXT ===\n`;
  topChunks.forEach((item) => {
      context += `[Source: ${item.chunk.source}]\n${item.chunk.content}\n---\n`;
  });
  
  return context;
};

// --- END RAG IMPLEMENTATION ---


// Tool Definition for Creating Database
const createDatabaseTool: FunctionDeclaration = {
  name: "create_database",
  description: "Create a new database (table) page in the project with structured data. Use this when the user asks to save search results or data into a table.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the database page" },
      columns: { 
        type: Type.ARRAY, 
        description: "List of column headers",
        items: { type: Type.STRING }
      },
      rows: {
        type: Type.ARRAY, 
        description: "List of rows. Each row is an array of string values matching the column order.",
        items: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    },
    required: ["title", "columns", "rows"]
  }
};

export const startChatSession = (project: Project, modelId: string = 'gemini-2.5-flash') => {
  const ai = getAiClient();
  currentProject = project; // Save reference
  
  // Create a Project Index to help the model know what exists even if RAG misses it
  const fileIndex = project.assets?.map(a => a.name).join(', ') || "None";
  const pageIndex = project.pages.map(p => p.title).join(', ') || "None";

  const systemInstruction = `
    You are a helpful AI assistant for a "Second Brain" workspace.
    Current Project: "${project.name}"
    
    PROJECT STRUCTURE:
    - Pages: [${pageIndex}]
    - Assets/Files: [${fileIndex}]

    RULES:
    1. Context from files will be provided dynamically based on the user's query.
    2. If the user asks about a specific file listed above but no context is provided, ask them to be more specific or try to infer from the file name.
    3. If the user asks for "latest news", "search for...", or external info, ALWAYS USE THE GOOGLE SEARCH TOOL (if enabled).
    4. If the user asks to create a table/database, USE THE create_database TOOL (if enabled).
    5. When using the Google Search tool, YOU MUST still consider the "RELEVANT PROJECT CONTEXT" provided in the message. Blend the internal file knowledge with the external search results to give a comprehensive answer.
    6. Be concise and use Markdown.
  `;

  // Note: We do NOT pass tools here in config. 
  // We pass them dynamically in sendMessage to avoid "Tool use with function calling is unsupported" error.
  chatSession = ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const sendMessage = async (message: string, forceSearch: boolean = false): Promise<string> => {
  if (!chatSession || !currentProject) {
    throw new Error("Chat session not initialized. Select a project first.");
  }

  try {
    let finalMessage = "";
    
    // 1. Retrieve Relevant Context (Client-Side RAG)
    const context = getRelevantContext(currentProject, message);
    
    if (forceSearch) {
        // STRONG INSTRUCTION: When searching, we explicitly tell the model to mix the context.
        finalMessage += `User Question: ${message}\n\n`;
        
        if (context) {
           finalMessage += `Here is context from the user's files that might be relevant. Please use this if it helps answer the question alongside web search results:\n${context}\n\n`;
        }

        finalMessage += "(SYSTEM: The user has explicitly requested a Web Search. Use the 'googleSearch' tool. Combine the file context above (if relevant) with your search findings.)";
    } else {
        // Standard Chat
        if (context) {
            finalMessage += `${context}\n\n`;
        }
        finalMessage += `User Question: ${message}`;
    }
    
    // Define tools based on mode to prevent API conflicts
    const tools: Tool[] = forceSearch 
      ? [{ googleSearch: {} }] 
      : [{ functionDeclarations: [createDatabaseTool] }];

    let result = await chatSession.sendMessage({ 
        message: finalMessage,
        tools: tools 
    });
    
    // Log Token Usage
    if (result.usageMetadata) {
        console.log(`[Gemini Chat] Token Usage - Prompt: ${result.usageMetadata.promptTokenCount}, Response: ${result.usageMetadata.candidatesTokenCount}, Total: ${result.usageMetadata.totalTokenCount}`);
    }
    
    // Handle Function Calls (Loop until no more calls)
    while (result.functionCalls && result.functionCalls.length > 0) {
        const call = result.functionCalls[0];
        
        if (call.name === 'create_database') {
            const args = call.args as any;
            
            // Execute Client Side Action
            if (pageCreator) {
                // Transform simple arrays to TableData format
                const columns = args.columns.map((label: string, idx: number) => ({
                    id: `col-${idx}`,
                    label: label,
                    type: 'text'
                }));
                
                const rows = args.rows.map((rowVals: string[], rIdx: number) => {
                    const rowObj: any = { id: `row-${Date.now()}-${rIdx}` };
                    columns.forEach((col: any, cIdx: number) => {
                        rowObj[col.id] = rowVals[cIdx] || '';
                    });
                    return rowObj;
                });
                
                const tableContent = JSON.stringify({ columns, rows });
                pageCreator(args.title, tableContent, 'table');
                
                // Send response back to model
                // IMPORTANT: We must pass the tools again so the model context remains valid for function calling
                result = await chatSession.sendMessage({
                    message: [{
                        functionResponse: {
                            id: call.id,
                            name: call.name,
                            response: { result: "Database created successfully." }
                        }
                    }],
                    tools: tools
                });
                
            } else {
                 result = await chatSession.sendMessage({
                    message: [{
                        functionResponse: {
                            id: call.id,
                            name: call.name,
                            response: { error: "Page creator not registered." }
                        }
                    }],
                    tools: tools
                });
            }
        }
    }

    // Safety check for empty text
    if (!result.text) {
        console.warn("Gemini response text is empty. Checking candidates...", result);
        if (result.candidates && result.candidates.length > 0) {
            // Check for finish reason
            const candidate = result.candidates[0];
            if (candidate.finishReason === 'SAFETY') return "I cannot answer this query due to safety guidelines.";
            if (candidate.finishReason === 'RECITATION') return "I cannot answer this query due to recitation guidelines.";
            
            // Sometimes text is hidden in parts if mixed with grounding
            const parts = candidate.content?.parts;
            if (parts) {
                const textPart = parts.find(p => p.text);
                if (textPart) return textPart.text as string;
            }
        }
        return "I processed the request but the model returned no text. This usually happens with search queries that have no results.";
    }

    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI. Please try again.";
  }
};

export interface ResearchResult {
    title: string;
    content: string;
}

export const runDeepResearch = async (query: string, onStatusUpdate?: (status: string) => void, modelId: string = 'gemini-2.5-flash'): Promise<ResearchResult> => {
    const ai = getAiClient();
    
    // --- Step 1: PLANNER ---
    onStatusUpdate?.("Planning research strategy...");
    
    const plannerPrompt = `
    You are a Research Planner.
    User Query: "${query}"
    
    Goal: Break this down into 3-4 specific Google Search queries that will gather the necessary facts to answer the user comprehensively.
    
    Output Format: return ONLY a raw JSON array of strings. Example: ["market size of X", "competitors of Y"]
    `;
    
    const plannerResponse = await ai.models.generateContent({
        model: modelId,
        contents: plannerPrompt
    });

    let searchQueries: string[] = [];
    try {
        const text = plannerResponse.text.replace(/```json|```/g, '').trim();
        searchQueries = JSON.parse(text);
    } catch (e) {
        console.warn("Failed to parse planner output, falling back to original query", e);
        searchQueries = [query];
    }
    
    if (!Array.isArray(searchQueries)) searchQueries = [query];

    // --- Step 2: EXECUTION LOOP ---
    let aggregatedContext = "";
    const uniqueSources = new Map<string, string>();

    for (const searchQuery of searchQueries) {
        onStatusUpdate?.(`Searching Google for: "${searchQuery}"...`);
        
        try {
            const searchResult = await ai.models.generateContent({
                model: modelId,
                contents: `Find detailed facts for: "${searchQuery}". Return a comprehensive summary of the search results.`,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const summary = searchResult.text || "";
            aggregatedContext += `### Results for "${searchQuery}"\n${summary}\n\n`;

            // Collect Grounding Metadata
            const chunks = searchResult.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            chunks.forEach(chunk => {
                if (chunk.web?.uri && chunk.web?.title) {
                    uniqueSources.set(chunk.web.uri, chunk.web.title);
                }
            });
        } catch (e) {
            console.error(`Search failed for ${searchQuery}`, e);
        }
    }

    // --- Step 3: WRITER ---
    onStatusUpdate?.("Synthesizing final report...");

    const writerPrompt = `
    You are a Deep Research Agent. 
    
    ORIGINAL QUERY: "${query}"
    
    GATHERED CONTEXT FROM WEB SEARCHES:
    ${aggregatedContext}
    
    INSTRUCTIONS:
    1. Synthesize the gathered context into a cohesive, high-quality Markdown report (~1000 words).
    2. Do NOT just list the search results. Integrate them into a narrative.
    3. Use clear headings (#, ##) and bullet points.
    4. Answer the original query comprehensively.
    
    OUTPUT FORMAT:
    Use the following exact delimiters:
    
    # TITLE: [Insert Title Here]
    # CONTENT:
    [Insert Full Markdown Report Here]
    `;
    
    const finalResult = await ai.models.generateContent({
        model: modelId,
        contents: writerPrompt
    });

    let text = finalResult.text || "";
    let title = "Deep Research Report";
    let content = text;

    const titleMatch = text.match(/# TITLE:\s*(.*)/);
    const contentMatch = text.match(/# CONTENT:\s*([\s\S]*)/);

    if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
    }
    if (contentMatch && contentMatch[1]) {
        content = contentMatch[1].trim();
    }

    // Append Sources
    if (uniqueSources.size > 0) {
        content += "\n\n---\n### References & Sources\n";
        uniqueSources.forEach((title, uri) => {
            content += `- [${title}](${uri})\n`;
        });
    }

    return { title, content };
};
