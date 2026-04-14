import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, Target, Stethoscope, Users, FileText,
  Inbox, CalendarDays, BarChart2, Share2, Handshake, GraduationCap,
  Settings, Map, PlayCircle, ChevronDown, ChevronRight, ArrowRight,
  Lightbulb, Zap, Search, Book,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'

const ONBOARDING_KEY = 'consej_onboarded'

// ─── Workflow step ────────────────────────────────────────────────────────────

function FlowStep({ icon: Icon, label, sub, color, last }: {
  icon: React.FC<{ className?: string }>
  label: string
  sub: string
  color: string
  last?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', color)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-semibold text-foreground mt-1.5 text-center leading-tight w-20">{label}</p>
        <p className="text-[10px] text-muted-foreground text-center leading-tight w-20 mt-0.5">{sub}</p>
      </div>
      {!last && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-[-20px]" />}
    </div>
  )
}

// ─── Module section (accordion) ───────────────────────────────────────────────

interface ModuleDef {
  icon: React.FC<{ className?: string }>
  label: string
  route: string
  color: string
  bg: string
  desc: string
  steps: string[]
  tips: string[]
  tags: string[]
}

function ModuleCard({ mod, open, onToggle }: { mod: ModuleDef; open: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  return (
    <div className={cn('bg-card border rounded-xl overflow-hidden transition-all', open && 'border-primary/30')}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', mod.bg)}>
          <mod.icon className={cn('w-4.5 h-4.5', mod.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{mod.label}</p>
          <p className="text-xs text-muted-foreground truncate">{mod.desc}</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-5 space-y-4 border-t">
          <div className="pt-4 grid sm:grid-cols-2 gap-4">
            {/* How to use */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Como usar
              </p>
              <ol className="space-y-1.5">
                {mod.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" /> Dicas
              </p>
              <ul className="space-y-1.5">
                {mod.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="shrink-0 text-primary mt-0.5">•</span>
                    <span className="leading-snug">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5 flex-wrap">
              {mod.tags.map(t => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
            <button
              onClick={() => navigate(mod.route)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              Ir para {mod.label} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULES: { group: string; items: ModuleDef[] }[] = [
  {
    group: 'Visão Geral',
    items: [
      {
        icon: LayoutDashboard, label: 'Dashboard', route: '/dashboard',
        color: 'text-primary', bg: 'bg-primary/10',
        desc: 'Painel central com métricas, alertas de renovação e resumo dos módulos.',
        steps: [
          'Acesse o Dashboard para ver o resumo do dia: contratos expirando, leads ativos, MRR.',
          'Os cards de "Contratos Expirando" mostram quem precisa de renovação urgente.',
          'O gráfico de pipeline mostra como seus leads estão distribuídos entre as fases.',
          'Clique em qualquer número para navegar direto ao módulo correspondente.',
        ],
        tips: [
          'Confira o Dashboard ao iniciar o dia — ele concentra os alertas mais importantes.',
          'MRR (Receita Mensal Recorrente) reflete apenas contratos com status Ativo.',
          'O botão "Nova Reunião" no dashboard abre o calendário direto.',
        ],
        tags: ['MRR', 'Alertas', 'KPIs'],
      },
      {
        icon: BarChart2, label: 'Analytics', route: '/analytics',
        color: 'text-amber-400', bg: 'bg-amber-500/10',
        desc: 'Win rate, taxa de conversão por fase, desempenho por responsável e motivos de perda.',
        steps: [
          'Acesse Analytics para ver a taxa de conversão global do pipeline.',
          'O gráfico de funil mostra onde mais leads abandonam o processo.',
          'A seção "Por Responsável" compara performance individual de cada membro.',
          'Analise os motivos de perda para identificar objeções recorrentes.',
        ],
        tips: [
          'Win rate saudável para EJs de consultoria jurídica: 20–35%.',
          'Se muitos leads param em "Educar o Lead", o problema é qualificação inicial.',
          'Filtre por período para comparar meses diferentes.',
        ],
        tags: ['Win Rate', 'Funil', 'Performance'],
      },
    ],
  },
  {
    group: 'Pipeline Comercial',
    items: [
      {
        icon: KanbanSquare, label: 'Leads', route: '/leads',
        color: 'text-violet-400', bg: 'bg-violet-500/10',
        desc: 'Kanban com 9 fases — da classificação até ganho ou perda.',
        steps: [
          'Todo contato novo entra em "Classificação" — avalie se tem potencial.',
          'Arraste o card para a próxima fase conforme o avanço da negociação.',
          'Clique no card para abrir os detalhes e registrar notas.',
          'Quando ganhar, mova para "Ganho – Assessoria" ou "Ganho – Consultoria" para converter em cliente.',
        ],
        tips: [
          'Use os filtros de Origem e Segmento para focar em grupos específicos.',
          'Cards em "Stand By" ficam ocultos por padrão — ative o toggle para vê-los.',
          'O diagnóstico comercial deve ser feito antes de montar a proposta.',
          'Motivo de perda é obrigatório ao mover para "Perdido" — isso alimenta o Analytics.',
        ],
        tags: ['Kanban', '9 fases', 'Funil', 'Drag & Drop'],
      },
      {
        icon: Target, label: 'Prospecção', route: '/prospeccao',
        color: 'text-primary', bg: 'bg-primary/10',
        desc: 'Lista de leads ativos ordenada por score de prioridade de abordagem.',
        steps: [
          'Acesse Prospecção para ver quais leads têm mais potencial de fechamento.',
          'O score (0–100) considera: contato disponível, diagnóstico, investimento estimado e estágio.',
          'Filtre por "Só com contato" para ver apenas leads que você pode ligar agora.',
          'Clique no ícone de cópia ao lado do telefone/e-mail para copiar direto.',
        ],
        tips: [
          'Leads com score ≥ 70 (alta prioridade) devem ser abordados primeiro.',
          'Se um lead tem diagnóstico completo + investimento estimado, seu score sobe bastante.',
          'Use o filtro de Estágio para focar em "Proposta Comercial" e "Negociação".',
        ],
        tags: ['Score', 'Prioridade', 'Contatos'],
      },
      {
        icon: Stethoscope, label: 'Diagnóstico', route: '/diagnosticos',
        color: 'text-sky-400', bg: 'bg-sky-500/10',
        desc: 'Formulário guiado que identifica urgências jurídicas e recomenda o serviço ideal.',
        steps: [
          'Aplique o diagnóstico junto com o lead durante a primeira reunião de qualificação.',
          'Responda as perguntas sobre as áreas de direito relevantes para a empresa.',
          'O sistema gera automaticamente um Cluster e lista os serviços mais urgentes.',
          'Use o resultado como base para montar a proposta comercial personalizada.',
        ],
        tips: [
          'O diagnóstico pode ser preenchido antes da reunião e revisado com o lead.',
          'Clusters 1-2 = Governança básica. Cluster 5 = Assessoria completa.',
          'Um diagnóstico completo aumenta significativamente o score na lista de Prospecção.',
        ],
        tags: ['Clusters', 'Recomendação', 'Qualificação'],
      },
    ],
  },
  {
    group: 'Gestão de Clientes',
    items: [
      {
        icon: Users, label: 'Clientes', route: '/clientes',
        color: 'text-emerald-400', bg: 'bg-emerald-500/10',
        desc: 'Base de clientes ativos com contratos, NPS, histórico e oportunidades.',
        steps: [
          'Clientes são criados automaticamente ao converter um lead ganho no pipeline.',
          'Clique no cliente para abrir o perfil detalhado com todas as abas.',
          'Na aba "Dados", use o botão "Editar" para atualizar telefone, e-mail, segmento etc.',
          'Registre o NPS após 3 meses de contrato — promotores são candidatos a indicar.',
        ],
        tips: [
          'NPS ≥ 9 (Promotor): convide para o programa de indicações.',
          'NPS ≤ 6 (Detrator): agende check-in urgente antes que peça cancelamento.',
          'A aba "Histórico" mostra todas as alterações feitas no sistema.',
        ],
        tags: ['NPS', 'Perfil', 'Histórico'],
      },
      {
        icon: FileText, label: 'Contratos', route: '/contratos',
        color: 'text-blue-400', bg: 'bg-blue-500/10',
        desc: 'Contratos de assessoria (recorrente) e consultoria (pontual) com progress de vigência.',
        steps: [
          'Para criar um contrato, acesse o perfil do cliente → aba Contratos → Novo Contrato.',
          'Defina tipo (assessoria/consultoria), modelo de precificação, datas e valores.',
          'A barra de progresso mostra quanto da vigência já passou.',
          'Contratos expirando em 30 dias aparecem em laranja e no Dashboard.',
        ],
        tips: [
          'Marque "Caso Manifesto" (ícone escudo) em contratos com demandas urgentes.',
          'O campo RM Status acompanha o registro de marca — muito importante para clientes de PI.',
          'Contratos encerrados ficam visíveis no histórico do cliente.',
        ],
        tags: ['Assessoria', 'Consultoria', 'Vigência', 'Renovação'],
      },
      {
        icon: Inbox, label: 'Demandas', route: '/demandas',
        color: 'text-indigo-400', bg: 'bg-indigo-500/10',
        desc: 'Serviços jurídicos executados dentro de um contrato ativo.',
        steps: [
          'Crie uma demanda ao receber uma solicitação de um cliente com contrato ativo.',
          'Selecione o contrato, informe título, tipo (simples R$200 / complexa R$500) e área de direito.',
          'Atualize o status conforme o progresso: Aberta → Em Andamento → Concluída.',
          'Demandas concluídas alimentam o cálculo de receita por serviços no Analytics.',
        ],
        tips: [
          'Demandas simples: até 2h de trabalho. Complexas: elaboração de documentos extensos, análises.',
          'Atribua um responsável para facilitar o acompanhamento interno.',
          'Cada demanda registrada gera um audit log visível no histórico do cliente.',
        ],
        tags: ['Serviços', 'Status', 'Cobrança'],
      },
    ],
  },
  {
    group: 'Agenda & Comunicação',
    items: [
      {
        icon: CalendarDays, label: 'Reuniões', route: '/reunioes',
        color: 'text-cyan-400', bg: 'bg-cyan-500/10',
        desc: 'Calendário semanal de reuniões com equipe e clientes.',
        steps: [
          'Clique em "Nova Reunião" e preencha título, data/hora, duração e participantes.',
          'Cole o link da videochamada (Meet, Zoom) para acesso direto pelo card.',
          'Após a reunião, marque como "Realizada" ou "Cancelada".',
          '"Próximas Reuniões" lista as agendadas em ordem cronológica abaixo do calendário.',
        ],
        tips: [
          'Adicione os e-mails dos participantes — os avatares aparecem no card.',
          'Use o campo "Local" para reuniões presenciais ou híbridas.',
          'Navegue semanas com as setas ou clique "Hoje" para voltar à semana atual.',
        ],
        tags: ['Calendário', 'Video', 'Participantes'],
      },
    ],
  },
  {
    group: 'Crescimento',
    items: [
      {
        icon: Share2, label: 'Indicações', route: '/indicacoes',
        color: 'text-pink-400', bg: 'bg-pink-500/10',
        desc: 'Rastrea quem indicou quem e o status do lead indicado.',
        steps: [
          'Indicações são criadas automaticamente quando um lead entra com origem "Indicação de Cliente".',
          'Acompanhe o status: Pendente → Contactado → Em Negociação → Convertido.',
          'Quando o lead é convertido, marque a recompensa como entregue.',
          'No perfil do cliente indicante, a aba Indicações mostra todas as suas indicações.',
        ],
        tips: [
          'Clientes com NPS ≥ 9 têm 3x mais probabilidade de indicar.',
          'Defina a recompensa antes de pedir a indicação — transparência gera confiança.',
        ],
        tags: ['Referral', 'Programa', 'Recompensas'],
      },
      {
        icon: Handshake, label: 'Parceiros', route: '/parceiros',
        color: 'text-orange-400', bg: 'bg-orange-500/10',
        desc: 'Empresas e profissionais que enviam leads para a CONSEJ.',
        steps: [
          'Cadastre parceiros estratégicos: outras EJs, escritórios, startups, designers.',
          'Defina o tipo de recompensa combinada (desconto, presente, sem recompensa).',
          'Quando um lead entrar via parceiro, selecione o parceiro no campo "Referido por".',
          'Acompanhe quantos leads cada parceiro enviou.',
        ],
        tips: [
          'Parceiros EJs (MEJ) são muito eficazes — a rede de EJs troca referências.',
          'Mantenha os dados de contato atualizados para acionar parceiros rapidamente.',
        ],
        tags: ['B2B', 'Referral', 'Rede'],
      },
      {
        icon: GraduationCap, label: 'Pós-Juniors', route: '/pos-juniors',
        color: 'text-teal-400', bg: 'bg-teal-500/10',
        desc: 'Cadastro e acompanhamento de ex-membros da CONSEJ.',
        steps: [
          'Cadastre ex-membros com nome, cargo atual, empresa e contato.',
          'Registre a área de atuação profissional para identificar colaborações.',
          'Use a lista para networking, indicações e projetos especiais.',
        ],
        tips: [
          'Ex-membros são potenciais clientes, parceiros ou indicantes futuros.',
          'Mantenha contato periódico — alumni são embaixadores da marca CONSEJ.',
        ],
        tags: ['Alumni', 'Networking', 'Ex-membros'],
      },
    ],
  },
  {
    group: 'Configuração',
    items: [
      {
        icon: Settings, label: 'Configurações', route: '/configuracoes',
        color: 'text-muted-foreground', bg: 'bg-muted',
        desc: 'Alertas de renovação, tabela de preços e preferências do sistema.',
        steps: [
          'Defina o prazo de alerta de renovação (padrão: 60 dias antes do vencimento).',
          'Configure os preços dos serviços (demanda simples e complexa).',
          'Salve as configurações — elas persistem para toda a equipe.',
        ],
        tips: [
          'Ajuste o alerta de renovação para 90 dias se o ciclo de renovação for longo.',
          'Os preços configurados aqui são usados nos cálculos de receita por demandas.',
        ],
        tags: ['Preços', 'Alertas', 'Preferências'],
      },
      {
        icon: Map, label: 'Mapa', route: '/mapa',
        color: 'text-green-400', bg: 'bg-green-500/10',
        desc: 'Visualização geográfica de clientes e leads por estado.',
        steps: [
          'O mapa mostra onde estão concentrados seus leads e clientes por UF.',
          'Clique em um estado para ver a lista de leads/clientes daquela região.',
          'Use os filtros para alternar entre leads e clientes.',
        ],
        tips: [
          'Estados com alta concentração podem indicar oportunidade de evento presencial.',
          'O campo "Estado" no perfil do lead/cliente alimenta o mapa.',
        ],
        tags: ['Geográfico', 'UF', 'Distribuição'],
      },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AjudaPage() {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  function handleTour() {
    localStorage.removeItem(ONBOARDING_KEY)
    window.location.reload()
  }

  // Flatten and filter modules
  const allMods = MODULES.flatMap(g => g.items)
  const filtered = search.trim()
    ? allMods.filter(m =>
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.desc.toLowerCase().includes(search.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        m.steps.some(s => s.toLowerCase().includes(search.toLowerCase()))
      )
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            Central de Ajuda
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manual completo do CONSEJ CRM — clique em qualquer módulo para expandir
          </p>
        </div>
        <button
          onClick={handleTour}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
        >
          <PlayCircle className="w-4 h-4" />
          Tour guiado
        </button>
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar módulo, ação ou dúvida…" className="w-full" />

      {/* Workflow diagram */}
      {!search && (
        <div className="bg-card border rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Fluxo comercial típico
          </p>
          <div className="flex items-start flex-wrap gap-y-4 gap-x-1">
            <FlowStep icon={KanbanSquare} label="Lead entra" sub="Classificação" color="bg-violet-500/10 border-violet-500/20 text-violet-400" />
            <FlowStep icon={Stethoscope} label="Diagnóstico" sub="Qualificação" color="bg-sky-500/10 border-sky-500/20 text-sky-400" />
            <FlowStep icon={Target} label="Proposta" sub="Negociação" color="bg-amber-500/10 border-amber-500/20 text-amber-400" />
            <FlowStep icon={Users} label="Conversão" sub="Novo cliente" color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
            <FlowStep icon={FileText} label="Contrato" sub="Assessoria/Consultoria" color="bg-blue-500/10 border-blue-500/20 text-blue-400" />
            <FlowStep icon={Inbox} label="Demandas" sub="Execução" color="bg-indigo-500/10 border-indigo-500/20 text-indigo-400" last />
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
            Em paralelo: <span className="text-foreground">Reuniões</span> para avançar negociações ·
            <span className="text-foreground"> Analytics</span> para monitorar performance ·
            <span className="text-foreground"> Indicações</span> para crescimento orgânico
          </p>
        </div>
      )}

      {/* Search results */}
      {filtered !== null ? (
        <div className="space-y-2">
          {filtered.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">{filtered.length} módulo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
              {filtered.map(mod => (
                <ModuleCard
                  key={mod.label}
                  mod={mod}
                  open={openId === mod.label}
                  onToggle={() => setOpenId(openId === mod.label ? null : mod.label)}
                />
              ))}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum módulo encontrado para "{search}"</p>
            </div>
          )}
        </div>
      ) : (
        /* Module groups */
        <div className="space-y-5">
          {MODULES.map(group => (
            <div key={group.group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">{group.group}</p>
              <div className="space-y-2">
                {group.items.map(mod => (
                  <ModuleCard
                    key={mod.label}
                    mod={mod}
                    open={openId === mod.label}
                    onToggle={() => setOpenId(openId === mod.label ? null : mod.label)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          Dúvidas adicionais? Use a busca global <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd> para navegar rapidamente para qualquer módulo.
        </span>
      </div>
    </div>
  )
}
