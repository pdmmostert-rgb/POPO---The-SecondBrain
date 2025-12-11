
import React, { useState, useEffect } from 'react';
import { BoardData, TaskCard, BoardSection, TodoItem } from '../types';
import { Plus, MoreHorizontal, X, Clock, CheckSquare, MessageSquare, Calendar } from 'lucide-react';

interface BoardViewProps {
  initialContent: string;
  onUpdate: (content: string) => void;
}

const DEFAULT_BOARD: BoardData = {
    sections: [
        { id: 's1', title: 'Planned', cardIds: [] },
        { id: 's2', title: 'Processing', cardIds: [] },
        { id: 's3', title: 'Done', cardIds: [] }
    ],
    cards: {}
};

const BoardView: React.FC<BoardViewProps> = ({ initialContent, onUpdate }) => {
  const [data, setData] = useState<BoardData>(DEFAULT_BOARD);
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (parsed && parsed.sections) {
          setData(parsed);
      } else {
          setData(DEFAULT_BOARD);
      }
    } catch (e) {
      setData(DEFAULT_BOARD);
    }
  }, [initialContent]);

  const updateParent = (newData: BoardData) => {
    setData(newData);
    onUpdate(JSON.stringify(newData));
  };

  const addCard = (sectionId: string) => {
      const newCardId = `card-${Date.now()}`;
      const newCard: TaskCard = {
          id: newCardId,
          title: 'New Task',
          description: '',
          todos: [],
          comments: []
      };
      
      const newSections = data.sections.map(s => {
          if (s.id === sectionId) {
              return { ...s, cardIds: [...s.cardIds, newCardId] };
          }
          return s;
      });
      
      const newCards = { ...data.cards, [newCardId]: newCard };
      updateParent({ sections: newSections, cards: newCards });
      setEditingCard(newCard); // Open modal immediately
  };

  const deleteCard = (cardId: string, sectionId: string) => {
      const newSections = data.sections.map(s => {
          if (s.id === sectionId) {
              return { ...s, cardIds: s.cardIds.filter(id => id !== cardId) };
          }
          return s;
      });
      const newCards = { ...data.cards };
      delete newCards[cardId];
      updateParent({ sections: newSections, cards: newCards });
      if (editingCard?.id === cardId) setEditingCard(null);
  };

  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
      setDraggedCardId(cardId);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
      e.preventDefault();
      if (!draggedCardId) return;

      // Find source section
      const sourceSection = data.sections.find(s => s.cardIds.includes(draggedCardId));
      if (!sourceSection) return;

      // If same section, do nothing (reordering could be added later)
      if (sourceSection.id === sectionId) {
          setDraggedCardId(null);
          return;
      }

      // Move logic
      const newSections = data.sections.map(s => {
          if (s.id === sourceSection.id) {
              return { ...s, cardIds: s.cardIds.filter(id => id !== draggedCardId) };
          }
          if (s.id === sectionId) {
              return { ...s, cardIds: [...s.cardIds, draggedCardId] };
          }
          return s;
      });

      updateParent({ ...data, sections: newSections });
      setDraggedCardId(null);
  };

  const updateCardDetails = (updatedCard: TaskCard) => {
      const newCards = { ...data.cards, [updatedCard.id]: updatedCard };
      updateParent({ ...data, cards: newCards });
      setEditingCard(updatedCard);
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-6 h-full min-w-full pb-4">
          {data.sections.map(section => (
              <div 
                key={section.id} 
                className="w-72 md:w-80 flex-shrink-0 bg-gray-50 rounded-xl flex flex-col max-h-full border border-gray-200/60"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleSectionDrop(e, section.id)}
              >
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between font-semibold text-gray-700 text-sm">
                      <div className="flex items-center gap-2">
                          {/* Editable Section Title */}
                          <input 
                              className="bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded px-1 text-gray-700 font-semibold w-full outline-none"
                              value={section.title}
                              onChange={(e) => {
                                  const newSections = data.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                                  updateParent({ ...data, sections: newSections });
                              }}
                          />
                          <span className="bg-gray-200 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">{section.cardIds.length}</span>
                      </div>
                      <button onClick={() => addCard(section.id)} className="hover:bg-gray-200 p-1 rounded text-gray-500">
                          <Plus size={16} />
                      </button>
                  </div>
                  
                  {/* Cards Area */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
                      {section.cardIds.map(cardId => {
                          const card = data.cards[cardId];
                          if (!card) return null;
                          const completedTodos = card.todos.filter(t => t.done).length;
                          
                          return (
                              <div 
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleCardDragStart(e, card.id)}
                                onClick={() => setEditingCard(card)}
                                className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative"
                              >
                                  <div className="font-medium text-gray-800 text-sm mb-1">{card.title}</div>
                                  
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                      {card.deadline && (
                                          <div className={`flex items-center gap-1 ${new Date(card.deadline) < new Date() ? 'text-red-500' : ''}`}>
                                              <Clock size={12} />
                                              <span>{new Date(card.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                          </div>
                                      )}
                                      {card.todos.length > 0 && (
                                          <div className="flex items-center gap-1">
                                              <CheckSquare size={12} />
                                              <span>{completedTodos}/{card.todos.length}</span>
                                          </div>
                                      )}
                                      {card.comments.length > 0 && (
                                          <div className="flex items-center gap-1">
                                              <MessageSquare size={12} />
                                              <span>{card.comments.length}</span>
                                          </div>
                                      )}
                                  </div>
                                  
                                  {/* Hover Delete */}
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); deleteCard(card.id, section.id); }}
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded"
                                  >
                                      <X size={14} />
                                  </button>
                              </div>
                          );
                      })}
                      
                      <button 
                        onClick={() => addCard(section.id)}
                        className="w-full py-2 text-gray-400 hover:bg-gray-200/50 rounded flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                          <Plus size={14} /> New
                      </button>
                  </div>
              </div>
          ))}
          
          {/* Add Section */}
          <button 
             onClick={() => {
                 const newSectionId = `sect-${Date.now()}`;
                 const newSection: BoardSection = { id: newSectionId, title: 'New Section', cardIds: [] };
                 updateParent({ ...data, sections: [...data.sections, newSection] });
             }}
             className="w-72 flex-shrink-0 h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-300 hover:text-gray-500 transition-colors"
          >
              <Plus size={20} /> Add Section
          </button>
      </div>

      {/* Task Edit Modal */}
      {editingCard && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex items-start gap-4 bg-white">
                      <div className="flex-1">
                          <input 
                              value={editingCard.title}
                              onChange={(e) => updateCardDetails({ ...editingCard, title: e.target.value })}
                              className="text-xl font-bold text-gray-900 w-full outline-none placeholder-gray-300 bg-white"
                              placeholder="Task Title"
                          />
                          <div className="text-xs text-gray-500 mt-1">in Board</div>
                      </div>
                      <button onClick={() => setEditingCard(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                      {/* Description */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                          <textarea 
                              value={editingCard.description}
                              onChange={(e) => updateCardDetails({ ...editingCard, description: e.target.value })}
                              className="w-full min-h-[100px] p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-y"
                              placeholder="Add a more detailed description..."
                          />
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap gap-4">
                           {/* Deadline */}
                           <div className="space-y-2">
                               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Deadline</label>
                               <div className="relative">
                                   <input 
                                      type="date"
                                      value={editingCard.deadline || ''}
                                      onChange={(e) => updateCardDetails({ ...editingCard, deadline: e.target.value })}
                                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 outline-none focus:border-indigo-500"
                                   />
                                   <Calendar size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                               </div>
                           </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Checklist</label>
                             <button 
                                onClick={() => {
                                    const newTodo: TodoItem = { id: Date.now().toString(), text: 'New Item', done: false };
                                    updateCardDetails({ ...editingCard, todos: [...editingCard.todos, newTodo] });
                                }}
                                className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
                             >
                                 + Add Item
                             </button>
                          </div>
                          <div className="space-y-2">
                              {editingCard.todos.map((todo, idx) => (
                                  <div key={todo.id} className="flex items-center gap-3 group">
                                      <input 
                                          type="checkbox"
                                          checked={todo.done}
                                          onChange={() => {
                                              const newTodos = [...editingCard.todos];
                                              newTodos[idx].done = !newTodos[idx].done;
                                              updateCardDetails({ ...editingCard, todos: newTodos });
                                          }}
                                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                      />
                                      <input 
                                          value={todo.text}
                                          onChange={(e) => {
                                              const newTodos = [...editingCard.todos];
                                              newTodos[idx].text = e.target.value;
                                              updateCardDetails({ ...editingCard, todos: newTodos });
                                          }}
                                          className={`flex-1 bg-white border-b border-transparent focus:border-gray-200 outline-none text-sm px-1 ${todo.done ? 'line-through text-gray-400' : 'text-gray-900'}`}
                                      />
                                      <button 
                                          onClick={() => {
                                              const newTodos = editingCard.todos.filter(t => t.id !== todo.id);
                                              updateCardDetails({ ...editingCard, todos: newTodos });
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500"
                                      >
                                          <X size={14} />
                                      </button>
                                  </div>
                              ))}
                              {editingCard.todos.length === 0 && <div className="text-sm text-gray-400 italic">No checklist items</div>}
                          </div>
                      </div>

                      {/* Comments */}
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comments</label>
                           <div className="space-y-3">
                               {editingCard.comments.map(comment => (
                                   <div key={comment.id} className="flex gap-3">
                                       <div className="w-6 h-6 rounded bg-orange-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">S</div>
                                       <div className="flex-1 space-y-1">
                                           <div className="text-xs text-gray-400 flex justify-between">
                                               <span>User</span>
                                               <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                           </div>
                                           <div className="text-sm text-gray-800 bg-gray-50 border border-gray-100 p-2 rounded-br-lg rounded-bl-lg rounded-tr-lg">
                                               {comment.text}
                                           </div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                           
                           <div className="flex gap-2 mt-2">
                               <input 
                                  placeholder="Write a comment..."
                                  className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-gray-900 placeholder-gray-400"
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                          const val = e.currentTarget.value.trim();
                                          if (val) {
                                              const newComment = { id: Date.now().toString(), text: val, createdAt: Date.now() };
                                              updateCardDetails({ ...editingCard, comments: [...editingCard.comments, newComment] });
                                              e.currentTarget.value = '';
                                          }
                                      }
                                  }}
                               />
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BoardView;
