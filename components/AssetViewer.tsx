
import React from 'react';
import { Asset } from '../types';
import { X, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface AssetViewerProps {
  asset: Asset | null;
  onClose: () => void;
}

const AssetViewer: React.FC<AssetViewerProps> = ({ asset, onClose }) => {
  if (!asset) return null;

  const isImage = asset.name.match(/\.(jpeg|jpg|png|gif)$/i);
  const isPdf = asset.name.endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isImage ? <ImageIcon size={20} className="text-blue-500" /> : <FileText size={20} className="text-gray-500" />}
            <span className="font-semibold text-gray-800">{asset.name}</span>
            {asset.url && (
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs">
                    <ExternalLink size={12} /> Open Original
                </a>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 relative">
           {isImage ? (
               <div className="flex justify-center items-center min-h-full p-4">
                   <img src={asset.url || asset.content} alt={asset.name} className="max-w-full max-h-full rounded shadow-sm object-contain" />
               </div>
           ) : isPdf && asset.url ? (
               <iframe src={asset.url} className="w-full h-full border-none" title="PDF Preview" />
           ) : (
               <div className="p-8">
                   <div className="bg-white p-8 rounded shadow-sm border border-gray-200 min-h-[500px] max-w-3xl mx-auto">
                        <div className="mb-4 pb-4 border-b border-gray-100 text-center">
                            <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Extracted Text Content</h3>
                            {!asset.url && <p className="text-xs text-orange-500 mt-1">Cloud file not available. Showing parsed text used by AI.</p>}
                        </div>
                       <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">{asset.content}</pre>
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AssetViewer;
