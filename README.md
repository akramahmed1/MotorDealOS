# MotorDeals AI OS

**Production-grade AI operating system for Cash Any Car LLC (DBA MotorDeals USA / MotorExport USA)**

A licensed Illinois auto dealer in Glenview, IL, with a secondary storage lot at the Renaissance Hotel parking lot.

---

## What This Is

An open-source, AI-powered dealer operating system that replaces manual marketing, lead management, and follow-up with orchestrated AI agents — while a single remote manager supervises instead of doing everything by hand.

## Architecture

- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui (Vercel)
- **Backend:** FastAPI + SQLAlchemy + Pydantic (Railway/Render)
- **Database:** PostgreSQL 15 (Supabase)
- **AI:** NVIDIA NIM Free Tier (Llama 3.1 8B/70B)
- **Queue:** Celery + Redis
- **SMS:** Twilio
- **Email:** SendGrid
- **Images:** Cloudinary
- **Social:** Meta Graph API

## Quick Start

```bash
# 1. Clone
git clone https://github.com/motordeals/ai-os.git
cd ai-os

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start local infrastructure
docker-compose up -d

# 4. Run database migrations
psql $DATABASE_URL -f infra/supabase/schema.sql

# 5. Start backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 6. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/START_HERE.md` | **Hand this to your AI builder first** |
| `docs/KARPATHY.md` | Engineering philosophy |
| `docs/CLAUDE.md` | Agent behavior rules |
| `docs/DEALER.md` | Business logic & legal guardrails |
| `docs/AGENTS.md` | Agent orchestration spec |
| `docs/DECISIONS.md` | Human approval matrix |
| `docs/PRD.md` | Full product requirements |
| `docs/API_SPEC.md` | REST API specification |
| `docs/PROJECT_STRUCTURE.md` | File/folder architecture |
| `docs/Website_Audit.md` | Website optimization plan |
| `infra/supabase/schema.sql` | Production database schema |
| `.env.example` | Environment variables template |

## Phases

| Phase | Focus | Timeline | Value |
|-------|-------|----------|-------|
| 1 | Marketing Engine + Lead Machine | Weeks 1-3 | +$5K-11K/mo |
| 2 | Inventory Hub + Profit Tracking | Weeks 4-6 | +$2K-4K/mo |
| 3 | Export Scale + Financing | Weeks 7-9 | +$2.5K-9K/mo |
| 4 | Document Vault + AutoFunds Cutover | Weeks 10-12 | +$300-500/mo saved |

## License

MIT — Open source, production-ready, lawsuit-proof.
