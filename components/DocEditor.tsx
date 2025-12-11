
import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Image as ImageIcon, Eye, Edit3, List, Heading1, Heading2 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface DocEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const DocEditor: React.FC<DocEditorProps> = ({ content, onChange }) => {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (!isPreview && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content, isPreview]);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onChange(newText);
    
    // Restore selection/focus
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target?.result as string;
            // Insert markdown image syntax
            insertText(`\n![${file.name}](${base64})\n`);
        };
        reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full relative group">
      {/* Toolbar */}
      <div className={`
        flex items-center gap-1 mb-4 pb-2 border-b border-gray-100 transition-opacity sticky top-0 bg-white z-10 overflow-x-auto no-scrollbar
        ${isPreview ? 'opacity-50 pointer-events-none' : 'opacity-100'}
      `}>
         <button onClick={() => insertText('**', '**')} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Bold">
            <Bold size={16} />
         </button>
         <button onClick={() => insertText('_', '_')} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Italic">
            <Italic size={16} />
         </button>
         <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0"></div>
         <button onClick={() => insertText('# ')} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Heading 1">
            <Heading1 size={16} />
         </button>
         <button onClick={() => insertText('## ')} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Heading 2">
            <Heading2 size={16} />
         </button>
         <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0"></div>
         <button onClick={() => insertText('- ')} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Bullet List">
            <List size={16} />
         </button>
         <button onClick={() => fileInputRef.current?.click()} className="p-2 md:p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 flex-shrink-0" title="Insert Image">
            <ImageIcon size={16} />
         </button>
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
         
         <div className="flex-1"></div>
      </div>
      
      {/* View Toggle (Always Visible) */}
      <div className="absolute right-0 -top-[52px]">
        <button 
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
            {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
            {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Editor / Preview Area */}
      <div className="min-h-[400px] md:min-h-[500px]">
        {isPreview ? (
            <div className="prose prose-indigo max-w-none">
                <MarkdownRenderer content={content} />
            </div>
        ) : (
            <textarea
                ref={textareaRef}
                className="w-full resize-none outline-none text-base md:text-lg text-gray-800 leading-relaxed placeholder-gray-300 font-normal bg-transparent"
                placeholder="Type '/' for commands or start writing..."
                value={content}
                onChange={(e) => onChange(e.target.value)}
                style={{ minHeight: '400px' }}
            />
        )}
      </div>
    </div>
  );
};

export default DocEditor;
