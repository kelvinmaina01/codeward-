# Full Agent Sandbox Execution & Failure Documentation

We successfully implemented the real `LocalExecSandbox` and wired it through the entire pipeline: Orchestrator -> Dispatcher -> Analyzers. The Orchestrator correctly spawned local `/tmp` repositories and used bash tools (`git clone`, `git diff`, `ls -R`) to read files.

However, during the stress testing against the live OpenAI API, we encountered several architectural failures inherent to LLM-driven loops. Below is a detailed documentation of these failures, why they occurred, and how we solved (or can solve) them. This documentation is critical for when we switch to Anthropic models (Claude) in the future.

## 1. The `maxSteps` Limit Exceeded
**Issue**: The Orchestrator ran out of loop iterations before submitting its decision, causing Zod schema errors (`Error: Phase 1 Orchestrator failed to call submit_phase1_result`).
**Root Cause**: In `agent-loop.ts`, `maxSteps` was hardcoded to `5`. When an agent begins exploring a repository with native tools (e.g. running `ls`, then `cat file.ts`, then `git log`), it easily consumes 5 steps just gathering context. If it hits the limit, the loop forcefully exits before the LLM can call the final `submit_report` tool.
**The Fix**: I increased the default `maxSteps` to `15` in `agent-loop.ts`. 
**Future Consideration (Anthropic)**: When switching to Anthropic, if an agent hits the max steps, we must catch this and append a system instruction: *"You have reached the maximum allowed steps. You MUST call submit_report immediately based on what you have."*

## 2. Multi-turn `tool_calls` Strictness
**Issue**: The OpenAI API would intermittently fail or ignore tool results during exploration.
**Root Cause**: OpenAI has an extremely strict schema for returning tool execution outputs. Initially, `agent-loop.ts` was returning tool results as `role: "system"` messages. This confused the LLM. If an assistant message contains `tool_calls`, the very next messages **must** be `role: "tool"` with matching `tool_call_id`s. 
**The Fix**: I rewrote the loop in `agent-loop.ts` to strictly pass the raw assistant object (`result.rawContent`) and map the execution responses into proper `{ role: "tool", tool_call_id: id }` messages.
**Future Consideration (Anthropic)**: Claude handles tool results slightly differently (`tool_result` blocks). We will need an `AnthropicProvider` wrapper that properly formats the assistant's `tool_use` blocks and returns `tool_result` blocks.

## 3. Network Hangs & Fetch Timeouts
**Issue**: The background stress test occasionally hung indefinitely at `-> Calling OpenAI API...` without ever resolving or throwing an error.
**Root Cause**: The raw `fetch` request in `NativeOpenAIProvider` (`openai.provider.ts`) does not have a timeout configured. If the OpenAI API hangs (which is common for long context windows), the Node.js process waits forever.
**Future Fix**: We need to implement an `AbortController` in `NativeOpenAIProvider` (and future `AnthropicProvider`) with a 60-second timeout, combined with an exponential backoff retry loop (e.g., using `p-retry`), to handle network congestion gracefully.

## 4. `ZodError: received: undefined` (Tool Interception Conflict)
**Issue**: The application crashed during parsing because `phase1Result` was mysteriously `undefined` even though tools were called.
**Root Cause**: In our test harness (`test-lawlify.ts`), we were using `.map()` to override the `execute` method of **all** tools to intercept the final result. As a result, when the Orchestrator called `execute_shell_command`, our mock intercepted it and overwrote `phase1Result` with the shell arguments! 
**The Fix**: I updated the interception logic to explicitly only intercept the terminal tools (`submit_phase1_result` and `submit_orchestrator_decision`).

## 5. Fallow API Integration Stub
**Issue**: The Bloat agent's skills define massive analysis reliance on the Rust `Fallow` AST engine (`run_fallow_dead_code`, etc.), but the engine isn't wired.
**Next Step**: To realize the sub-second analysis promised in the Phase 2 Blueprint, we must either compile and package the Fallow CLI so the Sandbox can execute it, or create a mock Fallow endpoint that returns structured AST data for the agents.

## 6. Fly.io Machines vs Local Sandbox
**Note**: We built `LocalExecSandbox` to rapidly test the agent loop logic locally without dealing with API latency and provisioning overhead. Because the agents use the abstract `SandboxHandle` interface, migrating to Fly.io Machines in production will only require writing a `FlyMachineSandbox` adapter that calls the Fly.io API. No agent logic will need to change.
