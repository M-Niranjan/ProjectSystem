import axios from 'axios';

// Force-clear stale mock data when the mock version changes
const MOCK_VERSION = 'v7-fixed-dm-unread-badge';
if (localStorage.getItem('mock_version') !== MOCK_VERSION) {
  ['mock_projects', 'mock_tasks', 'mock_teammates', 'mock_messages', 'mock_notifications', 'mock_user'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('mock_version', MOCK_VERSION);
}

// Initialize mock database in localStorage to persist user actions on page refreshes
const initMocks = () => {
  if (!localStorage.getItem('mock_projects')) {
    localStorage.setItem('mock_projects', JSON.stringify([
      { id: 1, name: 'Prologue SaaS Dashboard', title: 'Prologue SaaS Dashboard', description: 'Next-gen enterprise workspace platform', status: 'ACTIVE' },
      { id: 2, name: 'Workflow Integration Suite', title: 'Workflow Integration Suite', description: 'Continuous sync engine', status: 'ACTIVE' },
      { id: 3, name: 'Brand Design System', title: 'Brand Design System', description: 'Modern UI design tokens', status: 'COMPLETED' }
    ]));
  }
  if (!localStorage.getItem('mock_tasks')) {
    localStorage.setItem('mock_tasks', JSON.stringify([
      { id: 101, title: 'Design Figma Wireframes', description: 'Create modern UI designs', status: 'COMPLETED', priority: 'HIGH', dueDate: '2026-07-20', estimatedTime: 8, project: { id: 1, name: 'Prologue SaaS Dashboard', title: 'Prologue SaaS Dashboard' }, assignee: { id: 999, name: 'Niranjan', role: 'ROLE_ADMIN' } },
      { id: 102, title: 'Setup Spring Boot Security', description: 'Configure JWT filters', status: 'ACCEPTED', acceptedAt: new Date(Date.now() - 3600000).toISOString(), priority: 'CRITICAL', dueDate: '2026-07-22', estimatedTime: 12, project: { id: 1, name: 'Prologue SaaS Dashboard', title: 'Prologue SaaS Dashboard' }, assignee: { id: 1001, name: 'Ramesh', role: 'ROLE_EMPLOYEE' } },
      { id: 103, title: 'Write Unit Tests', description: 'Increase coverage to 80%', status: 'PENDING_ACCEPTANCE', priority: 'MEDIUM', dueDate: '2026-07-25', estimatedTime: 6, project: { id: 2, name: 'Workflow Integration Suite', title: 'Workflow Integration Suite' }, assignee: { id: 1002, name: 'Rahul', role: 'ROLE_EMPLOYEE' } },
      { id: 104, title: 'Optimize Database Queries', description: 'Fix slow joins and add indexes', status: 'BACKLOG', declineReason: 'Manju: Heavy workload in current sprint', priority: 'HIGH', dueDate: '2026-07-28', estimatedTime: 8, project: { id: 2, name: 'Workflow Integration Suite', title: 'Workflow Integration Suite' }, assignee: null },
      { id: 105, title: 'Automate E2E Regression Suite', description: 'Build Playwright integration test suite', status: 'ACCEPTED', acceptedAt: new Date(Date.now() - 7200000).toISOString(), priority: 'MEDIUM', dueDate: '2026-07-26', estimatedTime: 10, project: { id: 1, name: 'Prologue SaaS Dashboard', title: 'Prologue SaaS Dashboard' }, assignee: { id: 1004, name: 'Vinay', role: 'ROLE_EMPLOYEE' } }
    ]));
  }
  if (!localStorage.getItem('mock_teammates')) {
    localStorage.setItem('mock_teammates', JSON.stringify([
      { id: 999, name: 'Niranjan', email: 'niranjan@pm.com', role: 'ROLE_ADMIN', designation: 'Engineering', department: 'CSE', experience: 10, skills: 'java html css react git github sql etc' },
      { id: 1001, name: 'Ramesh', email: 'ramesh@pm.com', role: 'ROLE_EMPLOYEE', designation: 'Software Developer', department: 'Engineering', experience: 4, skills: 'Java, Spring Boot, React, SQL' },
      { id: 1002, name: 'Rahul', email: 'rahul@pm.com', role: 'ROLE_EMPLOYEE', designation: 'Frontend Engineer', department: 'Web Engineering', experience: 3, skills: 'React, HTML, CSS, JavaScript, Git' },
      { id: 1003, name: 'Manju', email: 'manju@pm.com', role: 'ROLE_EMPLOYEE', designation: 'Backend Engineer', department: 'Engineering', experience: 5, skills: 'Java, SQL, Spring Boot, GitHub' },
      { id: 1004, name: 'Vinay', email: 'vinay@pm.com', role: 'ROLE_EMPLOYEE', designation: 'QA Engineer', department: 'Quality Assurance', experience: 3, skills: 'Testing, Automation, Java, Git' }
    ]));
  }
  if (!localStorage.getItem('mock_messages')) {
    localStorage.setItem('mock_messages', JSON.stringify([
      { id: 1, content: 'Hello team, let us launch the project dashboard by Monday!', sender: { id: 1001, name: 'Ramesh' }, createdAt: new Date(Date.now() - 3600000).toISOString(), project: { id: 1 } },
      { id: 2, content: 'Sure, wireframes are fully designed.', sender: { id: 999, name: 'Niranjan' }, createdAt: new Date(Date.now() - 1800000).toISOString(), project: { id: 1 } },
      { id: 3, content: 'Hey Ramesh, do you need help with the API config?', sender: { id: 999, name: 'Niranjan' }, recipient: { id: 1001 }, isRead: true, createdAt: new Date(Date.now() - 100000).toISOString() }
    ]));
  }
  if (!localStorage.getItem('mock_notifications')) {
    localStorage.setItem('mock_notifications', JSON.stringify([
      { id: 1, title: 'Task Assigned', message: 'You have been assigned: Write Unit Tests', type: 'TASK_ASSIGNED', isRead: false, createdAt: new Date().toISOString() }
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
    const storedUser = localStorage.getItem('mock_user');
    resData = storedUser ? JSON.parse(storedUser) : {
      id: 999,
      name: 'Niranjan',
      email: 'niranjan@pm.com',
      role: 'ROLE_ADMIN',
      designation: 'Engineering',
      department: 'CSE',
      experience: 10,
      skills: 'java html css react git github sql etc',
      createdAt: new Date().toISOString()
    };
  } else if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
    let role: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE' = 'ROLE_ADMIN';
    let name = 'Niranjan';
    let designation = 'Engineering';
    let department = 'CSE';
    let experience = 10;
    let skills = 'java html css react git github sql etc';
    let userId = 999;
    const loginEmail = data?.email || 'niranjan@pm.com';

    if (loginEmail === 'ramesh@pm.com' || loginEmail === 'ms.user@pm.com') {
      userId = 1001;
      role = 'ROLE_EMPLOYEE';
      name = 'Ramesh';
      designation = 'Software Developer';
      department = 'Engineering';
      experience = 4;
      skills = 'Java, Spring Boot, React, SQL';
    } else if (loginEmail === 'rahul@pm.com') {
      userId = 1002;
      role = 'ROLE_EMPLOYEE';
      name = 'Rahul';
      designation = 'Frontend Engineer';
      department = 'Web Engineering';
      experience = 3;
      skills = 'React, HTML, CSS, JavaScript, Git';
    } else if (loginEmail === 'manju@pm.com') {
      userId = 1003;
      role = 'ROLE_EMPLOYEE';
      name = 'Manju';
      designation = 'Backend Engineer';
      department = 'Engineering';
      experience = 5;
      skills = 'Java, SQL, Spring Boot, GitHub';
    } else if (loginEmail === 'vinay@pm.com') {
      userId = 1004;
      role = 'ROLE_EMPLOYEE';
      name = 'Vinay';
      designation = 'QA Engineer';
      department = 'Quality Assurance';
      experience = 3;
      skills = 'Testing, Automation, Java, Git';
    } else if (loginEmail === 'google.user@pm.com' || loginEmail === 'demo@pm.com' || loginEmail === 'niranjan@pm.com') {
      userId = 999;
      role = 'ROLE_ADMIN';
      name = 'Niranjan';
      designation = 'Engineering';
      department = 'CSE';
      experience = 10;
      skills = 'java html css react git github sql etc';
    }

    const mockUser = {
      id: userId,
      name: data?.name || name,
      email: loginEmail,
      role: data?.role || role,
      designation: data?.designation || designation,
      department: data?.department || department,
      experience: data?.experience || experience,
      skills: data?.skills || skills,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));

    // Dynamically register user in teammates list so they appear as chat contacts
    const teammates = JSON.parse(localStorage.getItem('mock_teammates') || '[]');
    if (!teammates.some((t: any) => t.id === userId)) {
      teammates.push({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        designation: mockUser.designation,
        department: mockUser.department,
        experience: mockUser.experience,
        skills: mockUser.skills
      });
      localStorage.setItem('mock_teammates', JSON.stringify(teammates));
    }

    resData = {
      accessToken: 'mock-jwt-token-prologue',
      user: mockUser
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
      completionRate: t.length ? Math.round((completedT / t.length) * 100) : 0,
      pendingTasks: t.filter((x: any) => x.status !== 'COMPLETED').length,
      tasksByStatus: {
        BACKLOG: t.filter((x: any) => x.status === 'BACKLOG').length,
        PENDING_ACCEPTANCE: t.filter((x: any) => x.status === 'PENDING_ACCEPTANCE').length,
        ACCEPTED: t.filter((x: any) => x.status === 'ACCEPTED').length,
        TO_DO: t.filter((x: any) => x.status === 'TO_DO').length,
        IN_PROGRESS: t.filter((x: any) => x.status === 'IN_PROGRESS').length,
        TESTING: t.filter((x: any) => x.status === 'TESTING').length,
        REVIEW: t.filter((x: any) => x.status === 'REVIEW').length,
        COMPLETED: completedT
      }
    };
  } else if (url.includes('/api/tasks/') && url.includes('/comments')) {
    const match = url.match(/\/api\/tasks\/(\d+)\/comments/);
    const taskId = match ? parseInt(match[1]) : 0;
    if (method === 'post') {
      const storedUser = localStorage.getItem('mock_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : { id: 999, name: 'Niranjan' };
      resData = {
        id: Date.now(),
        content: data?.content || '',
        user: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhoto },
        createdAt: new Date().toISOString()
      };
    } else {
      resData = [
        { id: 1, content: 'Alice, make sure the border radius matches the standard 16px variables.', user: { id: 1001, name: 'Ramesh' }, createdAt: '2026-07-14T11:20:00Z' },
        { id: 2, content: 'Understood, updated in Figma design system.', user: { id: 999, name: 'Niranjan' }, createdAt: '2026-07-14T11:22:00Z' }
      ];
    }
  } else if (url.includes('/api/tasks/') && url.includes('/timer')) {
    resData = { isRunning: false, elapsedTime: 1200 };
  } else if (url.includes('/api/tasks/') && url.includes('/ai-subtasks')) {
    resData = [
      { id: 1, title: 'Draft schema specs', isCompleted: true },
      { id: 2, title: 'Configure unit test suite', isCompleted: false }
    ];
  } else if (url.includes('/api/tasks/') && url.includes('/attachments')) {
    resData = [
      { id: 1, name: 'architecture_diagram.png', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', size: '1.2 MB' }
    ];
  } else if (url.includes('/api/tasks')) {
    if (method === 'post') {
      const t = getTasks();
      const resolvedAssignee = data.assignee ? data.assignee : (data.assigneeId ? { id: data.assigneeId, name: 'Assigned Member' } : null);

      const newT = {
        id: Date.now(),
        title: data.title,
        description: data.description,
        status: data.status || (resolvedAssignee ? 'PENDING_ACCEPTANCE' : 'BACKLOG'),
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        estimatedTime: Number(data.estimatedTime || 0),
        actualTime: 0,
        project: data.project || { id: data.projectId || 1, name: 'Project Workspace', title: 'Project Workspace' },
        assignee: resolvedAssignee,
        declineReason: null,
        acceptedAt: null
      };
      t.push(newT);
      setTasks(t);
      resData = newT;
    } else {
      resData = getTasks();
    }
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
  } else if (url.includes('/api/teams')) {
    if (method === 'post') {
      const teammates = getTeammates();
      const newTeammate = {
        id: Date.now(),
        ...data,
        role: data.role || 'ROLE_EMPLOYEE',
        designation: data.designation || 'Teammate',
        department: data.department || 'Technology',
        experience: Number(data.experience || 2),
        skills: data.skills || ''
      };
      teammates.push(newTeammate);
      localStorage.setItem('mock_teammates', JSON.stringify(teammates));
      resData = newTeammate;
    } else if (method === 'put') {
      const match = url.match(/\/api\/teams\/(\d+)/);
      const id = match ? parseInt(match[1]) : 0;
      const teammates = getTeammates();
      const index = teammates.findIndex((x: any) => x.id === id);
      if (index !== -1) {
        teammates[index] = { ...teammates[index], ...data };
        localStorage.setItem('mock_teammates', JSON.stringify(teammates));
        resData = teammates[index];
      } else {
        resData = {};
      }
    } else {
      resData = getTeammates();
    }
  } else if (url.includes('/api/chat/project/')) {
    const match = url.match(/\/api\/chat\/project\/(\d+)/);
    const projId = match ? parseInt(match[1]) : 0;
    resData = getMessages().filter((x: any) => x.project && x.project.id === projId);
  } else if (url.includes('/api/messages/unread')) {
    const storedUser = localStorage.getItem('mock_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : { id: 999 };
    const currentUserId = currentUser.id || 999;
    resData = getMessages().filter((x: any) => 
      x.recipient && x.recipient.id === currentUserId && (x.isRead === false || x.isRead === undefined)
    );
  } else if (url.includes('/api/messages/conversation/')) {
    const match = url.match(/\/api\/messages\/conversation\/(\d+)/);
    const contactId = match ? parseInt(match[1]) : 0;
    const storedUser = localStorage.getItem('mock_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : { id: 999, name: 'Niranjan' };
    const currentUserId = currentUser.id || 999;

    // Mark messages from contactId to currentUserId as read
    const allMsgs = getMessages();
    let updated = false;
    allMsgs.forEach((m: any) => {
      if (m.recipient && m.recipient.id === currentUserId && m.sender.id === contactId && !m.isRead) {
        m.isRead = true;
        updated = true;
      }
    });
    if (updated) {
      setMessages(allMsgs);
    }

    resData = allMsgs.filter((x: any) => 
      x.recipient && (
        (x.sender.id === currentUserId && x.recipient.id === contactId) ||
        (x.sender.id === contactId && x.recipient.id === currentUserId)
      )
    );
  } else if (url.includes('/api/chat') || url.includes('/api/messages')) {
    if (method === 'post') {
      const m = getMessages();
      const storedUser = localStorage.getItem('mock_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : { id: 999, name: 'Niranjan' };
      const newM = {
        id: Date.now(),
        content: data.content,
        sender: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhoto },
        createdAt: new Date().toISOString(),
        project: data.project,
        recipient: data.recipient,
        isRead: false
      };
      m.push(newM);
      setMessages(m);
      resData = newM;
    } else {
      resData = getMessages();
    }
  } else if (url.match(/\/api\/notifications\/(\d+)\/read/)) {
    // Mark individual notification as read
    const match = url.match(/\/api\/notifications\/(\d+)\/read/);
    const nId = match ? parseInt(match[1]) : 0;
    const notifications = getNotifications();
    const updated = notifications.map((n: any) => n.id === nId ? { ...n, isRead: true } : n);
    setNotifications(updated);
    resData = { success: true };
  } else if (url.includes('/api/notifications/read-all') || url.includes('mark-all-read')) {
    // Mark all as read
    const notifications = getNotifications();
    const updated = notifications.map((n: any) => ({ ...n, isRead: true }));
    setNotifications(updated);
    resData = { success: true };
  } else if (url.includes('/api/notifications/unread')) {
    // Only return unread notifications
    resData = getNotifications().filter((n: any) => !n.isRead);
  } else if (url.includes('/api/notifications')) {
    resData = getNotifications();
  } else if (url.includes('/api/users/profile')) {
    resData = {
      id: 999,
      ...data,
      role: 'ROLE_ADMIN'
    };
  } else if (url.includes('/api/logs/user/')) {
    resData = [
      { id: 1, action: 'CREATE', details: 'Initialized project: Prologue SaaS Dashboard', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, action: 'UPDATE', details: 'Moved task: "Revamp login page" to IN_PROGRESS', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, action: 'COMMENT', details: 'Added comment: "Matches radius variables" on task 101', createdAt: new Date().toISOString() }
    ];
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
