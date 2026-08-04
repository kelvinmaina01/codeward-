import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
      description: 'These cookies are required for the website to function and cannot be switched off.',
      required: true,
      enabled: true,
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.',
      required: false,
      enabled: false,
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'These cookies may be set through our site by our advertising partners to build a profile of your interests.',
      required: false,
      enabled: false,
    },
  ]);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const save = (level: ConsentLevel) => {
    try {
      localStorage.setItem(STORAGE_KEY, level);
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
      <div className="fixed inset-0 bg-black/20 z-[9998] pointer-events-none" />

      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 flex justify-center items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Cookie consent"
      >
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden text-[#1e1b4b] flex flex-col font-sans">
          <div className="p-6 md:p-8">
            {/* Header Area */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#2dd4bf] rounded-full flex items-center justify-center shrink-0 relative overflow-hidden">
                {/* Custom Cookie SVG graphic matching the screenshot */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.2307 21.913 10.4813 21.75 9.76135C21.3644 9.91741 20.9427 10 20.5 10C18.567 10 17 8.433 17 6.5C17 5.62608 17.321 4.82729 17.8427 4.20579C16.1472 2.8091 14.1595 2 12 2Z" fill="#14b8a6"/>
                  <circle cx="7.5" cy="10.5" r="1.5" fill="#0f766e" opacity="0.5"/>
                  <circle cx="10.5" cy="15.5" r="1.5" fill="#0f766e" opacity="0.5"/>
                  <circle cx="15.5" cy="12.5" r="1" fill="#0f766e" opacity="0.5"/>
                  <circle cx="12" cy="7" r="1" fill="#0f766e" opacity="0.5"/>
                </svg>
                {/* Bite cut out using a pseudo element overlay if needed, but SVG does it */}
              </div>
              <h2 className="text-[#1e1b4b] font-bold text-2xl md:text-[28px] m-0">
                We are using cookies
              </h2>
            </div>
            
            {/* Content Text */}
            <p className="text-[#312e81] text-[15px] leading-relaxed mb-6 font-medium">
              We use cookies to personalise content and ads, to provide social media features and to analyse our traffic. We also share information about your use of our site with our social media, advertising and analytics partners who may combine it with other information that you've provided to them or that they've collected from your use of their services.
            </p>

            {/* Customization Details */}
            {showCustomize && (
              <div className="mb-6 rounded-lg border border-[#e0e7ff] overflow-hidden bg-[#f8fafc]">
                {categories.map((cat, i) => (
                  <div key={cat.id} className={i > 0 ? 'border-t border-[#e0e7ff]' : ''}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f1f5f9] transition-colors"
                      onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[#1e1b4b] text-[14px] font-bold">{cat.name}</span>
                        {cat.required && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${cat.required ? 'bg-[#312e81] opacity-50' : cat.enabled ? 'bg-[#312e81]' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${cat.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        {expandedCategory === cat.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {expandedCategory === cat.id && (
                      <div className="px-4 pb-4 pt-1 text-[13px] text-[#4338ca]">
                        {cat.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2">
              <button
                onClick={handleNecessary}
                className="flex-1 py-3 px-4 rounded border border-[#c7d2fe] bg-white text-[#312e81] font-semibold text-[15px] hover:bg-[#f8fafc] transition-colors"
              >
                Use necessary
              </button>
              
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className="flex-1 py-3 px-4 rounded border border-[#c7d2fe] bg-white text-[#312e81] font-semibold text-[15px] hover:bg-[#f8fafc] transition-colors"
              >
                {showCustomize ? 'Hide customize' : 'Customize'}
              </button>

              <button
                onClick={showCustomize ? handleSaveCustom : handleAllowAll}
                className="flex-1 py-3 px-4 rounded bg-[#231f40] text-white font-semibold text-[15px] hover:bg-[#1e1b4b] transition-colors"
              >
                {showCustomize ? 'Save preferences' : 'Allow all cookies'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
