# Integração Google Calendar — Follow-ups na agenda do consultor

Quando uma **tarefa com prazo** (`data_vencimento`) ou uma **reunião** é criada/editada/concluída/excluída, o CRM reflete isso como evento no Google Calendar do **consultor responsável** (`tarefas.atribuido_a_id` / `reunioes.responsavel_id`), num calendário dedicado **"CONSEJ Follow-ups"**.

- **Modelo:** OAuth por consultor — cada um conecta a própria conta 1x em **Meu Espaço → Minha Agenda → Conectar Google Agenda**.
- **Sincronização:** automática e de ciclo completo (cria / atualiza / cancela), via trigger no banco → edge function `sync-calendar`.
- **Melhorias incluídas:** lembretes (1 dia + 30 min antes), link de volta pro CRM na descrição, calendário dedicado. O lead **não** é convidado.

> ⚠️ Nada disso funciona até o **setup 1x** abaixo ser concluído. Enquanto faltar, o card mostra "integração não habilitada" e os triggers são no-op silencioso.

---

## 1. Google Cloud (console.cloud.google.com)

1. **Crie/selecione um projeto** (ex.: "CONSEJ CRM").
2. **APIs e serviços → Biblioteca →** ative **Google Calendar API**.
3. **Tela de consentimento OAuth:**
   - Tipo: **Interno** (se todos são `@consej.com.br` no Workspace) ou **Externo**.
   - Escopos: adicione `.../auth/calendar.app.created` e `.../auth/userinfo.email` (+ `openid`).
   - Se **Externo** em modo de teste: adicione cada consultor como **usuário de teste** (ou publique o app).
4. **Credenciais → Criar credenciais → ID do cliente OAuth:**
   - Tipo: **Aplicativo da Web**.
   - **URIs de redirecionamento autorizados** (adicione todas que for usar):
     - `https://consejcomercio.vercel.app/me/google-callback`  ← produção
     - `http://localhost:5173/me/google-callback`  ← dev local
     - *(para testar num preview do Vercel, adicione a URL específica daquele preview)*
   - Guarde o **Client ID** e o **Client Secret**.

---

## 2. Supabase — secrets das Edge Functions

Dashboard → **Edge Functions → Secrets** (ou `npx supabase secrets set`):

| Secret | Valor |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID do passo 1.4 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client Secret do passo 1.4 |
| `WEBHOOK_CALENDAR_SECRET` | uma string aleatória forte (ex.: `openssl rand -hex 32`) |
| `APP_URL` | `https://consejcomercio.vercel.app` *(já deve existir)* |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

---

## 3. Supabase — Vault (para o trigger do banco)

O trigger `google_calendar_sync_dispatch` lê o segredo do Vault. O valor tem que ser **igual** ao `WEBHOOK_CALENDAR_SECRET` acima. No **SQL Editor**:

```sql
select vault.create_secret(
  '<MESMO_VALOR_DO_WEBHOOK_CALENDAR_SECRET>',
  'webhook_calendar_secret'
);
```

---

## 4. Aplicar a migração 042

```bash
npx supabase db push        # aplica 042_google_calendar.sql
```

*(ou cole o conteúdo de `supabase/migrations/042_google_calendar.sql` no SQL Editor.)*

Cria: colunas em `perfis`, tabela `google_calendar_connections` (lockada), `google_event_id` em `tarefas`/`reunioes`, e os 6 triggers.

---

## 5. Deploy das Edge Functions

⚠️ **`sync-calendar` PRECISA de `--no-verify-jwt`** (é chamada pelo trigger com o secret Bearer próprio, não com JWT do Supabase). As de connect/disconnect usam o JWT do usuário (deploy normal).

```bash
npx supabase functions deploy google-calendar-connect
npx supabase functions deploy google-calendar-disconnect
npx supabase functions deploy sync-calendar --no-verify-jwt
```

---

## 6. Vercel — variável do frontend

Vercel → projeto `consejcomercio` → **Settings → Environment Variables:**

| Variável | Valor |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | o **mesmo Client ID** do passo 1.4 |

Depois **redeploy** (o `VITE_` é embutido no build). Localmente, adicione a mesma linha no `.env`.

---

## 7. Cada consultor conecta

**Meu Espaço → Minha Agenda → Conectar Google Agenda** → consentimento Google → volta conectado. Um calendário **"CONSEJ Follow-ups"** aparece na conta dele.

---

## Como funciona (resumo técnico)

- `buildGoogleAuthUrl` (frontend) → consentimento com `access_type=offline&prompt=consent` (garante refresh_token).
- `/me/google-callback` → `google-calendar-connect` troca o code por tokens, cria o calendário dedicado e guarda o **refresh_token** em `google_calendar_connections` (RLS: só service_role lê).
- Trigger em `tarefas`/`reunioes` → `net.http_post` → `sync-calendar`, que: acha o consultor responsável, renova o access_token, e **cria/atualiza/cancela** o evento — guardando o `google_event_id` na linha (evita duplicar; o `WHEN` do trigger ignora o write-back → sem loop).
- Concluir/cancelar a tarefa/reunião **remove** o evento; excluir a linha também.
- Se o consultor não conectou, o sync é um no-op silencioso.

## Segurança / privacidade

- Escopo `calendar.app.created`: o app só enxerga/gerencia o calendário que ele mesmo criou — **não** acessa a agenda principal nem outros calendários do consultor.
- `refresh_token` fica só no backend (tabela sem policy para `authenticated`). A UI só lê o booleano `perfis.google_calendar_conectado`.
- Desconectar revoga o token no Google e apaga a linha.
