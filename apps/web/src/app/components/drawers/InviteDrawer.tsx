import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Mail, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface InviteRow {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export const InviteDrawer: React.FC = () => {
  const {
    activeWorkspace,
    openInviteDrawer,
    setOpenInviteDrawer,
    inviteUser,
    verifyOtp
  } = useWorkspace();

  const [step, setStep] = useState<'invite' | 'success'>('invite');
  const [rows, setRows] = useState<InviteRow[]>([
    { id: '1', email: '', role: 'member' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!openInviteDrawer) return null;

  const handleClose = () => {
    setOpenInviteDrawer(false);
    setStep('invite');
    setRows([{ id: '1', email: '', role: 'member' }]);
    setStatusMsg(null);
    setError(null);
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), email: '', role: 'member' }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: 'email' | 'role', val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'email') {
        // Smart Paste Recognition: If pasting comma/newline separated emails
        if (val.includes(',') || val.includes('\n') || val.includes(' ')) {
          const splitEmails = val.split(/[\s,\n]+/).map(e => e.trim()).filter(e => e.includes('@'));
          if (splitEmails.length > 1) {
            // Replace current row with first email, and append the rest as new rows!
            const remainingRows = splitEmails.slice(1).map(e => ({
              id: Math.random().toString(36).substring(2, 9),
              email: e,
              role: r.role
            }));
            setTimeout(() => {
              setRows(current => {
                const updated = current.map(row => row.id === id ? { ...row, email: splitEmails[0] } : row);
                return [...updated, ...remainingRows];
              });
            }, 0);
            return { ...r, email: splitEmails[0] };
          }
        }
        return { ...r, email: val };
      }
      return { ...r, role: val as any };
    }));
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    const validRows = rows.filter(r => r.email.trim().length > 0 && r.email.includes('@'));

    if (validRows.length === 0) {
      setError('Please enter at least one valid email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStatusMsg(`Sending ${validRows.length} invitation${validRows.length > 1 ? 's' : ''}...`);

      let successCount = 0;
      let lastFailError = '';

      for (const row of validRows) {
        const res = await inviteUser(activeWorkspace.id, row.email.trim(), row.role);
        if (res.success) {
          successCount++;
        } else {
          lastFailError = res.error || 'Failed to send invite';
        }
      }

      if (successCount > 0) {
        setStatusMsg(`Successfully sent ${successCount} invitation${successCount > 1 ? 's' : ''}!`);
        setStep('success');
      } else {
        setError(lastFailError || 'Failed to send invitations.');
        setStatusMsg(null);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while sending invites.');
      setStatusMsg(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-dark fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 text-cw-txt">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Centered Modal Popup */}
      <div className="relative w-[92%] max-w-[620px] bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cw-purple/10 text-cw-purple flex items-center justify-center font-bold">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-cw-txt">
                {step === 'invite' ? 'Invite Team Members' : 'Invitations Sent'}
              </h2>
              <p className="text-xs text-cw-txt3 mt-0.5">
                {activeWorkspace?.name || 'Workspace'} · Assign custom roles per member
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {error && (
            <div className="p-3.5 bg-cw-red/10 border border-cw-red/20 rounded-xl text-cw-red text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMsg && !error && (
            <div className="p-3.5 bg-cw-purple/10 border border-cw-purple/20 rounded-xl text-cw-purple text-xs flex items-center gap-2 animate-pulse">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {step === 'invite' ? (
            /* Step 1: Dynamic Per-Person Role Form */
            <form onSubmit={handleSendInvite} className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-cw-txt2 px-1">
                  <span>Team Member Email</span>
                  <span>Assign Role</span>
                </div>

                {rows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2 animate-in fade-in duration-150">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        required
                        placeholder="colleague@company.com"
                        value={row.email}
                        onChange={(e) => handleRowChange(row.id, 'email', e.target.value)}
                        className="w-full bg-cw-bg border border-cw-bdr rounded-xl pl-9 pr-3 py-2.5 text-xs text-cw-txt focus:outline-none focus:border-cw-purple font-mono"
                      />
                      <Mail size={14} className="absolute left-3 top-3 text-cw-txt3" />
                    </div>

                    <select
                      value={row.role}
                      onChange={(e) => handleRowChange(row.id, 'role', e.target.value)}
                      className="bg-cw-bg border border-cw-bdr rounded-xl px-3 py-2.5 text-xs font-medium text-cw-txt focus:outline-none focus:border-cw-purple shrink-0 cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="w-9 h-9 rounded-xl hover:bg-cw-red/10 text-cw-txt3 hover:text-cw-red border border-transparent hover:border-cw-red/20 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-2 text-xs font-medium text-cw-purple hover:bg-cw-purple/10 border border-cw-purple/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add another member
                </button>
                
                <span className="text-[10px] text-cw-txt3">
                  Tip: Pasting multiple emails auto-splits into rows
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cw-purple hover:brightness-110 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Sending Invites...
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Send Invites ({rows.length})
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Success Screen */
            <div className="space-y-5">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-cw-txt">Invitations Sent!</h3>
                <p className="text-sm text-cw-txt3 mt-2 mb-6">
                  Magic links have been sent to the requested email addresses. They will be added to the workspace as soon as they accept.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 bg-cw-purple hover:brightness-110 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
