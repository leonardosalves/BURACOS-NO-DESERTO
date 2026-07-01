import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import {
  DashButton,
  DashModal,
  DashProgress,
  DashRating,
  dashToast,
} from './dashmin/ui';

function ExtSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="dash-card">
      <p className="dash-card-eyebrow">Extension</p>
      <h3 className="dash-card-title text-base">{title}</h3>
      {subtitle && <p className="dash-card-desc mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

type NestItem = { id: string; text: string; tag: string };

const DEFAULT_NEST: NestItem[] = [
  { id: '1', text: 'Gerar narração TTS no Workflow', tag: 'Urgent · Important' },
  { id: '2', text: 'Validar qualidade pré-render', tag: 'Normal' },
  { id: '3', text: 'Publicar metadados no Upload', tag: 'Low' },
];

export function DashminExtensionsPage() {
  const [rating, setRating] = useState(4);
  const [progress, setProgress] = useState(35);
  const [nest, setNest] = useState(DEFAULT_NEST);
  const [sweetOpen, setSweetOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const moveNest = (from: string, to: string) => {
    if (from === to) return;
    setNest((prev) => {
      const next = [...prev];
      const fi = next.findIndex((n) => n.id === from);
      const ti = next.findIndex((n) => n.id === to);
      if (fi < 0 || ti < 0) return prev;
      const [item] = next.splice(fi, 1);
      next.splice(ti, 0, item);
      return next;
    });
  };

  return (
    <div className="dash-ext-page grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ExtSection title="Toastr" subtitle="Notificações toast no canto — integrado ao react-hot-toast.">
        <div className="flex flex-wrap gap-2">
          <DashButton size="sm" variant="success" onClick={() => dashToast.success('Render finalizado com sucesso!')}>
            Success
          </DashButton>
          <DashButton size="sm" variant="danger" onClick={() => dashToast.error('Erro ao conectar API.')}>
            Error
          </DashButton>
          <DashButton size="sm" variant="warning" onClick={() => dashToast.warning('Narração ainda não gerada.')}>
            Warning
          </DashButton>
          <DashButton size="sm" variant="info" onClick={() => dashToast.info('Metadados copiados.')}>
            Info
          </DashButton>
          <DashButton size="sm" onClick={() => dashToast.primary('Pipeline Lumiera sincronizado.')}>
            Primary
          </DashButton>
        </div>
      </ExtSection>

      <ExtSection title="Sweet Alert" subtitle="Modais de confirmação com tom e ações claras.">
        <DashButton onClick={() => setSweetOpen(true)}>Simular exclusão de OUTPUT</DashButton>
        <DashModal
          open={sweetOpen}
          title="Excluir vídeo renderizado?"
          tone="danger"
          confirmLabel="Sim, excluir"
          cancelLabel="Cancelar"
          onCancel={() => setSweetOpen(false)}
          onConfirm={() => {
            setSweetOpen(false);
            dashToast.success('Arquivo removido (demo).');
          }}
        >
          <p className="text-sm text-dash-muted">Esta ação não pode ser desfeita. O arquivo será removido da pasta OUTPUT.</p>
        </DashModal>
      </ExtSection>

      <ExtSection title="Rating" subtitle="Avaliação por estrelas — útil para ranquear ideias do Creator.">
        <DashRating value={rating} onChange={setRating} />
        <p className="text-xs text-dash-muted mt-2">Valor atual: {rating}/5</p>
      </ExtSection>

      <ExtSection title="Progress animado" subtitle="Barra listrada para renders e uploads longos.">
        <DashProgress value={progress} label="Render Remotion PRO" tone="primary" striped />
        <div className="flex gap-2 mt-3">
          <DashButton size="sm" variant="outline" onClick={() => setProgress((p) => Math.max(0, p - 15))}>
            −15%
          </DashButton>
          <DashButton size="sm" onClick={() => setProgress((p) => Math.min(100, p + 15))}>
            +15%
          </DashButton>
        </div>
      </ExtSection>

      <div className="lg:col-span-2">
      <ExtSection
        title="Nestable"
        subtitle="Lista reordenável — padrão do todo list do Dashmin (arraste pelo ícone)."
      >
        <ul className="dash-nestable">
          {nest.map((item) => (
            <li
              key={item.id}
              className={`dash-nestable-item ${dragId === item.id ? 'dragging' : ''}`}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) moveNest(dragId, item.id);
                setDragId(null);
              }}
            >
              <span className="dash-nestable-drag" aria-hidden>
                <GripVertical className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="dash-nestable-text">{item.text}</p>
                <span className="dash-nestable-tag">{item.tag}</span>
              </div>
            </li>
          ))}
        </ul>
      </ExtSection>
      </div>
    </div>
  );
}