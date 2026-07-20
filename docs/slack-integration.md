# Integração Slack — Passagem de Bastão (Comercial → DDGD)

Runbook de setup da Edge Function `notify-ddgd-handoff`, que notifica o time da DDGD no Slack quando um lead é marcado como **Ganho – Assessoria** ou **Ganho – Consultoria** no CRM.

## Visão geral

```
CRM (useUpdateLeadStatus) → Supabase leads UPDATE → Database Webhook
  → Edge Function notify-ddgd-handoff → Slack chat.postMessage → #comercial-ddgd-handoff
  → registra em notificacoes_ddgd (auditoria + idempotência)
```

## 1. Slack App

1. Acesse <https://api.slack.com/apps> → **Create New App** → *From scratch*.
   - Nome: `CONSEJ Handoff Bot` · Workspace: CONSEJ.
2. **OAuth & Permissions** → Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `files:write` *(para fase 2 — upload do dossiê em áudio/vídeo)*
3. **Install to Workspace** → copie o `Bot User OAuth Token` (`xoxb-...`).
4. No Slack, crie o canal `#comercial-ddgd-handoff` (ou use um existente). Convide o bot: `/invite @CONSEJ Handoff Bot`.
5. Copie o **Channel ID** (botão direito no canal → *Copy link*; o ID vem ao fim da URL, ex.: `C0XXXXXXX`).

> **Observação:** o token `SLACK_BOT_TOKEN` já existe (usado pela função `slack-proxy`). Reaproveite o mesmo token — só adicione os scopes que faltarem e reinstale o app.

## 2. Migration

Aplique a migration nova:

```bash
cd consejcomercio
supabase db push
# ou, se gerenciar migrations manualmente, rode 015_notificacoes_ddgd.sql
```

Confirme: `SELECT * FROM notificacoes_ddgd LIMIT 1;` (deve retornar 0 linhas sem erro).

## 3. Secrets da Edge Function

```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-...
supabase secrets set SLACK_CHANNEL_ID=C0XXXXXXX
supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 32)
supabase secrets set APP_URL=https://crm.consej.com.br
```

Guarde o valor de `WEBHOOK_SECRET` — será usado no header do Database Webhook (passo 5).

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo runtime.

## 4. Deploy da função

```bash
supabase functions deploy notify-ddgd-handoff
```

URL resultante: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-ddgd-handoff`.

## 5. Database Webhook

No Supabase Dashboard → **Database** → **Webhooks** → *Create a new hook*:

- **Name:** `leads_won_to_ddgd`
- **Table:** `leads`
- **Events:** `UPDATE` apenas
- **Type:** HTTP Request
- **Method:** `POST`
- **URL:** a URL do deploy acima
- **HTTP Headers:**
  - `Authorization: Bearer <WEBHOOK_SECRET>`
  - `Content-Type: application/json`
- **HTTP Params:** (vazio)

> O filtro "transição para `ganho_*`" é feito **dentro da função** (checando `old_record.status` vs `record.status`), para capturar casos em que o status é atualizado junto com outros campos.

## 6. Testes

### Local
```bash
supabase start
supabase functions serve notify-ddgd-handoff --env-file supabase/.env.local
```

Simule um webhook:
```bash
curl -X POST http://localhost:54321/functions/v1/notify-ddgd-handoff \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE",
    "table": "leads",
    "schema": "public",
    "old_record": { "id": "<uuid>", "status": "negociacao" },
    "record":     { "id": "<uuid>", "status": "ganho_assessoria", "empresa": "Teste Ltda", "nome": "Fulano", "segmento": "startup", "telefone": "+55 84 9...", "email": null, "origem": "site", "updated_at": "2026-04-23T12:00:00Z" }
  }'
```

### Produção (staging)
1. Criar lead de teste.
2. No kanban, arrastar para **Ganho – Assessoria**.
3. Conferir em ≤ 5s a mensagem no canal Slack.
4. `SELECT * FROM notificacoes_ddgd WHERE lead_id = '<uuid>';` → `status = 'enviado'`, `slack_ts` preenchido.

### Idempotência
Arrastar o mesmo lead de volta para **Negociação** e novamente para **Ganho – Assessoria** → o Slack **não** deve receber mensagem duplicada (UNIQUE em `lead_id` bloqueia).

### Falha controlada
Revogar o `SLACK_BOT_TOKEN` temporariamente, disparar uma transição → linha fica com `status = 'erro'` e `erro_mensagem` preenchido. A UI do CRM não deve ser afetada.

## 7. Observabilidade

View pronta para dashboards/monitoria:

```sql
SELECT * FROM notificacoes_ddgd_falhas;          -- falhas recentes
SELECT status, COUNT(*) FROM notificacoes_ddgd   -- agregado
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY status;
```

Logs da Edge Function: Supabase Dashboard → **Edge Functions** → `notify-ddgd-handoff` → **Logs**.

## 8. Fase 2 (não incluído)

- **Dossiê em áudio/vídeo:** botão no CRM que grava e faz `files.upload` no Slack como reply da thread (usar `slack_ts` registrado).
- **Ack da DDGD:** botão "Recebemos" no Block Kit → endpoint de interactivity → atualiza `leads.handoff_confirmado_at`.
- **Card em ferramenta de GT:** quando a DDGD definir a ferramenta (ClickUp/Trello/Asana), estender a Edge Function para criar o card também.
- **Reenvio manual:** botão no CRM que chama a função via RPC passando `{ lead_id, force: true }`.
