import { useState, useEffect } from 'react'
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useConfiguracoes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Settings, DollarSign, Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { ServicoConfig } from '@/types'

export function ConfiguracoesPage() {
  const { data: config, isLoading } = useConfiguracoes()
  const updateConfig = useUpdateConfiguracoes()

  const [alertaDias, setAlertaDias] = useState('60')
  const [servicos, setServicos] = useState<ServicoConfig[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<'simples' | 'complexa'>('simples')
  const [novoValor, setNovoValor] = useState('')

  // Sync local state when data loads from DB
  useEffect(() => {
    if (config) {
      setAlertaDias(String(config.alerta_renovacao_dias))
      setServicos(config.servicos)
    }
  }, [config])

  function addServico() {
    if (!novoNome || !novoValor) { toast.error('Preencha nome e valor'); return }
    setServicos(prev => [...prev, {
      id: crypto.randomUUID(),
      nome: novoNome,
      tipo: novoTipo,
      valor: parseFloat(novoValor) || 0,
    }])
    setNovoNome('')
    setNovoValor('')
  }

  function saveAll() {
    updateConfig.mutate({
      alerta_renovacao_dias: parseInt(alertaDias) || 60,
      servicos,
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Configurações</h1>
      <div className="max-w-2xl space-y-4">

        {/* Serviços e preços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Serviços e Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Edite os serviços disponíveis e seus respectivos valores.</p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 bg-[rgba(255,255,255,0.04)] rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Input
                      value={s.nome}
                      onChange={e => setServicos(prev => prev.map(sv => sv.id === s.id ? { ...sv, nome: e.target.value } : sv))}
                      className="flex-1"
                      placeholder="Nome do serviço"
                    />
                    <select
                      value={s.tipo}
                      onChange={e => setServicos(prev => prev.map(sv => sv.id === s.id ? { ...sv, tipo: e.target.value as 'simples' | 'complexa' } : sv))}
                      className="form-control-sm"
                    >
                      <option value="simples">Simples</option>
                      <option value="complexa">Complexa</option>
                    </select>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-2 text-fg4 text-sm">R$</span>
                      <Input
                        type="number"
                        value={s.valor}
                        onChange={e => setServicos(prev => prev.map(sv => sv.id === s.id ? { ...sv, valor: parseFloat(e.target.value) || 0 } : sv))}
                        className="pl-8"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => setServicos(prev => prev.filter(sv => sv.id !== s.id))}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-fg4 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new service */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Adicionar serviço</p>
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
                  className="form-control-sm"
                >
                  <option value="simples">Simples</option>
                  <option value="complexa">Complexa</option>
                </select>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-2 text-fg4 text-sm">R$</span>
                  <Input
                    type="number"
                    value={novoValor}
                    onChange={e => setNovoValor(e.target.value)}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
                <Button onClick={addServico} size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
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
          </CardContent>
        </Card>

        {/* Save button */}
        <Button onClick={saveAll} disabled={updateConfig.isPending} className="bg-primary hover:bg-primary/90">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {updateConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>

        <Card>
          <CardHeader><CardTitle className="text-base">Sobre o Sistema</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">CONSEJ CRM v2.0</p>
            <p className="text-xs text-fg4 mt-1">Assessoria Jurídica Júnior — Gestão de relacionamento com clientes e leads passivos.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
