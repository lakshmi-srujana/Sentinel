# Sentinel — Build Roadmap & Git Checkpoints

A 4-week plan (no fixed deadline, but structured so you always have something demoable). Each week ends with a **working, demoable state** — never leave a week half-broken. Git checkpoints are suggested commit/tag points, not rigid rules — commit more often than this in practice (small, frequent commits), but hit at least these milestones.

Repo suggestion: one monorepo, `sentinel/`, with folders `backend/`, `frontend/`, `ml/` (PII + RAG + agents), `infra/` (docker, deployment configs).

---

## Week 0 — Setup (Day 0–1)

**Tasks**
1. Create the repo, add `.gitignore` (Python, Node, `.env`), `README.md` with the one-line pitch.
2. Set up FastAPI skeleton (`/backend`) with a health-check endpoint.
3. Set up PostgreSQL locally (Docker Compose) with a first migration: `users`, `orgs`, `roles` tables.
4. Set up basic auth (signup/login, JWT) — no RBAC logic yet, just "is logged in."

**Git checkpoints**
- `init: repo scaffold, FastAPI health check, docker-compose for postgres`
- `feat: user/org models + JWT auth`
- Tag: `v0.1-skeleton`

---

## Week 1 — Governance Gateway + RBAC (the foundation)

This week's goal: a prompt goes in, gets scored/masked, and comes back — with roles enforced.

**Tasks, in order**
1. Build the **PII detection module** (`ml/pii/`):
   - Start with `regex` patterns (emails, phone numbers, card numbers, Aadhaar/SSN-style IDs).
   - Add `spaCy` NER pass for names, orgs, locations.
   - Write unit tests with sample sentences containing planted PII.
2. Build the **masking function**: replace detected spans with placeholders, store the mapping (in-memory or DB, keyed by request ID) so a response can be un-masked later.
3. Build the **risk scoring engine**: combine PII hit count/type + a small keyword-risk list into a 0–100 score. Keep the scoring function pure/testable (input: text, output: score + reasons).
4. Build the **policy engine**: map score → action (approve / redact / escalate / block) using the thresholds from the overview doc. Log every decision.
5. Wire this into the FastAPI gateway endpoint: `POST /prompt` → runs PII → risk → policy → (if approved) calls Claude API → returns response, un-masked.
6. Add **RBAC middleware**: roles (employee/manager/HR/admin) attached to users; protect endpoints (`/dashboard/manager`, `/dashboard/hr`) by role.
7. Build a minimal audit log table: every prompt, its score, its action, timestamp, user, org.

**Git checkpoints**
- `feat: PII detection (regex + spacy) with tests`
- `feat: masking + unmasking pipeline`
- `feat: risk scoring engine (0-100)`
- `feat: policy engine (approve/redact/escalate/block) + audit log`
- `feat: gateway endpoint wired to Claude API`
- `feat: RBAC middleware + role-protected routes`
- Tag: `v0.2-governance-gateway` ← **first real demo-able milestone**

---

## Week 2 — Value-Delivering Features: RAG + Code Review

Goal: employees can actually *use* Sentinel for something beyond governance.

**Tasks, in order**
1. **Document ingestion pipeline**: accept PDFs/Markdown/text uploads, chunk them (by tokens/paragraphs), embed with `sentence-transformers`, store vectors in FAISS (start local, no external vector DB yet).
2. **Retrieval + generation**: given a user question, embed it, retrieve top-k chunks, assemble a grounded prompt, send through the *same governance gateway* (this reuse is a great interview point), return an answer with source citations.
3. Add a simple `/rag/query` endpoint and a `/rag/upload` endpoint (org-scoped — org A's docs never leak into org B's answers; test this explicitly).
4. **Code review assistant**: accept a diff/PR text or a GitHub webhook payload, run it through the LLM with a review-focused prompt, return structured comments (style/bug/security categories). Reuse the gateway so code snippets containing secrets/keys also get PII-checked.
5. Basic frontend (Streamlit is fine for now) with three tabs: Chat/Prompt, RAG Q&A, Code Review.

**Git checkpoints**
- `feat: document ingestion + chunking + embeddings (FAISS)`
- `feat: RAG query endpoint with citations, org-scoped isolation`
- `feat: code review assistant endpoint`
- `feat: minimal frontend (streamlit) for prompt/RAG/code-review`
- Tag: `v0.3-rag-and-code-review`

---

## Week 3 — Differentiator: Private AI Agent Runtime

Goal: a fully local mode where nothing leaves the machine.

**Tasks, in order**
1. Install and run **Ollama** locally with a small open model (Llama 3 8B or Mistral 7B).
2. Build an adapter layer so the gateway can route to either "cloud LLM" (Claude) or "local LLM" (Ollama) based on org settings/tier.
3. Wrap the local model with **LangGraph** or **CrewAI** to give it tool use: a "search internal docs" tool (reuses the RAG FAISS index), a sandboxed "run Python" tool for simple calculations.
4. Build one concrete agent workflow end-to-end (e.g. "answer this question, and if it needs a calculation, use the Python tool" or "search docs, then summarize") — one working workflow beats three half-working ones.
5. Add a toggle in the dashboard: "Private Mode" — when on, requests only ever hit the local model/agent, never the cloud API. Log this distinction in the audit trail.

**Git checkpoints**
- `feat: ollama integration + LLM routing (cloud vs local)`
- `feat: agent runtime (langgraph/crewai) with docs-search tool`
- `feat: end-to-end agent workflow (search + reason + tool use)`
- `feat: private-mode toggle + audit trail distinction`
- Tag: `v0.4-private-ai-agents`

---

## Week 4 — Homomorphic Encryption POC + Billing + Polish

Goal: ship the "wow" module, monetization, and make the whole thing presentable.

**Tasks, in order**
1. **Homomorphic encryption POC** (keep scope small and honest):
   - Install `TenSEAL`.
   - Build one concrete, working example: e.g. encrypt a prompt client-side, run a simple encrypted keyword-match or length check on the ciphertext, decrypt only the final governance decision — not the raw text.
   - Document clearly in the README what is and isn't fully homomorphic in your implementation (interviewers respect precision here far more than overclaiming).
2. **Billing module**: integrate Stripe in test mode. Define 2–3 tiers (Free/Pro/Enterprise) mapped to which modules are enabled (e.g. Free = governance only; Pro = + RAG/code review; Enterprise = + private AI + HE tier). Add usage metering (prompts/month) with plan-based limits.
3. **Admin/HR dashboard**: build the real dashboard views now that there's real data — risk trends over time (charts), flagged/escalated queue with approve/deny actions for managers, per-department usage, billing/plan status.
4. **Polish pass**: consistent error handling, loading states, a proper `README.md` with architecture diagram, setup instructions, and a demo script (what to show, in what order, in a 15-minute walkthrough — this doubles as your cold-email demo script).
5. **Deploy** a live demo (Render/Railway/Fly.io for backend + DB, Vercel/Netlify or same host for frontend) so you have a link to send in cold emails, not just "clone my repo."

**Git checkpoints**
- `feat: homomorphic encryption POC (TenSEAL) + docs on scope`
- `feat: stripe billing + tiered plan gating + usage metering`
- `feat: admin/hr dashboard with risk trends and flagged queue`
- `chore: polish - error handling, README, architecture diagram, demo script`
- `chore: deploy live demo (backend + frontend)`
- Tag: `v1.0-sentinel` ← **cold-email-ready release**

---

## After v1.0 — Optional Extensions (good "what's next" answers in interviews)

- Multi-tenant orgs with per-org custom policy thresholds.
- Slack/Teams bot front-end instead of (or alongside) the web app.
- Fine-tuned/small classifier to replace the keyword-based risk scorer with a learned model, trained on your own labeled examples.
- SOC2-style audit export (CSV/PDF) for the HR/admin dashboard.
- Real vector DB (Pinecone/Weaviate) + multi-region deployment story, if you want to talk about scaling.

---

## General Git Hygiene Notes

- Branch per feature (`feat/pii-detection`, `feat/rag-pipeline`, etc.), merge to `main` via PR even solo — gives you a clean, explainable commit history for interviews.
- Tag each weekly milestone (`v0.1` → `v1.0`) as shown above — this alone makes a great "here's my progress over the month" story.
- Write a short note in each PR description on *why*, not just *what* — future-you (and interviewers looking at the repo) will thank you.
