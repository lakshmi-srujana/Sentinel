# Sentinel — Full Technical Blueprint & Antigravity Execution Plan

This document is the "no detail missed" companion to the Overview and Roadmap docs. It's written to be dropped into an agentic coding tool (Antigravity, Claude Code, or similar) as a working spec — every module has its data model, API contract, file location, dependencies, and acceptance criteria spelled out so the agent (or you) never has to guess.

---

## 1. Repository & Folder Structure

```
sentinel/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app entrypoint
│   │   ├── config.py               # settings via pydantic-settings, reads .env
│   │   ├── db/
│   │   │   ├── session.py          # SQLAlchemy engine/session
│   │   │   └── models.py           # ORM models (see Section 2)
│   │   ├── auth/
│   │   │   ├── routes.py           # /auth/signup, /auth/login
│   │   │   ├── jwt.py              # token creation/verification
│   │   │   └── rbac.py             # role-check dependency
│   │   ├── governance/
│   │   │   ├── pii.py              # regex + spaCy detection
│   │   │   ├── masking.py          # mask/unmask logic
│   │   │   ├── risk_scoring.py     # scoring function
│   │   │   ├── policy.py           # score -> action mapping
│   │   │   └── routes.py           # POST /prompt
│   │   ├── rag/
│   │   │   ├── ingestion.py        # chunking + embedding
│   │   │   ├── retrieval.py        # FAISS query
│   │   │   └── routes.py           # /rag/upload, /rag/query
│   │   ├── code_review/
│   │   │   └── routes.py           # /code-review
│   │   ├── agents/
│   │   │   ├── ollama_client.py
│   │   │   ├── graph.py            # LangGraph/CrewAI workflow
│   │   │   └── routes.py           # /agent/run
│   │   ├── he/
│   │   │   └── poc.py              # TenSEAL proof-of-concept
│   │   ├── billing/
│   │   │   ├── stripe_client.py
│   │   │   └── routes.py           # /billing/*
│   │   └── dashboard/
│   │       └── routes.py           # aggregated stats endpoints
│   ├── tests/
│   │   ├── test_pii.py
│   │   ├── test_risk_scoring.py
│   │   ├── test_rag.py
│   │   └── test_rbac.py
│   ├── alembic/                    # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/ (Prompt, RAG, CodeReview, Dashboard, Billing)
│   │   └── ...
│   └── package.json
└── infra/
    └── deploy notes per host (Render/Railway/Fly.io)
```

---

## 2. Data Model (Postgres, via SQLAlchemy + Alembic migrations)

| Table | Key Columns |
|---|---|
| `orgs` | id, name, plan_tier (free/pro/enterprise), created_at |
| `users` | id, org_id (FK), email, hashed_password, role (employee/manager/hr/admin), created_at |
| `prompts` | id, user_id, org_id, raw_text_hash (never store raw text unmasked), masked_text, risk_score, action (approve/redact/escalate/block), model_used (cloud/local), created_at |
| `pii_entities` | id, prompt_id (FK), entity_type, placeholder_token, position_start, position_end |
| `documents` | id, org_id, filename, uploaded_by, created_at |
| `document_chunks` | id, document_id (FK), chunk_text, embedding (vector), chunk_index |
| `code_reviews` | id, org_id, user_id, diff_hash, summary, created_at |
| `agent_runs` | id, org_id, user_id, workflow_name, tools_used (json), output_summary, created_at |
| `audit_log` | id, org_id, user_id, action_type, details (json), created_at |
| `subscriptions` | id, org_id, stripe_customer_id, plan_tier, status, current_period_end |

**Design rule to follow strictly:** never persist raw unmasked prompt text to disk/DB. Store only the masked version plus a hash of the original for dedup/audit purposes. This is both a genuine privacy best-practice and a strong interview talking point.

---

## 3. API Contract (per module)

### 3.1 Auth
- `POST /auth/signup` → `{email, password, org_name}` → `201 {user_id, org_id}`
- `POST /auth/login` → `{email, password}` → `200 {access_token, role}`

### 3.2 Governance Gateway
- `POST /prompt`
  - Request: `{text: string, target: "cloud" | "local"}`
  - Response: `{action: "approve"|"redact"|"escalate"|"block", risk_score: int, masked_preview: string, llm_response: string | null, prompt_id: uuid}`
  - If `action == "block"`, `llm_response` is `null` and a `reason` field explains why.
  - If `action == "escalate"`, response is queued; return `{status: "pending_review", prompt_id}` instead of an immediate answer.

### 3.3 RAG
- `POST /rag/upload` → multipart file upload → `{document_id, chunks_indexed: int}`
- `POST /rag/query` → `{question: string}` → `{answer: string, sources: [{document_id, chunk_text, score}]}`
  - **Must** filter by `org_id` from the JWT — write an explicit test that org A cannot retrieve org B's chunks.

### 3.4 Code Review
- `POST /code-review` → `{diff_text: string}` → `{comments: [{line, category: "style"|"bug"|"security", message}], summary: string}`
  - Diff text passes through the governance gateway first (secrets/keys get masked before reaching the LLM).

### 3.5 Agent Runtime
- `POST /agent/run` → `{goal: string}` → `{steps: [{tool_used, input, output}], final_answer: string}`
  - Runs entirely against the local Ollama model when `org.plan_tier` requires private mode, or when the user explicitly toggles "Private Mode."

### 3.6 Homomorphic Encryption POC
- `POST /he/encrypted-check` → `{ciphertext: base64, operation: "keyword_match"|"length_check"}` → `{result: bool | int}`
  - Document in the response (or README) exactly which part of the computation happened on ciphertext vs. plaintext — precision here matters more than scope.

### 3.7 Billing
- `POST /billing/checkout` → `{plan_tier}` → `{checkout_url}` (Stripe Checkout session)
- `POST /billing/webhook` → Stripe webhook receiver, updates `subscriptions` table
- `GET /billing/usage` → `{prompts_this_month: int, limit: int, plan_tier}`

### 3.8 Dashboard
- `GET /dashboard/manager` → flagged/escalated prompts for direct reports
- `GET /dashboard/hr` → org-wide risk trend data (aggregated, no raw prompt content), usage per department
- `GET /dashboard/admin` → policy thresholds, module toggles per org

---

## 4. Dependencies (pin versions once you start, list here as you go)

**Backend (`requirements.txt`)**
```
fastapi
uvicorn
sqlalchemy
alembic
psycopg2-binary
pydantic-settings
python-jose[cryptography]   # JWT
passlib[bcrypt]             # password hashing
spacy
regex
sentence-transformers
faiss-cpu
anthropic                   # Claude API SDK
langgraph                   # or crewai
tenseal
stripe
pytest
httpx                       # for async test client
```
Run `python -m spacy download en_core_web_sm` after install.

**Frontend**
```
react, react-router-dom, axios (or fetch), recharts (dashboard charts)
```
(Or Streamlit alone for the first two weeks if you want a faster path to a working demo.)

**Local infra**
- Docker + Docker Compose (Postgres)
- Ollama installed locally, with `ollama pull llama3` (or `mistral`) run once

---

## 5. Environment Variables (`.env.example`)

```
DATABASE_URL=postgresql://sentinel:sentinel@localhost:5432/sentinel
JWT_SECRET=changeme
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OLLAMA_BASE_URL=http://localhost:11434
FAISS_INDEX_PATH=./data/faiss_index
ENV=development
```

---

## 6. Acceptance Criteria Checklist (per module — use this to know when a module is "actually done")

**Governance Gateway**
- [ ] Regex catches emails, phone numbers, card numbers in test sentences
- [ ] spaCy catches at least person names and org names in test sentences
- [ ] Masked text never contains the original PII substring
- [ ] Risk score is deterministic for the same input
- [ ] All four policy actions (approve/redact/escalate/block) are reachable with crafted test inputs
- [ ] Every prompt (approved or not) produces exactly one audit_log row

**RBAC**
- [ ] An employee JWT cannot hit `/dashboard/hr` (expect 403)
- [ ] A manager only sees their own reports' flagged items, not the whole org
- [ ] Role is embedded in the JWT and re-validated server-side on every protected route (never trust a client-sent role)

**RAG**
- [ ] Uploading the same document twice doesn't duplicate chunks (or is explicitly handled)
- [ ] A query against org A's docs never returns org B's chunks (explicit cross-org test)
- [ ] Every answer includes at least one source citation with a chunk excerpt

**Code Review**
- [ ] A diff containing a fake API key gets masked before the LLM call (verify via logs, not just output)
- [ ] Comments are categorized (style/bug/security), not just free text

**Private AI Agent**
- [ ] With Ollama stopped, the app fails gracefully with a clear error (not a silent hang)
- [ ] "Private Mode" toggle actually prevents any call to the Claude API — verify with a network log/mock, not just visually

**Homomorphic Encryption POC**
- [ ] The encrypted operation runs and returns a correct result on at least 3 test cases
- [ ] README explicitly states what stays encrypted vs. what gets decrypted, and why

**Billing**
- [ ] Free tier usage limit actually blocks the 11th prompt (or whatever limit you set) with a clear upgrade message
- [ ] Stripe webhook correctly upgrades `subscriptions.status` in the DB on a test payment

**Dashboard**
- [ ] Manager/HR/Admin views each show different data for the same org (proves RBAC is wired end-to-end, not just cosmetic)

---

## 7. Testing Strategy

- Unit tests for pure functions first: `risk_scoring.py`, `pii.py`, `masking.py` — these need no DB/network and should be the fastest, most reliable tests.
- Integration tests with `httpx.AsyncClient` against a test Postgres DB (use a separate `sentinel_test` database, reset between runs).
- Manually script one full end-to-end demo path before each weekly tag: signup → login → send a PII-laden prompt → see it masked/scored → upload a doc → ask a RAG question → run a code review → toggle private mode → run an agent task.

---

## 8. Things Commonly Missed (explicit checklist)

- [ ] CORS configured on the backend so the frontend can actually call it locally
- [ ] Password hashing (never store plaintext passwords) — use `passlib[bcrypt]`
- [ ] Rate limiting on `/prompt` and `/rag/query` (even a simple in-memory limiter) to avoid runaway API costs during a demo
- [ ] `.env` is in `.gitignore` — never commit real API keys, even temporarily
- [ ] Migrations checked into `alembic/versions/` so the DB schema is reproducible, not just created ad hoc
- [ ] A seed script that creates one demo org with an employee, a manager, and an HR user — so a cold-email demo doesn't require live signup fumbling
- [ ] Timeouts on all outbound LLM calls (Claude API and Ollama) so one slow call doesn't hang the whole request
- [ ] Explicit "what happens if spaCy model isn't downloaded" error message, not a stack trace
- [ ] A `/health` endpoint that checks DB connectivity, so deployment platforms can health-check correctly
- [ ] Logging that never logs raw unmasked prompt text, even at DEBUG level (audit this specifically — it's the one privacy bug that would undercut the entire pitch)

---

## 9. How to Use This With an Agentic Coding Tool (Antigravity, Claude Code, etc.)

1. Feed the agent **one module at a time**, in the roadmap's order — not the whole document at once. Point it at the relevant section here (folder structure + API contract + acceptance criteria for that module) plus the matching week from the Build Roadmap doc.
2. After the agent produces code, run through that module's **Acceptance Criteria Checklist** yourself before moving on — don't let the agent "self-certify."
3. Ask the agent to write the **unit tests** for a module before or alongside the implementation (Section 7) — this catches silent scope-narrowing (a very common agentic-coding failure mode) early.
4. Use the **Things Commonly Missed** checklist (Section 8) as a final pass at the end of each week, before you tag the release — these are the details that don't belong to any one module but break a demo if skipped.
