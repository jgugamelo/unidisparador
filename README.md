# 💬 WhatsSmart Sender

Plataforma de disparo inteligente de mensagens via WhatsApp com **WAHA API** + **OpenAI**.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | NestJS + Swagger |
| Banco | Supabase (PostgreSQL) |
| Fila | Redis + BullMQ |
| WhatsApp | WAHA API |
| IA | OpenAI GPT-4o-mini |

---

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- Conta no [Supabase](https://supabase.com)
- WAHA rodando (você já tem ✅)
- OpenAI API Key

---

## Setup

### 1. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENAI_API_KEY=sk-...

WAHA_BASE_URL=http://localhost:3003   # URL do seu WAHA
WAHA_API_KEY=...

JWT_SECRET=troque-por-algo-seguro
WEBHOOK_SECRET=troque-por-algo-seguro

BACKEND_URL=http://localhost:3001     # URL pública do backend (para WAHA enviar webhooks)
FRONTEND_URL=http://localhost:3000
```

### 2. Execute o schema no Supabase

No **SQL Editor** do Supabase, execute em ordem:

```
database/001_schema.sql   ← Tabelas, índices e RLS
database/002_functions.sql ← Funções auxiliares (incrementos, métricas)
```

### 3. Suba Redis via Docker

```bash
docker-compose up redis -d
```

### 4. Instale dependências e rode o backend

```bash
cd backend
npm install
npm run start:dev
```

Backend disponível em: `http://localhost:3001`  
Swagger em: `http://localhost:3001/api/docs`

### 5. Instale dependências e rode o frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em: `http://localhost:3000`

---

## Configurar WAHA para enviar webhooks

No seu WAHA, configure o webhook apontando para:

```
http://SEU_BACKEND:3001/webhooks/waha
```

Adicione o header:
```
X-Webhook-Secret: (valor do WEBHOOK_SECRET no .env)
```

Eventos necessários: `message`, `session.status`

---

## Primeiro usuário (Admin)

1. Crie o usuário no Supabase → Authentication → Users
2. Execute no SQL Editor:

```sql
INSERT INTO public.users (id, nome, email, role)
VALUES ('<uuid-do-usuario>', 'Seu Nome', 'seu@email.com', 'admin');
```

---

## Fluxo de uso

```
1. Acesse /auth/login e faça login
2. Vá em Sessões WAHA → crie uma sessão → escaneie o QR Code
3. Vá em Contatos → importe um CSV com colunas: nome, telefone, email, origem
4. Vá em Campanhas → crie uma campanha → selecione a sessão e a base de contatos
5. Clique em "Gerar variações com IA" → aprove as variações
6. Aprove a campanha → clique em Iniciar
7. Acompanhe em Dashboard → as métricas atualizam em tempo real
8. Respostas aparecem em Atendimento quando classificadas como interesse
```

---

## Estrutura do projeto

```
whatsapp-sender/
├── backend/
│   └── src/
│       ├── auth/                  # JWT login
│       ├── contacts/              # Importação CSV/XLSX, normalização
│       ├── campaigns/             # CRUD + aprovação + início
│       ├── message-variations/    # Geração OpenAI + aprovação
│       ├── message-queue/         # BullMQ worker de envio
│       ├── waha/                  # Integração WAHA API
│       ├── webhooks/              # Recebimento de eventos WAHA
│       ├── blacklist/             # Gestão de bloqueios
│       ├── risk/                  # Motor de avaliação de risco
│       ├── followup/              # Follow-ups automáticos via cron
│       ├── response-classification/ # OpenAI classifica intenção
│       ├── attendance/            # Cards de atendimento humano
│       └── dashboard/             # Métricas consolidadas
├── frontend/
│   └── src/app/
│       ├── auth/login/            # Tela de login
│       ├── dashboard/             # Dashboard principal
│       ├── campaigns/             # Listagem + criação de campanhas
│       ├── contacts/              # Listagem + importação
│       ├── sessions/              # Gerenciamento WAHA
│       ├── attendance/            # Atendimento humano
│       └── blacklist/             # Gestão da blacklist
└── database/
    ├── 001_schema.sql             # Todas as tabelas
    └── 002_functions.sql          # Funções SQL auxiliares
```

---

## Parâmetros de segurança (defaults do PRD)

| Parâmetro | Valor |
|---|---|
| Limite diário por sessão | 50 msg/dia (configurável) |
| Intervalo mínimo entre envios | 90s |
| Intervalo máximo entre envios | 300s |
| Pausa a cada 20 mensagens | 10 min |
| Pausa a cada 100 mensagens | 60 min |
| Opt-out > 3% | Reduz velocidade |
| Opt-out > 5% | Pausa campanha |
| Erro > 10% | Pausa sessão |
| Follow-ups máximos | 2 |

---

## Próximos passos (MVP 2)

- [ ] Teste A/B de mensagens
- [ ] Integração Chatwoot
- [ ] Score de risco preditivo
- [ ] Painel de risco em tempo real
- [ ] Relatórios exportáveis
- [ ] Aquecimento automático de número
