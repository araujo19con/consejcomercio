import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientes, useDeleteCliente } from '@/hooks/useClientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CLIENT_STATUS_OPTIONS, SEGMENTS } from '@/lib/constants'
import { getDaysUntilExpiry } from '@/lib/utils'
import { Search, Briefcase, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cliente, Contrato } from '@/types'
import { NewClienteModal } from '@/components/clientes/NewClienteModal'

function getStatusColor(status: string) {
  return CLIENT_STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-600'
}

function getSegmentLabel(value: string) {
  return SEGMENTS.find(s => s.value === value)?.label || value
}

function getNextExpiry(contratos: Contrato[] | undefined): string | null {
  if (!contratos?.length) return null
  const active = contratos.filter(c => c.status === 'ativo' && c.data_fim)
  if (!active.length) return null
  return active.sort((a, b) => new Date(a.data_fim!).getTime() - new Date(b.data_fim!).getTime())[0].data_fim!
}

export function ClientesPage() {
  const navigate = useNavigate()
  const { data: clientes, isLoading } = useClientes()
  const deleteCliente = useDeleteCliente()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showNew, setShowNew] = useState(false)

  function handleDelete(e: React.MouseEvent, id: string, nome: string) {
    e.stopPropagation()
    if (!confirm(`Excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`)) return
    deleteCliente.mutate(id)
  }

  const filtered = clientes?.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    return matchSearch && matchStatus
  }) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</Badge>
          <Button size="sm" onClick={() => setShowNew(true)} style={{ backgroundColor: '#0089ac' }} className="text-white">
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar cliente..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {['todos', 'ativo', 'em_renovacao', 'encerrado'].map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              {s === 'todos' ? 'Todos' : CLIENT_STATUS_OPTIONS.find(o => o.value === s)?.label || s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Carregando...</div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(cliente => {
            const nextExpiry = getNextExpiry(cliente.contratos)
            const daysLeft = nextExpiry ? getDaysUntilExpiry(nextExpiry) : null
            const isExpiringSoon = daysLeft !== null && daysLeft <= 60 && daysLeft >= 0

            return (
              <Card
                key={cliente.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/clientes/${cliente.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{cliente.nome}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(cliente.status))}>
                          {CLIENT_STATUS_OPTIONS.find(s => s.value === cliente.status)?.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{cliente.empresa} · {getSegmentLabel(cliente.segmento)}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-xs text-slate-500">{cliente.contratos?.length || 0} contrato(s)</p>
                        {nextExpiry && (
                          <div className={cn('flex items-center gap-1 text-xs mt-0.5', isExpiringSoon ? 'text-orange-600 font-medium' : 'text-slate-400')}>
                            {isExpiringSoon && <AlertCircle className="w-3 h-3" />}
                            {daysLeft === 0 ? 'Vence hoje' : daysLeft && daysLeft < 0 ? 'Vencido' : `Vence em ${daysLeft}d`}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => handleDelete(e, cliente.id, cliente.nome)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center text-slate-400 py-12">Nenhum cliente encontrado.</div>
          )}
        </div>
      )}

      <NewClienteModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(id) => navigate(`/clientes/${id}`)}
      />
    </div>
  )
}
