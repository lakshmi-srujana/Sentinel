# Sentinel — Enterprise AI Governance & Intelligence Platform

## 1. One-Line Pitch

Sentinel is a gateway that sits between a company's employees and any LLM (Claude, GPT, or a local model) — masking sensitive data, scoring and controlling risky prompts, answering questions from internal knowledge, reviewing code, and optionally running fully private/local AI agents — all wrapped in a role-based SaaS platform with freemium billing.

Think of it as an "AI operating system" a mid-size tech company plugs in front of every LLM interaction its employees have.

---

## 2. The Problem

As companies roll out LLM access to employees (via ChatGPT, Claude, Copilot, etc.), three problems appear immediately:

1. **Data leakage** — employees paste PII, credentials, financial data, or proprietary code into prompts sent to a third-party LLM.
2. **No visibility or control** — IT/security/HR have no way to see what's being asked, no way to block risky prompts, and no audit trail.
3. **Fragmented tools** — the org ends up licensing five different point solutions (a DLP tool, a chatbot for internal docs, a code review bot, a private-AI sandbox) instead of one coherent platform.

Sentinel addresses all three at once, and is designed from day one to be **modular and extensible** — new "modules" plug into the same gateway, RBAC system, and dashboard.

---

## 3. Core Architecture

```
 Employee → Sentinel Gateway → [Governance Layer] → LLM (cloud or local)
                     │
                     ├── PII Detection & Masking
                     ├── Risk Scoring Engine
                     ├── Policy Engine (approve/redact/escalate/block)
                     ├── RBAC (employee / manager / HR / admin)
                     ├── Audit Log & HR/Manager Dashboard
                     ├── Internal Knowledge RAG
                     ├── Code Review Assistant
                     ├── Private AI Agent Runtime (local LLM + tools)
                     ├── Homomorphic Encryption Layer (optional, high-security tier)
                     └── Billing / Freemium Tiering
```

Everything flows through one gateway. Each capability below is a **module** that can be built, demoed, and explained independently — but they share the same request pipeline, the same user/org model, and the same dashboard.

---

## 4. Modules in Detail

### 4.1 Governance Gateway (the foundation)
- Every prompt from an employee passes through this layer before reaching any LLM.
- **PII detection**: regex (emails, phone numbers, card numbers, IDs) + spaCy NER (names, orgs, locations) to catch things regex misses.
- **Masking**: sensitive spans are replaced with placeholders (`[PERSON_1]`, `[EMAIL_1]`) before the prompt leaves the boundary; the mapping is stored so the response can be "un-masked" back to the user if needed.
- **Risk scoring**: a 0–100 score combining number/type of PII hits, keyword risk (e.g. "confidential", "salary", "merger"), and prompt intent.
  - 0–30 → **Approve** (send through, masked)
  - 30–50 → **Redact** (send through with extra redaction, flagged in logs)
  - 50–85 → **Escalate** (held for manager/security review before sending)
  - 85–100 → **Block** (never sent, employee notified)
- This is the module inspired by your friends' project — you're building your own implementation of it, which is the fair and correct way to use their idea as inspiration for your resume.

### 4.2 Role-Based Access Control (RBAC)
- Roles: **Employee**, **Manager**, **HR**, **Admin**.
- Employees only see their own prompt history and usage.
- Managers see aggregated activity and flagged items for their direct reports.
- HR sees org-wide policy violations and risk trends (not raw content, to respect privacy — this is a good design talking point for interviews).
- Admins configure policies, thresholds, and modules per department.

### 4.3 Internal Knowledge RAG
- Company docs (wikis, Notion exports, PDFs, Confluence) are chunked, embedded (sentence-transformers), and stored in a vector store (FAISS locally, or Pinecone/Weaviate for scale).
- Employees ask natural-language questions ("What's our PTO policy?", "How does the deploy pipeline work?") and get grounded answers with citations back to the source document.
- This is the easiest module to **demo live** to a company during a cold-email pitch — point it at their own public docs.

### 4.4 Code Review Assistant
- A focused agent that reviews PRs/diffs for style, obvious bugs, and security smells, and posts structured comments.
- Signals to a hiring manager that you understand real engineering workflows, not just chatbot wrappers.
- Can share infrastructure with the RAG module (same LLM-calling layer, same embedding store for "similar past PRs").

### 4.5 Private AI Agent Runtime
- Runs a local, open-source model (e.g. Llama 3 / Mistral via **Ollama**) so no data ever leaves the company's infrastructure.
- Wrapped with an agent framework (**LangGraph** or **CrewAI**) so it can autonomously use tools: search internal docs, query a database, run sandboxed Python.
- Directly answers the #1 objection enterprise IT has to LLM adoption: "our data leaves the building."
- This is your **differentiator** module — most student projects never touch agentic, local-first AI.

### 4.6 Homomorphic Encryption Layer (advanced / stretch module)
- Lets computation happen on **encrypted** data without decrypting it first.
- In Sentinel: an employee's prompt is encrypted client-side; certain governance checks (e.g. simple pattern matches) run directly on ciphertext; the company's own admins never see raw prompt text even internally.
- Library: **TenSEAL** (Python wrapper around Microsoft SEAL).
- Genuinely hard — treat this as a "wow factor, weeks 3–4" module, not a week-1 foundation. Even a small, working proof-of-concept (e.g. homomorphic keyword-matching on an encrypted string) is a strong interview talking point on its own.

### 4.7 Freemium Billing / Pricing Module
- Tiered plans (e.g. Free: limited prompts/month + basic governance; Pro: full RAG + code review; Enterprise: private AI + homomorphic tier).
- Stripe integration for subscription management, usage metering, and plan gating.
- Demonstrates you understand SaaS business mechanics, not just the ML — this is what separates a "toy project" from something that reads as production-minded.

### 4.8 Admin / HR Dashboard
- Visualizes: risk score trends, module usage per department, flagged/escalated prompts queue, billing status.
- This is the "face" of the product in a demo — build it late, once the data is flowing, so it has something real to show.

---

## 5. Suggested Tech Stack

| Layer | Choice |
|---|---|
| Backend API | FastAPI (Python) |
| PII detection | `regex` + `spaCy` (NER) |
| Embeddings / RAG | `sentence-transformers` + FAISS (local) or Pinecone |
| Cloud LLM | Claude API (Anthropic) |
| Local/private LLM | Ollama running Llama 3 / Mistral |
| Agent orchestration | LangGraph or CrewAI |
| Homomorphic encryption | TenSEAL |
| Database | PostgreSQL (users, org, audit logs, billing) |
| Auth / RBAC | FastAPI + JWT, custom role middleware |
| Billing | Stripe |
| Frontend | React (or Streamlit for a faster first demo) |
| Deployment | Docker Compose locally; Render/Railway/Fly.io for a live demo link |

---

## 6. Why This Is a Strong Resume/Interview Project

- **Breadth + depth**: touches security/privacy, applied NLP, RAG systems, agentic AI, cryptography, and SaaS engineering — you can steer any interview toward your strongest area.
- **Real buyer, real problem**: every module maps to something mid-size tech companies are actively budgeting for in 2025–2026 (AI governance, internal knowledge search, dev tooling, data privacy).
- **Extensible by design**: because everything shares one gateway + RBAC + dashboard, you can keep adding modules after the "core" is done — a good story for "what would you build next" interview questions.
- **Demoable in stages**: you don't need every module finished to show something impressive — the Governance Gateway alone, or the RAG module alone, is already a complete demo.

---

## 7. What to Call It / How to Frame It

Working name: **Sentinel** — "it sits at the gate of every AI interaction in a company."

One-sentence resume bullet (draft, refine once built):
> Built Sentinel, an enterprise AI governance platform that masks PII, scores prompt risk (0–100 policy engine), and routes queries to cloud or fully local LLMs — including a RAG-based internal knowledge assistant, an agentic code-review bot, and a homomorphic-encryption proof-of-concept — with RBAC and Stripe-based freemium billing.

See the companion document **"Sentinel — Build Roadmap & Git Checkpoints"** for the week-by-week plan to actually build this.
