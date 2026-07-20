import { useRef, useState } from 'react'
import {
  usePassagemBastaoMidias,
  useUploadMidia,
  useDeleteMidia,
  useSendMidiaToSlack,
  getSignedUrl,
} from '@/hooks/usePassagemBastao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Send, Loader2, FileAudio, FileVideo, Check, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { PassagemBastaoMidia } from '@/types'

type Props = { leadId: string }

const MAX_SIZE_MB = 50

export function MediaUploader({ leadId }: Props) {
  const { data: midias = [], isLoading } = usePassagemBastaoMidias(leadId)
  const upload = useUploadMidia()
  const remove = useDeleteMidia()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const f of Array.from(files)) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name}: acima de ${MAX_SIZE_MB}MB`)
        continue
      }
      if (!/^(audio|video)\//.test(f.type)) {
        toast.error(`${f.name}: tipo não aceito (${f.type || 'desconhecido'})`)
        continue
      }
      upload.mutate({ leadId, file: f })
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Áudios e vídeos do Closer</CardTitle>
        <p className="text-xs text-muted-foreground">
          Grave explicações ou cole trechos da reunião. Até {MAX_SIZE_MB}MB por arquivo.
          O botão "Enviar ao Slack" publica o arquivo na thread da DDGD.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer transition-colors"
          style={{
            border: `1px dashed ${dragOver ? 'var(--primary)' : 'var(--alpha-border)'}`,
            background: dragOver ? 'var(--alpha-bg-sm)' : 'var(--alpha-bg-xs)',
          }}
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-fg2">
            {upload.isPending ? 'Enviando...' : 'Clique ou arraste áudio/vídeo aqui'}
          </p>
          <p className="text-xs text-muted-foreground">mp3, m4a, wav, mp4, webm, mov — máx {MAX_SIZE_MB}MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando mídias...</div>
        ) : midias.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">Nenhuma mídia enviada ainda.</div>
        ) : (
          <div className="space-y-2">
            {midias.map((m) => (
              <MidiaRow
                key={m.id}
                midia={m}
                onDelete={() => {
                  if (confirm(`Remover "${m.nome_arquivo}"?`)) remove.mutate(m)
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MidiaRow({ midia, onDelete }: { midia: PassagemBastaoMidia; onDelete: () => void }) {
  const send = useSendMidiaToSlack()
  const [url, setUrl] = useState<string | null>(null)
  const isVideo = midia.tipo === 'video'
  const Icon = isVideo ? FileVideo : FileAudio

  async function preview() {
    if (url) return
    const signed = await getSignedUrl(midia.storage_path, 3600)
    if (!signed) {
      toast.error('Não foi possível gerar URL.')
      return
    }
    setUrl(signed)
  }

  const enviado = !!midia.enviado_slack_em

  return (
    <div
      className="p-3 rounded-lg flex flex-col gap-2"
      style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{midia.nome_arquivo}</p>
          <p className="text-xs text-muted-foreground">
            {midia.tipo} · {midia.tamanho_bytes ? formatSize(midia.tamanho_bytes) : '—'}
            {enviado && (
              <>
                {' · '}
                <span className="text-green-500 inline-flex items-center gap-0.5">
                  <Check className="w-3 h-3" />
                  enviado ao Slack
                </span>
              </>
            )}
            {midia.erro_slack && (
              <>
                {' · '}
                <span className="text-red-400">erro: {midia.erro_slack}</span>
              </>
            )}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={preview} title="Prévia">
          <Play className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => send.mutate(midia)}
          disabled={send.isPending || enviado}
          title={enviado ? 'Já enviado' : 'Enviar ao Slack'}
        >
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Remover">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {url && (
        <div className="mt-1">
          {isVideo ? (
            <video src={url} controls className="w-full rounded" style={{ maxHeight: 320 }} />
          ) : (
            <audio src={url} controls className="w-full" />
          )}
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
