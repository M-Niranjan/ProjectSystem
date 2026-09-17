import axios from 'axios';

// Force-clear stale mock data when the mock version changes
const MOCK_VERSION = 'v12-completely-clean-no-default-users';
if (localStorage.getItem('mock_version') !== MOCK_VERSION) {
  ['mock_projects', 'mock_tasks', 'mock_teammates', 'mock_messages', 'mock_notifications', 'mock_user', 'mock_audit_logs', 'mock_roles_permissions', 'mock_users_db'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('mock_version', MOCK_VERSION);
}

// Initialize mock database in localStorage to persist user actions on page refreshes
const initMocks = () => {
  if (!localStorage.getItem('mock_projects')) {
    localStorage.setItem('mock_projects', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_tasks')) {
    localStorage.setItem('mock_tasks', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_teammates')) {
    localStorage.setItem('mock_teammates', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_audit_logs')) {
    localStorage.setItem('mock_audit_logs', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_roles_permissions')) {
    localStorage.setItem('mock_roles_permissions', JSON.stringify([
      { role: 'Admin', code: 'ROLE_ADMIN', dashboard: true, userMgmt: true, roleMgmt: true, teamMgmt: true, orgSettings: true, auditLogs: true, projects: true, tasks: true },
      { role: 'Team Lead', code: 'ROLE_MANAGER', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: true, orgSettings: false, auditLogs: false, projects: true, tasks: true },
      { role: 'Employee', code: 'ROLE_EMPLOYEE', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: false, orgSettings: false, auditLogs: false, projects: false, tasks: true }
    ]));
  }
  if (!localStorage.getItem('mock_messages')) {
    localStorage.setItem('mock_messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_users_db')) {
    localStorage.setItem('mock_users_db', JSON.stringify([]));
  }
  if (!localStorage.getItem('mock_notifications')) {
    localStorage.setItem('mock_notifications', JSON.stringify([]));
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
    resData = storedUser ? JSON.parse(storedUser) : null;
  } else if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
    const inputEmail = (data?.email || '').trim().toLowerCase();
    const inputPassword = (data?.password || '').trim();

    const usersDb = JSON.parse(localStorage.getItem('mock_users_db') || '[]');
    let matchedUser = usersDb.find((u: any) => u.email.trim().toLowerCase() === inputEmail);

    if (!matchedUser) {
      const storedUserStr = localStorage.getItem('mock_user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.email?.trim().toLowerCase() === inputEmail) {
          matchedUser = storedUser;
        }
      }
    }

    if (matchedUser) {
      if (matchedUser.password && inputPassword && matchedUser.password !== inputPassword) {
        throw {
          response: {
            status: 400,
            data: 'Invalid email or password! Please enter your updated credentials.'
          }
        };
      }

      localStorage.setItem('mock_user', JSON.stringify(matchedUser));
      resData = {
        accessToken: 'mock-jwt-token-prologue',
        user: matchedUser
      };
    } else {
      const role = data?.role as 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE' | undefined;
      if (!role) {
        throw {
          response: {
            status: 400,
            data: 'Invalid user role. Please contact your administrator.'
          }
        };
      }
      let name = data?.name || inputEmail.split('@')[0] || 'User';
      let designation = data?.designation || (role === 'ROLE_ADMIN' ? 'System Administrator' : 'Software Engineer');
      let department = data?.department || 'Engineering';
      let experience = data?.experience || 1;
      let skills = data?.skills || '';
      let userId = Date.now();

      const mockUser = {
        id: userId,
        name,
        email: data?.email || inputEmail,
        password: inputPassword || 'password123',
        role,
        designation,
        department,
        experience,
        skills,
        createdAt: new Date().toISOString()
      };

      usersDb.push(mockUser);
      localStorage.setItem('mock_users_db', JSON.stringify(usersDb));
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
    }
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
  } else if (url.includes('/api/tasks/project/')) {
    const match = url.match(/\/api\/tasks\/project\/(\d+)/);
    const projId = match ? parseInt(match[1]) : 0;
    const allT = getTasks();
    resData = allT.filter((t: any) => t.project && (t.project.id === projId || t.project.id === Number(projId)));
  } else if (url.match(/\/api\/tasks\/(\d+)/)) {
    const match = url.match(/\/api\/tasks\/(\d+)/);
    const taskId = match ? parseInt(match[1]) : 0;
    const allT = getTasks();
    
    if (method === 'put') {
      const index = allT.findIndex((t: any) => t.id === taskId);
      if (index !== -1) {
        allT[index] = { ...allT[index], ...data, id: taskId };
        setTasks(allT);
        resData = allT[index];
      } else {
        resData = { id: taskId, ...data };
      }
    } else if (method === 'delete') {
      const filtered = allT.filter((t: any) => t.id !== taskId);
      setTasks(filtered);
      resData = { success: true };
    } else {
      const found = allT.find((t: any) => t.id === taskId);
      resData = found || (allT.length > 0 ? allT[0] : { id: taskId, title: 'Task' });
    }
  } else if (url.includes('/api/tasks')) {
    if (method === 'post') {
      const t = getTasks();
      const resolvedAssignee = data.assignee ? data.assignee : (data.assigneeId ? { id: Number(data.assigneeId), name: 'Assigned Member' } : null);

      const newT = {
        id: Date.now(),
        title: data.title || 'New Task',
        description: data.description || '',
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
  } else if (url.includes('/api/projects/') && url.includes('/favorite')) {
    const match = url.match(/\/api\/projects\/(\d+)\/favorite/);
    const projId = match ? parseInt(match[1]) : 0;
    const allP = getProjects();
    const index = allP.findIndex((p: any) => p.id === projId);
    if (index !== -1) {
      allP[index].isFavorite = !allP[index].isFavorite;
      setProjects(allP);
      resData = allP[index];
    } else {
      resData = { id: projId, isFavorite: true };
    }
  } else if (url.match(/\/api\/projects\/(\d+)/)) {
    const match = url.match(/\/api\/projects\/(\d+)/);
    const projId = match ? parseInt(match[1]) : 0;
    const allP = getProjects();

    if (method === 'put') {
      const index = allP.findIndex((p: any) => p.id === projId);
      if (index !== -1) {
        allP[index] = { ...allP[index], ...data, id: projId };
        setProjects(allP);
        resData = allP[index];
      } else {
        resData = { id: projId, ...data };
      }
    } else if (method === 'delete') {
      const filtered = allP.filter((p: any) => p.id !== projId);
      setProjects(filtered);
      resData = { success: true };
    } else {
      const found = allP.find((p: any) => p.id === projId);
      resData = found || (allP.length > 0 ? allP[0] : { id: projId, name: 'Project' });
    }
  } else if (url.includes('/api/projects')) {
    if (method === 'post') {
      const p = getProjects();
      const newProj = { id: Date.now(), title: data.name || data.title, ...data, status: data.status || 'ACTIVE' };
      p.push(newProj);
      setProjects(p);
      resData = newProj;
    } else {
      resData = getProjects();
    }
  } else if (url.includes('/api/teams') || url.includes('/api/admin/create-team-leader') || url.includes('/api/admin/create-employee') || url.includes('/api/users/team-leaders') || url.includes('/api/users/employees')) {
    if (method === 'post') {
      const teammates = getTeammates();
      const newTeammate = {
        id: Date.now(),
        ...data,
        gender: data.gender || 'Male',
        role: data.role || 'ROLE_EMPLOYEE',
        designation: data.designation || 'Teammate',
        department: data.department || 'Technology',
        experience: Number(data.experience || 2),
        skills: data.skills || ''
      };
      teammates.push(newTeammate);
      localStorage.setItem('mock_teammates', JSON.stringify(teammates));

      const auditLogs = JSON.parse(localStorage.getItem('mock_audit_logs') || '[]');
      auditLogs.unshift({
        id: Date.now(),
        user: 'Niranjan (Admin)',
        action: (data.role === 'ROLE_MANAGER' || data.role === 'teamLeader') ? 'TEAM_LEAD_CREATE' : 'EMPLOYEE_CREATE',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        activity: `Provisioned user ${newTeammate.name} (${newTeammate.email}) as ${data.role === 'ROLE_MANAGER' || data.role === 'teamLeader' ? 'Team Lead' : 'Employee'}`,
        status: 'SUCCESS'
      });
      localStorage.setItem('mock_audit_logs', JSON.stringify(auditLogs));

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
    } else if (method === 'delete') {
      const match = url.match(/\/api\/teams\/(\d+)/);
      const id = match ? parseInt(match[1]) : 0;
      const teammates = getTeammates().filter((x: any) => x.id !== id);
      localStorage.setItem('mock_teammates', JSON.stringify(teammates));

      const usersDb = JSON.parse(localStorage.getItem('mock_users_db') || '[]').filter((x: any) => x.id !== id);
      localStorage.setItem('mock_users_db', JSON.stringify(usersDb));

      resData = { success: true };
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
    const storedUser = localStorage.getItem('mock_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : { id: 999 };
    const currentUserId = currentUser.id || 999;
    const currentUserName = (currentUser.name || '').toLowerCase();

    const notifications = getNotifications();
    resData = notifications.filter((n: any) => {
      if (n.isRead) return false;
      if (n.recipientId && n.recipientId !== 'ALL' && String(n.recipientId) !== String(currentUserId)) {
        return false;
      }
      if (n.recipientName && n.recipientName !== 'ALL' && String(n.recipientName).toLowerCase() !== currentUserName) {
        return false;
      }
      return true;
    });
  } else if (url.includes('/api/notifications')) {
    if (method === 'post') {
      const notifications = getNotifications();
      const newNotification = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: data?.title || 'Team Leader Update',
        message: data?.message || 'Team Leader made changes in the workspace.',
        type: data?.type || 'SYSTEM_ALERT',
        isRead: false,
        recipientId: data?.recipientId || 'ALL',
        recipientName: data?.recipientName || 'ALL',
        createdAt: new Date().toISOString(),
      };
      notifications.unshift(newNotification);
      setNotifications(notifications);
      resData = newNotification;
    } else {
      resData = getNotifications();
    }
  } else if (url.includes('/api/users/profile')) {
    const storedUserStr = localStorage.getItem('mock_user');
    const currentUser = storedUserStr ? JSON.parse(storedUserStr) : { id: 999, email: 'niranjan@pm.com', role: 'ROLE_ADMIN' };
    
    const usersDb = JSON.parse(localStorage.getItem('mock_users_db') || '[]');
    let userIndex = usersDb.findIndex((u: any) => u.id === currentUser.id || u.email?.toLowerCase() === currentUser.email?.toLowerCase());

    const updatedUserObj = {
      ...currentUser,
      ...data,
      id: currentUser.id || 999,
      role: currentUser.role || 'ROLE_ADMIN'
    };

    if (data?.password && data.password.trim()) {
      updatedUserObj.password = data.password.trim();
    }

    if (userIndex !== -1) {
      usersDb[userIndex] = { ...usersDb[userIndex], ...updatedUserObj };
    } else {
      usersDb.push(updatedUserObj);
    }

    localStorage.setItem('mock_users_db', JSON.stringify(usersDb));
    localStorage.setItem('mock_user', JSON.stringify(updatedUserObj));

    // Also update mock_teammates list so chat contacts and assignee lists reflect new email & name
    const teammates = JSON.parse(localStorage.getItem('mock_teammates') || '[]');
    const tIndex = teammates.findIndex((t: any) => t.id === updatedUserObj.id || t.email?.toLowerCase() === currentUser.email?.toLowerCase());
    if (tIndex !== -1) {
      teammates[tIndex] = {
        ...teammates[tIndex],
        name: updatedUserObj.name || teammates[tIndex].name,
        email: updatedUserObj.email || teammates[tIndex].email,
        designation: updatedUserObj.designation || teammates[tIndex].designation,
        department: updatedUserObj.department || teammates[tIndex].department,
      };
      localStorage.setItem('mock_teammates', JSON.stringify(teammates));
    }

    resData = updatedUserObj;
  } else if (url.includes('/api/admin/roles')) {
    const storedRoles = localStorage.getItem('mock_roles_permissions');
    const defaultRoles = [
      { role: 'Admin', code: 'ROLE_ADMIN', dashboard: true, userMgmt: true, roleMgmt: true, teamMgmt: true, orgSettings: true, auditLogs: true, projects: true, tasks: true },
      { role: 'Team Lead', code: 'ROLE_MANAGER', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: true, orgSettings: false, auditLogs: false, projects: true, tasks: true },
      { role: 'Employee', code: 'ROLE_EMPLOYEE', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: false, orgSettings: false, auditLogs: false, projects: false, tasks: true }
    ];
    if (method === 'put' || method === 'post') {
      localStorage.setItem('mock_roles_permissions', JSON.stringify(data || defaultRoles));
      resData = data || defaultRoles;
    } else {
      resData = storedRoles ? JSON.parse(storedRoles) : defaultRoles;
    }
  } else if (url.includes('/api/admin/audit-logs')) {
    const storedLogs = localStorage.getItem('mock_audit_logs');
    const defaultLogs = [
      { id: 1, user: 'Niranjan (Admin)', action: 'LOGIN', date: '2026-08-25', time: '01:15:20', activity: 'Admin logged into Prologue Workspace', status: 'SUCCESS' },
      { id: 2, user: 'Niranjan (Admin)', action: 'ROLE_UPDATE', date: '2026-08-24', time: '18:40:12', activity: 'Assigned Ramesh to Team Employee role', status: 'SUCCESS' },
      { id: 3, user: 'Ramesh (Employee)', action: 'TASK_SUBMIT', date: '2026-08-24', time: '14:22:05', activity: 'Submitted API Integration module for Code Review', status: 'SUCCESS' },
      { id: 4, user: 'Rahul (Employee)', action: 'TASK_SUBMIT', date: '2026-08-25', time: '00:30:10', activity: 'Submitted task Create Patient Dashboard for Code Review', status: 'PENDING_REVIEW' }
    ];
    resData = storedLogs ? JSON.parse(storedLogs) : [];
  } else if (url.includes('/api/admin/organization')) {
    resData = {
      name: 'Prologue Enterprise Solutions',
      workingHours: '09:00 - 18:00 (40h/week)',
      timezone: 'Asia/Kolkata (IST)',
      departments: 'Engineering, Product, Quality Assurance, Design, Management'
    };
  } else if (url.includes('/api/logs/user/')) {
    resData = [
      { id: 1, action: 'CREATE', details: 'Initialized project: Prologue SaaS Dashboard', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, action: 'UPDATE', details: 'Moved task: "Revamp login page" to IN_PROGRESS', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, action: 'COMMENT', details: 'Added comment: "Matches radius variables" on task 101', createdAt: new Date().toISOString() }
    ];
  } else {
    resData = [];
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
});

// Interceptor to append JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
    if (error.response && error.response.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
