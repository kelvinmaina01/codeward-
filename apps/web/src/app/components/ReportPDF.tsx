import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 80, // Space for the fixed footer
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  logo: {
    width: 140,
  },
  headerText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 20,
  },
  table: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    borderRadius: 4,
  },
  tableCol: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableColLast: {
    flex: 1,
    padding: 10,
  },
  tableHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  tableValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textCritical: { color: '#ef4444' },
  textHigh: { color: '#f59e0b' },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6', // Codeward purple
  },
  findingContainer: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  findingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 6,
  },
  bgCritical: { backgroundColor: '#fef2f2', color: '#ef4444' },
  bgHigh: { backgroundColor: '#fffbeb', color: '#f59e0b' },
  bgInfo: { backgroundColor: '#eff6ff', color: '#3b82f6' },
  findingTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  findingRepo: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Courier',
  },
  findingDesc: {
    fontSize: 10,
    color: '#334155',
    marginTop: 6,
    lineHeight: 1.4,
  },
  findingSuggested: {
    fontSize: 10,
    color: '#059669',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
  },
  footerLeftText: {
    fontSize: 9,
    color: '#475569',
    width: '35%',
    lineHeight: 1.4,
  },
  footerBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '45%',
    flexWrap: 'wrap',
  },
  badgeText: {
    fontSize: 7,
    color: '#0f172a',
    marginHorizontal: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  footerRightText: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  }
});

const getSevStyle = (sev: string) => {
  if (sev === 'CRITICAL') return styles.bgCritical;
  if (sev === 'HIGH') return styles.bgHigh;
  return styles.bgInfo;
};

export const ReportPDF = ({ findings, fixesOpened, categories }: { findings: any[], fixesOpened: number, categories: any[] }) => {
  const now = new Date().toISOString().slice(0, 10);
  const totalFindings = findings.length;
  const critical = findings.filter(f => f.severity === 'CRITICAL').length;
  const high = findings.filter(f => f.severity === 'HIGH').length;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Image src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" style={styles.logo} />
          <Text style={styles.headerText}>Generated on {now}</Text>
        </View>

        <Text style={styles.title}>Codeward Technical Debt Report</Text>
        <Text style={styles.subtitle}>{totalFindings} open high-priority items · {fixesOpened} auto-fix PR(s) opened</Text>

        <View style={styles.table}>
          <View style={styles.tableCol}>
            <Text style={styles.tableHeader}>TOTAL DEBT</Text>
            <Text style={styles.tableValue}>{totalFindings}</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableHeader}>CRITICAL</Text>
            <Text style={[styles.tableValue, styles.textCritical]}>{critical}</Text>
          </View>
          <View style={styles.tableColLast}>
            <Text style={styles.tableHeader}>HIGH</Text>
            <Text style={[styles.tableValue, styles.textHigh]}>{high}</Text>
          </View>
        </View>

        {categories.map(cat => {
          const items = findings.filter(f => f.source === cat.key);
          if (items.length === 0) return null;
          
          return (
            <View key={cat.key} wrap={false}>
              <Text style={styles.categoryTitle}>{cat.label} ({items.length})</Text>
              {items.map(f => (
                <View key={f.id} style={styles.findingContainer} wrap={false}>
                  <View style={styles.findingTitleRow}>
                    <Text style={[styles.severityBadge, getSevStyle(f.severity)]}>{f.severity}</Text>
                    <Text style={styles.findingTitle}>{f.title}</Text>
                  </View>
                  <Text style={styles.findingRepo}>
                    {f.repo} {f.file ? `· ${f.file}${f.line != null ? `:${f.line}` : ''}` : ''}
                  </Text>
                  <Text style={styles.findingDesc}>{f.description}</Text>
                  {f.suggestedFix && (
                    <Text style={styles.findingSuggested}>Suggested fix: {f.suggestedFix}</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text style={styles.footerLeftText}>
            Codeward builds, tests, and optimizes your codebase. Automatically.
          </Text>
          <View style={styles.footerBadges}>
            <Text style={styles.badgeText}>🛡 ISO 27001 Certified</Text>
            <Text style={styles.badgeText}>🔒 GDPR Compliant</Text>
            <Text style={styles.badgeText}>🛡 CCPA Compliant</Text>
            <Text style={styles.badgeText}>⚕ HIPAA Compliant</Text>
            <Text style={styles.badgeText}>🔐 256-bit SSL Encrypted</Text>
            <Text style={styles.badgeText}>✓ 99% Accuracy</Text>
          </View>
          <Text style={styles.footerRightText}>
            → hello@codeward.cloud
          </Text>
        </View>
      </Page>
    </Document>
  );
};
