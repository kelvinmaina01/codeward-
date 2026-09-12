import * as React from 'react';
import { brandColors } from '../BrandEmailLayout.js';

interface BrandButtonProps {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const BrandButton: React.FC<BrandButtonProps> = ({
  href,
  children,
  style,
}) => {
  return (
    <div style={buttonWrapper}>
      <a
        href={href}
        style={{
          ...pillButton,
          ...style,
        }}
      >
        {children}
      </a>
    </div>
  );
};

const buttonWrapper: React.CSSProperties = {
  textAlign: 'center',
  margin: '26px auto',
};

const pillButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: brandColors.ctaPillBg,   // #FCE2BA
  color: brandColors.ctaPillText,           // #040407
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: '1',
  textDecoration: 'none',
  textAlign: 'center',
  padding: '13px 32px',
  borderRadius: '9999px',
  border: '1px solid rgba(4, 4, 7, 0.16)',
  letterSpacing: '-0.2px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
};

export default BrandButton;
