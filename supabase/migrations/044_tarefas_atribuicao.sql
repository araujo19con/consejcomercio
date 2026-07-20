-- ============================================================================
-- Migration 044 — Permissão de atribuição de tarefas
-- ============================================================================
-- Regra: só GERENTE e DIRETOR podem criar/atribuir tarefa para OUTRA pessoa.
-- Consultor e coordenador só podem criar tarefa para si mesmos
-- (atribuido_a_id = auth.uid()).
--
-- Refina as policies de INSERT/UPDATE de tarefas (migration 033), que hoje só
-- checam is_interno() — ou seja, qualquer interno pode atribuir a qualquer um.
--
-- Usa public.is_at_least('gerente') (migration 035) → true para gerente e diretor.
-- O trigger de cadência automática (migration 043 — cadencia_materializar) é
-- SECURITY DEFINER e BYPASSA RLS, então continua podendo atribuir ao responsável
-- do lead normalmente. As edge functions (service_role) também não são afetadas.
-- ============================================================================

-- ─── INSERT: só atribui a si mesmo, salvo gerente/diretor ───────────────────
DROP POLICY IF EXISTS "interno_insert_tarefas" ON tarefas;
CREATE POLICY "interno_insert_tarefas" ON tarefas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_interno()
    AND (atribuido_a_id = auth.uid() OR public.is_at_least('gerente'))
  );

-- ─── UPDATE: idem — reatribuir para outro exige gerente/diretor ─────────────
DROP POLICY IF EXISTS "interno_update_tarefas" ON tarefas;
CREATE POLICY "interno_update_tarefas" ON tarefas
  FOR UPDATE TO authenticated
  USING (public.is_interno())
  WITH CHECK (
    public.is_interno()
    AND (atribuido_a_id = auth.uid() OR public.is_at_least('gerente'))
  );

-- (SELECT e DELETE permanecem como na 033 — qualquer interno.)
