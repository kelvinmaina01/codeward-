import { triggerComprehensiveAudit } from './apps/api/src/agents/audit-trigger.js';
triggerComprehensiveAudit(39, 'S4v3easy/AegisCode_v1.1.2').then(() => {
  console.log("Triggered!");
  process.exit(0);
});
