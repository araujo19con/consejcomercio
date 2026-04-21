# CONSEJ CRM v2 — Contexto do Projeto

## O que é

CRM interno da CONSEJ, empresa júnior de consultoria jurídica. Gerencia leads, pipeline, clientes, contratos, diagnósticos e mensagens de abordagem.

## Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Roteamento:** React Router v6
- **Estado/fetch:** TanStack Query (React Query)
- **UI:** shadcn/ui + Radix UI
- **DnD:** @dnd-kit

## Vault Obsidian — CONSEJ

O vault de conhecimento da CONSEJ está em:
```
C:\Users\Gabriel\OneDrive\Área de Trabalho\CONSEJ
```

Acessível via MCP `obsidian-consej` (servidor filesystem configurado no settings global).

### Estrutura do vault

| Pasta | Conteúdo |
|-------|----------|
| `Leads/` | Notas por lead — contexto, histórico, dores identificadas |
| `Clientes/` | Notas por cliente ativo — projeto, entregas, NPS |
| `Reuniões/` | Atas de diagnóstico e reuniões |
| `Processos/` | Processos internos da CONSEJ |
| `Conhecimento Jurídico/` | Referências, modelos, pesquisa jurídica |
| `Templates/` | Modelos de e-mail, proposta, contrato |
| `Time/` | Notas dos consultores |

### Uso

- Ao trabalhar em um lead específico, consultar `Leads/Nome - Empresa.md` para contexto adicional
- Diagnósticos importantes podem ser anotados em `Reuniões/`
- Conhecimento jurídico relevante para um serviço fica em `Conhecimento Jurídico/`

## Convenções de código

- Componentes em `src/components/`
- Hooks em `src/hooks/`
- Páginas em `src/pages/`
- Tipos centralizados em `src/types/index.ts`
- Constantes em `src/lib/constants.ts`
- Configurações globais em `configuracoes` (Supabase, id = 'default')

## Supabase

- RLS ativa em todas as tabelas sensíveis
- Migrações incrementais em `supabase/migrations/`
- Perfis de usuário auto-criados via trigger `on_auth_user_created`
