import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { PassagemBastao, PassagemBastaoMidia } from '@/types'
import { toast } from 'sonner'

const BUCKET = 'handoff-media'

export function usePassagemBastao(leadId: string | undefined) {
  return useQuery({
    enabled: !!leadId,
    queryKey: leadId ? QUERY_KEYS.passagemBastao.byLead(leadId) : ['passagem_bastao', 'disabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passagem_bastao')
        .select('*')
        .eq('lead_id', leadId!)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as PassagemBastao | null
    },
  })
}

export function usePassagemBastaoMidias(leadId: string | undefined) {
  return useQuery({
    enabled: !!leadId,
    queryKey: leadId ? QUERY_KEYS.passagemBastao.midias(leadId) : ['passagem_bastao_midias', 'disabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passagem_bastao_midias')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PassagemBastaoMidia[]
    },
  })
}

type UpsertInput = {
  lead_id: string
  dores_expectativas?: string | null
  perfil_comunicacao?: string | null
  info_financeira?: string | null
  prazos_marcos?: string | null
}

export function useUpsertPassagemBastao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...input,
        atualizado_por_id: user?.id ?? null,
      }
      const { data, error } = await supabase
        .from('passagem_bastao')
        .upsert(payload, { onConflict: 'lead_id' })
        .select()
        .single()
      if (error) throw error
      return data as PassagemBastao
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.passagemBastao.byLead(row.lead_id) })
      toast.success('Dossiê salvo.')
    },
    onError: (err) => toast.error('Erro ao salvar dossiê: ' + (err as Error).message),
  })
}

function detectTipo(mime: string): 'audio' | 'video' {
  if (mime.startsWith('video/')) return 'video'
  return 'audio'
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function useUploadMidia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, file }: { leadId: string; file: File }) => {
      const { data: passagem, error: pbErr } = await supabase
        .from('passagem_bastao')
        .upsert({ lead_id: leadId }, { onConflict: 'lead_id' })
        .select('id')
        .single()
      if (pbErr) throw pbErr

      const path = `${leadId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (upErr) throw upErr

      const { data, error } = await supabase
        .from('passagem_bastao_midias')
        .insert({
          passagem_id: passagem.id,
          lead_id: leadId,
          tipo: detectTipo(file.type),
          nome_arquivo: file.name,
          storage_path: path,
          mime_type: file.type,
          tamanho_bytes: file.size,
        })
        .select()
        .single()
      if (error) throw error
      return data as PassagemBastaoMidia
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.passagemBastao.midias(row.lead_id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.passagemBastao.byLead(row.lead_id) })
      toast.success('Mídia enviada.')
    },
    onError: (err) => toast.error('Erro no upload: ' + (err as Error).message),
  })
}

export function useDeleteMidia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (midia: PassagemBastaoMidia) => {
      await supabase.storage.from(BUCKET).remove([midia.storage_path])
      const { error } = await supabase.from('passagem_bastao_midias').delete().eq('id', midia.id)
      if (error) throw error
      return midia
    },
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.passagemBastao.midias(m.lead_id) })
      toast.success('Mídia removida.')
    },
    onError: (err) => toast.error('Erro ao remover: ' + (err as Error).message),
  })
}

export async function getSignedUrl(path: string, expiresInSec = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec)
  if (error) return null
  return data.signedUrl
}

export function useSendMidiaToSlack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (midia: PassagemBastaoMidia) => {
      const { data, error } = await supabase.functions.invoke('notify-ddgd-midia', {
        body: { midia_id: midia.id },
      })
      if (error) throw error
      return data as { ok: boolean; permalink?: string; error?: string }
    },
    onSuccess: (res, midia) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.passagemBastao.midias(midia.lead_id) })
      if (res.ok) toast.success('Mídia enviada ao Slack.')
      else toast.error('Slack recusou: ' + (res.error ?? 'erro'))
    },
    onError: (err) => toast.error('Erro ao enviar ao Slack: ' + (err as Error).message),
  })
}
