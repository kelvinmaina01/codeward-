import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, Check } from 'lucide-react';
import { updateConsentPreferences } from '../../../lib/telemetry';

type ConsentLevel = 'necessary' | 'custom' | 'all';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

const STORAGE_KEY = 'codeward_cookie_consent';

function getStoredConsent(): ConsentLevel | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as ConsentLevel | null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CookieCategory[]>([
    {
      id: 'necessary',
      name: 'Strictly Necessary',
      description: 'These cookies are required for core website features, security, session management, and cannot be switched off.',
      required: true,
      enabled: true,
    },
    {
      id: 'analytics',
      name: 'Analytics & Performance',
      description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our platform.',
      required: false,
      enabled: false,
    },
    {
      id: 'marketing',
      name: 'Personalisation & Social Media',
      description: 'These cookies may be set by our advertising and social media partners to build a profile of your interests and show relevant content.',
      required: false,
      enabled: false,
    },
  ]);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const save = (level: ConsentLevel) => {
    try {
      const analyticsEnabled = categories.find(c => c.id === 'analytics')?.enabled || false;
      const marketingEnabled = categories.find(c => c.id === 'marketing')?.enabled || false;
      updateConsentPreferences(level, { 
        analytics: level === 'all' ? true : level === 'necessary' ? false : analyticsEnabled, 
        marketing: level === 'all' ? true : level === 'necessary' ? false : marketingEnabled 
      });
    } catch {}
    setVisible(false);
  };

  const handleNecessary = () => save('necessary');
  const handleAllowAll = () => save('all');
  const handleSaveCustom = () => save('custom');

  const toggleCategory = (id: string) => {
    if (id === 'necessary') return;
    setCategories(prev =>
      prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998] transition-opacity duration-300" />

      {/* Banner / Modal Container */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-5 md:p-6 flex justify-center items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Cookie consent"
      >
        <div className="w-full max-w-3xl bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden text-slate-900 flex flex-col font-sans animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 sm:p-8">
            {/* Header with Cookie Graphic */}
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-600">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.2307 21.913 10.4813 21.75 9.76135C21.3644 9.91741 20.9427 10 20.5 10C18.567 10 17 8.433 17 6.5C17 5.62608 17.321 4.82729 17.8427 4.20579C16.1472 2.8091 14.1595 2 12 2Z" fill="#F59E0B" />
                  <circle cx="7.5" cy="10.5" r="1.5" fill="#B45309" opacity="0.7"/>
                  <circle cx="10.5" cy="15.5" r="1.5" fill="#B45309" opacity="0.7"/>
                  <circle cx="15.5" cy="12.5" r="1" fill="#B45309" opacity="0.7"/>
                  <circle cx="12" cy="7" r="1" fill="#B45309" opacity="0.7"/>
                </svg>
              </div>
              <h2 className="text-slate-900 font-bold text-xl sm:text-2xl tracking-tight m-0">
                We are using cookies
              </h2>
            </div>
            
            {/* Description Text */}
            <p className="text-slate-600 text-sm sm:text-[14.5px] leading-relaxed mb-6 font-normal">
              We use cookies to personalise content and ads, to provide social media features and to analyse our traffic. We also share information about your use of our site with our social media, advertising and analytics partners who may combine it with other information that you've provided to them or that they've collected from your use of their services.
            </p>

            {/* Customization Accordion */}
            {showCustomize && (
              <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/80 divide-y divide-slate-200">
                {categories.map((cat) => (
                  <div key={cat.id} className="transition-colors">
                    <div
                      className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-100/70 select-none"
                      onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-900 text-sm font-semibold">{cat.name}</span>
                        {cat.required ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                            <ShieldCheck size={12} className="text-slate-600" />
                            Required
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-normal">
                            {cat.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3.5">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={cat.enabled}
                          disabled={cat.required}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleCategory(cat.id); 
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            cat.required 
                              ? 'bg-slate-400 cursor-not-allowed opacity-60' 
                              : cat.enabled 
                              ? 'bg-emerald-600' 
                              : 'bg-slate-300'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              cat.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <span className="text-slate-400">
                          {expandedCategory === cat.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>

                    {expandedCategory === cat.id && (
                      <div className="px-4 pb-3.5 pt-0.5 text-xs text-slate-500 leading-relaxed">
                        {cat.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleNecessary}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm cursor-pointer text-center"
              >
                Use necessary
              </button>
              
              <button
                type="button"
                onClick={() => setShowCustomize(!showCustomize)}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm cursor-pointer text-center"
              >
                {showCustomize ? 'Hide customize' : 'Customize'}
              </button>

              {showCustomize ? (
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-black active:scale-[0.99] transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  Save preferences
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleAllowAll}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-black active:scale-[0.99] transition-all shadow-sm cursor-pointer text-center"
              >
                Allow all cookies
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
