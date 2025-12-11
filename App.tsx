
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import BoardView from './components/BoardView'; 
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import DocEditor from './components/DocEditor';
import Login from './components/Login';
import AssetViewer from './components/AssetViewer';
import ConfirmationModal from './components/ConfirmationModal';
import { INITIAL_DATA } from './utils/mockData';
import { loadProjectsFromDB, saveProjectsToDB } from './services/db';
import { Project, Page, Asset } from './types';
import { MessageSquare, Clock, Star, Loader2, Menu } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'project'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{
      type: 'project' | 'page' | 'asset';
      id: string;
      secondaryId?: string; // pageId or assetId
      name: string;
  } | null>(null);

  const handleLogin = async () => {
      setIsLoading(true);
      try {
          const loadedProjects = await loadProjectsFromDB();

          if (loadedProjects.length === 0) {
              await saveProjectsToDB(INITIAL_DATA);
              setProjects(INITIAL_DATA);
          } else {
              setProjects(loadedProjects);
          }
          
          setIsAuthenticated(true);
      } catch (e) {
          console.error("Failed to load DB", e);
          setProjects(INITIAL_DATA); 
          setIsAuthenticated(true);
      } finally {
          setIsLoading(false);
      }
  };

  // Persist changes
  const updateProjects = (newProjects: Project[]) => {
      setProjects(newProjects);
      saveProjectsToDB(newProjects).catch(e => console.error("Save failed", e));
  };

  // Derived state
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
    [projects, activeProjectId]
  );

  const activePage = useMemo(() => 
    activeProject?.pages.find(p => p.id === activePageId), 
    [activeProject, activePageId]
  );

  // Handlers
  const handlePageSelect = (projectId: string, pageId: string) => {
    setActiveProjectId(projectId);
    setActivePageId(pageId);
    setCurrentView('project');
    setIsChatOpen(false); // Close chat when navigating
    setIsSidebarOpen(false);
  };

  const handleDashboardSelect = () => {
      setCurrentView('dashboard');
      setActivePageId(null);
      setIsSidebarOpen(false);
  };

  const handleOpenChat = (projectId: string) => {
      if (activeProjectId !== projectId) {
          setActiveProjectId(projectId);
          setActivePageId(null);
          setCurrentView('project');
      }
      setIsChatOpen(true);
      setIsSidebarOpen(false);
  };

  const handleCreateProject = () => {
      const newId = `proj-${Date.now()}`;
      const newProject: Project = {
          id: newId,
          name: 'New Project',
          icon: '📁',
          pages: [],
          assets: []
      };
      const updatedProjects = [...projects, newProject];
      updateProjects(updatedProjects);
      
      // Auto-switch to new project
      setActiveProjectId(newId);
      setActivePageId(null);
      setCurrentView('project');
      setIsSidebarOpen(false);
  };

  // --- RENAME HANDLERS ---

  const handleRenameProject = (projectId: string, newName: string) => {
      const updatedProjects = projects.map(p => 
          p.id === projectId ? { ...p, name: newName } : p
      );
      updateProjects(updatedProjects);
  };

  const handleRenameAsset = (projectId: string, assetId: string, newName: string) => {
      const updatedProjects = projects.map(p => {
          if (p.id === projectId) {
              return {
                  ...p,
                  assets: p.assets.map(a => a.id === assetId ? { ...a, name: newName } : a)
              };
          }
          return p;
      });
      updateProjects(updatedProjects);
  };

  // --- DELETE HANDLERS ---

  const handleDeleteProject = (projectId: string) => {
      const p = projects.find(proj => proj.id === projectId);
      if (p) {
          setDeleteTarget({ type: 'project', id: projectId, name: p.name });
      }
  };

  const handleDeletePage = (projectId: string, pageId: string) => {
      const p = projects.find(proj => proj.id === projectId);
      const page = p?.pages.find(pg => pg.id === pageId);
      if (page) {
          setDeleteTarget({ type: 'page', id: projectId, secondaryId: pageId, name: page.title });
      }
  };

  const handleDeleteAsset = (projectId: string, assetId: string) => {
      const p = projects.find(proj => proj.id === projectId);
      const asset = p?.assets?.find(a => a.id === assetId);
      if (asset) {
          setDeleteTarget({ type: 'asset', id: projectId, secondaryId: assetId, name: asset.name });
      }
  };

  const confirmDelete = () => {
      if (!deleteTarget) return;
      
      if (deleteTarget.type === 'project') {
          const updatedProjects = projects.filter(p => p.id !== deleteTarget.id);
          updateProjects(updatedProjects); 
          
          if (activeProjectId === deleteTarget.id) {
              setActiveProjectId(null);
              setActivePageId(null);
              setCurrentView('dashboard');
          }
      } 
      else if (deleteTarget.type === 'page' && deleteTarget.secondaryId) {
          const updatedProjects = projects.map(p => {
              if (p.id === deleteTarget.id) {
                  return { ...p, pages: p.pages.filter(pg => pg.id !== deleteTarget.secondaryId) };
              }
              return p;
          });
          updateProjects(updatedProjects);

          if (activePageId === deleteTarget.secondaryId) {
              setActivePageId(null);
          }
      } 
      else if (deleteTarget.type === 'asset' && deleteTarget.secondaryId) {
          const updatedProjects = projects.map(p => {
              if (p.id === deleteTarget.id) {
                  return { ...p, assets: p.assets?.filter(a => a.id !== deleteTarget.secondaryId) || [] };
              }
              return p;
          });
          updateProjects(updatedProjects);

          if (viewingAsset?.id === deleteTarget.secondaryId) {
              setViewingAsset(null);
          }
      }

      setDeleteTarget(null);
  };

  const handleUpdateContent = (newContent: string) => {
    if (!activeProject || !activePage) return;

    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          pages: p.pages.map(pg => 
            pg.id === activePage.id ? { ...pg, content: newContent, updatedAt: new Date().toISOString() } : pg
          )
        };
      }
      return p;
    });

    updateProjects(updatedProjects);
  };
  
  const handleAddPage = (projectId: string, type: 'doc' | 'table' | 'board', title: string = 'Untitled', content: string = '') => {
      const newPageId = `pg-${Date.now()}`;
      
      let initialContent = content;
      if (!content) {
        if (type === 'table') {
            initialContent = JSON.stringify({columns: [{id:'col1', label:'Name', type:'text'}], rows: []});
        } else if (type === 'board') {
            initialContent = JSON.stringify({
                sections: [
                    { id: 's1', title: 'To Do', cardIds: [] },
                    { id: 's2', title: 'In Progress', cardIds: [] },
                    { id: 's3', title: 'Done', cardIds: [] }
                ],
                cards: {}
            });
        }
      }

      const newPage: Page = {
          id: newPageId,
          title: title,
          type,
          content: initialContent,
          updatedAt: new Date().toISOString()
      };
      
      const updatedProjects = projects.map(p => {
          if (p.id === projectId) {
              return { ...p, pages: [...p.pages, newPage] };
          }
          return p;
      });
      
      updateProjects(updatedProjects);
      setActiveProjectId(projectId);
      setActivePageId(newPageId);
      setCurrentView('project');
      setIsSidebarOpen(false);
  };

  const handleUpdateTitle = (newTitle: string) => {
      if (!activeProject || !activePage) return;
      const updatedProjects = projects.map(p => {
        if (p.id === activeProject.id) {
          return {
            ...p,
            pages: p.pages.map(pg => 
              pg.id === activePage.id ? { ...pg, title: newTitle } : pg
            )
          };
        }
        return p;
      });
      updateProjects(updatedProjects);
  };

  const extractPdfText = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += `[Page ${i}]\n${pageText}\n\n`;
      }
      return fullText;
  };

  const extractDocxText = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
  };

  const handleUploadAsset = async (projectId: string, files: File[]) => {
      if (!files || files.length === 0) return;
      
      setIsProcessingFile(true);

      try {
          const newAssets: Asset[] = [];

          for (const file of files) {
             try {
                let content = '';
                let type: Asset['type'] = 'text';

                // Process content locally for AI (RAG)
                if (file.type === 'application/pdf') {
                    type = 'pdf';
                    content = await extractPdfText(file);
                } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    type = 'docx';
                    content = await extractDocxText(file);
                } else if (file.type.startsWith('image')) {
                    type = 'image';
                    content = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                } else {
                    type = 'text';
                    content = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsText(file);
                    });
                }

                newAssets.push({
                    id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    type: type,
                    content: content
                });

             } catch (e) {
                 console.error(`Failed to parse file: ${file.name}`, e);
             }
          }

          if (newAssets.length > 0) {
            const updatedProjects = projects.map(p => {
                if (p.id === projectId) {
                    const currentAssets = p.assets || [];
                    return { ...p, assets: [...currentAssets, ...newAssets] };
                }
                return p;
            });
            updateProjects(updatedProjects);
          }

      } catch (err) {
          console.error("Batch upload error", err);
          alert("Some files failed to upload.");
      } finally {
          setIsProcessingFile(false);
      }
  };
  
  const handleImportData = (newProjects: Project[]) => {
      updateProjects(newProjects);
      setCurrentView('dashboard');
      setActiveProjectId(null);
      setActivePageId(null);
  };

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-gray-500 font-medium">Loading POPO...</p>
          </div>
      );
  }

  return (
    <div className="flex w-full h-screen bg-white overflow-hidden text-gray-900 font-sans relative">
      <Sidebar 
        projects={projects}
        activePageId={activePageId}
        currentView={currentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectPage={handlePageSelect}
        onSelectDashboard={handleDashboardSelect}
        onAddPage={handleAddPage}
        onUploadAsset={handleUploadAsset}
        onAddProject={handleCreateProject}
        onOpenChat={handleOpenChat}
        onViewAsset={setViewingAsset}
        onDeleteProject={handleDeleteProject}
        onDeletePage={handleDeletePage}
        onDeleteAsset={handleDeleteAsset}
        onRenameProject={handleRenameProject}
        onRenameAsset={handleRenameAsset}
        onImportData={handleImportData}
      />

      <main className="flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out w-full">
        
        <div className="md:hidden h-14 border-b border-gray-100 flex items-center px-4 bg-white shrink-0 justify-between">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
             <Menu size={20} />
           </button>
           <div className="flex items-center gap-2">
               <span className="text-lg">🐥</span>
               <span className="font-mono font-bold text-gray-900 tracking-tight">POPO</span>
           </div>
           <div className="w-8"></div> 
        </div>

        {isProcessingFile && (
            <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
                 <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                 <p className="text-indigo-900 font-medium">Processing Files...</p>
            </div>
        )}

        {currentView === 'project' && activeProject && (
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white shrink-0 z-10 overflow-hidden">
                <div className="flex items-center gap-2 text-sm text-gray-500 truncate">
                    <span className="hidden md:inline">{activeProject?.icon} {activeProject?.name}</span>
                    <span className="hidden md:inline text-gray-300">/</span>
                    <span className="text-gray-900 font-medium truncate">{activePage?.title || 'Project Overview'}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 hidden md:block">
                        <Clock size={18} />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 hidden md:block">
                        <Star size={18} />
                    </button>
                    <div className="h-4 w-px bg-gray-200 mx-2 hidden md:block"></div>
                    <button 
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isChatOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <MessageSquare size={16} />
                        <span className="hidden md:inline">Ask AI</span>
                        <span className="md:hidden">AI</span>
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white">
            {currentView === 'dashboard' ? (
                <Dashboard projects={projects} onNavigateToPage={handlePageSelect} />
            ) : activePage ? (
                <div className={`
                    h-full flex flex-col
                    ${activePage.type === 'doc' ? 'max-w-4xl mx-auto px-4 md:px-12 pt-8 md:pt-16 pb-32' : 'px-4 md:px-8 py-6'}
                `}>
                    <input 
                        className="text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 w-full border-none focus:outline-none focus:ring-0 bg-transparent mb-6"
                        placeholder="Untitled"
                        value={activePage.title}
                        onChange={(e) => handleUpdateTitle(e.target.value)}
                    />

                    <div className="flex-1">
                        {activePage.type === 'doc' ? (
                            <DocEditor 
                                content={activePage.content}
                                onChange={handleUpdateContent}
                            />
                        ) : activePage.type === 'board' ? (
                            <BoardView 
                                initialContent={activePage.content}
                                onUpdate={handleUpdateContent}
                            />
                        ) : (
                            <TableView 
                                initialContent={activePage.content} 
                                onUpdate={handleUpdateContent}
                            />
                        )}
                    </div>
                </div>
            ) : activeProject ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 p-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
                        <span className="text-3xl">{activeProject.icon}</span>
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-medium text-gray-900">{activeProject.name}</h2>
                        <p className="text-sm mt-1 max-w-xs text-gray-500">
                            Create a page to start writing or use the Chat to ask questions about your project assets.
                        </p>
                    </div>
                    <div className="flex gap-3 mt-2 flex-col md:flex-row w-full md:w-auto">
                        <button 
                            onClick={() => setIsChatOpen(true)} 
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors w-full md:w-auto"
                        >
                            Open AI Chat
                        </button>
                        <button 
                            onClick={() => handleAddPage(activeProject.id, 'doc')}
                            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors w-full md:w-auto"
                        >
                            Create Page
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p>Select a project to view</p>
                </div>
            )}
        </div>
      </main>

      <AssetViewer asset={viewingAsset} onClose={() => setViewingAsset(null)} />
      
      <ConfirmationModal 
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'project' ? 'Project' : deleteTarget?.type === 'page' ? 'Page' : 'File'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {currentView === 'project' && activeProject && (
        <ChatInterface 
          project={activeProject} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          onAddPage={handleAddPage}
        />
      )}
    </div>
  );
}

export default App;
