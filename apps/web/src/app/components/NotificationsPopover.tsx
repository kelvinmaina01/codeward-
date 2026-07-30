import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayIcon, Cancel01Icon, Notification01Icon, SparklesIcon, Alert01Icon, ArrowRight01Icon, ShieldAlertIcon, GitPullRequestIcon, RefreshIcon } from 'hugeicons-react';
import { API_URL } from '../../lib/api';

export interface NotificationItem {
  id: string;
  type: 'update' | 'message' | 'alert';
  title: string;
  description: string;
  date: string;
  hasVideo?: boolean;
  videoTitle?: string;
  bannerColor?: string;
  unread?: boolean;
  isAlertHighlight?: boolean;
  source?: string;
  repo?: string;
  htmlUrl?: string;
}

const DEFAULT_CODEWARD_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'cw-1',
    type: 'alert',
    title: '3 Security Alerts Triggered',
    description: 'High severity SQL injection & JWT secret exposure detected in auth.ts. Review findings and open auto-fix PRs.',
    date: 'Just now',
    isAlertHighlight: true,
    unread: true,
    source: 'Security Agent',
  },
  {
    id: 'cw-2',
    type: 'update',
    title: 'Introducing Codeward Branch Engine',
    description: 'Start a parallel refactor session from any issue. Your dependencies, rules, and history carry over cleanly.',
    date: 'Jul 10',
    hasVideo: true,
    videoTitle: 'Codeward Branch Deep-Dive',
    unread: true,
  },
  {
    id: 'cw-3',
    type: 'update',
    title: 'Codeward Autonomous Suite v2.4 Live',
    description: 'Build, scan, and deploy self-healing microservices directly from your Codeward Dashboard.',
    date: 'Jul 8',
    bannerColor: 'bg-cw-purple',
    unread: false,
  },
  {
    id: 'cw-4',
    type: 'message',
    typeMessage: 'message',
    title: 'Guardian Agent Audit Completed',
    description: 'Finished static analysis across 142 files. Zero blocking architectural smells detected.',
    date: 'Yesterday',
    unread: false,
    source: 'Guardian Agent',
  }
];

interface NotificationsPopoverProps {
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationsPopover({ onClose, anchorRef }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'updates' | 'messages'>('all');
  const [items, setItems] = useState<NotificationItem[]>(DEFAULT_CODEWARD_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [realAlertsCount, setRealAlertsCount] = useState(0);
  const [popoverLeft, setPopoverLeft] = useState<number>(188);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position popover left edge directly on top of the bell button
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      if (rect.left > 0) {
        setPopoverLeft(rect.left);
      }
    }
  }, [anchorRef]);

  // Fetch real alerts from backend API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`${API_URL}/api/alerts`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0) {
          setRealAlertsCount(data.alerts.length);
          const mappedAlerts: NotificationItem[] = data.alerts.slice(0, 10).map((a: any) => ({
            id: `api-${a.id}`,
            type: a.kind === 'autofix' ? 'update' : 'alert',
            title: a.title,
            description: a.description,
            date: timeAgoShort(a.createdAt),
            unread: true,
            isAlertHighlight: a.severity === 'CRITICAL' || a.severity === 'HIGH',
            source: a.source,
            repo: a.repo,
            htmlUrl: a.htmlUrl,
          }));

          // Merge real backend alerts with Codeward default feature updates
          const updates = DEFAULT_CODEWARD_NOTIFICATIONS.filter((n) => n.type === 'update');
          setItems([...mappedAlerts, ...updates]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch real alerts for notification popover:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'updates') return item.type === 'update';
    if (activeTab === 'messages') return item.type === 'message' || item.type === 'alert';
    return true;
  });

  // Limit display to 3 items max due to card size constraint
  const DISPLAY_LIMIT = 3;
  const displayedItems = filteredItems.slice(0, DISPLAY_LIMIT);
  const remainingCount = Math.max(0, filteredItems.length - DISPLAY_LIMIT);

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  return (
    <div
      ref={popoverRef}
      style={{ left: `${popoverLeft}px` }}
      className="fixed bottom-16 w-[345px] max-h-[calc(100vh-90px)] overflow-y-auto no-scrollbar bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl z-[9999] p-4 font-sans text-[13px] text-cw-txt animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* 1. Header & Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[15px] text-cw-txt">Notifications</h3>
          {items.some((i) => i.unread) && (
            <span className="px-2 py-0.5 rounded-full bg-cw-purple/20 text-cw-purple text-[10px] font-bold">
              {items.filter((i) => i.unread).length} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.some((i) => i.unread) && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] text-cw-purple hover:underline font-medium cursor-pointer"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt cursor-pointer transition-colors"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs: All | Updates | Messages */}
      <div className="flex items-center gap-1 p-1 bg-cw-bg3 rounded-xl mb-3 border border-cw-bdr/50">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-cw-bg2 text-cw-txt shadow-sm border border-cw-bdr/50'
              : 'text-cw-txt3 hover:text-cw-txt'
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('updates')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'updates'
              ? 'bg-cw-bg2 text-cw-txt shadow-sm border border-cw-bdr/50'
              : 'text-cw-txt3 hover:text-cw-txt'
          }`}
        >
          Updates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-cw-bg2 text-cw-txt shadow-sm border border-cw-bdr/50'
              : 'text-cw-txt3 hover:text-cw-txt'
          }`}
        >
          Alerts
        </button>
      </div>

      {/* 3. Notifications List (Limited to DISPLAY_LIMIT for card size) */}
      <div className="space-y-3 max-h-[320px] overflow-y-auto no-scrollbar pr-0.5">
        {displayedItems.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-cw-txt3">No notifications in this category.</div>
        ) : (
          displayedItems.map((item) => (
            <div key={item.id} className="group relative pb-2.5 border-b border-cw-bdr/40 last:border-b-0 last:pb-0">
              {/* Highlighted Alert Card */}
              {item.isAlertHighlight ? (
                <div className="p-2.5 bg-cw-red/10 border border-cw-red/30 rounded-xl mb-1">
                  <div className="flex items-center justify-between gap-1 mb-1 text-cw-red font-bold text-[12px]">
                    <span className="flex items-center gap-1.5 truncate">
                      <Alert01Icon size={15} className="shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </span>
                    {item.source && (
                      <span className="text-[9px] bg-cw-red/20 px-1.5 py-0.5 rounded font-mono uppercase shrink-0">
                        {item.source}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-cw-txt2 leading-snug mb-2 line-clamp-2">{item.description}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/dashboard/alerts');
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 bg-cw-red text-white font-bold text-[11px] rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  >
                    <span>View All Alerts in Alerts Center</span>
                    <ArrowRight01Icon size={12} />
                  </button>
                </div>
              ) : (
                <>
                  {/* Title & Unread indicator */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-[12px] text-cw-txt leading-snug flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.unread && <span className="w-1.5 h-1.5 rounded-full bg-cw-purple inline-block shrink-0" />}
                    </h4>
                    <span className="text-[9px] text-cw-txt3 font-mono shrink-0">{item.date}</span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-cw-txt2 leading-relaxed mb-2 line-clamp-2">{item.description}</p>

                  {/* Video Thumbnail Card */}
                  {item.hasVideo && (
                    <div className="relative my-1.5 rounded-xl overflow-hidden bg-cw-bg3 border border-cw-bdr flex flex-col items-center justify-center py-5 group/card cursor-pointer hover:border-cw-purple transition-all">
                      <div className="absolute inset-0 bg-gradient-to-br from-cw-bg3 via-cw-bg2 to-cw-bg3 opacity-80" />
                      <div className="relative z-10 flex flex-col items-center gap-1.5">
                        <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md group-hover/card:scale-105 transition-transform">
                          <PlayIcon size={16} className="fill-white ml-0.5" />
                        </div>
                        <div className="text-[10px] font-bold text-cw-txt tracking-wider opacity-60">
                          {item.videoTitle}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banner Graphic Card */}
                  {item.bannerColor && (
                    <div className={`my-1.5 h-8 rounded-lg ${item.bannerColor} opacity-90 flex items-center justify-between px-3 text-white text-[10px] font-bold tracking-wide shadow-sm`}>
                      <span>Codeward Autonomous Engine v2.4</span>
                      <SparklesIcon size={13} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 4. Bottom Summary & Nav Arrow Button */}
      <div className="mt-3 pt-2.5 border-t border-cw-bdr flex items-center justify-between gap-2">
        <div className="text-[10px] text-cw-txt3 font-medium">
          {remainingCount > 0 ? `+${remainingCount} more alerts available` : `Showing top ${displayedItems.length} notifications`}
        </div>
        <button
          type="button"
          onClick={() => {
            navigate('/dashboard/alerts');
            onClose();
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-cw-purple hover:text-cw-purple/80 hover:underline cursor-pointer transition-colors"
        >
          <span>Alerts Page</span>
          <ArrowRight01Icon size={12} />
        </button>
      </div>
    </div>
  );
}

function timeAgoShort(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

