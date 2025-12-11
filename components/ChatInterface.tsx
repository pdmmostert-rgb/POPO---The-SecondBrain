
import React, { useState, useEffect, useRef } from 'react';
import { Project, ChatMessage } from '../types';
import { startChatSession, sendMessage, runDeepResearch, registerPageCreator, AVAILABLE_MODELS } from '../services/geminiService';
import { Send, X, Bot, User, Sparkles, Globe, Loader2, Search, RotateCcw, ChevronDown } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onAddPage: (projectId: string, type: 'doc' | 'table', title?: string, content?: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ project, isOpen, onClose, onAddPage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [researchStep, setResearchStep] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initChat = (modelId: string) => {
    startChatSession(project, modelId);
    // Register the creation capability
    registerPageCreator((title, content, type) => {
        onAddPage(project.id, type, title, content);
    });

    setMessages([{
      id: 'init',
      role: 'model',
      text: `Hi! I'm your Second Brain assistant for the **${project.name}** project.\n\nAsk me anything about your notes, tables, or uploaded assets.`,
      timestamp: Date.now()
    }]);
  };

  // Initialize chat when project changes or model changes
  useEffect(() => {
    if (isOpen && project) {
        initChat(selectedModel);
    }
  }, [project, isOpen, selectedModel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
      initChat(selectedModel);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isResearching) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const responseText = await sendMessage(userMsg.text, useWebSearch);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: "I encountered an error. Please try clearing the chat.",
          timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepResearch = async () => {
    if (!input.trim() || isLoading || isResearching) return;
    
    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: `Deep Research Request: ${input}`,
        timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsResearching(true);
    setResearchStep("Initializing agents...");

    try {
        const result = await runDeepResearch(userMsg.text, (status) => {
            setResearchStep(status);
        }, selectedModel);
        
        // Add the page to the project
        onAddPage(project.id, 'doc', result.title, result.content);

        // Show the full report in the chat
        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: `✅ **Deep Research Completed!**\n\nI have saved a new page: **${result.title}**.\n\n---\n\n# ${result.title}\n\n${result.content}`,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
        console.error("Deep Research Error:", e);
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "❌ Sorry, the deep research agent encountered an error. Please try again.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsResearching(false);
        setResearchStep('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 transition-transform duration-300">
      {/* Header */}
      <div className="h-16 border-b border-gray-100 flex flex-col justify-center px-4 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <span className="font-semibold text-gray-700 truncate max-w-[200px]">Chat with {project.name}</span>
            </div>
            <div className="flex items-center gap-1">
                <button 
                    onClick={handleClearChat} 
                    className="text-gray-400 hover:text-indigo-600 hover:bg-gray-200 p-2 rounded"
                    title="Restart Session"
                >
                    <RotateCcw size={18} />
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-2 rounded">
                    <X size={20} />
                </button>
            </div>
        </div>
        
        {/* Model Selector */}
        <div className="flex items-center">
            <div className="relative group">
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="appearance-none bg-transparent text-xs font-medium text-gray-500 hover:text-indigo-600 cursor-pointer pr-4 focus:outline-none"
                >
                    {AVAILABLE_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                </select>
                <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100 text-indigo-600'}
            `}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-gray-100 text-gray-800 rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}
            `}>
              {/* Use Markdown Renderer here */}
              <MarkdownRenderer content={msg.text} />
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-indigo-600" />
             </div>
             <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}

        {isResearching && (
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                   <Globe size={14} className="text-white" />
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-none px-4 py-3 w-full max-w-[85%]">
                   <div className="flex items-center gap-2 mb-2 text-indigo-700 font-semibold text-sm">
                       <Loader2 size={14} className="animate-spin" />
                       Running Deep Research Agent...
                   </div>
                   <div className="text-xs text-indigo-600 font-mono bg-white/50 p-2 rounded border border-indigo-100/50">
                       {researchStep}
                   </div>
                </div>
             </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0">
        <div className="relative">
          {/* Web Search Toggle (Inside Input Area) */}
          <div className="absolute left-2 top-2 z-10">
             <button
               onClick={() => setUseWebSearch(!useWebSearch)}
               className={`
                  flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
                  ${useWebSearch 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'}
               `}
               title={useWebSearch ? "Web Search Enabled" : "Enable Web Search"}
             >
                <Search size={12} />
                {useWebSearch ? 'Web' : 'Search'}
             </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={useWebSearch ? "Ask AI to search the web..." : "Ask AI or use Deep Research..."}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-24 pt-9 pb-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none min-h-[80px] max-h-[150px]"
            rows={1}
            disabled={isResearching}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
             <button
                onClick={handleDeepResearch}
                disabled={!input.trim() || isLoading || isResearching}
                title="Deep Research Agent (Create Report)"
                className={`
                  p-2 rounded-lg transition-colors
                  ${!input.trim() || isLoading || isResearching 
                    ? 'text-gray-300' 
                    : 'text-indigo-600 hover:bg-indigo-100 bg-indigo-50'}
                `}
              >
                <Globe size={18} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isResearching}
                title="Send Chat"
                className={`
                  p-2 rounded-lg transition-colors
                  ${!input.trim() || isLoading || isResearching 
                    ? 'text-gray-300' 
                    : 'text-indigo-600 hover:bg-indigo-50'}
                `}
              >
                <Send size={18} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
