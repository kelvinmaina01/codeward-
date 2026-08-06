import { useState, useEffect } from 'react';
import {
  Download, Share2, Globe, Printer, ChevronRight, CheckCircle2,
  TrendingDown, Activity, ShieldAlert, Zap, LayoutTemplate, FileText,
  X, Bot, ArrowRight, Shield, Cpu, MessageSquare, GitPullRequest,
  AlertTriangle, Wrench, BarChart3, BookOpen, FlaskConical, Eye, Bell, Sparkles
} from 'lucide-react';
import { API_URL } from '../../lib/api';
import { RepoSelector } from './RepoSelector';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tagline: string;
  status: 'active' | 'idle' | 'warning';
  stats: { label: string; value: string; color?: string }[];
  findings: { severity: 'critical' | 'high' | 'medium' | 'low' | 'pass'; title: string; detail: string }[];
  actions: string[];
  score: number;
}

export function Certificate() {
  const [notified, setNotified] = useState(false);

  const handleGetNotified = () => {
    setNotified(true);
    toast.success("You'll be notified as soon as Health Certificates launch! 🚀", {
      description: "We've added your account to the priority updates list.",
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-cw-bg">
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-xl w-full bg-cw-bg2 border border-cw-purple/30 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cw-purple/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cw-blue/20 rounded-full blur-3xl pointer-events-none" />

          {/* Main Message */}
          <p className="text-cw-txt text-lg sm:text-xl font-medium mb-8 leading-relaxed">
            We are currently working on that feature! Our team is actively developing it and we'll have updates soon.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleGetNotified}
            disabled={notified}
            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer ${
              notified
                ? 'bg-cw-green/20 text-cw-green border border-cw-green/30 cursor-default'
                : 'bg-cw-purple hover:brightness-110 text-white shadow-cw-purple/25 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {notified ? (
              <>
                <CheckCircle2 size={18} /> You're on the list!
              </>
            ) : (
              <>
                <Bell size={18} /> Get notified
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


