'use client';
import { Avatar, rem } from '@mantine/core';

interface UserAvatarProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  size?: string | number;
  radius?: string;
}

export function UserAvatar({ user, size = 'md', radius = 'xl' }: UserAvatarProps) {
  
  const getSrc = (url?: string | null) => {
    if (!url) return undefined;
    
    // 1. If it's already a full URL
    if (url.startsWith('http')) return url;
    
    // 2. Prepend API Domain
    const baseUrl = 'https://api.pixelforgedeveloper.com';
    
    // 3. Clean path
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    
    // 4. Cache Busting
    return `${baseUrl}${cleanPath}?t=${new Date().getTime()}`;
  };

  const getInitials = () => {
    if (!user) return 'U';
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
  };

  return (
    <Avatar 
      src={getSrc(user?.avatarUrl)} 
      color="blue" 
      radius={radius} 
      size={size}
      key={user?.avatarUrl} 
      alt={user?.firstName || 'User'}
    >
      {/* Mantine Avatar shows children (initials) only if src fails to load */}
      {getInitials()}
    </Avatar>
  );
}