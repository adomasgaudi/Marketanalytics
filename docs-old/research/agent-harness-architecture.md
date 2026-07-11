# Research — agent-harness architecture

> v91.8. Researched 2026-07-11 via `keyword-research`.
> Question: beyond "context management," what is the accepted anatomy and file
> structure of an AI agent harness: skills, hooks, rules, instructions,
> commands, prompts, memory, tools, state, and verification?

## Short verdict

The strongest term is **harness**, not "skills." A skill is one vendor's package
format for a reusable capability. The wider field describes the thing around the
model as a **model-harness-environment system**, **agent-computer interface**,
**orchestration runtime**, **tool/action interface**, **memory/state layer**,
**permission boundary**, and **verification/observability layer**.

For a repo, the recommended structure is not one mega instruction file. It is a
thin **agent guide** plus explicit runtime directories:

```text
AGENTS.md / CLAUDE.md          # short orientation + non-negotiable rules
.agent/
  manifest.json                # capabilities, tools, commands, gates
  prompts/                     # reusable prompt templates / workflows
  rules/                       # scoped policy and conventions
  commands/                    # deterministic task entrypoints
  hooks/                       # enforced checks and automatic reminders
  memory/                      # stable project knowledge
  state/                       # current task state, resumable episodes
  evals/                       # requirement checks and verification reports
  traces/                      # logs, interventions, tool/context evidence
```

Names can vary, but these responsibilities should be separate because they have
different lifecycles and authority levels.

## Expert vocabulary surfaced

- **Agent-oriented programming** / **agent-oriented software engineering**
- **Model-harness-environment system**
- **AI harness engineering**
- **Agent-computer interface (ACI)** and **agent-observation interface (AOI)**
- **Orchestration runtime**, **state graph**, **durable execution**
- **Tool/action interface**, **tool registry**, **capability negotiation**
- **Project memory**, **task state**, **context manager**
- **Permission boundary**, **approval gate**, **intervention record**
- **Verification protocol**, **observability layer**, **trace-based evaluation**
- **Agent card**, **agent discovery**, **handoffs**
- **Prompt templates/workflows**, **resources**, **tools**
- **Stateless reducer**, **execution state/business state**

## Per-source findings

### 1. Yoav Shoham — agent-oriented programming — Grade A

Shoham introduced **agent-oriented programming** in the early 1990s. The older
agent literature matters because it gives the root abstraction: the basic unit
is an **agent**, not an object; agents have identity, state, messages, and
autonomy. Modern LLM agents inherit the language but replace symbolic mental
state with model calls, tool loops, memory stores, and runtime scaffolds.

Prescription: do not define the harness as "a prompt." Define it as the software
architecture that lets an autonomous actor perceive, decide, act, communicate,
and maintain state.

Source: <https://en.wikipedia.org/wiki/Agent-oriented_programming>

### 2. SWE-agent — Agent-Computer Interface — Grade A

SWE-agent's key contribution is the **Agent-Computer Interface (ACI)**: agents
are a new class of end user and need interfaces designed for their capabilities,
not just human IDEs exposed through text. The ACI covers how an agent edits
files, navigates repos, runs tests, and observes command results.

Prescription: tools are not incidental. The action surface is architecture. A
coding harness needs first-class tool commands, repo navigation affordances,
edit affordances, test affordances, and feedback formatting.

Source: <https://arxiv.org/abs/2405.15793>

### 3. AI Harness Engineering — Grade A-

This 2026 paper gives the cleanest current anatomy. It defines the harness as
the **runtime substrate** between model and environment, and names eleven
responsibilities:

- task interface
- context manager
- tool registry
- project memory
- task state
- observability layer
- failure attribution
- verification protocol
- permission boundary
- entropy auditor
- intervention logger

It also separates harness from prompt, framework, ACI, operating system,
evaluation harness, and DevOps. Its H0-H3 ladder maps directly to file
structure:

- H0: task + repo files
- H1: tool/test registry + tool protocol
- H2: agent guide + architecture + testing guide + task state + known failures
- H3: deterministic checks + reproduction protocol + failure attribution +
  verification protocol + verification report template

Prescription: structure the repo's AI support files by **runtime responsibility**
and **evidence artifact**, not by vendor brand names.

Source: <https://arxiv.org/abs/2605.13357>

### 4. MCP — Model Context Protocol — Grade A

MCP supplies the best standardized primitive vocabulary for connecting agents to
external context and actions:

- **Host**: container/coordinator that enforces permissions and aggregates context
- **Client**: isolated connection/session to one server
- **Server**: focused provider of capabilities
- **Resources**: data/context
- **Tools**: executable functions/actions
- **Prompts**: reusable templates/workflows
- **Roots**: filesystem boundaries
- **Sampling**: server-requested model calls
- **Elicitation**: structured requests for more user input

Prescription: model "tools/resources/prompts" as distinct artifacts. Do not mix
data, actions, and reusable workflows in one instruction pile.

Source: <https://modelcontextprotocol.io/specification/2025-06-18>

### 5. LangGraph — orchestration runtime / state graph — Grade A/B

LangGraph's production structure is useful because it is file-structure concrete:

```text
my_agent/
  utils/
    tools.py
    nodes.py
    state.py
  agent.py
.env
pyproject.toml / requirements.txt
langgraph.json
```

Its vocabulary: **graphs**, **nodes**, **state**, **tools**, **persistence**,
**checkpointers**, **stores**, **interrupts**, **time travel**, **subgraphs**,
and **observability**.

Prescription: keep agent construction, tool implementations, node functions,
and state definitions separate. The equivalent for markdown/file-based harnesses
is: guide, tools, commands, rules, memory, state, traces, evals.

Sources:
- <https://docs.langchain.com/oss/python/langgraph/overview>
- <https://docs.langchain.com/oss/python/langgraph/application-structure>

### 6. HumanLayer 12-factor agents — Grade B

Dex Horthy's 12-factor agents are practitioner guidance, not a standard, but the
terms are sharp:

- own your prompts
- own your context window
- tools are structured outputs
- unify execution state and business state
- launch/pause/resume with simple APIs
- contact humans with tool calls
- own your control flow
- compact errors into context
- small focused agents
- trigger from anywhere
- make your agent a stateless reducer

Prescription: production agents are mostly software with LLM decisions at key
points. Prefer deterministic code, explicit state, and resumable APIs over a
"bag of tools plus prompt loop."

Source: <https://github.com/humanlayer/12-factor-agents>

### 7. Anthropic "Building Effective Agents" — Grade A

This source gives the pattern language: **prompt chaining**, **routing**,
**parallelization**, **orchestrator-workers**, **evaluator-optimizer**, and
**agents**. It distinguishes workflows, where paths are more predefined, from
agents, where the model plans and acts in an open-ended loop.

Prescription: use agentic structure only when simpler workflows are insufficient.
When you do use it, ground each step in environment feedback, tool results,
stopping conditions, sandboxing, and guardrails.

Source: <https://www.anthropic.com/engineering/building-effective-agents>

### 8. OpenAI Swarm — agents and handoffs — Grade A/B

Swarm is now superseded by OpenAI Agents SDK, but the primitives are clean:
**Agent = instructions + tools**, and agents can perform **handoffs**. Its loop:
model completion, execute tool calls, switch agent if needed, update context
variables, stop when no function calls remain.

Prescription: "commands" and "skills" are not the core primitives. The durable
core is agent identity, instructions, tools/functions, context variables,
handoffs, and loop control.

Source: <https://github.com/openai/swarm>

### 9. A2A — Agent2Agent protocol — Grade A

A2A's vocabulary is useful for multi-agent boundaries:

- **Agent Card** for discovery
- **Agent Skill** for declared capability
- **Task**, **TaskStatus**, **TaskState**
- **Message**, **Part**, **Artifact**
- streaming events and push notifications
- authentication and authorization

Prescription: when agents coordinate, publish capabilities and task state as
structured metadata. Do not rely on another agent reading your whole memory.



Source: <https://a2a-protocol.org/latest/specification/>
































