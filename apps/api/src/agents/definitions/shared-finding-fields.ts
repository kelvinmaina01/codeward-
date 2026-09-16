import { z } from 'zod';

/**
 * Finding fields shared by every agent that can put a finding in front of a developer.
 *
 * Kept in one place for exactly the reason REPORTING_DISCIPLINE lives in one place
 * (see shared-discipline.ts): when the same contract was written separately into each
 * agent it drifted, and agents ended up with materially different bars for what counted
 * as a finding. `security.agent.ts` already declared both of these; the other six agents
 * were taught the discipline in prose but given no field to express it in, so the policy
 * engine could only ever infer these axes rather than read them.
 *
 * Both are `.optional()` on purpose, matching the convention security.agent.ts established:
 * the policy engine (agents/policy/finding-policy.ts) is explicitly written to handle
 * absence — it derives confidence from evidence strength and exposure from category/path —
 * so an older agent, a different provider, or a model that omits the field stays valid and
 * degrades to today's behaviour instead of failing the tool call. The `.describe()` text is
 * what does the instructional work, because it is carried into the JSON Schema the model
 * actually sees at call time.
 */

/**
 * How certain the agent is that the issue is REAL — deliberately independent of how bad it
 * would be if it were. The policy engine treats a declared value as a ceiling and still caps
 * it by the evidence actually supplied, so this field can only ever lower trust, never
 * manufacture it. That asymmetry is why adding it is safe.
 */
export const CONFIDENCE_FIELD = z
  .enum(['HIGH', 'MEDIUM', 'LOW'])
  .optional()
  .describe(
    'How certain you are the issue IS REAL — not how bad it would be. These are different axes and must not be conflated. ' +
    'HIGH: you read the code or tool output that proves it. MEDIUM: the evidence is suggestive but you could not fully verify it. ' +
    'LOW: you are inferring. LOW-confidence findings are dropped by the backend, so do not dress one up — leave it out instead. ' +
    'Never raise severity to compensate for thin evidence; lower confidence instead.'
  );

/**
 * How reachable the issue is from an attacker's position. This is the axis that decides
 * whether a finding is worth STOPPING A MERGE over, as distinct from severity, which only
 * describes impact. Without it, the only way to stop blocking on an unreachable CVE was to
 * downgrade its severity, which deleted it from the report entirely.
 */
export const EXPOSURE_FIELD = z
  .enum(['DIRECT', 'TRANSITIVE'])
  .optional()
  .describe(
    'How reachable this is from THIS application. DIRECT: first-party code, or a production dependency you can name the importing file for. ' +
    'TRANSITIVE: a devDependency, build/test tooling, a nested dependency no first-party file imports, or something whose only location is a lockfile or node_modules path. ' +
    'DIRECT can block the merge; TRANSITIVE is reported as an advisory and never blocks. ' +
    'Keep severity honest either way — a transitive denial-of-service is still HIGH if that is its real impact. Do NOT downgrade severity to avoid blocking; set exposure instead.'
  );
