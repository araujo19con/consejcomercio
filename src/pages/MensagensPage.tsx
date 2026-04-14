import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Check, Smartphone, Mail, Linkedin, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'primeiro_contato' | 'followup' | 'diagnostico' | 'proposta' | 'negociacao' | 'pos_fechamento' | 'reativacao'
type Sector = 'empresarial' | 'trabalhista' | 'familia' | 'imobiliario' | 'tributario' | 'consumidor' | 'contratual' | 'previdenciario' | 'geral'
type Channel = 'whatsapp' | 'email' | 'linkedin'

interface MsgTemplate { subject?: string; body: string }
type TemplateMap = Partial<Record<Sector, MsgTemplate[]>>
type Templates = Record<Stage, Record<Channel, TemplateMap>>

// ─── Static data ──────────────────────────────────────────────────────────────

const STAGES: { id: Stage; label: string; colorVal: string; bgVal: string }[] = [
  { id: 'primeiro_contato', label: 'Primeiro Contato',   colorVal: '#93c5fd', bgVal: 'rgba(59,130,246,0.12)'   },
  { id: 'followup',         label: 'Follow-up',          colorVal: '#c4b5fd', bgVal: 'rgba(139,92,246,0.12)'  },
  { id: 'diagnostico',      label: 'Diagnóstico',        colorVal: '#67e8f9', bgVal: 'rgba(6,182,212,0.12)'   },
  { id: 'proposta',         label: 'Proposta Enviada',   colorVal: '#fbbf24', bgVal: 'rgba(245,158,11,0.12)'  },
  { id: 'negociacao',       label: 'Negociação',         colorVal: '#fdba74', bgVal: 'rgba(249,115,22,0.12)'  },
  { id: 'pos_fechamento',   label: 'Pós-Fechamento',     colorVal: '#6ee7b7', bgVal: 'rgba(16,185,129,0.12)'  },
  { id: 'reativacao',       label: 'Reativação',         colorVal: '#fda4af', bgVal: 'rgba(244,63,94,0.12)'   },
]

const SECTORS: { id: Sector; label: string; emoji: string }[] = [
  { id: 'geral',           label: 'Geral',                     emoji: '⚖️'  },
  { id: 'empresarial',     label: 'Empresarial / Societário',  emoji: '🏢'  },
  { id: 'trabalhista',     label: 'Trabalhista',               emoji: '👷'  },
  { id: 'familia',         label: 'Família e Sucessões',       emoji: '👨‍👩‍👧'  },
  { id: 'imobiliario',     label: 'Imobiliário',               emoji: '🏠'  },
  { id: 'tributario',      label: 'Tributário / Fiscal',       emoji: '📊'  },
  { id: 'consumidor',      label: 'Direito do Consumidor',     emoji: '🛒'  },
  { id: 'contratual',      label: 'Contratos e Compliance',    emoji: '📝'  },
  { id: 'previdenciario',  label: 'Previdenciário',            emoji: '🏛️'  },
]

const CHANNELS: { id: Channel; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
  { id: 'email',    label: 'E-mail',   icon: Mail        },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin    },
]

// ─── Template helper ──────────────────────────────────────────────────────────

function fill(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? `[${k}]`)
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Templates = {

  /* ────────────────── PRIMEIRO CONTATO ────────────────── */
  primeiro_contato: {
    whatsapp: {
      empresarial: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nMeu nome é {{responsavel}}, sou advogada na CONSEJ Advocacia.\n\nAtuamos com assessoria jurídica empresarial — contratos, societário e compliance — para empresas que querem crescer com segurança jurídica.\n\nTeria 15 minutinhos para uma conversa rápida essa semana?` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Vi que você está à frente da {{empresa}} e acredito que podemos agregar bastante na área jurídica.\n\nPodemos marcar uma conversa rápida? Prometo ser breve! 😄` },
      ],
      trabalhista: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Trabalhamos com assessoria trabalhista preventiva — ajudando empresas a evitar passivos e gerir contratos de trabalho com segurança.\n\nTem um tempinho essa semana para conversarmos? 😊` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nMeu nome é {{responsavel}}, advogada trabalhista na CONSEJ. Sabemos o quanto o compliance trabalhista pode ser desafiador para empresas em crescimento como a {{empresa}}.\n\nPodemos marcar 15 min para eu te mostrar como podemos ajudar?` },
      ],
      familia: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nMeu nome é {{responsavel}}, sou advogada na CONSEJ Advocacia. Atuamos com Direito de Família e Sucessões — inventários, divórcios, planejamento patrimonial — com foco em resolver questões sensíveis com agilidade e discrição.\n\nSe você ou alguém próximo precisar, estarei à disposição!` },
        { body: `Oi, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Trabalhamos com planejamento sucessório e questões familiares com muito cuidado e sigilo.\n\nCaso queira conversar sobre proteção patrimonial ou qualquer demanda familiar, é só me chamar! 😊` },
      ],
      imobiliario: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Atuamos com assessoria jurídica imobiliária — análise de contratos, due diligence e regularização de imóveis — para quem quer transacionar com total segurança.\n\nTem interesse em conversarmos? 😊` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nMeu nome é {{responsavel}}, advogada na CONSEJ. Sabemos que toda transação imobiliária envolve riscos jurídicos que podem ser evitados com a assessoria certa.\n\nPodemos marcar uma conversa rápida esta semana?` },
      ],
      tributario: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nSou {{responsavel}}, da CONSEJ Advocacia. Trabalhamos com planejamento tributário e contencioso fiscal — ajudando empresas a reduzir sua carga tributária de forma legal e segura.\n\nTem como conversarmos essa semana?` },
        { body: `Oi, {{nome}}!\n\nMeu nome é {{responsavel}}, advogada tributarista na CONSEJ. Empresas como a {{empresa}} frequentemente pagam mais impostos do que o necessário por falta de planejamento adequado.\n\nGostaria de te mostrar como podemos ajudar. Tem 15 min esta semana?` },
      ],
      consumidor: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Atuamos com Direito do Consumidor — tanto na defesa de consumidores quanto na assessoria de empresas para adequação às normas do CDC.\n\nPodemos conversar rapidamente? 😊` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nMeu nome é {{responsavel}}, da CONSEJ Advocacia. Sei que adequar a {{empresa}} ao CDC pode gerar dúvidas — estamos aqui para simplificar isso.\n\nTem um tempinho para conversarmos esta semana?` },
      ],
      contratual: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nSou {{responsavel}}, da CONSEJ Advocacia. Somos especialistas em elaboração, revisão e gestão de contratos comerciais — ajudando empresas a fechar negócios com segurança.\n\nPodemos marcar uma conversa rápida?` },
        { body: `Oi, {{nome}}!\n\nMeu nome é {{responsavel}}, da CONSEJ. Sabemos que contratos mal redigidos são uma das maiores fontes de litígio para empresas.\n\nGostaria de mostrar como podemos blindar juridicamente os contratos da {{empresa}}. Tem 15 min esta semana?` },
      ],
      previdenciario: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Atuamos com Direito Previdenciário — aposentadorias, revisões de benefícios e recursos administrativos — para garantir que você receba o que tem direito.\n\nPodemos conversar? 😊` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nMeu nome é {{responsavel}}, da CONSEJ Advocacia. Muitas pessoas deixam de receber benefícios previdenciários por falta de orientação adequada.\n\nGostaria de fazer uma análise gratuita do seu caso. Tem interesse?` },
      ],
      geral: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nMeu nome é {{responsavel}}, sou advogada na CONSEJ Advocacia. Trabalhamos com assessoria jurídica para pessoas e empresas que buscam resolver questões legais com agilidade e segurança.\n\nPosso te contar mais sobre o nosso trabalho?` },
        { body: `Oi, {{nome}}! Tudo certo?\n\nSou {{responsavel}}, da CONSEJ Advocacia. Temos ajudado pessoas e empresas a resolver demandas jurídicas de forma eficiente e acessível.\n\nGostaria de marcar uma conversa rápida para entender melhor como posso te ajudar? 😊` },
      ],
    },
    email: {
      empresarial: [
        {
          subject: `Assessoria Jurídica Empresarial para a {{empresa}}`,
          body: `Olá, {{nome}},\n\nEspero que esteja bem!\n\nMeu nome é {{responsavel}} e faço parte da equipe da CONSEJ Advocacia. Trabalhamos com assessoria jurídica empresarial, apoiando empresas como a {{empresa}} em:\n\n• Elaboração e revisão de contratos\n• Estruturação e reestruturação societária\n• Compliance e gestão de riscos jurídicos\n• Resolução de disputas e litígios\n\nGostaria de agendar uma conversa de 20 minutos para entender melhor as necessidades da {{empresa}} e apresentar como podemos contribuir.\n\nEstaria disponível ainda esta semana?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      trabalhista: [
        {
          subject: `Assessoria Trabalhista Preventiva — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nMeu nome é {{responsavel}}, advogada na CONSEJ Advocacia.\n\nEntrei em contato porque trabalhamos com assessoria trabalhista preventiva para empresas em crescimento — auxiliando na elaboração de contratos de trabalho, gestão de passivos e treinamentos de compliance.\n\nEmpesas que investem em prevenção reduzem significativamente o risco de ações trabalhistas e passivos ocultos.\n\nGostaria de marcar uma conversa rápida para conhecer melhor a realidade da {{empresa}}?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      imobiliario: [
        {
          subject: `Assessoria Jurídica Imobiliária — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nMeu nome é {{responsavel}}, da CONSEJ Advocacia.\n\nAtuamos com assessoria jurídica imobiliária completa — análise de contratos de compra e venda, due diligence, regularização de imóveis e contencioso.\n\nSabemos que cada negócio imobiliário envolve riscos que podem ser mitigados com a assessoria certa desde o início.\n\nGostaria de agendar uma conversa breve para entender sua demanda e apresentar como podemos ajudar?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      tributario: [
        {
          subject: `Redução de Carga Tributária — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nMeu nome é {{responsavel}}, tributarista na CONSEJ Advocacia.\n\nMuitas empresas pagam mais impostos do que o necessário pela ausência de planejamento tributário adequado. Nossa equipe atua na identificação de oportunidades legais de redução de carga tributária e na defesa em contencioso fiscal.\n\nGostaria de agendar uma análise preliminar gratuita da situação tributária da {{empresa}}?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      geral: [
        {
          subject: `CONSEJ Advocacia — Assessoria Jurídica para {{empresa}}`,
          body: `Olá, {{nome}},\n\nEspero encontrá-lo(a) bem!\n\nMeu nome é {{responsavel}} e faço parte da equipe da CONSEJ Advocacia. Somos um escritório comprometido em oferecer assessoria jurídica ágil e acessível para pessoas e empresas.\n\nGostaríamos de entender melhor as suas necessidades jurídicas e apresentar como podemos contribuir.\n\nPodemos marcar uma conversa rápida ainda esta semana?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      empresarial: [
        { body: `Olá, {{nome}}! Vi o seu trabalho à frente da {{empresa}} e fiquei muito impressionado(a) com o que vocês estão construindo.\n\nSou {{responsavel}}, advogada na CONSEJ Advocacia — trabalhamos com assessoria jurídica empresarial para empresas em crescimento.\n\nGostaria de trocar uma ideia sobre como podemos apoiar a {{empresa}} juridicamente. Seria possível marcarmos uma conversa rápida?` },
      ],
      trabalhista: [
        { body: `Olá, {{nome}}! Acompanho o trabalho da {{empresa}} e admiro muito o que vocês têm feito.\n\nSou {{responsavel}}, advogada trabalhista na CONSEJ Advocacia. Apoiamos empresas em crescimento a estruturar relações trabalhistas sólidas e a mitigar riscos de passivos.\n\nPodemos conversar sobre isso? Tenho algumas ideias que podem ser relevantes para a {{empresa}}.` },
      ],
      geral: [
        { body: `Olá, {{nome}}! Tive a oportunidade de conhecer seu trabalho e fiquei com vontade de conversar.\n\nSou {{responsavel}}, da CONSEJ Advocacia — trabalhamos com assessoria jurídica personalizada para pessoas e empresas.\n\nSeria possível trocarmos uma ideia sobre como posso contribuir? Ficarei feliz em agendar uma conversa breve no horário que for melhor para você.` },
      ],
    },
  },

  /* ────────────────── FOLLOW-UP ────────────────── */
  followup: {
    whatsapp: {
      geral: [
        { body: `Oi, {{nome}}! Tudo bem? 😊\n\nPassando para dar um oi e ver se você teve a oportunidade de pensar na nossa conversa.\n\nCaso tenha surgido alguma dúvida ou queira saber mais sobre como a CONSEJ pode te ajudar, é só me chamar!\n\n{{responsavel}} — CONSEJ Advocacia` },
        { body: `Olá, {{nome}}! Tudo certo?\n\nSei que a rotina é corrida, mas queria retomar nossa conversa. Acredito que temos muito a oferecer para {{empresa}}.\n\nTem 15 minutos essa semana para conversarmos?\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      empresarial: [
        { body: `Oi, {{nome}}! 😊\n\nPassando para retomar nosso contato. Sei que é uma semana agitada, mas queria reforçar: estamos prontos para apoiar a {{empresa}} com assessoria jurídica empresarial sob medida.\n\nQuando tiver um tempinho, me chama! 🙂\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      trabalhista: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nSei que o dia a dia da {{empresa}} é intenso, então vou ser breve: gostaria de retomar nossa conversa sobre assessoria trabalhista preventiva.\n\nQuando for um bom momento? 😊\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      tributario: [
        { body: `Oi, {{nome}}! Tudo certo?\n\nRetomando nossa conversa — ainda estou convicto(a) de que há oportunidades reais de otimização tributária para a {{empresa}}.\n\nPodemos marcar 20 minutos para eu te mostrar um diagnóstico inicial? 😊\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Re: Assessoria Jurídica — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nEspero que esteja tudo bem!\n\nEntro em contato para dar continuidade à nossa conversa. Sei que o dia a dia é muito agitado, por isso quero facilitar ao máximo.\n\nCaso ainda faça sentido, estou disponível para uma conversa rápida de 15–20 minutos no horário que for melhor para você.\n\nSe preferir, posso te enviar uma proposta inicial por aqui mesmo — é só me dizer!\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      empresarial: [
        {
          subject: `Seguindo nosso contato — {{empresa}} + CONSEJ`,
          body: `Olá, {{nome}},\n\nEspero que esteja tudo bem!\n\nRetomo nosso contato para saber se você teve a oportunidade de refletir sobre a assessoria jurídica empresarial para a {{empresa}}.\n\nEstou à disposição para uma conversa rápida ou para encaminhar um diagnóstico inicial sem compromisso.\n\nQuando seria um bom momento?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `Olá, {{nome}}! Passando para retomar nossa conversa.\n\nSei que a agenda costuma estar cheia, mas gostaria de manter o contato. Caso queira saber mais sobre como a CONSEJ pode apoiar a {{empresa}}, é só me chamar.\n\nUm ótimo dia! 😊\n\n{{responsavel}}` },
      ],
    },
  },

  /* ────────────────── DIAGNÓSTICO ────────────────── */
  diagnostico: {
    whatsapp: {
      geral: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nPassando para confirmar nossa reunião de diagnóstico!\n\n📅 Data e horário: [data]\n📍 Local/Link: [link]\n\nO diagnóstico dura cerca de 40 minutos e é totalmente gratuito. Nele vamos entender sua situação atual e identificar as melhores soluções jurídicas para você.\n\nQualquer dúvida, me chama! Até lá!\n\n{{responsavel}} — CONSEJ Advocacia` },
        { body: `Oi, {{nome}}! 😊\n\nFicou confirmado o nosso diagnóstico!\n\nEnquanto isso, se puder me contar um pouquinho mais sobre sua principal demanda jurídica, consigo me preparar melhor para nossa conversa.\n\nNos vemos em breve!\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      empresarial: [
        { body: `Olá, {{nome}}! Tudo bem?\n\nConfirmado nosso diagnóstico jurídico da {{empresa}}! 🎯\n\nPara aproveitar melhor o nosso tempo, seria possível você trazer:\n• Principais contratos em andamento\n• Estrutura societária atual\n• Principais dores/riscos que identificam hoje\n\nNos vemos em breve! 😊\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      trabalhista: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nConfirmando nosso diagnóstico trabalhista!\n\nSe possível, traga uma ideia de:\n• Número de colaboradores\n• Principais modalidades de contratação (CLT, PJ, autônomo…)\n• Se já houve ações trabalhistas recentes\n\nIsso vai nos ajudar a ser muito mais assertivos! Até lá!\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Confirmação — Diagnóstico Jurídico CONSEJ`,
          body: `Olá, {{nome}},\n\nTudo certo para o nosso diagnóstico jurídico!\n\n📅 Data: [data]\n🕐 Horário: [horário]\n📍 Local/Link: [link]\n\nO diagnóstico tem duração de aproximadamente 40 minutos e é totalmente gratuito. Nosso objetivo é entender profundamente sua situação e identificar as melhores soluções jurídicas.\n\nCaso precise reagendar, basta me avisar com antecedência.\n\nAté breve!\n\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      empresarial: [
        {
          subject: `Diagnóstico Jurídico — {{empresa}} + CONSEJ`,
          body: `Olá, {{nome}},\n\nConfirmado o nosso diagnóstico jurídico da {{empresa}}!\n\n📅 Data: [data] | 🕐 Horário: [horário]\n\nPara otimizar nossa reunião, seria muito útil se você pudesse trazer um breve panorama sobre:\n\n• Estrutura societária e contratos principais em vigor\n• Maiores riscos jurídicos percebidos atualmente\n• Objetivos de crescimento para os próximos 12 meses\n\nCom essas informações, conseguimos ser muito mais precisos e propor soluções realmente relevantes.\n\nAté breve!\n\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `{{nome}}, tudo confirmado para nosso diagnóstico! 🎯\n\nEstou animado(a) para entender melhor a sua situação e apresentar como a CONSEJ pode contribuir.\n\nCaso precise reagendar, é só me avisar.\n\nAté logo!\n{{responsavel}}` },
      ],
    },
  },

  /* ────────────────── PROPOSTA ────────────────── */
  proposta: {
    whatsapp: {
      geral: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nAcabei de encaminhar a proposta da CONSEJ para você! 📄\n\nFique à vontade para ler com calma. Qualquer dúvida sobre valores, escopo ou forma de atuação, é só me chamar — vou adorar te explicar!\n\nEspero que faça muito sentido para você. 🙂\n\n{{responsavel}} — CONSEJ Advocacia` },
        { body: `Oi, {{nome}}! Proposta enviada! 🎉\n\nMontamos uma solução especialmente pensada para a sua situação. Se quiser, posso te apresentar em uma chamada rápida de 15 min os pontos principais.\n\nQuando for bom para você?\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      empresarial: [
        { body: `Olá, {{nome}}! 😊\n\nA proposta de assessoria jurídica para a {{empresa}} foi encaminhada!\n\nEla contempla [escopo acordado] com dedicação exclusiva da nossa equipe.\n\nGostaria de apresentá-la pessoalmente para tirar todas as dúvidas? Consigo um slot ainda essa semana.\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      tributario: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nProporta de planejamento tributário enviada!\n\nBaseamos tudo no que conversamos — levantamos oportunidades reais de economia para a {{empresa}}.\n\nQuando puder, me diz o que achou! Estou à disposição para qualquer ajuste.\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Proposta de Serviços Jurídicos — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nSegue em anexo a proposta de serviços jurídicos da CONSEJ Advocacia, elaborada especialmente com base nas necessidades que identificamos em nossa conversa.\n\nA proposta contempla:\n• [Item 1]\n• [Item 2]\n• [Item 3]\n\nEstou à inteira disposição para apresentá-la pessoalmente e esclarecer qualquer dúvida sobre escopo, valores ou forma de atuação.\n\nAguardo seu retorno!\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
      empresarial: [
        {
          subject: `Proposta de Assessoria Jurídica — {{empresa}}`,
          body: `Olá, {{nome}},\n\nConforme combinado, segue em anexo a proposta de assessoria jurídica empresarial para a {{empresa}}.\n\nEla foi desenhada para atender às suas necessidades específicas, com foco em:\n• Segurança contratual e societária\n• Prevenção e gestão de riscos jurídicos\n• Suporte ágil e próximo ao dia a dia da empresa\n\nCaso queira agendar uma apresentação rápida, fico à disposição.\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `{{nome}}, proposta enviada por e-mail! 📄\n\nMontamos algo personalizado para a sua situação. Qualquer dúvida ou ajuste que queira discutir, pode me chamar aqui mesmo.\n\nAguardo seu retorno!\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
  },

  /* ────────────────── NEGOCIAÇÃO ────────────────── */
  negociacao: {
    whatsapp: {
      geral: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nPassando para saber se você teve a oportunidade de analisar nossa proposta e se surgiu alguma dúvida ou ponto que queira discutir.\n\nEstamos abertos para conversar sobre qualquer ajuste que faça sentido para vocês!\n\n{{responsavel}} — CONSEJ Advocacia` },
        { body: `Oi, {{nome}}! 😊\n\nQueria saber se a proposta ficou clara ou se tem algum ponto que gostaria de ajustar.\n\nNão precisa decidir agora — pode me contar o que está passando pela sua cabeça que resolvo! 🙂\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      empresarial: [
        { body: `Olá, {{nome}}! Tudo certo?\n\nRetomando a conversa sobre a assessoria para a {{empresa}}. Sei que é uma decisão importante — e justamente por isso estou aqui para garantir que a proposta esteja 100% alinhada com o que vocês precisam.\n\nHá algum ponto que gostariam de ajustar ou discutir?\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Dúvidas sobre a proposta? — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nEspero que esteja tudo bem!\n\nEntro em contato para verificar se surgiu alguma dúvida sobre a proposta enviada e se há pontos que gostaria de discutir ou ajustar.\n\nEstamos abertos a conversar sobre escopo, valores e condições para que a parceria faça total sentido para a {{empresa}}.\n\nQuando for conveniente, podemos agendar uma ligação rápida?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `{{nome}}, tudo bem?\n\nPassando para retomar nossa conversa sobre a proposta. Se houver qualquer dúvida ou ponto que queira discutir, estou à disposição.\n\nComo estão vendo até agora?\n\n{{responsavel}}` },
      ],
    },
  },

  /* ────────────────── PÓS-FECHAMENTO ────────────────── */
  pos_fechamento: {
    whatsapp: {
      geral: [
        { body: `Olá, {{nome}}! 🎉\n\nMuito feliz em ter você como cliente da CONSEJ Advocacia!\n\nEm breve nossa equipe entrará em contato para alinhar os próximos passos e iniciar nossos trabalhos. Qualquer dúvida até lá, pode me chamar!\n\nSeja muito bem-vindo(a)! 😊\n\n{{responsavel}} — CONSEJ Advocacia` },
        { body: `Oi, {{nome}}! Bem-vindo(a) à CONSEJ! 🎉\n\nEstamos muito animados para trabalhar junto com você e a {{empresa}}!\n\nVou te enviar um e-mail com todas as informações de onboarding. Qualquer dúvida, pode contar comigo!\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
      empresarial: [
        { body: `Olá, {{nome}}! Que ótima notícia! 🎉\n\nSeja muito bem-vindo(a) à CONSEJ Advocacia!\n\nVamos iniciar o onboarding jurídico da {{empresa}} o quanto antes. Vou te enviar um e-mail com o checklist de documentos que precisamos para começar.\n\nEstamos animados com essa parceria! 💪\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Bem-vindo(a) à CONSEJ Advocacia, {{nome}}! 🎉`,
          body: `Olá, {{nome}},\n\nÉ um prazer tê-lo(a) como cliente da CONSEJ Advocacia!\n\nA partir de agora, você conta com nossa equipe dedicada para apoiar todas as suas demandas jurídicas com agilidade e comprometimento.\n\nPara darmos início aos trabalhos, precisaremos de alguns documentos:\n• [Documento 1]\n• [Documento 2]\n\nNosso canal de comunicação principal será [canal]. Nossa equipe estará disponível de segunda a sexta, das 9h às 18h.\n\nQualquer dúvida, estamos à disposição!\n\nSeja muito bem-vindo(a)!\n\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `{{nome}}, que notícia incrível! 🎉\n\nSeja muito bem-vindo(a) à família CONSEJ Advocacia!\n\nEstamos empolgados para iniciar nossa parceria e contribuir com o crescimento da {{empresa}}.\n\nEm breve, nossa equipe entrará em contato com os próximos passos. Muito obrigado pela confiança!\n\n{{responsavel}} — CONSEJ Advocacia` },
      ],
    },
  },

  /* ────────────────── REATIVAÇÃO ────────────────── */
  reativacao: {
    whatsapp: {
      geral: [
        { body: `Olá, {{nome}}! Quanto tempo! 😊\n\nSou {{responsavel}}, da CONSEJ Advocacia. Tivemos o prazer de conversar há um tempo e queria retomar o contato.\n\nComo estão as coisas por aí? Alguma necessidade jurídica surgiu que eu possa ajudar?\n\nEstou aqui! 🙂` },
        { body: `Oi, {{nome}}! Tudo bem?\n\nSou {{responsavel}}, da CONSEJ. Há um tempo não conversamos e queria dar um oi!\n\nA gente cresceu bastante, expandimos nossa equipe e hoje conseguimos atender muito bem demandas de [setor].\n\nSe surgir algo que eu possa ajudar, pode contar! 😊` },
      ],
      empresarial: [
        { body: `Olá, {{nome}}! Tudo bem? 😊\n\nSou {{responsavel}}, da CONSEJ Advocacia. Queria retomar nosso contato — a {{empresa}} está em constante crescimento e acredito que o momento pode ser oportuno para conversarmos sobre assessoria jurídica.\n\nO que acha de marcarmos uma conversa rápida?` },
      ],
    },
    email: {
      geral: [
        {
          subject: `Retomando o contato — CONSEJ Advocacia`,
          body: `Olá, {{nome}},\n\nEspero que esteja tudo bem!\n\nMeu nome é {{responsavel}}, da CONSEJ Advocacia. Tivemos o prazer de conversar anteriormente e queria retomar o contato.\n\nNosso escritório cresceu bastante e hoje contamos com uma equipe ainda mais robusta para atender demandas jurídicas com agilidade e qualidade.\n\nCaso tenha surgido alguma necessidade na área jurídica, gostaríamos de retomar a conversa.\n\nEstaria disponível para uma conversa rápida?\n\nAtenciosamente,\n{{responsavel}}\nCONSEJ Advocacia`,
        },
      ],
    },
    linkedin: {
      geral: [
        { body: `Olá, {{nome}}! Quanto tempo! 😊\n\nSou {{responsavel}}, da CONSEJ Advocacia. Queria retomar nosso contato e saber como as coisas têm evoluído por aí.\n\nNosso escritório expandiu bastante — se surgir qualquer necessidade jurídica, adoraria conversar.\n\nComo está a {{empresa}}?` },
      ],
    },
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMessages(
  stage: Stage,
  sector: Sector,
  channel: Channel,
  ctx: Record<string, string>
): { subject?: string; body: string }[] {
  const byChannel = TEMPLATES[stage]?.[channel] ?? {}
  const templates = byChannel[sector] ?? byChannel['geral'] ?? []
  return templates.map(t => ({
    subject: t.subject ? fill(t.subject, ctx) : undefined,
    body: fill(t.body, ctx),
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

const PREFS_KEY = 'consej_mensagens_prefs'
function loadPrefs(): Partial<{ stage: Stage; sector: Sector; channel: Channel; responsavel: string }> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } catch { return {} }
}

export function MensagensPage() {
  const [searchParams] = useSearchParams()
  const prefs = loadPrefs()

  const [stage, setStage]           = useState<Stage>((searchParams.get('stage') as Stage) || prefs.stage || 'primeiro_contato')
  const [sector, setSector]         = useState<Sector>(prefs.sector || 'geral')
  const [channel, setChannel]       = useState<Channel>(prefs.channel || 'whatsapp')
  const [nome, setNome]             = useState(searchParams.get('nome') ?? '')
  const [empresa, setEmpresa]       = useState(searchParams.get('empresa') ?? '')
  const [responsavel, setResponsavel] = useState(prefs.responsavel ?? '')
  const [varIdx, setVarIdx]         = useState(0)
  const [copied, setCopied]         = useState(false)

  // Persist preferences whenever they change
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ stage, sector, channel, responsavel }))
  }, [stage, sector, channel, responsavel])

  // If navigated from lead card, scroll to message area
  useEffect(() => {
    if (searchParams.get('nome')) {
      setTimeout(() => document.getElementById('msg-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(
    () => ({
      nome: nome || 'Nome',
      empresa: empresa || 'Empresa',
      responsavel: responsavel || 'Responsável',
    }),
    [nome, empresa, responsavel]
  )

  const messages = useMemo(() => getMessages(stage, sector, channel, ctx), [stage, sector, channel, ctx])
  const currentMsg = messages[varIdx] ?? messages[0]

  const stageInfo = STAGES.find(s => s.id === stage)!
  const sectorInfo = SECTORS.find(s => s.id === sector)!

  function nextVariation() {
    setVarIdx(i => (i + 1) % Math.max(messages.length, 1))
  }

  function handleStageChange(s: Stage) {
    setStage(s)
    setVarIdx(0)
  }
  function handleSectorChange(s: Sector) {
    setSector(s)
    setVarIdx(0)
  }
  function handleChannelChange(c: Channel) {
    setChannel(c)
    setVarIdx(0)
  }

  async function copyMessage() {
    const text = channel === 'email' && currentMsg.subject
      ? `Assunto: ${currentMsg.subject}\n\n${currentMsg.body}`
      : currentMsg.body
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = currentMsg?.body.length ?? 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0089ac' }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[rgba(230,235,240,0.95)]">Mensagens de Abordagem</h1>
          <p className="text-sm text-[rgba(130,150,170,0.65)]">Gere mensagens personalizadas para cada etapa do funil e tipo de cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

        {/* ── Config Panel ── */}
        <div className="bg-card border rounded-2xl p-5 space-y-5 shadow-sm">

          {/* Contact info */}
          <div>
            <h2 className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider mb-3">Dados do contato</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-[rgba(150,165,180,0.70)] text-xs mb-1 block">Nome do contato</Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[rgba(150,165,180,0.70)] text-xs mb-1 block">Empresa</Label>
                <Input
                  placeholder="Ex: Tech Solutions Ltda"
                  value={empresa}
                  onChange={e => setEmpresa(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[rgba(150,165,180,0.70)] text-xs mb-1 block">Advogado(a) responsável</Label>
                <Input
                  placeholder="Ex: Ana Carolina"
                  value={responsavel}
                  onChange={e => setResponsavel(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Channel */}
          <div>
            <h2 className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider mb-3">Canal</h2>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleChannelChange(ch.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all',
                    channel === ch.id
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                      : 'text-[rgba(130,150,170,0.65)] hover:border hover:bg-background'
                  )}
                >
                  <ch.icon className="w-4 h-4" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Stage */}
          <div>
            <h2 className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider mb-3">Etapa do funil</h2>
            <div className="space-y-1.5">
              {STAGES.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.id)}
                  className="w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                  style={stage === s.id
                    ? { background: s.bgVal, color: s.colorVal, borderColor: s.colorVal + '80' }
                    : { borderColor: 'transparent', color: 'rgba(150,165,180,0.70)' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sector */}
          <div>
            <h2 className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider mb-3">Setor / Área jurídica</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTORS.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => handleSectorChange(sec.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left',
                    sector === sec.id
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                      : 'text-[rgba(150,165,180,0.70)] hover:border hover:bg-background'
                  )}
                >
                  <span>{sec.emoji}</span>
                  <span className="truncate">{sec.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Message Output ── */}
        <div id="msg-output" className="space-y-4">

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ background: stageInfo.bgVal, color: stageInfo.colorVal, borderColor: stageInfo.colorVal + '80' }}>
              {stageInfo.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-background text-[rgba(150,165,180,0.70)]" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
              {sectorInfo.emoji} {sectorInfo.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-background text-[rgba(150,165,180,0.70)] capitalize">
              {channel === 'whatsapp' ? '📱 WhatsApp' : channel === 'email' ? '📧 E-mail' : '💼 LinkedIn'}
            </span>
            {messages.length > 1 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-background text-[rgba(100,120,140,0.55)]">
                Variação {varIdx + 1} de {messages.length}
              </span>
            )}
          </div>

          {/* Message card */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">

            {/* Email subject */}
            {channel === 'email' && currentMsg?.subject && (
              <div className="px-5 py-3 border-b border-slate-100 bg-background">
                <span className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider mr-2">Assunto:</span>
                <span className="text-sm font-medium text-[rgba(230,235,240,0.92)]">{currentMsg.subject}</span>
              </div>
            )}

            {/* Body */}
            <div className="p-5">
              <pre className="whitespace-pre-wrap text-sm text-[rgba(215,225,235,0.85)] font-sans leading-relaxed">
                {currentMsg?.body ?? '—'}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                {channel === 'whatsapp' && (
                  <span className={cn(
                    'text-xs',
                    charCount > 1000 ? 'text-orange-500' : charCount > 600 ? 'text-amber-500' : 'text-[rgba(100,120,140,0.55)]'
                  )}>
                    {charCount} caracteres
                    {charCount > 1000 && ' — considere encurtar'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextVariation}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Outra versão
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={copyMessage}
                  className="h-8 gap-1.5 text-xs"
                  style={copied ? { backgroundColor: '#16a34a' } : { backgroundColor: '#0089ac' }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar mensagem'}
                </Button>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2.5 p-4 bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.20)] rounded-xl">
            <span className="text-lg leading-none">💡</span>
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Dica:</strong> Personalize sempre com detalhes específicos do cliente — mencionar o nome da empresa, um dado recente ou uma dor real aumenta muito a taxa de resposta. As mensagens geradas são um ponto de partida, não um roteiro fixo!
            </div>
          </div>

          {/* All variations preview */}
          {messages.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[rgba(100,120,140,0.55)] uppercase tracking-wider">Todas as variações</h3>
              {messages.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => setVarIdx(i)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border text-sm transition-all',
                    varIdx === i
                      ? 'border-[rgba(0,137,172,0.55)] bg-[rgba(0,137,172,0.08)]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.06)]'
                  )}
                >
                  <div className="text-xs font-semibold text-[rgba(100,120,140,0.55)] mb-1.5">Variação {i + 1}</div>
                  <p className="text-[rgba(150,165,180,0.70)] text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {msg.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
