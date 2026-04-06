# LUCASCAR — Sistema de Orçamentos

Sistema de gestão de orçamentos para lanternagem e pintura automotiva. Desenvolvido com Next.js 16, Supabase e Tailwind CSS.

## Funcionalidades

- **Dashboard** com métricas de faturamento, taxa de conversão e orçamentos recentes
- **Orçamentos** — criação, edição, exclusão, troca de status, geração de PDF e compartilhamento via WhatsApp
- **Clientes** — cadastro completo com proteção contra exclusão de clientes com orçamentos vinculados
- **Veículos** — cadastro vinculado a clientes, mesma proteção de exclusão
- **Serviços** — catálogo com ativar/desativar, valores e prazos padrão
- **Configurações** — dados da empresa, upload de logo e alteração de PIN

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | PIN via SHA-256 + cookie |
| UI | shadcn/ui + Tailwind CSS v4 |
| PDF | @react-pdf/renderer v4 |
| Deploy | Vercel |

---

## Setup local

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (free tier é suficiente)

### 1. Clone e instale

```bash
git clone <url-do-repositorio>
cd lucas-car
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Encontre esses valores em: Supabase Dashboard → seu projeto → **Settings → API**

### 3. Configure o banco de dados

No Supabase Dashboard, vá em **SQL Editor** e execute o conteúdo de:

```
supabase/migrations/001_initial.sql
```

Isso cria todas as tabelas, índices, políticas de RLS e o PIN padrão (`1234`).

### 4. Configure o Supabase Storage (para upload de logo)

No Supabase Dashboard → **Storage**:

1. Crie um novo bucket chamado `logos`
2. Marque como **Public**
3. Em **Policies**, adicione uma policy para permitir `INSERT`, `UPDATE` e `SELECT` pelo `anon` role

### 5. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com o PIN **1234**.

---

## Deploy na Vercel

### Opção A — via interface (recomendado)

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório
3. Na tela de configuração, adicione as variáveis de ambiente:

   | Variável | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do seu projeto Supabase |

4. Clique em **Deploy** — o Vercel detecta Next.js automaticamente.

### Opção B — via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Durante o setup, o CLI pedirá as variáveis de ambiente.

### Configurações do build (auto-detectadas pelo Vercel)

| Campo | Valor |
|-------|-------|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm install` |

Nenhum `vercel.json` é necessário.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase (ex: `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Chave pública anon do Supabase (JWT) |

> **Segurança:** ambas as variáveis são prefixadas com `NEXT_PUBLIC_`, portanto ficam expostas no bundle do cliente — isso é intencional e seguro para a `anon key`, pois o acesso é controlado pelo Row Level Security do Supabase.

---

## Credenciais padrão

| Campo | Valor |
|-------|-------|
| PIN de acesso | `1234` |

Altere o PIN em **Configurações → Alterar PIN de Acesso** após o primeiro login.

---

## Estrutura do projeto

```
lucas-car/
├── app/
│   ├── (root)/             # Dashboard principal
│   ├── clientes/           # Gestão de clientes
│   ├── configuracoes/      # Configurações do sistema
│   ├── login/              # Tela de autenticação PIN
│   ├── orcamento/          # Criar novo orçamento
│   ├── orcamentos/
│   │   ├── page.tsx        # Lista de orçamentos
│   │   └── [id]/
│   │       ├── page.tsx    # Detalhes + PDF + WhatsApp
│   │       └── editar/     # Edição de orçamento
│   ├── servicos/           # Catálogo de serviços
│   └── veiculos/           # Cadastro de veículos
├── components/
│   ├── dashboard/          # Componentes específicos do sistema
│   └── ui/                 # shadcn/ui (não editar manualmente)
├── lib/
│   ├── auth.ts             # Hashing de PIN e gerenciamento de cookie
│   ├── supabase.ts         # Cliente Supabase
│   └── utils.ts            # cn() e utilitários
├── supabase/
│   └── migrations/
│       └── 001_initial.sql # Schema completo do banco
├── types/
│   └── database.ts         # Interfaces TypeScript para as tabelas
├── proxy.ts                # Auth middleware (protege todas as rotas)
├── .env.example            # Template de variáveis de ambiente
└── next.config.mjs
```

---

## Scripts disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção (após build)
npm run lint     # ESLint
```
