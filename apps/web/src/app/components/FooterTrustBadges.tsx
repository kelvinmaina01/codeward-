import React from 'react';

interface FooterTrustBadgesProps {
  dark?: boolean;
  className?: string;
}

export function FooterTrustBadges({ dark = true, className = '' }: FooterTrustBadgesProps) {
  const iconColor = dark ? 'text-cw-purple' : 'text-slate-700';
  const titleColor = dark ? 'text-cw-txt font-bold' : 'text-slate-900 font-bold';
  const subtitleColor = dark ? 'text-cw-txt3 font-medium' : 'text-slate-600 font-medium';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 lg:gap-x-6 gap-y-2 ${className}`}>
      {/* 1. ISO 27001 Certified */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 2L3 8V18C3 27.5 9.4 36.3 18 38C26.6 36.3 33 27.5 33 18V8L18 2Z" stroke="currentColor" strokeWidth="2.2" fill="none"/>
          <circle cx="18" cy="18" r="8" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          <path d="M10 18H26M18 10C20 12.5 21 15 21 18C21 21 20 23.5 18 26C16 23.5 15 21 15 18C15 15 16 12.5 18 10Z" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="14" y="21" width="8" height="6" rx="1.5" fill="currentColor"/>
          <path d="M16 21V19.5C16 18.4 16.9 17.5 18 17.5C19.1 17.5 20 18.4 20 19.5V21" stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>ISO 27001</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Certified</div>
        </div>
      </div>

      {/* 2. GDPR Compliant */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 20 + 15 * Math.cos(rad);
            const cy = 20 + 15 * Math.sin(rad);
            return (
              <circle key={i} cx={cx} cy={cy} r="1.5" fill="currentColor" />
            );
          })}
          <rect x="15" y="19" width="10" height="9" rx="2" fill="currentColor"/>
          <path d="M17 19V16.5C17 14.8 18.3 13.5 20 13.5C21.7 13.5 23 14.8 23 16.5V19" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>GDPR</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Compliant</div>
        </div>
      </div>

      {/* 3. CCPA Compliant */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 5L24 8L22 18L30 30L26 35L18 32L12 24L8 16L10 5Z" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="13" y="16" width="10" height="8" rx="1.5" fill="currentColor"/>
          <path d="M15 16V14C15 12.3 16.3 11 18 11C19.7 11 21 12.3 21 14V16" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          <path d="M16 20L17.5 21.5L20 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>CCPA</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Compliant</div>
        </div>
      </div>

      {/* 4. HIPAA Compliant */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6V34M14 10C16 8 20 7 20 7C20 7 24 8 26 10M14 14C17 12 20 11 20 11C20 11 23 12 26 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="20" cy="5" r="2" fill="currentColor"/>
          <path d="M16 18C16 18 24 20 24 24C24 28 16 28 16 31" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <path d="M24 18C24 18 16 20 16 24C16 28 24 28 24 31" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>HIPAA</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Compliant</div>
        </div>
      </div>

      {/* 5. 256-bit SSL Encrypted */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="17" width="22" height="17" rx="3.5" stroke="currentColor" strokeWidth="2.2" fill="none"/>
          <path d="M12 17V12C12 8.7 14.7 6 18 6C21.3 6 24 8.7 24 12V17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          <text x="18" y="29" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="sans-serif">SSL</text>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>256-bit SSL</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Encrypted</div>
        </div>
      </div>

      {/* 6. 99% Accuracy Guarantee */}
      <div className="flex items-center gap-2">
        <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} shrink-0`} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" fill="none"/>
          <path d="M13 20L18 25L27 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="leading-tight text-left">
          <div className={`text-[11px] sm:text-[12px] ${titleColor} tracking-tight`}>99% Accuracy</div>
          <div className={`text-[9px] sm:text-[10px] ${subtitleColor}`}>Guarantee</div>
        </div>
      </div>
    </div>
  );
}
