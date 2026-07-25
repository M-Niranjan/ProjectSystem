export const getAvatarByName = (name?: string) => {
  if (!name) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80';
  
  const lower = name.toLowerCase();

  if (lower.includes('niranjan')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80';
  }
  if (lower.includes('ramesh')) {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&auto=format&fit=crop&q=80';
  }
  if (lower.includes('rahul')) {
    return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&auto=format&fit=crop&q=80';
  }
  if (lower.includes('manju')) {
    return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&auto=format&fit=crop&q=80';
  }
  if (lower.includes('vinay')) {
    return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&auto=format&fit=crop&q=80';
  }

  const avatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&auto=format&fit=crop&q=80'
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return avatars[sum % avatars.length];
};
