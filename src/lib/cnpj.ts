// ─── BrasilAPI CNPJ lookup ────────────────────────────────────────────────────

export interface CnpjData {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  email?: string
  ddd_telefone_1?: string
  municipio?: string
  uf?: string
  descricao_situacao_cadastral?: string
  situacao_cadastral?: number  // 2 = ATIVA
  cnae_fiscal: number
  descricao_cnae_fiscal?: string
  porte?: string
  qsa?: { nome_socio: string; qual_socio_descricao: string }[]
}

export type CnpjState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: CnpjData }
  | { status: 'error'; message: string }

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCNPJ(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function cleanCNPJ(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function formatCnpjPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function lookupCnpj(cnpj: string): Promise<CnpjData> {
  const clean = cleanCNPJ(cnpj)
  if (clean.length !== 14) throw new Error('CNPJ deve ter 14 dígitos')
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
  if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal')
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body.includes('message') ? JSON.parse(body).message : `Erro ${res.status}`)
  }
  return res.json() as Promise<CnpjData>
}

// ─── CNAE → segmento mapping ──────────────────────────────────────────────────

export function cnaeToSegmento(cnae: number): string {
  const c = Math.floor(cnae / 100) // use first 4 digits of CNAE
  if ([7111, 7112, 7119].includes(c)) return 'escritorio_arquitetura'
  if ([7410, 7420, 7490].includes(c)) return 'empresa_design'
  if ([5811, 5812, 5813, 5819, 5821, 5822, 5829, 5911, 5912, 5919].includes(c)) return 'empresa_design'
  if ([6201, 6202, 6203, 6209, 6311, 6319, 6391, 6399].includes(c)) return 'startup'
  if ([7020, 7021, 6911, 6912, 6919, 6920, 6621, 6622, 6629].includes(c)) return 'empresa_gestao'
  if ([8531, 8532, 8541, 8542, 8550, 8591, 8592, 8593, 8599].includes(c)) return 'empresa_junior'
  return 'outro'
}
