import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  Settings01Icon,
  Settings02Icon,
  SparklesIcon,
  Home01Icon,
  HelpCircleIcon,
  Book01Icon,
  Logout01Icon,
  Share01Icon,
  Moon01Icon,
  Sun01Icon,
  CircleIcon,
  UserAdd01Icon,
  UserGroupIcon,
  ArrowRight01Icon
} from 'hugeicons-react';
import { signOut, useSession } from '../../lib/auth';
import { useWorkspace, type WorkspaceMember } from '../contexts/WorkspaceContext';

interface UserProfilePopoverProps {
  onClose: () => void;
  onOpenThemeModal?: () => void;
}

export function UserProfilePopover({ onClose, onOpenThemeModal }: UserProfilePopoverProps) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { activeWorkspace, fetchMembers, setOpenInviteDrawer } = useWorkspace();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const userName = session?.user?.name || 'kelvin maina';
  const userImage = session?.user?.image || null;
  const userInitial = userName.charAt(0).toUpperCase();

  // Load real workspace members from database
  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchMembers(activeWorkspace.id)
        .then((res) => {
          if (res?.members) {
            setMembers(res.members);
          }
        })
        .catch(() => {});
    }
  }, [activeWorkspace?.id, fetchMembers]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  // Real workspace members only (fallback to self if empty)
  const displayMembers = members.length > 0 ? members : [
    {
      id: session?.user?.id || 'self',
      userId: session?.user?.id || 'self',
      userName,
      userEmail: session?.user?.email || '',
      userImage,
      role: 'owner' as const
    }
  ];

  return (
    <div
      ref={popoverRef}
      className="fixed bottom-16 left-4 w-[290px] max-h-[calc(100vh-90px)] overflow-y-auto no-scrollbar bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl z-[9999] p-2 font-sans text-[13px] text-cw-txt animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Header: User Avatar + Name + Workspace Indicator */}
      <div
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-cw-bg3 transition-colors cursor-pointer"
        onClick={() => {
          navigate('/dashboard/settings');
          onClose();
        }}
      >
        <div className="w-9 h-9 rounded-full bg-cw-purple/20 border border-cw-purple/40 flex items-center justify-center text-cw-purple font-bold text-[13px] shrink-0 overflow-hidden relative">
          {userImage ? <img src={userImage} alt={userName} className="w-full h-full object-cover" /> : userInitial}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cw-green border border-cw-bg2" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-cw-txt text-[13px] truncate leading-tight">{userName}</div>
          <div className="text-[10px] text-cw-txt3 truncate flex items-center gap-1 mt-0.5 font-medium">
            {activeWorkspace?.name || 'Personal'} <span className="text-[9px]">⇕</span>
          </div>
        </div>
      </div>

      {/* 2. Free Plan & Credits Card */}
      <div className="my-2 p-3 bg-cw-bg3 border border-cw-bdr/60 rounded-xl flex flex-col gap-1.5">
        {/* Top Row: Free Title + 505 > + Upgrade Button */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-cw-txt text-[14px] font-serif">Free Plan</div>
          <div className="flex items-center gap-1.5">
            <span
              onClick={() => {
                navigate('/dashboard/settings');
                onClose();
              }}
              className="font-mono font-bold text-[12px] text-cw-txt2 hover:text-cw-txt cursor-pointer transition-colors"
            >
              505 ›
            </span>
            <button
              type="button"
              onClick={() => {
                navigate('/dashboard/settings');
                onClose();
              }}
              className="px-2.5 py-0.5 bg-cw-txt text-cw-bg text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Upgrade
            </button>
          </div>
        </div>

        {/* Bottom Row: ✨ Credits ⓘ */}
        <div
          className="flex items-center gap-1.5 text-[11px] text-cw-txt2 hover:text-cw-purple cursor-pointer font-medium transition-colors"
          onClick={() => {
            navigate('/dashboard/settings');
            onClose();
          }}
        >
          <SparklesIcon size={13} className="text-cw-purple shrink-0" />
          <span>Credits</span>
          <span className="text-[10px] text-cw-txt3">ⓘ</span>
        </div>
      </div>

      {/* 3. Real Workspace Members - Overlapping Circular Avatars & Settings Arrow */}
      <div className="p-2 rounded-xl bg-cw-bg3/40 border border-cw-bdr/40 my-2 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-cw-txt font-bold text-[12px]">
            <UserGroupIcon size={15} className="text-cw-purple shrink-0" />
            <span>Workspace</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cw-purple/20 text-cw-purple font-mono">
              {displayMembers.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setOpenInviteDrawer(true);
                onClose();
              }}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cw-purple/15 text-cw-purple hover:bg-cw-purple/25 transition-colors cursor-pointer"
            >
              <UserAdd01Icon size={11} />
              <span>Invite</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/dashboard/settings');
                onClose();
              }}
              className="p-1 rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors cursor-pointer"
              title="See members & activity in Settings"
            >
              <ArrowRight01Icon size={13} />
            </button>
          </div>
        </div>

        {/* Overlapping Circular Avatar Bubbles */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
            {displayMembers.slice(0, 4).map((m, idx) => (
              <div
                key={m.id || m.userId || idx}
                className="w-7 h-7 rounded-full bg-cw-purple/20 border-2 border-cw-bg2 flex items-center justify-center text-[10px] font-bold text-cw-purple overflow-hidden shadow-sm shrink-0 relative"
                title={`${m.userName || m.userEmail || 'Member'} (${m.role || 'member'})`}
              >
                {m.userImage ? (
                  <img src={m.userImage} alt={m.userName || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  (m.userName || m.userEmail || 'M').charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {displayMembers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-cw-bg3 border-2 border-cw-bg2 flex items-center justify-center text-[9px] font-bold text-cw-txt2 shrink-0">
                +{displayMembers.length - 4}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/dashboard/settings');
              onClose();
            }}
            className="text-[11px] text-cw-txt3 hover:text-cw-purple font-medium hover:underline cursor-pointer"
          >
            See activity →
          </button>
        </div>
      </div>

      {/* 4. Primary Navigation Links */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            navigate('/dashboard/settings');
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer"
        >
          <UserIcon size={16} className="text-cw-txt3 shrink-0" />
          <span className="font-bold text-[13px]">Account</span>
        </button>

        {/* Personalization Section + Quick 3-Theme Mode Selector Bar */}
        <div className="p-1.5 rounded-xl bg-cw-bg3/50 border border-cw-bdr/40 my-1 space-y-1.5">
          <div className="flex items-center justify-between px-2 pt-0.5">
            <div className="flex items-center gap-2">
              <Settings02Icon size={15} className="text-cw-purple shrink-0" />
              <span className="font-bold text-[12px] text-cw-txt">Personalization</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) onOpenThemeModal();
              }}
              className="text-[10px] text-cw-purple font-bold hover:underline cursor-pointer"
            >
              Cycle
            </button>
          </div>

          {/* Quick 3 Mode Action Buttons */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-cw-bg2 rounded-lg border border-cw-bdr/50">
            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) onOpenThemeModal();
              }}
              className="py-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 bg-cw-bg3 text-cw-txt hover:border-cw-purple border border-transparent transition-all cursor-pointer"
              title="Dark Mode"
            >
              <Moon01Icon size={12} className="text-cw-purple" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) onOpenThemeModal();
              }}
              className="py-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 bg-cw-bg3 text-cw-txt hover:border-cw-purple border border-transparent transition-all cursor-pointer"
              title="Cream Warm Mode"
            >
              <CircleIcon size={12} className="text-[#c5a882] fill-[#c5a882]" />
              <span>Cream</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) onOpenThemeModal();
              }}
              className="py-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 bg-cw-bg3 text-cw-txt hover:border-cw-purple border border-transparent transition-all cursor-pointer"
              title="White Mode"
            >
              <Sun01Icon size={12} className="text-cw-amber" />
              <span>White</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            navigate('/dashboard/settings');
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer"
        >
          <Settings01Icon size={16} className="text-cw-txt3 shrink-0" />
          <span className="font-bold text-[13px]">Settings</span>
        </button>
      </div>

      {/* Divider */}
      <div className="my-1.5 border-t border-cw-bdr/60" />

      {/* 5. External / Auxiliary Links */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            navigate('/');
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <Home01Icon size={16} className="text-cw-txt3 group-hover:text-cw-txt shrink-0" />
            <span className="font-bold text-[13px]">Homepage</span>
          </div>
          <Share01Icon size={13} className="text-cw-txt3 opacity-60 group-hover:opacity-100" />
        </button>

        <button
          type="button"
          onClick={() => {
            window.open('https://codeward.ai/support', '_blank');
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <HelpCircleIcon size={16} className="text-cw-txt3 group-hover:text-cw-txt shrink-0" />
            <span className="font-bold text-[13px]">Get help</span>
          </div>
          <Share01Icon size={13} className="text-cw-txt3 opacity-60 group-hover:opacity-100" />
        </button>

        <button
          type="button"
          onClick={() => {
            window.open('/docs', '_blank');
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <Book01Icon size={16} className="text-cw-txt3 group-hover:text-cw-txt shrink-0" />
            <span className="font-bold text-[13px]">Docs</span>
          </div>
          <Share01Icon size={13} className="text-cw-txt3 opacity-60 group-hover:opacity-100" />
        </button>
      </div>

      {/* Divider */}
      <div className="my-1.5 border-t border-cw-bdr/60" />

      {/* 6. Destructive Action: Sign Out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cw-red/10 text-cw-red font-bold text-[13px] transition-colors text-left cursor-pointer"
      >
        <Logout01Icon size={16} className="text-cw-red shrink-0" />
        <span>Sign out</span>
      </button>
    </div>
  );
}
