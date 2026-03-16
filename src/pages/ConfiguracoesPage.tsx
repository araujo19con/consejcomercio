import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export function ConfiguracoesPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Configurações</h1>
      <div className="max-w-xl space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Alertas de Renovação</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Alertar quando faltarem (dias)</Label>
              <Input type="number" defaultValue={60} className="max-w-xs" />
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
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
