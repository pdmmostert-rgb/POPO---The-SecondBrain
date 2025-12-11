
import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FileText, 
  Table, 
  Upload,
  MessageSquare,
  Layout,
  File,
  X,
  Trash2,
  Edit2,
  Kanban,
  Download,
  UploadCloud
} from 'lucide-react';
import { exportDatabase, importDatabase } from '../services/db';

interface SidebarProps {
  projects: Project[];
  activePageId: string | null;
  currentView: 'dashboard' | 'project';
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (projectId: string, pageId: string) => void;
  onSelectDashboard: () => void;
  onAddPage: (projectId: string, type: 'doc' | 'table' | 'board') => void;
  onUploadAsset: (projectId: string, files: File[]) => void;
  onAddProject: () => void;
  onOpenChat: (projectId: string) => void;
  onViewAsset: (asset: any) => void;
  onDeleteProject: (projectId: string) => void;
  onDeletePage: (projectId: string, pageId: string) => void;
  onDeleteAsset: (projectId: string, assetId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onRenameAsset: (projectId: string, assetId: string, newName: string) => void;
  onImportData: (projects: Project[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  activePageId, 
  currentView,
  isOpen,
  onClose,
  onSelectPage,
  onSelectDashboard,
  onAddPage,
  onUploadAsset,
  onAddProject,
  onOpenChat,
  onViewAsset,
  onDeleteProject,
  onDeletePage,
  onDeleteAsset,
  onRenameProject,
  onRenameAsset,
  onImportData
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));
  const [addMenuOpen, setAddMenuOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && uploadingProjectId) {
          const filesArray = Array.from(e.target.files);
          onUploadAsset(uploadingProjectId, filesArray);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadingProjectId(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const text = await file.text();
          try {
              const newProjects = await importDatabase(text);
              onImportData(newProjects);
              alert('Workspace imported successfully!');
          } catch (err) {
              alert('Failed to import workspace. Invalid file.');
          }
      }
      if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleExport = async () => {
      const json = await exportDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `popo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const triggerUpload = (projectId: string) => {
      setUploadingProjectId(projectId);
      setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleSelectPage = (projectId: string, pageId: string) => {
      onSelectPage(projectId, pageId);
      if (window.innerWidth < 768) {
          onClose();
      }
  };

  const handleSelectDashboard = () => {
      onSelectDashboard();
      if (window.innerWidth < 768) {
          onClose();
      }
  };

  const handleRenameProjectClick = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const newName = window.prompt("Enter new project name:", project.name);
      if (newName && newName.trim()) {
          onRenameProject(project.id, newName.trim());
      }
  };

  const handleRenameAssetClick = (e: React.MouseEvent, projectId: string, asset: any) => {
      e.stopPropagation();
      const newName = window.prompt("Enter new file name:", asset.name);
      if (newName && newName.trim()) {
          onRenameAsset(projectId, asset.id, newName.trim());
      }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#F7F7F5] border-r border-gray-200 h-screen flex flex-col text-gray-700 select-none font-sans transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative
      `}>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple
          accept=".txt,.md,.json,.csv,.png,.jpg,.jpeg,.pdf,.docx" 
          onChange={handleFileChange}
        />
        <input 
          type="file" 
          ref={importInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={handleImport}
        />

        {/* User Profile / Workspace Name */}
        <div className="p-3 hover:bg-gray-200 cursor-pointer transition-colors flex items-center gap-2 m-2 rounded-md">
          <div className="w-6 h-6 flex items-center justify-center text-lg">
            🐥
          </div>
          <div className="flex flex-col">
              <span className="font-mono font-bold text-gray-900 tracking-tight">POPO</span>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 md:hidden p-1">
             <X size={16} />
          </button>
          <ChevronDown size={14} className="ml-auto text-gray-400 hidden md:block" />
        </div>

        {/* Navigation Links */}
        <div className="px-3 mb-4">
          <div 
              onClick={handleSelectDashboard}
              className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-200 rounded-md cursor-pointer text-sm mb-1 ${currentView === 'dashboard' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-600'}`}
          >
            <Layout size={16} />
            <span>Dashboard</span>
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-xs font-semibold text-gray-500 px-3 mb-2 flex justify-between items-center">
            <span>Projects</span>
          </div>
          
          {projects.map(project => (
            <div key={project.id} className="mb-1">
              <div 
                onClick={() => {
                    onOpenChat(project.id);
                    if (window.innerWidth < 768) onClose();
                }}
                className="flex items-center gap-1 group px-2 py-1 hover:bg-gray-200 rounded-md cursor-pointer relative"
                title="Click to open chat"
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProject(project.id);
                  }}
                  className="p-0.5 hover:bg-gray-300 rounded text-gray-400"
                >
                  {expandedProjects.has(project.id) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <span className="text-sm font-medium flex-1 truncate flex items-center gap-2 text-gray-700">
                  <span>{project.icon}</span>
                  {project.name}
                </span>
                
                <div className="relative flex items-center md:opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat(project.id);
                          if (window.innerWidth < 768) onClose();
                      }}
                      className="p-0.5 mr-1 hover:bg-gray-300 rounded text-indigo-500"
                      title="Open Chat"
                    >
                      <MessageSquare size={14} />
                    </button>

                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          setAddMenuOpen(addMenuOpen === project.id ? null : project.id);
                      }}
                      className="p-0.5 mr-1 hover:bg-gray-300 rounded text-gray-500"
                      title="Add Page"
                    >
                      <Plus size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => handleRenameProjectClick(e, project)}
                      className="p-0.5 mr-1 hover:bg-gray-300 rounded text-gray-500"
                      title="Rename Project"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                      }}
                      className="p-0.5 hover:bg-red-100 hover:text-red-500 rounded text-gray-400"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    {addMenuOpen === project.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => {e.stopPropagation(); setAddMenuOpen(null);}}></div>
                          <div className="absolute right-0 top-6 w-36 bg-white shadow-lg border border-gray-200 rounded-md py-1 z-20 flex flex-col text-sm animate-in fade-in zoom-in duration-100 origin-top-right">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onAddPage(project.id, 'doc'); setAddMenuOpen(null); if (window.innerWidth < 768) onClose(); }}
                                  className="px-3 py-1.5 hover:bg-gray-100 text-left flex items-center gap-2"
                              >
                                  <FileText size={14} /> Page
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onAddPage(project.id, 'table'); setAddMenuOpen(null); if (window.innerWidth < 768) onClose(); }}
                                  className="px-3 py-1.5 hover:bg-gray-100 text-left flex items-center gap-2"
                              >
                                  <Table size={14} /> Database
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onAddPage(project.id, 'board'); setAddMenuOpen(null); if (window.innerWidth < 768) onClose(); }}
                                  className="px-3 py-1.5 hover:bg-gray-100 text-left flex items-center gap-2"
                              >
                                  <Kanban size={14} /> Task Board
                              </button>
                          </div>
                        </>
                    )}
                </div>
              </div>

              {expandedProjects.has(project.id) && (
                <div className="ml-2 pl-2 border-l border-gray-200 mt-1 space-y-0.5">
                  {/* Pages */}
                  {project.pages.map(page => (
                    <div
                      key={page.id}
                      onClick={() => handleSelectPage(project.id, page.id)}
                      className={`
                        flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-sm group
                        ${activePageId === page.id && currentView === 'project' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}
                      `}
                    >
                      {page.type === 'table' ? (
                        <Table size={14} className="text-gray-400" />
                      ) : page.type === 'board' ? (
                        <Kanban size={14} className="text-gray-400" />
                      ) : (
                        <FileText size={14} className="text-gray-400" />
                      )}
                      <span className="truncate flex-1">{page.title}</span>
                      
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(project.id, page.id);
                        }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 rounded text-gray-400 transition-opacity"
                        title="Delete Page"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Assets Section */}
                  <div className="pt-2 pb-1 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center group cursor-default">
                      <span>Assets</span>
                      <button 
                          onClick={() => triggerUpload(project.id)}
                          className="hover:text-gray-700 md:opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity" title="Upload File"
                      >
                          <Upload size={10} />
                      </button>
                  </div>
                  {project.assets && project.assets.map(asset => (
                      <div 
                          key={asset.id} 
                          onClick={() => onViewAsset(asset)}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100 cursor-pointer group"
                          title="View Asset"
                      >
                          <File size={14} className="text-gray-400" />
                          <span className="truncate flex-1">{asset.name}</span>
                          
                          <button 
                            onClick={(e) => handleRenameAssetClick(e, project.id, asset)}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-300 rounded text-gray-400 transition-opacity"
                            title="Rename File"
                          >
                            <Edit2 size={12} />
                          </button>

                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAsset(project.id, asset.id);
                            }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 rounded text-gray-400 transition-opacity"
                            title="Delete File"
                          >
                            <Trash2 size={12} />
                          </button>
                      </div>
                  ))}
                  
                  {project.pages.length === 0 && (!project.assets || project.assets.length === 0) && (
                     <div className="px-2 py-1 text-xs text-gray-400 italic">Empty</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button 
              onClick={() => {
                  onAddProject();
                  if (window.innerWidth < 768) onClose();
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full px-3 py-2 hover:bg-gray-100 rounded-md font-medium border border-gray-200 bg-white mb-2"
          >
              <Plus size={16} />
              <span>New Project</span>
          </button>
          
          <div className="flex gap-2">
              <button 
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors"
                  title="Download Backup"
              >
                  <Download size={14} /> Export
              </button>
              <button 
                  onClick={() => importInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors"
                  title="Import Backup"
              >
                  <UploadCloud size={14} /> Import
              </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
