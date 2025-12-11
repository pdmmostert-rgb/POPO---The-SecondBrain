
import React, { useState, useEffect } from 'react';
import { TableData, TableRow, TableColumn } from '../types';
import { Plus, Trash2, Copy, MoreHorizontal, X } from 'lucide-react';

interface TableViewProps {
  initialContent: string;
  onUpdate: (content: string) => void;
}

const TableView: React.FC<TableViewProps> = ({ initialContent, onUpdate }) => {
  const [data, setData] = useState<TableData>({ columns: [], rows: [] });
  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  useEffect(() => {
    try {
      setData(JSON.parse(initialContent));
    } catch (e) {
      setData({ columns: [], rows: [] });
    }
  }, [initialContent]);

  const updateParent = (newData: TableData) => {
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const updateRow = (rowId: string, columnId: string, value: string) => {
    const newRows = data.rows.map(row => 
      row.id === rowId ? { ...row, [columnId]: value } : row
    );
    const newData = { ...data, rows: newRows };
    updateParent(newData);
  };

  const addRow = () => {
    const newRow: TableRow = { id: Date.now().toString() };
    data.columns.forEach(col => newRow[col.id] = '');
    const newData = { ...data, rows: [...data.rows, newRow] };
    updateParent(newData);
  };
  
  const deleteRow = (rowId: string) => {
    const newData = { ...data, rows: data.rows.filter(r => r.id !== rowId) };
    updateParent(newData);
  };

  // --- Column Management ---

  const addColumn = () => {
      const newColId = `col-${Date.now()}`;
      const newColumn: TableColumn = { id: newColId, label: 'New Column', type: 'text' };
      const newData = { 
          columns: [...data.columns, newColumn],
          rows: data.rows // Rows handle missing keys gracefully in render, but explicit init is better if needed
      };
      updateParent(newData);
      setEditingHeader(newColId); // Auto-focus rename
  };

  const deleteColumn = (colId: string) => {
      if (data.columns.length <= 1) return; // Prevent deleting last column
      const newData = {
          columns: data.columns.filter(c => c.id !== colId),
          rows: data.rows // Extra keys in rows don't hurt
      };
      updateParent(newData);
  };

  const updateColumnLabel = (colId: string, newLabel: string) => {
      const newCols = data.columns.map(c => c.id === colId ? { ...c, label: newLabel } : c);
      updateParent({ ...data, columns: newCols });
  };

  const copyToClipboard = () => {
      // Generate Markdown Table
      const headers = `| ${data.columns.map(c => c.label).join(' | ')} |`;
      const separator = `| ${data.columns.map(() => '---').join(' | ')} |`;
      const rows = data.rows.map(r => `| ${data.columns.map(c => r[c.id] || '').join(' | ')} |`).join('\n');
      const md = `${headers}\n${separator}\n${rows}`;
      
      navigator.clipboard.writeText(md);
      alert('Table copied to clipboard as Markdown!');
  };

  return (
    <div className="w-full overflow-x-auto pb-20">
      <div className="flex justify-end gap-2 mb-2">
           <button 
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
           >
              <Copy size={14} /> Copy Table
           </button>
           <button 
              onClick={addColumn}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
           >
              <Plus size={14} /> Add Column
           </button>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {data.columns.map(col => (
              <th key={col.id} className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500 min-w-[150px] relative group">
                {editingHeader === col.id ? (
                    <input 
                        autoFocus
                        type="text"
                        defaultValue={col.label}
                        onBlur={(e) => {
                            updateColumnLabel(col.id, e.target.value);
                            setEditingHeader(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                updateColumnLabel(col.id, e.currentTarget.value);
                                setEditingHeader(null);
                            }
                        }}
                        className="w-full bg-white border border-indigo-300 rounded px-1 outline-none text-indigo-700"
                    />
                ) : (
                    <div className="flex items-center justify-between">
                        <span onClick={() => setEditingHeader(col.id)} className="cursor-pointer hover:text-indigo-600">{col.label}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                             <button onClick={() => setEditingHeader(col.id)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-indigo-600">
                                <MoreHorizontal size={14} />
                             </button>
                             {data.columns.length > 1 && (
                                <button onClick={() => deleteColumn(col.id)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500">
                                    <X size={14} />
                                </button>
                             )}
                        </div>
                    </div>
                )}
              </th>
            ))}
            <th className="border border-gray-200 bg-gray-50 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id} className="group hover:bg-gray-50">
              {data.columns.map(col => (
                <td key={`${row.id}-${col.id}`} className="border border-gray-200 p-0">
                  <input
                    type="text"
                    value={String(row[col.id] || '')}
                    onChange={(e) => updateRow(row.id, col.id, e.target.value)}
                    className={`w-full px-3 py-2 outline-none bg-transparent ${col.type === 'tag' ? 'text-indigo-600 font-medium' : 'text-gray-800'}`}
                  />
                </td>
              ))}
              <td className="border border-gray-200 text-center">
                 <button onClick={() => deleteRow(row.id)} className="text-gray-300 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                 </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button 
        onClick={addRow}
        className="mt-4 flex items-center gap-2 text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm"
      >
        <Plus size={16} />
        New Row
      </button>
    </div>
  );
};

export default TableView;
