import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Users, Shield, Check, Lock, Globe, Sparkles, Building } from 'lucide-react';
import { useWorkspace, Workspace } from '../contexts/WorkspaceContext';

export const WorkspaceSwitcher: React.FC = () => {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
    setOpenTeamDrawer,
    setOpenInviteDrawer
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsType, setNewWsType] = useState<'private' | 'public'>('private');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setIsOpen(false);
  };

  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      setCreating(true);
      setCreateError(null);
      await createWorkspace(newWsName.trim(), newWsType);
      setNewWsName('');
      setShowCreateModal(false);
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const initial = activeWorkspace?.name ? activeWorkspace.name.charAt(0).toUpperCase() : 'K';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Target Trigger Button matching user's exact screenshot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-cw-bg hover:bg-cw-bg3 border border-cw-bdr rounded-lg transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-cw-purple/90 flex items-center justify-center text-white font-bold text-[12px] shadow-sm shrink-0">
            {initial}
          </div>
          <span className="text-[13px] font-medium text-cw-txt truncate">
            {activeWorkspace?.name || 'kelvinmaina01'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-cw-txt3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[210px] bg-cw-bg2 border border-cw-bdr rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-cw-bdr/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-cw-txt3 uppercase tracking-wider">Workspaces</span>
            <span className="text-[9px] bg-cw-purple/10 text-cw-purple px-1.5 py-0.5 rounded font-mono shrink-0">
              {workspaces.length} total
            </span>
          </div>

          {/* List of Workspaces */}
          <div className="max-h-[220px] overflow-y-auto p-1 space-y-0.5">
            {workspaces.map((ws) => {
              const isActive = activeWorkspace?.id === ws.id;
              const wsInitial = ws.name.charAt(0).toUpperCase();
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-[12px] ${
                    isActive ? 'bg-cw-bg3 text-cw-txt font-semibold' : 'text-cw-txt2 hover:bg-cw-bg hover:text-cw-txt'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-cw-purple/20 text-cw-purple flex items-center justify-center text-[10px] font-bold shrink-0">
                      {wsInitial}
                    </div>
                    <div className="truncate">
                      <div className="truncate font-medium">{ws.name}</div>
                      <div className="text-[10px] text-cw-txt3 flex items-center gap-1">
                        {ws.type === 'private' ? <Lock size={9} /> : <Globe size={9} />}
                        <span className="capitalize">{ws.role || 'owner'}</span>
                      </div>
                    </div>
                  </div>
                  {isActive && <Check size={14} className="text-cw-green shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Workspace Management Footer */}
          <div className="p-1 border-t border-cw-bdr/50 bg-cw-bg/50 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setOpenTeamDrawer(true);
              }}
              className="w-full flex items-center gap-2 p-2 text-[12px] text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 rounded-lg transition-colors"
            >
              <Users size={14} className="text-cw-purple" />
              <span>Workspace Members &amp; RBAC</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setOpenInviteDrawer(true);
              }}
              className="w-full flex items-center gap-2 p-2 text-[12px] text-cw-blue hover:bg-cw-blue/10 rounded-lg transition-colors font-medium"
            >
              <Plus size={14} />
              <span>Invite Team Member</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-2 p-2 text-[12px] text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 rounded-lg transition-colors border-t border-cw-bdr/30 mt-1"
            >
              <Building size={14} className="text-cw-green" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal for Creating Workspace */}
      {showCreateModal && (
        <div className="theme-dark fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-cw-txt">
          <div className="bg-cw-bg2 border border-cw-bdr rounded-2xl w-[90%] max-w-[540px] p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-cw-txt mb-1">Create New Workspace</h3>
            <p className="text-xs text-cw-txt3 mb-5">
              Workspaces isolate repositories, team members, agent permissions, and security reports.
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-cw-red/10 border border-cw-red/20 rounded-xl text-cw-red text-xs flex items-center gap-2">
                <span className="font-bold">Error:</span> {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cw-txt2 mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Infrastructure"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-xs text-cw-txt focus:outline-none focus:border-cw-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cw-txt2 mb-1.5">Visibility &amp; Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewWsType('private')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      newWsType === 'private'
                        ? 'border-cw-purple bg-cw-purple/10 text-cw-txt'
                        : 'border-cw-bdr bg-cw-bg text-cw-txt3 hover:bg-cw-bg3'
                    }`}
                  >
                    <Lock size={16} className={newWsType === 'private' ? 'text-cw-purple' : ''} />
                    <div>
                      <div className="text-xs font-semibold">Private</div>
                      <div className="text-[10px] opacity-75">Team invite only</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewWsType('public')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      newWsType === 'public'
                        ? 'border-cw-purple bg-cw-purple/10 text-cw-txt'
                        : 'border-cw-bdr bg-cw-bg text-cw-txt3 hover:bg-cw-bg3'
                    }`}
                  >
                    <Globe size={16} className={newWsType === 'public' ? 'text-cw-purple' : ''} />
                    <div>
                      <div className="text-xs font-semibold">Public</div>
                      <div className="text-[10px] opacity-75">Visible to org</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cw-bdr">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-cw-bg hover:bg-cw-bg3 border border-cw-bdr rounded-lg text-xs font-medium text-cw-txt2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWsName.trim()}
                  className="px-4 py-2 bg-cw-purple hover:brightness-110 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all shadow-sm"
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
