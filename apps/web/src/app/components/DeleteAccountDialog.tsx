import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

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
        toast.error('Failed to initiate account deletion');
      }
    } catch (error) {
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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cw-bg border border-cw-bdr rounded-2xl w-[90vw] max-w-[480px] p-6 z-50 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-cw-txt">Delete account</Dialog.Title>
            <Dialog.Close className="text-cw-txt3 hover:text-cw-txt transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </Dialog.Close>
          </div>

          <div className="mb-6 text-cw-txt2 text-[14px] leading-relaxed">
            This action is irreversible. All your data will be permanently deleted.
            <div className="text-cw-red font-bold mt-2">Are you sure you want to delete your account?</div>
          </div>

          <div className="mb-6">
            <label className="block text-cw-txt2 text-[14px] mb-2 flex items-center gap-2">
              Type 
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('DELETE');
                  toast.success('Copied to clipboard');
                }}
                className="bg-cw-bg3 hover:bg-cw-bdr px-2 py-0.5 rounded text-cw-txt font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy DELETE"
              >
                DELETE 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cw-txt3"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
              to confirm.
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-cw-bg2 border border-cw-bdr rounded-lg px-3 py-2 text-cw-txt font-mono focus:border-cw-red/50 outline-none transition-colors"
              placeholder="DELETE"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="px-4 py-2 bg-cw-red/20 text-cw-red font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:bg-cw-red/30"
            >
              {isDeleting ? 'Deleting...' : 'Delete account'} 
              <span className="text-[10px] text-cw-red/70 border border-cw-red/30 rounded px-1 ml-1 bg-cw-red/10">Ctrl ↵</span>
            </button>
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-cw-txt2 hover:text-cw-txt font-bold rounded-lg transition-colors flex items-center gap-2">
                Cancel
                <span className="text-[10px] text-cw-txt3 border border-cw-bdr rounded px-1 ml-1 bg-cw-bg3">Esc</span>
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
