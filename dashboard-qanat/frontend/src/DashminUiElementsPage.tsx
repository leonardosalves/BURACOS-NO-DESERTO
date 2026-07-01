import React, { useState } from 'react';
import {
  DashAlert,
  DashBadge,
  DashButton,
  DashListGroup,
  DashModal,
  DashProgress,
  DashTabs,
} from './dashmin/ui';

function UiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dash-ui-section">
      <h2 className="dash-ui-section-title">{title}</h2>
      <div className="dash-ui-section-body">{children}</div>
    </section>
  );
}

export function DashminUiElementsPage() {
  const [tab, setTab] = useState('overview');
  const [pillTab, setPillTab] = useState('a');
  const [modalOpen, setModalOpen] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);

  return (
    <div className="dash-ui-page space-y-5">
      <UiSection title="Alerts">
        <div className="space-y-3">
          {alertVisible && (
            <DashAlert tone="primary" title="Dashmin Primary" dismissible onDismiss={() => setAlertVisible(false)}>
              Alerta primário — use para dicas do estúdio e novidades do pipeline.
            </DashAlert>
          )}
          <DashAlert tone="success" title="Sucesso">
            Render concluído e arquivo salvo em OUTPUT.
          </DashAlert>
          <DashAlert tone="warning" title="Atenção">
            Narração ausente — abra Workflow antes de compilar.
          </DashAlert>
          <DashAlert tone="danger" title="Erro">
            Falha na API de IA — verifique chaves em Configurações.
          </DashAlert>
          <DashAlert tone="info">Metadados YouTube prontos para aplicar no Upload.</DashAlert>
        </div>
      </UiSection>

      <UiSection title="Badges">
        <div className="flex flex-wrap gap-2">
          <DashBadge tone="primary">Primary</DashBadge>
          <DashBadge tone="success">Success</DashBadge>
          <DashBadge tone="warning">Warning</DashBadge>
          <DashBadge tone="danger">Danger</DashBadge>
          <DashBadge tone="info">Info</DashBadge>
          <DashBadge tone="muted">Muted</DashBadge>
        </div>
      </UiSection>

      <UiSection title="Buttons">
        <div className="flex flex-wrap gap-2 items-center">
          <DashButton variant="primary">Primary</DashButton>
          <DashButton variant="secondary">Secondary</DashButton>
          <DashButton variant="success">Success</DashButton>
          <DashButton variant="danger">Danger</DashButton>
          <DashButton variant="info">Info</DashButton>
          <DashButton variant="outline">Outline</DashButton>
          <DashButton variant="ghost">Ghost</DashButton>
        </div>
        <div className="flex flex-wrap gap-2 items-center mt-3">
          <DashButton size="sm">Small</DashButton>
          <DashButton size="md">Medium</DashButton>
          <DashButton size="lg">Large</DashButton>
        </div>
      </UiSection>

      <UiSection title="Cards">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="dash-card">
            <p className="dash-card-eyebrow">Card padrão</p>
            <h3 className="dash-card-title text-base">Título do card</h3>
            <p className="dash-card-desc">Corpo com fundo escuro e sombra Dashmin.</p>
          </div>
          <div className="dash-card dash-card-highlight">
            <p className="dash-card-eyebrow">Card highlight</p>
            <h3 className="dash-card-title text-base">Destaque</h3>
            <p className="dash-card-desc">Gradiente roxo para widgets de parabéns e KPIs.</p>
          </div>
        </div>
      </UiSection>

      <UiSection title="Progress Bars">
        <div className="space-y-4 max-w-md">
          <DashProgress value={72} label="Armazenamento" tone="primary" striped />
          <DashProgress value={45} label="Pipeline" tone="success" />
          <DashProgress value={28} label="Qualidade pré-render" tone="warning" />
          <DashProgress value={12} label="Erros bloqueantes" tone="danger" />
        </div>
      </UiSection>

      <UiSection title="Tabs">
        <DashTabs
          tabs={[
            { id: 'overview', label: 'Visão geral' },
            { id: 'daily', label: 'Diário' },
            { id: 'monthly', label: 'Mensal' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <p className="text-sm text-dash-muted mt-3">Aba ativa: <strong className="text-white">{tab}</strong></p>
        <DashTabs
          className="mt-4"
          variant="pill"
          tabs={[
            { id: 'a', label: 'Render' },
            { id: 'b', label: 'Workflow' },
            { id: 'c', label: 'Upload' },
          ]}
          active={pillTab}
          onChange={setPillTab}
        />
      </UiSection>

      <UiSection title="List Group">
        <DashListGroup
          items={[
            { id: '1', title: 'Projeto ativo', subtitle: 'Buracos no Deserto', active: true, badge: <DashBadge tone="success">OK</DashBadge> },
            { id: '2', title: 'Shorts em fila', subtitle: '3 ideias no Creator', badge: <DashBadge tone="warning">3</DashBadge> },
            { id: '3', title: 'Canal YouTube', subtitle: 'Alertas 48h', badge: <DashBadge tone="danger">2</DashBadge> },
          ]}
        />
      </UiSection>

      <UiSection title="Modals">
        <DashButton onClick={() => setModalOpen(true)}>Abrir modal (Sweet Alert style)</DashButton>
        <DashModal
          open={modalOpen}
          title="Confirmar ação"
          tone="primary"
          onCancel={() => setModalOpen(false)}
          onConfirm={() => setModalOpen(false)}
        >
          <p className="text-sm text-dash-muted leading-relaxed">
            Modal estilo Dashmin / Sweet Alert — use para confirmações de render, exclusão de OUTPUT ou reset do Creator.
          </p>
        </DashModal>
      </UiSection>

      <UiSection title="Typography">
        <div className="space-y-2">
          <h1 className="dash-typo-h1">Heading 1 — Dashboard</h1>
          <h2 className="dash-typo-h2">Heading 2 — Seção</h2>
          <h3 className="dash-typo-h3">Heading 3 — Card</h3>
          <p className="dash-typo-body">
            Corpo PT Sans com cor muted. O tema Dashmin dark usa contraste suave entre fundo <code className="dash-typo-code">#02030a</code> e cards <code className="dash-typo-code">#0c1018</code>.
          </p>
        </div>
      </UiSection>
    </div>
  );
}