import axios from 'axios';

// Initialize mock database in localStorage to persist user actions on page refreshes
const initMocks = () => {
  if (!localStorage.getItem('mock_projects')) {
    localStorage.setItem('mock_projects', JSON.stringify([
      { id: 1, title: 'Prologue SaaS Dashboard', description: 'Next-gen enterprise workspace platform', status: 'ACTIVE' },
      { id: 2, title: 'Workflow Integration Suite', description: 'Continuous sync engine', status: 'ACTIVE' },
      { id: 3, title: 'Brand Design System', description: 'Modern UI design tokens', status: 'COMPLETED' }
    ]));
  }
  if (!localStorage.getItem('mock_tasks')) {
    localStorage.setItem('mock_tasks', JSON.stringify([
      { id: 101, title: 'Design Figma Wireframes', description: 'Create modern UI designs', status: 'COMPLETED', priority: 'HIGH', dueDate: '2026-07-20', estimatedTime: 8, project: { id: 1, title: 'Prologue SaaS Dashboard' }, assignee: { id: 999, name: 'Demo Admin', role: 'ROLE_ADMIN' } },
      { id: 102, title: 'Setup Spring Boot Security', description: 'Configure JWT filters', status: 'TO_DO', priority: 'CRITICAL', dueDate: '2026-07-22', estimatedTime: 12, project: { id: 1, title: 'Prologue SaaS Dashboard' }, assignee: { id: 2, name: 'Niranjan M', role: 'ROLE_EMPLOYEE' } },
      { id: 103, title: 'Write Unit Tests', description: 'Increase coverage to 80%', status: 'PENDING_ACCEPTANCE', priority: 'MEDIUM', dueDate: '2026-07-25', estimatedTime: 6, project: { id: 2, title: 'Workflow Integration Suite' }, assignee: { id: 999, name: 'Demo Admin', role: 'ROLE_ADMIN' } }
    ]));
  }
  if (!localStorage.getItem('mock_teammates')) {
    localStorage.setItem('mock_teammates', JSON.stringify([
      { id: 999, name: 'Demo Admin', email: 'demo@pm.com', role: 'ROLE_ADMIN', designation: 'Workspace Manager', department: 'Product & Design' },
      { id: 2, name: 'Niranjan M', email: 'niranjan@pm.com', role: 'ROLE_EMPLOYEE', designation: 'Software Developer', department: 'Engineering' },
      { id: 3, name: 'Sarah Connor', email: 'sarah@pm.com', role: 'ROLE_EMPLOYEE', designation: 'QA Engineer', department: 'Quality Assurance' }
    ]));
  }
  if (!localStorage.getItem('mock_messages')) {
    localStorage.setItem('mock_messages', JSON.stringify([
      { id: 1, content: 'Hello team, let us launch the project dashboard by Monday!', sender: { id: 2, name: 'Niranjan M' }, createdAt: new Date(Date.now() - 3600000).toISOString(), project: { id: 1 } },
      { id: 2, content: 'Sure, wireframes are fully designed.', sender: { id: 999, name: 'Demo Admin' }, createdAt: new Date(Date.now() - 1800000).toISOString(), project: { id: 1 } },
      { id: 3, content: 'Hey Niranjan, do you need help with the API config?', sender: { id: 999, name: 'Demo Admin' }, recipient: { id: 2 }, createdAt: new Date(Date.now() - 100000).toISOString() }
    ]));
  }
  if (!localStorage.getItem('mock_notifications')) {
    localStorage.setItem('mock_notifications', JSON.stringify([
      { id: 1, title: 'Task Assigned', message: 'You have been assigned: Write Unit Tests', type: 'ALERT', isRead: false, createdAt: new Date().toISOString() }
    ]));
  }
};

initMocks();

// Custom mock adapter that mimics live rest controllers locally
const mockAdapter = async (config: any) => {
  const url = config.url || '';
  const method = config.method || 'get';
  const data = config.data ? JSON.parse(config.data) : null;

  const getTasks = () => JSON.parse(localStorage.getItem('mock_tasks') || '[]');
  const setTasks = (val: any) => localStorage.setItem('mock_tasks', JSON.stringify(val));
  const getProjects = () => JSON.parse(localStorage.getItem('mock_projects') || '[]');
  const setProjects = (val: any) => localStorage.setItem('mock_projects', JSON.stringify(val));
  const getTeammates = () => JSON.parse(localStorage.getItem('mock_teammates') || '[]');
  const getMessages = () => JSON.parse(localStorage.getItem('mock_messages') || '[]');
  const setMessages = (val: any) => localStorage.setItem('mock_messages', JSON.stringify(val));
  const getNotifications = () => JSON.parse(localStorage.getItem('mock_notifications') || '[]');
  const setNotifications = (val: any) => localStorage.setItem('mock_notifications', JSON.stringify(val));

  let resData: any = null;

  // Emulated REST Controller mappings
  if (url.includes('/api/auth/me')) {
    resData = {
      id: 999,
      name: 'Demo Admin',
      email: 'demo@pm.com',
      role: 'ROLE_ADMIN',
      designation: 'Workspace Manager',
      department: 'Product & Design',
      experience: 8,
      skills: 'React, TypeScript, Tailwind, Figma, Spring Boot',
      createdAt: new Date().toISOString()
    };
  } else if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
    resData = {
      accessToken: 'mock-jwt-token-prologue',
      user: {
        id: 999,
        name: data?.name || 'Demo Admin',
        email: data?.email || 'demo@pm.com',
        role: data?.role || 'ROLE_ADMIN',
        designation: 'Workspace Manager',
        department: 'Product & Design'
      }
    };
  } else if (url.includes('/api/reports/analytics')) {
    const t = getTasks();
    const p = getProjects();
    const completedT = t.filter((x: any) => x.status === 'COMPLETED').length;
    resData = {
      totalProjects: p.length,
      activeProjects: p.filter((x: any) => x.status === 'ACTIVE').length,
      completedProjects: p.filter((x: any) => x.status === 'COMPLETED').length,
      totalTasks: t.length,
      completedTasks: completedT,
      pendingTasks: t.length - completedT,
      productivityScore: t.length > 0 ? Math.round((completedT / t.length) * 100) : 100
    };
  } else if (url.includes('/api/projects')) {
    if (method === 'post') {
      const p = getProjects();
      const newProj = { id: Date.now(), ...data, status: 'ACTIVE' };
      p.push(newProj);
      setProjects(p);
      resData = newProj;
    } else {
      resData = getProjects();
    }
  } else if (url.match(/\/api\/tasks\/\d+/)) {
    const match = url.match(/\/api\/tasks\/(\d+)/);
    const id = match ? parseInt(match[1]) : 0;
    const t = getTasks();
    const index = t.findIndex((x: any) => x.id === id);
    if (method === 'put') {
      t[index] = { ...t[index], ...data };
      setTasks(t);
      resData = t[index];
    } else if (method === 'delete') {
      t.splice(index, 1);
      setTasks(t);
      resData = { success: true };
    } else {
      resData = t[index];
    }
  } else if (url.includes('/api/tasks')) {
    if (method === 'post') {
      const t = getTasks();
      const newT = { 
        id: Date.now(), 
        ...data, 
        status: data.status || 'TO_DO',
        project: data.project?.id ? getProjects().find((x: any) => x.id === data.project.id) : null,
        assignee: data.assignee?.id ? getTeammates().find((x: any) => x.id === data.assignee.id) : null
      };
      t.push(newT);
      setTasks(t);
      resData = newT;
    } else {
      resData = getTasks();
    }
  } else if (url.includes('/api/teams')) {
    resData = getTeammates();
  } else if (url.includes('/api/chat/project/')) {
    const match = url.match(/\/api\/chat\/project\/(\d+)/);
    const projId = match ? parseInt(match[1]) : 0;
    resData = getMessages().filter((x: any) => x.project && x.project.id === projId);
  } else if (url.includes('/api/messages/conversation/')) {
    const match = url.match(/\/api\/messages\/conversation\/(\d+)/);
    const contactId = match ? parseInt(match[1]) : 0;
    resData = getMessages().filter((x: any) => 
      x.recipient && (
        (x.sender.id === 999 && x.recipient.id === contactId) ||
        (x.sender.id === contactId && x.recipient.id === 999)
      )
    );
  } else if (url.includes('/api/chat') || url.includes('/api/messages')) {
    if (method === 'post') {
      const m = getMessages();
      const newM = {
        id: Date.now(),
        content: data.content,
        sender: { id: 999, name: 'Demo Admin' },
        createdAt: new Date().toISOString(),
        project: data.project,
        recipient: data.recipient
      };
      m.push(newM);
      setMessages(m);
      resData = newM;
    } else {
      resData = getMessages();
    }
  } else if (url.includes('/api/notifications/unread') || url.includes('/api/notifications')) {
    if (url.includes('mark-all-read')) {
      setNotifications([]);
      resData = { success: true };
    } else {
      resData = getNotifications();
    }
  } else if (url.includes('/api/users/profile')) {
    resData = {
      id: 999,
      ...data,
      role: 'ROLE_ADMIN'
    };
  } else {
    resData = {};
  }

  return {
    data: resData,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  };
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  adapter: (config) => {
    const token = localStorage.getItem('token');
    // If utilizing mock token or no backend URL is set, we use our local mock adapter
    if (token === 'mock-jwt-token-prologue' || !import.meta.env.VITE_API_BASE_URL) {
      return mockAdapter(config);
    }
    // Otherwise use default browser HTTP adapter
    return (axios.defaults.adapter as any)(config);
  }
});

// Interceptor to append JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle JWT expiration logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
