import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Layout } from './Layout.js';

interface AccountDeletionEmailProps {
  userName: string;
  dataSummary: Record<string, number>;
}

export const AccountDeletionEmail = ({
  userName,
  dataSummary,
}: AccountDeletionEmailProps) => {
  return (
    <Layout previewText="Your Codeward account deletion has been queued">
      <Heading style={h1}>Account Deletion Queued</Heading>
      <Text style={text}>Hi {userName},</Text>
      <Text style={text}>
        We have received your request to delete your Codeward account. Your data has been successfully queued for permanent removal.
      </Text>
      
      <Section style={summaryContainer}>
        <Heading as="h3" style={h3}>Data Summary</Heading>
        <Text style={text}>Here is a summary of the data associated with your account that will be permanently removed:</Text>
        <ul>
          {Object.entries(dataSummary).map(([key, value]) => (
            <li key={key} style={listItem}>
              <strong>{key}:</strong> {value}
            </li>
          ))}
        </ul>
      </Section>

      <Text style={text}>
        This action is irreversible. If you did not request this, please reply to this email immediately.
      </Text>
      <Text style={text}>
        Thank you for trying Codeward. We hope to see you again in the future!
      </Text>
    </Layout>
  );
};

export default AccountDeletionEmail;

const h1 = {
  color: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
};

const h3 = {
  color: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '28px',
  margin: '0 0 10px',
};

const text = {
  color: '#a1a1aa', // Zinc 400
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const listItem = {
  ...text,
  margin: '0 0 8px',
};

const summaryContainer = {
  backgroundColor: '#18181b', // Zinc 900
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #27272a', // Zinc 800
};
