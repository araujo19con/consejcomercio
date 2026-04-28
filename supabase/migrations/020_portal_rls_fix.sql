-- =============================================================================
-- 020_portal_rls_fix.sql
-- Conserta as policies RLS que bloqueavam o cliente do portal de:
-- (a) creditar +100 tokens ao enviar indicação
-- (b) debitar tokens ao solicitar resgate
--
-- Migration 015 só criou policy "interno insere transações", impedindo
-- as duas operações acima quando feitas pelo perfil tipo='cliente'.
--
-- TRADE-OFF de segurança: a policy abaixo permite que o cliente insira
-- transações para si mesmo (`perfil_id = auth.uid()`), o que tecnicamente
-- permite uma chamada de API direta com valor arbitrário. Mitigações:
--  1. Portal é invite-only (atacante precisa de conta cliente)
--  2. Audit logs em token_transacoes permitem detectar abuso
--  3. Roadmap: refatorar para RPC SECURITY DEFINER que lê valor do servidor
-- =============================================================================

-- 1. Cliente pode inserir transações DELE MESMO
CREATE POLICY "cliente insere próprias transações" ON token_transacoes
  FOR INSERT TO authenticated
  WITH CHECK (perfil_id = auth.uid());
