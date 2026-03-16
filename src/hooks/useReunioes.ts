import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Reuniao {
  id: string
  titulo: string
  descricao?: string
  data_hora: string
  duracao_minutos: number
  local?: string
  link_video?: string
  participantes: string[]
  cliente_id?: string
  lead_id?: string
  status: 'agendada' | 'realizada' | 'cancelada'
  slack_ts?: string
  slack_channel?: string
  created_at: string
}

export type NovaReuniao = Omit<Reuniao, 'id' | 'created_at'>

export function useReunioes() {
  return useQuery<Reuniao[]>({
    queryKey: ['reunioes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('*')
        .order('data_hora', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useReunioesSemanais() {
  const hoje = new Date()
  const dia = hoje.getDay()
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - (dia === 0 ? 6 : dia - 1))
  segunda.setHours(0, 0, 0, 0)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)

  return useQuery<Reuniao[]>({
    queryKey: ['reunioes', 'semana', segunda.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('*')
        .gte('data_hora', segunda.toISOString())
        .lte('data_hora', domingo.toISOString())
        .order('data_hora', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateReuniao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (reuniao: Partial<NovaReuniao>) => {
      const { data, error } = await supabase.from('reunioes').insert([reuniao]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunioes'] }),
  })
}

export function useUpdateReuniao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reuniao> & { id: string }) => {
      const { data, error } = await supabase.from('reunioes').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunioes'] }),
  })
}

export function useDeleteReuniao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reunioes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunioes'] }),
  })
}
