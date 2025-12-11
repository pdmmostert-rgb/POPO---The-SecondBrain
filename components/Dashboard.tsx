
import React from 'react';
import { Project } from '../types';
import { Clock, FileText, CheckCircle, Activity, ArrowRight } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onNavigateToPage: (projectId: string, pageId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onNavigateToPage }) => {
  // Get recent pages across all projects
  const recentPages = projects
    .flatMap(p => p.pages.map(page => ({ ...page, projectId: p.id, projectName: p.name })))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const totalPages = projects.reduce((acc, p) => acc + p.pages.length, 0);
  const totalAssets = projects.reduce((acc, p) => acc + (p.assets?.length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-12 py-8 md:py-12 w-full">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Good morning, User</h1>
      <p className="text-gray-500 mb-8 md:mb-10">Here's what's happening in your second brain.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText size={16} />
            </div>
            <span className="text-gray-600 font-medium">Total Pages</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalPages}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Activity size={16} />
            </div>
            <span className="text-gray-600 font-medium">Projects</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{projects.length}</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle size={16} />
             </div>
             <span className="text-gray-600 font-medium">Assets</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalAssets}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Clock size={20} className="text-gray-400" />
        Recently Edited
      </h2>
      
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {recentPages.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentPages.map(page => (
              <div 
                key={page.id} 
                onClick={() => onNavigateToPage(page.projectId, page.id)}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                     {page.type === 'table' ? <CheckCircle size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="truncate">
                    <h3 className="text-gray-900 font-medium truncate">{page.title}</h3>
                    <p className="text-xs text-gray-500 truncate">In {page.projectName}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No activity yet. Create a page to get started.
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 md:mt-12 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-indigo-900 font-semibold mb-2">Did you know?</h3>
        <p className="text-indigo-700 text-sm">
            You can chat with your data by clicking the "Ask AI" button in the top right corner of any project page. Try uploading a text file to a project and asking questions about it!
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
