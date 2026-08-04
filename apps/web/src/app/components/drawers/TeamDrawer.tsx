import React, { useEffect, useState } from 'react';
import { X, Users, UserPlus, Shield, Mail, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useWorkspace, WorkspaceMember, WorkspaceInvite } from '../../contexts/WorkspaceContext';

export const TeamDrawer: React.FC = () => {
  const {
    activeWorkspace,
    openTeamDrawer,
    setOpenTeamDrawer,
    setOpenInviteDrawer,
    fetchMembers
  } = useWorkspace();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMembers(activeWorkspace.id);
      setMembers(res.members);
      setInvites(res.pendingInvites);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openTeamDrawer) {
      loadData();
    }
  }, [openTeamDrawer, activeWorkspace?.id]);

  if (!openTeamDrawer) return null;

  return (
    <div className="theme-dark fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 text-cw-txt">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setOpenTeamDrawer(false)}
      />

      {/* Centered Modal Card */}
      <div className="relative w-[92%] max-w-[680px] max-h-[85vh] bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cw-purple/10 text-cw-purple flex items-center justify-center font-bold">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-cw-txt">Workspace Team &amp; RBAC</h2>
                <p className="text-xs text-cw-txt3 mt-0.5">
                  {activeWorkspace?.name || 'Workspace'} · Manage access levels
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpenTeamDrawer(false)}
              className="w-8 h-8 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Top Invite Banner Button */}
            <div className="bg-gradient-to-r from-cw-purple/10 to-cw-blue/10 border border-cw-purple/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-cw-txt mb-0.5">Invite new team members</div>
                <div className="text-[11px] text-cw-txt2">Real-time email verification &amp; OTP security</div>
              </div>
              <button
                onClick={() => {
                  setOpenTeamDrawer(false);
                  setOpenInviteDrawer(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-purple hover:brightness-110 text-white rounded-lg text-xs font-medium transition-all shadow-sm shrink-0"
              >
                <UserPlus size={14} /> Invite
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-cw-txt3 gap-2">
                <RefreshCw size={20} className="animate-spin text-cw-purple" />
                <span className="text-xs">Loading members...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-cw-red/10 border border-cw-red/20 rounded-xl text-cw-red text-xs flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            ) : (
              <>
                {/* Active Members Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                      Active Members ({members.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 bg-cw-bg rounded-xl border border-cw-bdr"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {m.userImage ? (
                            <img src={m.userImage} alt={m.userName || 'User'} className="w-8 h-8 rounded-full border border-cw-bdr shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cw-purple/20 text-cw-purple flex items-center justify-center font-bold text-xs shrink-0">
                              {(m.userName || m.userEmail || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs font-semibold text-cw-txt truncate">
                              {m.userName || 'Codeward User'}
                            </div>
                            <div className="text-[11px] text-cw-txt3 truncate">
                              {m.userEmail || m.userId}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                          m.role === 'owner'
                            ? 'bg-cw-purple/10 text-cw-purple border-cw-purple/30'
                            : m.role === 'admin'
                            ? 'bg-cw-blue/10 text-cw-blue border-cw-blue/30'
                            : 'bg-cw-bg3 text-cw-txt2 border-cw-bdr'
                        }`}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invites Section */}
                {invites.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                        Pending OTP Invites ({invites.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {invites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 bg-cw-bg/50 rounded-xl border border-cw-bdr/60 border-dashed"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-cw-amber/10 text-cw-amber flex items-center justify-center shrink-0">
                              <Mail size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-medium text-cw-txt truncate">{inv.email}</div>
                              <div className="text-[10px] text-cw-amber flex items-center gap-1">
                                <Clock size={10} /> Awaiting OTP verification
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cw-amber/10 text-cw-amber border border-cw-amber/20 shrink-0">
                            {inv.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Role Definitions Reference Card */}
            <div className="bg-cw-bg rounded-xl border border-cw-bdr p-4 space-y-3">
              <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} className="text-cw-purple" /> Access Level Permissions
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-cw-purple min-w-[50px]">Owner:</span>
                  <span className="text-cw-txt2">Full workspace control, member management, and billing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-cw-blue min-w-[50px]">Admin:</span>
                  <span className="text-cw-txt2">Can invite members, connect repositories, and configure agents.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-cw-txt min-w-[50px]">Member:</span>
                  <span className="text-cw-txt2">Can trigger scans, view security reports, and interact with Gordon.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-cw-txt3 min-w-[50px]">Viewer:</span>
                  <span className="text-cw-txt2">Read-only view of dashboard and debt reports.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };
