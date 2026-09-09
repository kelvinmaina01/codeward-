/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CODEWARD FRONTEND COMPONENT BARREL EXPORT
 * ─────────────────────────────────────────────────────────────────────────────
 * Central export index for all shared UI primitives, drawers, modals, and
 * widgets. Also re-exports pages for backwards compatibility.
 */

// Types
export * from './types.js';

// Drawers
export { TeamDrawer } from './drawers/TeamDrawer.js';
export { InviteDrawer } from './drawers/InviteDrawer.js';
export { HelpDrawer } from './drawers/HelpDrawer.js';
export { McpConnectionDrawer } from './drawers/McpConnectionDrawer.js';
export { ConnectorRequestDrawer } from './drawers/ConnectorRequestDrawer.js';
export { IntegrationSettingsDrawer } from './drawers/IntegrationSettingsDrawer.js';

// Modals & Popovers
export { DeleteAccountDialog } from './modals/DeleteAccountDialog.js';
export { CookieConsent } from './modals/CookieConsent.js';
export { UserProfilePopover } from './modals/UserProfilePopover.js';
export { NotificationsPopover } from './modals/NotificationsPopover.js';
export { WorkspaceSwitcher } from './modals/WorkspaceSwitcher.js';

// Shared Widgets & Visuals
export { GordonIcon } from './shared/GordonIcon.js';
export { GordonAttachmentMenu } from './shared/GordonAttachmentMenu.js';
export { GithubLink, GithubIcon, GitlabIcon, PlatformIcon, githubFileUrl, extractFilePaths } from './shared/GithubLink.js';
export { RepoSelector } from './shared/RepoSelector.js';
export { LinkProvider } from './shared/LinkProvider.js';
export { ProviderSettingsForm, ProviderSettingsForms } from './shared/ProviderSettingsForms.js';
export { DiffViewer } from './shared/DiffViewer.js';
export { ReportPDF } from './shared/ReportPDF.js';
export { FloatingStreamWidget } from './shared/FloatingStreamWidget.js';
export { AgentCanvas } from './shared/AgentCanvas.js';
export { ArchitectureFlow } from './shared/ArchitectureFlow.js';

// Legal Pages
export { LegalPage } from './legal/LegalPage.js';
export { termsContent } from './legal/TermsContent.js';
export { privacyContent } from './legal/PrivacyContent.js';
export { trustContent } from './legal/TrustContent.js';

// Pages: Marketing
export { default as CodewardHero, LandingHero } from '../pages/marketing/LandingHero.js';
export { LandingHeader } from '../pages/marketing/LandingHeader.js';
export { LandingFooter } from '../pages/marketing/LandingFooter.js';
export { default as PricingPage } from '../pages/marketing/PricingPage.js';
export { BlogsPage } from '../pages/marketing/BlogsPage.js';
export { SingleBlogPage } from '../pages/marketing/SingleBlogPage.js';
export { ComparePage } from '../pages/marketing/ComparePage.js';
export { BookDemo } from '../pages/marketing/BookDemo.js';
export { FooterTrustBadges } from './shared/FooterTrustBadges.js';
export { NewsletterForm } from '../pages/marketing/NewsletterForm.js';
export { ParticleBackground } from '../pages/marketing/ParticleBackground.js';

// Pages: Auth
export { AuthPage } from '../pages/auth/AuthPage.js';
export { ConnectRepo } from '../pages/auth/ConnectRepo.js';
export { InviteAcceptPage } from '../pages/auth/InviteAcceptPage.js';

// Pages: Dashboard
export { Dashboard } from '../pages/dashboard/Dashboard.js';
export { LiveFeed } from '../pages/dashboard/LiveFeed.js';
export { DebtReport } from '../pages/dashboard/DebtReport.js';
export { CommitHistory } from '../pages/dashboard/CommitHistory.js';
export { DeployHistory } from '../pages/dashboard/DeployHistory.js';
export { IssuesAndPRs } from '../pages/dashboard/IssuesAndPRs.js';
export { RunDetail } from '../pages/dashboard/RunDetail.js';
export { Security } from '../pages/dashboard/Security.js';
export { AIAgent } from '../pages/dashboard/AIAgent.js';
export { Staging } from '../pages/dashboard/Staging.js';
export { Settings } from '../pages/dashboard/Settings.js';
export { Repositories } from '../pages/dashboard/Repositories.js';
export { Certificate } from '../pages/dashboard/Certificate.js';
export { Integrations } from '../pages/dashboard/Integrations.js';
export { Alerts } from '../pages/dashboard/Alerts.js';

// Pages: Admin Portal
export { AdminLayout } from '../admin/AdminLayout.js';
export { AdminOverview } from '../admin/AdminOverview.js';
export { AdminFeed } from '../admin/AdminFeed.js';
export { AdminRuns } from '../admin/AdminRuns.js';
export { AdminRepos } from '../admin/AdminRepos.js';
export { AdminSecurity } from '../admin/AdminSecurity.js';
export { AdminBloat } from '../admin/AdminBloat.js';
export { AdminBroken } from '../admin/AdminBroken.js';
export { AdminArchitecture } from '../admin/AdminArchitecture.js';
export { AdminCompliance } from '../admin/AdminCompliance.js';
export { AdminAgents } from '../admin/AdminAgents.js';
export { AdminRevenue } from '../admin/AdminRevenue.js';
export { AdminCustomers } from '../admin/AdminCustomers.js';
export { AdminGrowth } from '../admin/AdminGrowth.js';
export { AdminBilling } from '../admin/AdminBilling.js';
export { AdminSandbox } from '../admin/AdminSandbox.js';
export { AdminGitHubApp } from '../admin/AdminGitHubApp.js';
export { AdminAlerts } from '../admin/AdminAlerts.js';
export { AdminSettings } from '../admin/AdminSettings.js';
