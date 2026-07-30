import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../../lib/api';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: 'private' | 'public';
  ownerId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt?: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  userName?: string;
  userEmail?: string;
  userImage?: string;
  createdAt?: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace) => void;
  loading: boolean;
  createWorkspace: (name: string, type?: 'private' | 'public') => Promise<Workspace>;
  fetchMembers: (workspaceId: string) => Promise<{ members: WorkspaceMember[]; pendingInvites: WorkspaceInvite[] }>;
  inviteUser: (workspaceId: string, email: string, role: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  inviteBatch: (workspaceId: string, invites: { email: string; role: string }[]) => Promise<{ success: boolean; message?: string; error?: string; sentCount?: number }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  openTeamDrawer: boolean;
  setOpenTeamDrawer: (open: boolean) => void;
  openInviteDrawer: boolean;
  setOpenInviteDrawer: (open: boolean) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [openTeamDrawer, setOpenTeamDrawer] = useState<boolean>(false);
  const [openInviteDrawer, setOpenInviteDrawer] = useState<boolean>(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/workspaces`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      const list: Workspace[] = data.workspaces || [];
      setWorkspaces(list);

      // Restore stored workspace selection or default to first
      const storedId = localStorage.getItem('codeward_active_workspace_id');
      const found = list.find((w) => w.id === storedId);
      if (found) {
        setActiveWorkspaceState(found);
      } else if (list.length > 0) {
        setActiveWorkspaceState(list[0]);
        localStorage.setItem('codeward_active_workspace_id', list[0].id);
      }
    } catch (err) {
      console.error('[WorkspaceContext] Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem('codeward_active_workspace_id', ws.id);
  };

  const createWorkspace = async (name: string, type: 'private' | 'public' = 'private'): Promise<Workspace> => {
    const res = await fetch(`${API_URL}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create workspace');
    
    const newWs = data.workspace;
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspace(newWs);
    return newWs;
  };

  const fetchMembers = async (workspaceId: string) => {
    const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch members');
    return {
      members: data.members || [],
      pendingInvites: data.pendingInvites || []
    };
  };

  const inviteUser = async (workspaceId: string, email: string, role: string) => {
    try {
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || data.error || 'Invitation failed' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch(`${API_URL}/api/workspaces/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'OTP verification failed' };
      }
      await fetchWorkspaces();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        loading,
        createWorkspace,
        fetchMembers,
        inviteUser,
        verifyOtp,
        openTeamDrawer,
        setOpenTeamDrawer,
        openInviteDrawer,
        setOpenInviteDrawer,
        refreshWorkspaces: fetchWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    return {
      workspaces: [],
      activeWorkspace: null,
      setActiveWorkspace: () => {},
      loading: false,
      error: null,
      refreshWorkspaces: async () => {},
      inviteUser: async () => ({ success: false, error: 'Workspace context missing' }),
      verifyOtp: async () => ({ success: false, error: 'Workspace context missing' }),
      openInviteDrawer: false,
      setOpenInviteDrawer: () => {},
    };
  }
  return context;
};
