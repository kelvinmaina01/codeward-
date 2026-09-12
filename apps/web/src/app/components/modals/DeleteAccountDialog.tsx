import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Trash2, X } from 'lucide-react';
import { API_URL } from '../../../lib/api';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteAccountDialog({ open, onOpenChange, onSuccess }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/users/me/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to initiate account deletion');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleDelete();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cw-bg2 text-cw-txt border border-cw-bdr rounded-xl w-[90vw] max-w-[460px] p-6 z-50 shadow-2xl animate-in fade-in zoom-in-95 outline-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cw-red/10 border border-cw-red/25 flex items-center justify-center text-cw-red shrink-0">
                <AlertTriangle size={16} />
              </div>
              <Dialog.Title className="text-[16px] font-semibold text-cw-txt">Delete account</Dialog.Title>
            </div>
            <Dialog.Close className="text-cw-txt3 hover:text-cw-txt p-1.5 rounded-md hover:bg-cw-bg3 transition-colors cursor-pointer" aria-label="Close">
              <X size={15} />
            </Dialog.Close>
          </div>

          <div className="mb-5 space-y-2.5">
            <p className="text-cw-txt2 text-[13px] leading-relaxed">
              This action is <strong className="text-cw-txt font-semibold">permanent and irreversible</strong>. All your connected repositories, scan history, technical debt records, and personal workspace data will be immediately and permanently erased.
            </p>
            <div className="p-2.5 rounded-lg bg-cw-red/10 border border-cw-red/25 text-cw-red text-[12px] font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>Are you sure you want to delete your Codeward account?</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-1.5 text-cw-txt2 text-[12px] font-medium mb-2">
              <span>Type</span>
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('DELETE');
                  setConfirmText('DELETE');
                  toast.success('Filled DELETE');
                }}
                className="bg-cw-bg3 hover:bg-cw-bdr border border-cw-bdr px-2 py-0.5 rounded text-cw-txt font-mono text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Click to copy and paste DELETE"
              >
                DELETE 
                <Copy size={11} className="text-cw-txt3" />
              </button>
              <span>to confirm:</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-cw-txt font-mono text-[13px] focus:border-cw-red/70 focus:ring-1 focus:ring-cw-red/40 outline-none transition-colors placeholder:text-cw-txt3"
              placeholder="Type DELETE"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cw-bdr">
            <Dialog.Close asChild>
              <button 
                type="button" 
                className="px-3.5 py-1.5 text-cw-txt2 hover:text-cw-txt bg-cw-bg2 hover:bg-cw-bg3 border border-cw-bdr font-medium text-[12px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Cancel
                <span className="text-[10px] text-cw-txt3 border border-cw-bdr rounded px-1 ml-0.5 font-mono">Esc</span>
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="px-3.5 py-1.5 bg-cw-red hover:bg-cw-red/90 text-white font-medium text-[12px] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <Trash2 size={13} />
              <span>{isDeleting ? 'Deleting...' : 'Delete account'}</span>
              <span className="text-[10px] text-white/80 border border-white/30 rounded px-1 ml-0.5 font-mono">Ctrl ↵</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
