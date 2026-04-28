# Integração Slack — Notificação de Indicações

Runbook de setup da Edge Function `notify-indicacao`, que avisa o time comercial no Slack toda vez que uma indicação entra no pipeline (via Portal de Indicações ou registrada manualmente no CRM).

## Visão geral

```
Portal cliente / CRM → INSERT em indicacoes → Database Webhook
  → Edge Function notify-indicacao → Slack chat.postMessage → #comercial-indicacoes
  → registra em notificacoes_indicacao (auditoria + idempotência)
```

## 1. Slack App

Reaproveite o mesmo app `CONSEJ Handoff Bot` (token `SLACK_BOT_TOKEN` já existe). Crie um canal novo (ou use existente) e convide o bot:

1. Crie o canal `#comercial-indicacoes` (ou nome equivalente).
2. `/invite @CONSEJ Handoff Bot`
3. Copie o **Channel ID** (botão direito → Copy link → ID no fim da URL, ex.: `C0XXXXXXX`).

## 2. Migration

```bash
cd consejcomercio
supabase db push
# ou rode manualmente: supabase/migrations/019_notificacoes_indicacao.sql
```

Confirme: `SELECT * FROM notificacoes_indicacao LIMIT 1;`

## 3. Secrets

```bash
supabase secrets set SLACK_LEADS_CHANNEL_ID=C0XXXXXXX
supabase secrets set WEBHOOK_INDICACAO_SECRET=$(openssl rand -hex 32)
# SLACK_BOT_TOKEN e APP_URL já existem
```

> Se quiser que a notificação caia no mesmo canal da DDGD, omita `SLACK_LEADS_CHANNEL_ID` — a função usa `SLACK_CHANNEL_ID` como fallback.

## 4. Deploy

```bash
supabase functions deploy notify-indicacao
```

URL: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-indicacao`

## 5. Database Webhook

Supabase Dashboard → **Database** → **Webhooks** → *Create a new hook*:

- **Name:** `indicacoes_to_slack`
- **Table:** `indicacoes`
- **Events:** `INSERT` apenas
- **Type:** HTTP Request
- **Method:** `POST`
- **URL:** a URL do deploy acima
- **HTTP Headers:**
  - `Authorization: Bearer <WEBHOOK_INDICACAO_SECRET>`
  - `Content-Type: application/json`

## 6. Testes

### Local
```bash
supabase functions serve notify-indicacao --env-file supabase/.env.local
```

```bash
curl -X POST http://localhost:54321/functions/v1/notify-indicacao \
  -H "Authorization: Bearer $WEBHOOK_INDICACAO_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "indicacoes",
    "schema": "public",
    "record": {
      "id": "11111111-1111-1111-1111-111111111111",
      "indicante_cliente_id": "<uuid-de-cliente-real>",
      "indicante_parceiro_id": null,
      "indicado_nome": "Maria Teste",
      "indicado_telefone": "(84) 99999-0000",
      "indicado_empresa": "Tech Indicada Ltda",
      "indicado_email": "maria@tech.com",
      "lead_id": null,
      "status": "pendente",
      "tipo_recompensa": null,
      "recompensa_descricao": null,
      "notas": "Segmento: Tecnologia",
      "created_at": "2026-04-28T17:00:00Z",
      "updated_at": "2026-04-28T17:00:00Z"
    }
  }'
```

### Produção
1. Cliente envia indicação pelo `/portal/indicar`.
2. Em ≤ 5s aparece a mensagem no canal Slack.
3. `SELECT * FROM notificacoes_indicacao WHERE indicacao_id = '<uuid>';` → `status = 'enviado'`.

### Idempotência
Reaplicar o mesmo INSERT (ou re-executar o webhook) → o Slack **não** recebe duplicata (UNIQUE em `indicacao_id`).

## 7. O que aparece no Slack

A mensagem traz:
- **Header:** "Indicação de cliente / parceiro — <Empresa>"
- **Lead indicado:** nome, empresa, telefone, e-mail, segmento
- **Quem indicou:** nome, empresa, e-mail, telefone
- **Linha do portal:** "+100 tokens creditados para Fulano" (se via portal)
- **Notas adicionais:** se houver (excluindo segmento já mostrado)
- **Botões:** "Abrir lead no CRM" (se já houver lead_id) e "Ver indicações"

## 8. Observabilidade

```sql
SELECT * FROM notificacoes_indicacao_falhas;     -- últimas falhas
SELECT origem, status, COUNT(*) FROM notificacoes_indicacao
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY origem, status;
```

Logs: Supabase Dashboard → **Edge Functions** → `notify-indicacao` → **Logs**.
