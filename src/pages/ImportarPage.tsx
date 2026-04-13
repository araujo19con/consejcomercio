import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, X, ArrowRight, Loader2, Users, FileSignature, KanbanSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'importing' | 'done'
type EntityType = 'leads' | 'clientes' | 'contratos'

interface ParsedFile {
  filename: string
  headers: string[]
  rows: Record<string, string>[]
  columnMap: Record<string, string> // crmField → csvColumn
  missing: string[]                 // required fields not found
}

interface ImportResult {
  leads:     { ok: number; err: number }
  clientes:  { ok: number; err: number }
  contratos: { ok: number; err: number }
  log: string[]
}

// ─── Column detection patterns ───────────────────────────────────────────────

const LEAD_PATTERNS: Record<string, string[]> = {
  nome:                 ['nome', 'name', 'contato', 'responsável do lead'],
  empresa:              ['empresa', 'company', 'organização', 'negócio'],
  telefone:             ['telefone', 'phone', 'tel', 'celular', 'whatsapp', 'fone'],
  email:                ['email', 'e-mail', 'mail'],
  segmento:             ['segmento', 'segment', 'tipo de empresa', 'tipo empresa'],
  origem:               ['origem', 'source', 'canal', 'como chegou'],
  status:               ['fase', 'stage', 'status', 'etapa', 'coluna'],
  notas:                ['observações', 'notas', 'notes', 'comentários', 'obs'],
  investimento_estimado:['investimento', 'budget', 'orçamento', 'valor estimado'],
  responsavel:          ['responsável', 'responsavel', 'assigned', 'dono'],
  estado:               ['estado', 'uf', 'estado br', 'estado brasileiro'],
}

const CLIENTE_PATTERNS: Record<string, string[]> = {
  nome:     ['nome', 'name', 'contato', 'cliente'],
  empresa:  ['empresa', 'company', 'organização'],
  telefone: ['telefone', 'phone', 'tel', 'celular', 'whatsapp'],
  email:    ['email', 'e-mail', 'mail'],
  segmento: ['segmento', 'segment', 'tipo de empresa'],
  status:   ['status', 'situação', 'situacao'],
  notas:    ['observações', 'notas', 'notes', 'comentários'],
  estado:   ['estado', 'uf'],
}

const CONTRATO_PATTERNS: Record<string, string[]> = {
  empresa_cliente:    ['empresa', 'company', 'cliente', 'organização'],
  tipo:               ['tipo', 'type', 'modalidade'],
  modelo_precificacao:['modelo', 'precificação', 'precificacao'],
  areas_direito:      ['áreas', 'areas', 'área', 'area', 'serviços', 'servicos'],
  valor_total:        ['valor total', 'total', 'valor'],
  valor_mensal:       ['valor mensal', 'mensal', 'mensalidade'],
  data_inicio:        ['data início', 'data inicio', 'início', 'inicio', 'start'],
  data_fim:           ['data fim', 'data final', 'vencimento', 'fim', 'end'],
  status:             ['status', 'situação'],
  notas:              ['observações', 'notas', 'comentários'],
}

const LEAD_REQUIRED   = ['nome', 'empresa']
const CLIENTE_REQUIRED = ['nome', 'empresa']
const CONTRATO_REQUIRED = ['empresa_cliente']

// ─── Stage / enum maps ───────────────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  'classificação':              'classificacao',
  'classificacao':              'classificacao',
  'levantamento de oportunidade':'levantamento_oportunidade',
  'levantamento':               'levantamento_oportunidade',
  'educar o lead':              'educar_lead',
  'educar lead':                'educar_lead',
  'proposta comercial':         'proposta_comercial',
  'proposta':                   'proposta_comercial',
  'negociação':                 'negociacao',
  'negociacao':                 'negociacao',
  'stand by':                   'stand_by',
  'stand_by':                   'stand_by',
  'ganho – assessoria':         'ganho_assessoria',
  'ganho assessoria':           'ganho_assessoria',
  'ganho – consultoria':        'ganho_consultoria',
  'ganho consultoria':          'ganho_consultoria',
  'ganho':                      'ganho_assessoria',
  'perdido':                    'perdido',
  'cancelado':                  'cancelado',
}

const SEGMENTO_MAP: Record<string, string> = {
  'empresa júnior': 'empresa_junior', 'empresa junior': 'empresa_junior', 'ej': 'empresa_junior',
  'empresa sênior': 'empresa_senior', 'empresa senior': 'empresa_senior',
  'startup': 'startup',
  'arquitetura': 'escritorio_arquitetura', 'escritório': 'escritorio_arquitetura',
  'design': 'empresa_design',
  'gestão': 'empresa_gestao', 'gestao': 'empresa_gestao', 'compliance': 'empresa_gestao',
}

const ORIGEM_MAP: Record<string, string> = {
  'indicação de cliente': 'indicacao_cliente', 'indicacao de cliente': 'indicacao_cliente',
  'indicação cliente': 'indicacao_cliente',
  'indicação de parceiro': 'indicacao_parceiro', 'indicacao de parceiro': 'indicacao_parceiro',
  'evento': 'evento', 'workshop': 'evento',
  'redes sociais': 'redes_sociais', 'instagram': 'redes_sociais', 'linkedin': 'redes_sociais',
  'site': 'site', 'inbound': 'site',
  'mej': 'mej', 'rede mej': 'mej',
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current); current = ''
    } else current += c
  }
  result.push(current)
  return result
}

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.every(v => !v.trim())) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim() })
    rows.push(row)
  }
  return { headers, rows }
}

// ─── Column auto-detection ────────────────────────────────────────────────────

function detectColumns(
  headers: string[],
  patterns: Record<string, string[]>,
  required: string[]
): { columnMap: Record<string, string>; missing: string[] } {
  const columnMap: Record<string, string> = {}
  for (const [field, pats] of Object.entries(patterns)) {
    const found = headers.find(h =>
      pats.some(p => h.toLowerCase().includes(p.toLowerCase()))
    )
    if (found) columnMap[field] = found
  }
  const missing = required.filter(f => !columnMap[f])
  return { columnMap, missing }
}

// ─── Data transformers ────────────────────────────────────────────────────────

function norm(map: Record<string, string>, value: string, fallback: string): string {
  return map[value.toLowerCase().trim()] ?? fallback
}

function parseDate(s: string): string | null {
  if (!s) return null
  const parts = s.split(/[\/\-]/)
  if (parts.length !== 3) return null
  if (parts[0].length === 4) return s
  if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  return null
}

function parseNum(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function g(row: Record<string, string>, col: string | undefined): string {
  return col ? (row[col] ?? '').trim() : ''
}

function buildLead(row: Record<string, string>, map: Record<string, string>) {
  const nome    = g(row, map.nome)
  const empresa = g(row, map.empresa)
  if (!nome || !empresa) return null
  return {
    nome, empresa,
    telefone: g(row, map.telefone) || 'Não informado',
    email:    g(row, map.email) || null,
    segmento: norm(SEGMENTO_MAP, g(row, map.segmento), 'outro'),
    origem:   norm(ORIGEM_MAP,   g(row, map.origem),   'outro'),
    status:   STAGE_MAP[g(row, map.status).toLowerCase()] ?? 'classificacao',
    notas:    g(row, map.notas) || null,
    investimento_estimado: g(row, map.investimento_estimado) || null,
    responsavel: g(row, map.responsavel) || null,
    estado:   g(row, map.estado) || null,
    servicos_interesse: [],
  }
}

function buildCliente(row: Record<string, string>, map: Record<string, string>) {
  const nome    = g(row, map.nome)
  const empresa = g(row, map.empresa)
  if (!nome || !empresa) return null
  const STATUS: Record<string, string> = {
    'ativo': 'ativo', 'em renovação': 'em_renovacao', 'em renovacao': 'em_renovacao', 'encerrado': 'encerrado'
  }
  return {
    nome, empresa,
    segmento: norm(SEGMENTO_MAP, g(row, map.segmento), 'outro'),
    status:   norm(STATUS,       g(row, map.status),   'ativo'),
    telefone: g(row, map.telefone) || null,
    email:    g(row, map.email) || null,
    notas:    g(row, map.notas) || null,
    estado:   g(row, map.estado) || null,
  }
}

function buildContrato(row: Record<string, string>, map: Record<string, string>, clienteId: string) {
  const TIPOS: Record<string, string> = {
    'assessoria': 'assessoria', 'assessoria jurídica': 'assessoria',
    'consultoria': 'consultoria', 'consultoria jurídica': 'consultoria',
    'resgate': 'resgate', 'por resgate': 'resgate',
  }
  const MODELOS: Record<string, string> = {
    'mensal': 'mensal', 'por demanda': 'por_demanda', 'híbrido': 'hibrido', 'hibrido': 'hibrido',
  }
  const STATUS: Record<string, string> = {
    'ativo': 'ativo', 'encerrado': 'encerrado', 'suspenso': 'suspenso',
  }
  const rawAreas = g(row, map.areas_direito)
  const areas = rawAreas ? rawAreas.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean) : ['empresarial']
  return {
    cliente_id: clienteId,
    tipo:                norm(TIPOS,   g(row, map.tipo),                'assessoria'),
    modelo_precificacao: norm(MODELOS, g(row, map.modelo_precificacao), 'mensal'),
    areas_direito: areas,
    valor_total:  parseNum(g(row, map.valor_total)),
    valor_mensal: parseNum(g(row, map.valor_mensal)),
    data_inicio:  parseDate(g(row, map.data_inicio)),
    data_fim:     parseDate(g(row, map.data_fim)),
    status:       norm(STATUS, g(row, map.status), 'ativo'),
    rm_status:    'verificar',
    notas:        g(row, map.notas) || null,
  }
}

// ─── Drop Zone component ─────────────────────────────────────────────────────

interface DropZoneProps {
  entity: EntityType
  label: string
  icon: React.FC<{ className?: string }>
  file: ParsedFile | null
  onFile: (f: ParsedFile) => void
  onClear: () => void
}

function DropZone({ entity: _entity, label, icon: Icon, file, onFile, onClear }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const patterns = _entity === 'leads' ? LEAD_PATTERNS : _entity === 'clientes' ? CLIENTE_PATTERNS : CONTRATO_PATTERNS
  const required = _entity === 'leads' ? LEAD_REQUIRED : _entity === 'clientes' ? CLIENTE_REQUIRED : CONTRATO_REQUIRED

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSVText(text)
      const { columnMap, missing } = detectColumns(headers, patterns, required)
      onFile({ filename: f.name, headers, rows, columnMap, missing })
    }
    reader.readAsText(f, 'UTF-8')
  }, [onFile, patterns, required])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }, [handleFile])

  if (file) {
    const hasError = file.missing.length > 0
    return (
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          background: hasError ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
          border: `1px solid ${hasError ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
        }}
      >
        <span style={{ color: hasError ? '#f87171' : '#34d399' }}><Icon className="w-4 h-4 mt-0.5 shrink-0" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate" style={{ color: 'rgba(220,230,240,0.90)' }}>
              {file.filename}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(150,165,180,0.70)' }}>
              {file.rows.length} registros
            </span>
          </div>
          {hasError ? (
            <p className="text-xs" style={{ color: '#f87171' }}>
              Colunas obrigatórias não encontradas: <strong>{file.missing.join(', ')}</strong>
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'rgba(150,165,180,0.65)' }}>
              {Object.keys(file.columnMap).length} colunas mapeadas automaticamente
            </p>
          )}
        </div>
        <button onClick={onClear} className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(150,165,180,0.60)' }} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all"
      style={{
        background: dragging ? 'rgba(0,137,172,0.08)' : 'rgba(255,255,255,0.03)',
        border: `2px dashed ${dragging ? 'rgba(0,137,172,0.50)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <span style={{ color: 'rgba(0,137,172,0.60)' }}><Icon className="w-6 h-6" /></span>
      <span className="text-sm font-medium" style={{ color: 'rgba(200,215,225,0.75)' }}>{label}</span>
      <span className="text-xs" style={{ color: 'rgba(150,165,180,0.55)' }}>
        Arraste o CSV ou clique para selecionar
      </span>
    </div>
  )
}

// ─── Preview table ────────────────────────────────────────────────────────────

function PreviewTable({ file, entity }: { file: ParsedFile; entity: EntityType }) {
  const patterns = entity === 'leads' ? LEAD_PATTERNS : entity === 'clientes' ? CLIENTE_PATTERNS : CONTRATO_PATTERNS
  const shownFields = Object.keys(patterns).filter(f => file.columnMap[f]).slice(0, 5)
  const sample = file.rows.slice(0, 3)

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              {shownFields.map(f => (
                <th key={f} className="px-3 py-2 text-left font-semibold tracking-wider uppercase" style={{ color: 'rgba(150,165,180,0.60)' }}>
                  {f.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < sample.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {shownFields.map(f => (
                  <td key={f} className="px-3 py-2 truncate max-w-[140px]" style={{ color: 'rgba(200,215,225,0.80)' }}>
                    {g(row, file.columnMap[f])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {file.rows.length > 3 && (
        <div className="px-3 py-1.5 text-xs" style={{ color: 'rgba(150,165,180,0.55)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          + {file.rows.length - 3} registros adicionais
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ImportarPage() {
  const [step, setStep] = useState<Step>('upload')
  const [leadsFile,    setLeadsFile]    = useState<ParsedFile | null>(null)
  const [clientesFile, setClientesFile] = useState<ParsedFile | null>(null)
  const [contratosFile,setContratosFile]= useState<ParsedFile | null>(null)
  const [result,  setResult]  = useState<ImportResult | null>(null)
  const [progress,setProgress]= useState({ current: 0, total: 0, label: '' })

  const hasAnyFile  = leadsFile || clientesFile || contratosFile
  const hasAnyError = [leadsFile, clientesFile, contratosFile].some(f => f && f.missing.length > 0)

  // ── Run import ──────────────────────────────────────────────────────────────
  async function runImport() {
    setStep('importing')
    const log: string[] = []
    const res: ImportResult = {
      leads:     { ok: 0, err: 0 },
      clientes:  { ok: 0, err: 0 },
      contratos: { ok: 0, err: 0 },
      log: [],
    }
    const empresaToClienteId: Record<string, string> = {}

    const total = (leadsFile?.rows.length ?? 0) + (clientesFile?.rows.length ?? 0) + (contratosFile?.rows.length ?? 0)
    let current = 0

    const tick = (label: string) => {
      current++
      setProgress({ current, total, label })
    }

    // 1. Leads
    if (leadsFile) {
      for (const row of leadsFile.rows) {
        const lead = buildLead(row, leadsFile.columnMap)
        if (!lead) { res.leads.err++; tick('Leads…'); continue }
        const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'telefone' })
        if (error) {
          log.push(`✗ Lead "${lead.nome}": ${error.message}`)
          res.leads.err++
        } else {
          res.leads.ok++
        }
        tick(`Leads: ${lead.nome}`)
      }
    }

    // 2. Clientes
    if (clientesFile) {
      for (const row of clientesFile.rows) {
        const cliente = buildCliente(row, clientesFile.columnMap)
        if (!cliente) { res.clientes.err++; tick('Clientes…'); continue }
        const { data, error } = await supabase.from('clientes').insert(cliente).select('id, empresa').single()
        if (error) {
          // Try to find existing
          const { data: ex } = await supabase.from('clientes').select('id, empresa').ilike('empresa', cliente.empresa).limit(1).single()
          if (ex) {
            empresaToClienteId[ex.empresa.toLowerCase()] = ex.id
            log.push(`~ Cliente "${cliente.empresa}" já existe`)
          } else {
            log.push(`✗ Cliente "${cliente.nome}": ${error.message}`)
            res.clientes.err++
          }
        } else if (data) {
          empresaToClienteId[data.empresa.toLowerCase()] = data.id
          res.clientes.ok++
        }
        tick(`Clientes: ${cliente.nome}`)
      }
    }

    // 3. Contratos
    if (contratosFile) {
      for (const row of contratosFile.rows) {
        const empresaRaw = g(row, contratosFile.columnMap['empresa_cliente'])
        let clienteId = empresaToClienteId[empresaRaw.toLowerCase()]

        if (!clienteId) {
          const { data: found } = await supabase.from('clientes').select('id').ilike('empresa', empresaRaw).limit(1).single()
          if (found) {
            clienteId = found.id
            empresaToClienteId[empresaRaw.toLowerCase()] = found.id
          } else {
            log.push(`✗ Contrato: cliente "${empresaRaw}" não encontrado`)
            res.contratos.err++
            tick('Contratos…')
            continue
          }
        }

        const contrato = buildContrato(row, contratosFile.columnMap, clienteId)
        const { error } = await supabase.from('contratos').insert(contrato)
        if (error) {
          log.push(`✗ Contrato de "${empresaRaw}": ${error.message}`)
          res.contratos.err++
        } else {
          res.contratos.ok++
        }
        tick(`Contratos: ${empresaRaw}`)
      }
    }

    res.log = log
    setResult(res)
    setStep('done')
  }

  // ─── Step: Upload ───────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'rgba(230,235,240,0.92)' }}>
          Importar do Pipefy
        </h1>
        <p className="text-sm" style={{ color: 'rgba(150,165,180,0.70)' }}>
          Exporte seus cards do Pipefy como CSV e faça upload abaixo. Os dados são detectados automaticamente.
        </p>
      </div>

      {/* How-to guide */}
      <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(0,137,172,0.06)', border: '1px solid rgba(0,137,172,0.20)' }}>
        <p className="font-medium mb-2" style={{ color: 'rgba(107,208,231,0.90)' }}>Como exportar do Pipefy:</p>
        <ol className="space-y-1 list-decimal list-inside" style={{ color: 'rgba(150,165,180,0.75)' }}>
          <li>Abra o Pipe no Pipefy</li>
          <li>Clique em <strong style={{ color: 'rgba(200,215,225,0.80)' }}>⋮ (menu)</strong> no topo direito</li>
          <li>Selecione <strong style={{ color: 'rgba(200,215,225,0.80)' }}>Export cards</strong> → <strong style={{ color: 'rgba(200,215,225,0.80)' }}>CSV</strong></li>
          <li>Repita para cada tipo de dado abaixo</li>
        </ol>
      </div>

      <div className="space-y-3 mb-6">
        <DropZone entity="leads"     label="Leads (pipeline)"    icon={KanbanSquare} file={leadsFile}     onFile={setLeadsFile}     onClear={() => setLeadsFile(null)} />
        <DropZone entity="clientes"  label="Clientes ganhos"     icon={Users}        file={clientesFile}  onFile={setClientesFile}  onClear={() => setClientesFile(null)} />
        <DropZone entity="contratos" label="Contratos"           icon={FileSignature} file={contratosFile} onFile={setContratosFile} onClear={() => setContratosFile(null)} />
      </div>

      <button
        disabled={!hasAnyFile || hasAnyError}
        onClick={() => setStep('preview')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', color: '#fff' }}
      >
        Continuar
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )

  // ─── Step: Preview ──────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'rgba(230,235,240,0.92)' }}>
          Revisão dos dados
        </h1>
        <p className="text-sm" style={{ color: 'rgba(150,165,180,0.70)' }}>
          Confira os dados que serão importados antes de confirmar.
        </p>
      </div>

      <div className="space-y-6 mb-6">
        {leadsFile && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <KanbanSquare className="w-4 h-4" style={{ color: 'rgba(107,208,231,0.70)' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(220,230,240,0.88)' }}>
                Leads — {leadsFile.rows.length} registros
              </span>
            </div>
            <PreviewTable file={leadsFile} entity="leads" />
          </div>
        )}

        {clientesFile && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: 'rgba(107,208,231,0.70)' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(220,230,240,0.88)' }}>
                Clientes — {clientesFile.rows.length} registros
              </span>
            </div>
            <PreviewTable file={clientesFile} entity="clientes" />
          </div>
        )}

        {contratosFile && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSignature className="w-4 h-4" style={{ color: 'rgba(107,208,231,0.70)' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(220,230,240,0.88)' }}>
                Contratos — {contratosFile.rows.length} registros
              </span>
            </div>
            <PreviewTable file={contratosFile} entity="contratos" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep('upload')}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(200,215,225,0.80)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          Voltar
        </button>
        <button
          onClick={runImport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', color: '#fff' }}
        >
          Importar agora
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // ─── Step: Importing ────────────────────────────────────────────────────────
  if (step === 'importing') return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#0089ac' }} />
      <p className="text-sm font-medium mb-1" style={{ color: 'rgba(220,230,240,0.90)' }}>
        Importando dados…
      </p>
      <p className="text-xs mb-4" style={{ color: 'rgba(150,165,180,0.65)' }}>
        {progress.label}
      </p>
      {progress.total > 0 && (
        <div className="w-64 rounded-full overflow-hidden h-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.round((progress.current / progress.total) * 100)}%`, background: '#0089ac' }}
          />
        </div>
      )}
      <p className="text-xs mt-2" style={{ color: 'rgba(150,165,180,0.50)' }}>
        {progress.current} / {progress.total}
      </p>
    </div>
  )

  // ─── Step: Done ─────────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    const totalOk  = result.leads.ok + result.clientes.ok + result.contratos.ok
    const totalErr = result.leads.err + result.clientes.err + result.contratos.err

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34d399' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'rgba(230,235,240,0.92)' }}>
              Importação concluída
            </h1>
            <p className="text-sm" style={{ color: 'rgba(150,165,180,0.70)' }}>
              {totalOk} registros importados{totalErr > 0 ? `, ${totalErr} erros` : ''}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Leads',     icon: KanbanSquare, data: result.leads },
            { label: 'Clientes',  icon: Users,        data: result.clientes },
            { label: 'Contratos', icon: FileText,     data: result.contratos },
          ].map(({ label, icon: Icon, data }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Icon className="w-4 h-4 mb-2" style={{ color: 'rgba(107,208,231,0.60)' }} />
              <div className="text-2xl font-bold mb-0.5" style={{ color: 'rgba(230,235,240,0.92)' }}>{data.ok}</div>
              <div className="text-xs" style={{ color: 'rgba(150,165,180,0.65)' }}>{label} importados</div>
              {data.err > 0 && (
                <div className="text-xs mt-1" style={{ color: '#f87171' }}>{data.err} erros</div>
              )}
            </div>
          ))}
        </div>

        {/* Error log */}
        {result.log.length > 0 && (
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#f87171' }} />
              <span className="text-sm font-medium" style={{ color: '#f87171' }}>Log de erros</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.log.map((line, i) => (
                <p key={i} className="text-xs font-mono" style={{ color: 'rgba(248,113,113,0.80)' }}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className="flex flex-wrap gap-3">
          {result.leads.ok > 0 && (
            <a href="/leads" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: 'rgba(0,137,172,0.12)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.25)' }}>
              <KanbanSquare className="w-3.5 h-3.5" /> Ver Leads
            </a>
          )}
          {result.clientes.ok > 0 && (
            <a href="/clientes" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: 'rgba(0,137,172,0.12)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.25)' }}>
              <Users className="w-3.5 h-3.5" /> Ver Clientes
            </a>
          )}
          {result.contratos.ok > 0 && (
            <a href="/contratos" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: 'rgba(0,137,172,0.12)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.25)' }}>
              <FileText className="w-3.5 h-3.5" /> Ver Contratos
            </a>
          )}
          <button
            onClick={() => { setStep('upload'); setLeadsFile(null); setClientesFile(null); setContratosFile(null); setResult(null) }}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(200,215,225,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Nova importação
          </button>
        </div>
      </div>
    )
  }

  return null
}
