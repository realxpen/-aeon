# AEON — The Agent Economy, Human Controlled

AEON is a WebMCP-powered agent-commerce prototype built for the **OpenAI WebMCP Challenge**.

> **Let the agent do the work. Keep the decisions that matter with the human.**

AEON explores what a human-governed **agent economy** could look like: a user gives an AI agent a commerce mission, the agent searches, evaluates, negotiates and prepares the action, but consequential authority remains with the human.

---

## 🚀 Live Demo

**App:** https://aeon-swifnatechnologyltd.vercel.app/

**Direct mission page:** https://aeon-swifnatechnologyltd.vercel.app/mission/new

### Vercel access note

The current deployment is hosted on Vercel. If Vercel shows an authentication / deployment-protection screen before AEON opens, **sign in to Vercel and continue to the deployment**.

That screen is **Vercel deployment access**, not an AEON account or product login.

If the hosted deployment is unavailable, AEON can also be run locally using the instructions below.

---

# 👩‍⚖️ Judge Quick Start

You can understand the core AEON experience in about two minutes.

### 1. Open the mission page

Go to:

https://aeon-swifnatechnologyltd.vercel.app/mission/new

### 2. Try the main demo mission

Paste:

> **Find me a smartphone under ₦500,000. Get the best deal you can, but ask me before purchasing.**

AEON should interpret the goal, detect the ₦500,000 ceiling, understand that negotiation is allowed, and preserve the requirement for human approval.

### 3. Follow the agent journey

The main experience moves through:

**Search → Evaluate → Negotiate → Govern → Human Approval → Execute**

What to look for:

- **Search** — marketplace candidates are discovered.
- **Evaluate** — products are compared against the mission.
- **Negotiate** — AEON negotiates with seller agents when authorized.
- **Govern** — the proposed deal is checked against the active Constitution.
- **Human Approval** — AEON stops before the consequential action.
- **Execute** — execution authority is released only after approval.

> A seller accepting a negotiated deal is **not** the same thing as the human approving the purchase.

### 4. Inspect the recommendation

At the approval checkpoint, review the proposed product, negotiated price, savings, seller information and alternatives.

Approve or decline the proposal to see how AEON handles the human decision.

---

# 🧺 Try a Multi-Product Mission

AEON also handles missions that require a basket rather than one product.

Try:

> **Build me a content creation setup under ₦1,000,000, prioritizing performance and audio.**

AEON decomposes the request into multiple requirements, finds compatible products and builds a basket under one shared budget.

The basket can include a camera, microphone, lighting and support equipment. The user can inspect or remove individual products before approval.

---

# 🧠 Core Idea: Capability ≠ Authority

The central idea behind AEON is that an agent being **capable** of an action should not automatically mean it has **authority** to perform it.

For the smartphone mission, the active boundaries look conceptually like:

```text
Budget:       ₦500,000
Negotiation:  Authorized
Purchase:     Human approval required
```

AEON can search and negotiate inside those boundaries.

Even if it reaches a valid deal under the ceiling, it still stops when the Constitution says the purchase requires the human.

This is the principle behind the **Constitution Firewall**.

---

# 🔌 WebMCP

AEON exposes structured commerce capabilities through WebMCP rather than requiring an agent to infer every action from the visual interface.

The current WebMCP tools are:

| Tool | Purpose |
| --- | --- |
| `create_mission` | Create a commerce mission with a goal, budget and authority boundaries |
| `search_products` | Search the AEON marketplace and compose budget-aware candidates/baskets |
| `compare_products` | Rank marketplace candidates against mission priorities |
| `negotiate_offer` | Negotiate with seller agents while enforcing the active Constitution |
| `request_purchase_approval` | Stop before purchase and request an explicit human decision |

The WebMCP registration lives in [`src/webmcp.ts`](src/webmcp.ts).

AEON uses Chrome's current imperative API through:

```ts
document.modelContext.registerTool(...)
```

with a compatibility fallback for earlier preview builds.

---

# 🧪 How to Verify WebMCP

## Option A — ChatGPT in-app browser

Open the deployed AEON site in a WebMCP-capable ChatGPT browser and ask the agent to use the site's available tools for a commerce mission.

Example mission:

> **Find me a smartphone under ₦500,000. Get the best deal you can, but do not purchase anything without asking me first. Use AEON's site tools where appropriate. Stop when human approval is required and show me the proposed deal.**

## Option B — Google Chrome WebMCP testing

1. Use a Chrome build with WebMCP testing support.
2. Open:

```text
chrome://flags/#enable-webmcp-testing
```

3. Enable WebMCP testing and restart Chrome if required.
4. Open AEON.
5. Open **DevTools → Application → WebMCP**.
6. Check **Available Tools**.

You should see:

```text
compare_products
create_mission
negotiate_offer
request_purchase_approval
search_products
```

`Available Tools` confirms that Chrome discovered AEON's WebMCP capabilities.

---

# 🛡️ Human-Controlled Commerce

AEON separates four things that are often collapsed into one agent action:

```text
WebMCP capabilities  → what the application exposes
Mission              → what the user wants
Constitution         → what the agent is allowed to do
Human approval       → authority for consequential action
```

That separation allows AEON to be useful without giving the agent unrestricted purchasing authority.

---

# 🧭 Natural-Language Missions

AEON extracts constraints directly from the user's request.

For example:

> Find me a phone under ₦500k.

already contains a budget, so AEON should not ask the user for the same information again.

AEON also avoids fabricating a mission from meaningless input. Missing or unclear constraints can trigger clarification instead of an invented budget or fake marketplace result.

---

# 🏗️ Architecture

AEON is built with:

- **React**
- **TypeScript**
- **Vite**
- **WebMCP**

Main pieces include:

- Natural-language mission parsing
- Mission Constitution / authority boundaries
- Marketplace search
- Product evaluation and ranking
- Multi-product basket composition
- Seller-agent negotiation
- Governance checks
- Human approval checkpoint
- Execution state
- Agent observability / Agent Console

The user-facing journey stays simple while the deeper agent activity remains inspectable.

---

# 💻 Run Locally

### Requirements

- Node.js 18+ recommended
- npm
- A modern Chromium-based browser

### Install

```bash
git clone https://github.com/realxpen/-aeon.git
cd ./-aeon
npm install
npm run build
```

### Start development server

```bash
npm run dev
```

Vite will print the local URL, normally:

```text
http://localhost:5173
```

Open the URL and navigate to `/mission/new` if necessary.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

---

# 🧪 Useful Test Missions

### Main smartphone demo

```text
Find me a smartphone under ₦500,000. Get the best deal you can, but ask me before purchasing.
```

### Multi-product mission

```text
Build me a content creation setup under ₦1,000,000, prioritizing performance and audio.
```

### Strict budget / no compliant result

```text
Find me a smartphone under ₦100,000.
```

### Another single-product mission

```text
Find me a laptop under ₦800,000. Get the best value you can and ask me before purchasing.
```

---

# ⚠️ Prototype Scope

AEON is a hackathon prototype exploring agent-native commerce and human authority.

- The current marketplace uses an in-project demo catalog.
- Seller-agent negotiation is simulated within the prototype so the negotiation/governance interaction can be demonstrated safely and repeatably.
- **No real payment processing or financial transaction is performed.**
- The final execution state represents authority being released after the required human approval.

This keeps the demo focused on WebMCP, agent coordination, governance and human-in-the-loop commerce without introducing real-money risk.

---

# 🔮 What's Next

AEON is an early exploration of a broader **agent economy** where humans, agents and merchants can interact safely.

Future directions include:

- Real marketplace integrations
- Richer agent-to-agent negotiation
- Persistent user Constitutions
- Granular spending permissions
- Merchant-side agents
- Basket optimization
- Identity and transaction verification
- Prompt-injection protection
- Safer payment and sensitive-data handling
- Suspicious agent-behavior detection
- Clear audit trails
- Delivery and post-purchase coordination

If agents eventually participate in real economic activity, **trust cannot be something added at the end. It needs to be part of the architecture from the beginning.**

---

## License

This project is open source under the [MIT License](LICENSE).

---

# AEON

### **The Agent Economy, Human Controlled.**

**Agents do the work. Humans keep the authority.**
