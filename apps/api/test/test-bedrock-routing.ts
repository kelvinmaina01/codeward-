import assert from "node:assert/strict";
import { getRegionForBedrockModel, resolveBedrockModelCandidates, BedrockProvider } from "../src/providers/bedrock.provider.js";

async function testBedrockRegionMapping() {
  console.log("[TEST] 1. Verifying Bedrock model region mapping...");

  assert.equal(getRegionForBedrockModel('us.anthropic.claude-3-5-haiku-20241022-v1:0'), 'us-east-1', "us. models must route to us-east-1");
  assert.equal(getRegionForBedrockModel('us.anthropic.claude-3-5-sonnet-20241022-v2:0'), 'us-east-1', "us. models must route to us-east-1");
  assert.equal(getRegionForBedrockModel('eu.anthropic.claude-3-5-haiku-20241022-v1:0'), 'eu-central-1', "eu. models must route to eu-central-1");
  assert.equal(getRegionForBedrockModel('eu.anthropic.claude-3-5-sonnet-20241022-v2:0'), 'eu-central-1', "eu. models must route to eu-central-1");
  assert.equal(getRegionForBedrockModel('apac.anthropic.claude-3-5-sonnet-20241022-v2:0'), 'ap-southeast-1', "apac. models must route to ap-southeast-1");
  assert.equal(getRegionForBedrockModel('anthropic.claude-3-5-haiku-20241022-v1:0'), 'us-east-1', "non-prefixed models default to us-east-1");

  console.log("  ✅ Region mapping verified.");
}

async function testBedrockCandidatesResolution() {
  console.log("[TEST] 2. Verifying Bedrock candidate generation under Stockholm eu-north-1 env...");

  const oldBedrockRegion = process.env.BEDROCK_REGION;
  const oldAwsRegion = process.env.AWS_REGION;

  try {
    process.env.BEDROCK_REGION = 'eu-north-1';
    process.env.AWS_REGION = 'eu-north-1';

    const mechCandidates = resolveBedrockModelCandidates('gpt-4o-mini');
    console.log("  Mechanical candidates in eu-north-1:", mechCandidates);
    assert.ok(mechCandidates.length >= 2, "Should provide multi-region candidates");
    assert.ok(mechCandidates.some(c => c.startsWith('us.')), "Must include us. candidates");
    assert.ok(mechCandidates.some(c => c.startsWith('eu.')), "Must include eu. candidates");

    const synthCandidates = resolveBedrockModelCandidates('gpt-4o');
    console.log("  Synthesis candidates in eu-north-1:", synthCandidates);
    assert.ok(synthCandidates.length >= 2, "Should provide multi-region synthesis candidates");
    assert.ok(synthCandidates.some(c => c.startsWith('us.')), "Must include us. candidates");
    assert.ok(synthCandidates.some(c => c.startsWith('eu.')), "Must include eu. candidates");

    console.log("  ✅ Candidate generation in eu-north-1 verified.");
  } finally {
    process.env.BEDROCK_REGION = oldBedrockRegion;
    process.env.AWS_REGION = oldAwsRegion;
  }
}

async function testBedrockProviderInitialization() {
  console.log("[TEST] 3. Verifying BedrockProvider construction without eu-north-1 trap...");

  const oldBedrockRegion = process.env.BEDROCK_REGION;
  const oldAwsRegion = process.env.AWS_REGION;

  try {
    process.env.BEDROCK_REGION = 'eu-north-1';
    process.env.AWS_REGION = 'eu-north-1';

    const provider = new BedrockProvider();
    assert.equal(provider.id, 'bedrock');

    console.log("  ✅ BedrockProvider constructed successfully.");
  } finally {
    process.env.BEDROCK_REGION = oldBedrockRegion;
    process.env.AWS_REGION = oldAwsRegion;
  }
}

async function main() {
  console.log("====================================================");
  console.log("Running Bedrock Multi-Region Routing Test Suite");
  console.log("====================================================");

  await testBedrockRegionMapping();
  await testBedrockCandidatesResolution();
  await testBedrockProviderInitialization();

  console.log("\n====================================================");
  console.log("PASS: All Bedrock multi-region routing tests passed! 🎯");
  console.log("====================================================\n");
}

main().catch((err) => {
  console.error("FAIL: Bedrock test failed:", err);
  process.exit(1);
});
