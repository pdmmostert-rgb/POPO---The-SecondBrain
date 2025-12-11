
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content by code blocks first to avoid parsing markdown inside code
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`markdown-body ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Render code block
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          return (
            <div key={index} className="my-3 bg-gray-900 rounded-md overflow-hidden text-sm">
                {lang && <div className="bg-gray-800 text-gray-400 px-3 py-1 text-xs">{lang}</div>}
                <pre className="p-3 overflow-x-auto text-gray-100 font-mono scrollbar-thin">
                    {code}
                </pre>
            </div>
          );
        }

        // --- TABLE PARSING LOGIC ---
        // Simple heuristic: Consecutive lines containing pipes, allowing for whitespace
        const lines = part.split('\n');
        const renderedLines: React.ReactNode[] = [];
        let tableBuffer: string[] = [];
        
        const flushTableBuffer = (keyPrefix: string) => {
             if (tableBuffer.length === 0) return;
             
             // Process table buffer
             const headerRow = tableBuffer[0];
             const separatorRow = tableBuffer.length > 1 ? tableBuffer[1] : null;
             const bodyRows = tableBuffer.slice(2);
             
             // Robust Row Parsing
             const parseRow = (row: string) => {
                 let r = row.trim();
                 if (r.startsWith('|')) r = r.slice(1);
                 if (r.endsWith('|')) r = r.slice(0, -1);
                 return r.split('|').map(c => c.trim());
             };
             
             const headers = parseRow(headerRow);
             // Basic Validation: must have a separator row with dashes
             if (separatorRow && separatorRow.includes('---')) {
                 renderedLines.push(
                     <div key={`${keyPrefix}-table`} className="my-4 overflow-x-auto border border-gray-200 rounded-lg">
                         <table className="w-full text-sm text-left text-gray-700">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                 <tr>
                                     {headers.map((h, i) => (
                                         <th key={i} className="px-4 py-3 font-bold">{h}</th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody>
                                 {bodyRows.map((rowStr, rIdx) => {
                                     const cells = parseRow(rowStr);
                                     return (
                                         <tr key={rIdx} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                             {cells.map((cell, cIdx) => (
                                                 <td key={cIdx} className="px-4 py-2 whitespace-pre-wrap">{cell}</td>
                                             ))}
                                             {/* Fill missing cells */}
                                             {cells.length < headers.length && 
                                                Array(headers.length - cells.length).fill(null).map((_, i) => <td key={`empty-${i}`} className="px-4 py-2"></td>)
                                             }
                                         </tr>
                                     );
                                 })}
                             </tbody>
                         </table>
                     </div>
                 );
             } else {
                 // Fallback if not a valid table structure
                 tableBuffer.forEach((l, i) => {
                     renderedLines.push(<p key={`${keyPrefix}-fallback-${i}`} className="mb-1">{l}</p>);
                 });
             }
             tableBuffer = [];
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Check if line looks like a table row (starts/ends with pipe OR contains multiple pipes)
            const isTableRow = trimmed.startsWith('|') || (trimmed.split('|').length > 2);

            if (isTableRow) {
                tableBuffer.push(line);
            } else {
                if (tableBuffer.length > 0) {
                    flushTableBuffer(`${index}-${i}`);
                }
                
                // Normal Line Rendering
                const key = `${index}-${i}`;
                if (line.startsWith('# ')) renderedLines.push(<h1 key={key} className="text-2xl font-bold mb-3 mt-4 text-gray-900">{line.slice(2)}</h1>);
                else if (line.startsWith('## ')) renderedLines.push(<h2 key={key} className="text-xl font-bold mb-2 mt-3 text-gray-800">{line.slice(3)}</h2>);
                else if (line.startsWith('### ')) renderedLines.push(<h3 key={key} className="text-lg font-semibold mb-2 mt-2 text-gray-800">{line.slice(4)}</h3>);
                else if (trimmed.startsWith('- ')) {
                     renderedLines.push(
                        <div key={key} className="flex gap-2 ml-2 mb-1">
                            <span className="text-gray-400 mt-1.5">•</span>
                            <span className="text-gray-700 flex-1">{parseInlineStyles(line.trim().slice(2))}</span>
                        </div>
                    );
                }
                else if (trimmed.match(/^\d+\. /)) {
                     renderedLines.push(
                         <div key={key} className="flex gap-2 ml-2 mb-1">
                            <span className="text-gray-500 font-medium min-w-[20px]">{trimmed.match(/^\d+\./)?.[0]}</span>
                            <span className="text-gray-700 flex-1">{parseInlineStyles(trimmed.replace(/^\d+\. /, ''))}</span>
                         </div>
                    );
                }
                else if (line.startsWith('> ')) {
                    renderedLines.push(<div key={key} className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2">{parseInlineStyles(line.slice(2))}</div>);
                }
                else {
                    // Images
                    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
                    if (imgMatch) {
                        renderedLines.push(
                            <div key={key} className="my-3">
                                <img src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full rounded-lg shadow-sm border border-gray-100" />
                                {imgMatch[1] && <div className="text-center text-xs text-gray-400 mt-1">{imgMatch[1]}</div>}
                            </div>
                        );
                    } else if (trimmed === '---' || trimmed === '***') {
                        renderedLines.push(<hr key={key} className="my-4 border-gray-200" />);
                    } else if (trimmed === '') {
                        renderedLines.push(<div key={key} className="h-2"></div>);
                    } else {
                        renderedLines.push(
                            <p key={key} className="mb-1.5 text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                                {parseInlineStyles(line)}
                            </p>
                        );
                    }
                }
            }
        }
        // Flush remaining table buffer at end
        flushTableBuffer(`${index}-end`);

        return <div key={index}>{renderedLines}</div>;
      })}
    </div>
  );
};

// Helper to parse bold, italic, and links inline
const parseInlineStyles = (text: string) => {
    if (!text) return null;

    // Handle Links [text](url)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(parseBoldItalic(text.slice(lastIndex, match.index)));
        }
        parts.push(
            <a 
                key={match.index} 
                href={match[2]} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium break-all"
                onClick={(e) => e.stopPropagation()}
            >
                {match[1]}
            </a>
        );
        lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(parseBoldItalic(text.slice(lastIndex)));
    }
    
    return <>{parts}</>;
};

const parseBoldItalic = (text: string) => {
    // Split by Bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        // Split by Italic *text* or _text_
        const subParts = part.split(/(\*.*?\*)/g); // Simple * check
        return subParts.map((sub, j) => {
             if (sub.startsWith('*') && sub.endsWith('*')) {
                 return <em key={`${i}-${j}`} className="italic">{sub.slice(1, -1)}</em>;
             }
             return sub;
        });
    });
};

export default MarkdownRenderer;
