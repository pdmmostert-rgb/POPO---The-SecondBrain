
import { Project } from '../types';

export const INITIAL_DATA: Project[] = [
  {
    id: 'p1',
    name: 'My Notes',
    icon: '📝',
    pages: [
      {
        id: 'pg1',
        title: 'Welcome',
        type: 'doc',
        content: '# Welcome to Second Brain\n\nThis is your personal knowledge base integrated with AI.\n\n### Features:\n- **Docs**: Write markdown notes with images.\n- **Databases**: Create tables for tracking tasks.\n- **Chat**: Ask AI questions about your projects.\n- **Assets**: Upload text files to query them.',
        updatedAt: new Date().toISOString(),
      }
    ],
    assets: []
  }
];
