import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Settings, DollarSign, Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Servico {
  id: string
  nome: string
  tipo: 'simples' | 'complexa'
  valor: number
}

const DEFAULT_SERVICOS: Servico[] = [
  { id: 'simples', nome: 'Demanda Simples', tipo: 'simples', valor: 200 },
  { id: 'complexa', nome: 'Demanda Complexa', tipo: 'complexa', valor: 500 },
]

const LS_KEY_SERVICOS = 'consej_servicos'
const LS_KEY_ALERTA = 'consej_alerta_dias'

function loadServicos(): Servico[] {
  try {
    const raw = localStorage.getItem(LS_KEY_SERVICOS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT_SERVICOS
}

export function ConfiguracoesPage() {
  const [alertaDias, setAlertaDias] = useState(() => {
    return localStorage.getItem(LS_KEY_ALERTA) ?? '60'
  })
  const [servicos, setServicos] = useState<Servico[]>(loadServicos)
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<'simples' | 'complexa'>('simples')
  const [novoValor, setNovoValor] = useState('')

  function saveServicos(updated: Servico[]) {
    setServicos(updated)
    localStorage.setItem(LS_KEY_SERVICOS, JSON.stringify(updated))
  }

  function updateServicoValor(id: string, valor: string) {
    saveServicos(servicos.map(s => s.id === id ? { ...s, valor: parseFloat(valor) || 0 } : s))
  }

  function updateServicoNome(id: string, nome: string) {
    saveServicos(servicos.map(s => s.id === id ? { ...s, nome } : s))
  }

  function removeServico(id: string) {
    saveServicos(servicos.filter(s => s.id !== id))
  }

  function addServico() {
    if (!novoNome || !novoValor) { toast.error('Preencha nome e valor'); return }
    const novo: Servico = {
      id: crypto.randomUUID(),
      nome: novoNome,
      tipo: novoTipo,
      valor: parseFloat(novoValor) || 0,
    }
    saveServicos([...servicos, novo])
    setNovoNome('')
    setNovoValor('')
    toast.success('Serviço adicionado!')
  }

  function saveAlerta() {
    localStorage.setItem(LS_KEY_ALERTA, alertaDias)
    toast.success('Configuração salva!')
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Configurações</h1>
      <div className="max-w-2xl space-y-4">

        {/* Serviços e preços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Serviços e Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">Edite os serviços disponíveis e seus respectivos valores.</p>

            <div className="space-y-2">
              {servicos.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Input
                    value={s.nome}
                    onChange={e => updateServicoNome(s.id, e.target.value)}
                    className="flex-1"
                    placeholder="Nome do serviço"
                  />
                  <select
                    value={s.tipo}
                    onChange={e => saveServicos(servicos.map(sv => sv.id === s.id ? { ...sv, tipo: e.target.value as 'simples' | 'complexa' } : sv))}
                    className="px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="simples">Simples</option>
                    <option value="complexa">Complexa</option>
                  </select>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                    <Input
                      type="number"
                      value={s.valor}
                      onChange={e => updateServicoValor(s.id, e.target.value)}
                      className="pl-8"
                      placeholder="0"
                    />
                  </div>
                  <button
                    onClick={() => removeServico(s.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new service */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-slate-600">Adicionar serviço</p>
              <div className="flex items-center gap-2">
                <Input
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Nome do serviço"
                  className="flex-1"
                />
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value as 'simples' | 'complexa')}
                  className="px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="simples">Simples</option>
                  <option value="complexa">Complexa</option>
                </select>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                  <Input
                    type="number"
                    value={novoValor}
                    onChange={e => setNovoValor(e.target.value)}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
                <Button onClick={addServico} size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas de renovação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Alertas de Renovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Alertar quando faltarem (dias)</Label>
              <Input
                type="number"
                value={alertaDias}
                onChange={e => setAlertaDias(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button size="sm" onClick={saveAlerta} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-3.5 h-3.5 mr-1" /> Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sobre o Sistema</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">CONSEJ CRM v2.0</p>
            <p className="text-xs text-slate-400 mt-1">Assessoria Jurídica Júnior — Gestão de relacionamento com clientes e leads passivos.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
