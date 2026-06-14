import * as React from 'react';
import { Button, Heading, Text, Container } from '@react-email/components';
import { Layout, colors } from './Layout.js';

interface WelcomeVerificationEmailProps {
  userName: string;
  verificationLink: string;
}

export const WelcomeVerificationEmail: React.FC<WelcomeVerificationEmailProps> = ({
  userName,
  verificationLink,
}) => {
  return (
    <Layout previewText={`Welcome to Codeward, ${userName}!`}>
      <Heading style={heading}>Welcome to Codeward 🛡️</Heading>
      
      <Text style={text}>
        Hi {userName},
      </Text>
      
      <Text style={text}>
        Thanks for joining Codeward. You are now seconds away from connecting your first repository and unleashing the AI execution engine on your pull requests.
      </Text>

      <Text style={text}>
        To get started, please verify your email address by clicking the button below:
      </Text>

      <Button href={verificationLink} style={button}>
        Verify Email Address
      </Button>
      
      <Text style={subtext}>
        If you didn't request this email, you can safely ignore it.
      </Text>
    </Layout>
  );
};

export default WelcomeVerificationEmail;

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: colors.blue, // Blue for neutral/info
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const text = {
  fontSize: '16px',
  color: colors.cream,
  lineHeight: '24px',
  marginBottom: '20px',
};

const subtext = {
  fontSize: '14px',
  color: colors.textMuted,
  textAlign: 'center' as const,
  marginTop: '24px',
};

const button = {
  backgroundColor: colors.blue,
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px 0',
};
