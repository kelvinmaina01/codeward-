import * as React from 'react';
import { brandColors } from '../BrandEmailLayout.js';

export const LINKEDIN_FALLBACK_LOGO = 'https://media.licdn.com/dms/image/v2/D4D0BAQH7XEDqB8WKRA/company-logo_100_100/B4DaA1ZClrHcAI-/0/1787602152009/get_codeward_logo?e=1790812800&v=beta&t=iIJXcjGUeuGO5PQd39N8khid7gYZJm5FBrQKnP9HgD0';
export const PRIMARY_LOGO_URL = 'https://raw.githubusercontent.com/kelvinmaina01/codeward-/main/apps/web/public/codeward-logo.png';

interface BrandHeaderProps {
  headline: string;
  subtitle?: string;
  heroStat?: {
    value: string | number;
    label: string;
    valueColor?: string;
    labelColor?: string;
  };
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  headline,
  subtitle,
  heroStat,
}) => {
  return (
    <div style={headerContainer}>
      {/* 1. Centered Brand Logo with LinkedIn Fallback */}
      <div style={logoWrapper}>
        <img
          src={PRIMARY_LOGO_URL}
          data-fallback-src={LINKEDIN_FALLBACK_LOGO}
          alt="Codeward"
          height="34"
          style={logoImg}
        />
      </div>

      {/* 2. Main Bold Headline (#020203) */}
      <h1 style={headlineStyle}>
        {headline}
      </h1>

      {/* 3. Subtitle / Context Metadata */}
      {subtitle && (
        <p style={subtitleStyle}>
          {subtitle}
        </p>
      )}

      {/* 4. Optional Hero Stat Block */}
      {heroStat && (
        <div style={heroStatContainer}>
          <div style={{ ...heroStatValue, color: heroStat.valueColor || brandColors.textPrimary }}>
            {heroStat.value}
          </div>
          <div style={{ ...heroStatLabel, color: heroStat.labelColor || brandColors.textSecondary }}>
            {heroStat.label}
          </div>
        </div>
      )}
    </div>
  );
};

const headerContainer: React.CSSProperties = {
  textAlign: 'center',
  margin: '0 auto 28px auto',
};

const logoWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
};

const logoImg: React.CSSProperties = {
  display: 'inline-block',
  border: '0',
  outline: 'none',
  textDecoration: 'none',
  verticalAlign: 'middle',
};

const headlineStyle: React.CSSProperties = {
  color: brandColors.textPrimary,
  fontSize: '23px',
  fontWeight: 800,
  lineHeight: '1.3',
  margin: '0 0 8px 0',
  letterSpacing: '-0.4px',
  textAlign: 'center',
};

const subtitleStyle: React.CSSProperties = {
  color: brandColors.textSecondary,
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const heroStatContainer: React.CSSProperties = {
  margin: '18px auto',
  textAlign: 'center',
};

const heroStatValue: React.CSSProperties = {
  fontSize: '40px',
  fontWeight: 900,
  lineHeight: '1.1',
  letterSpacing: '-1px',
};

const heroStatLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  marginTop: '4px',
};

export default BrandHeader;
