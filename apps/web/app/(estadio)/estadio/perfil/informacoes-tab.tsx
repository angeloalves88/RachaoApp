'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { NumberStepper } from '@/components/ui/number-stepper';
import { patchMeuEstadio, type EstadioCompleto } from '@/lib/estadios-actions';
import type {
  Comodidade,
  EstadioUpdateInput,
  TipoEspaco,
  TipoPiso,
} from '@rachao/shared/zod';

const TIPOS_ESPACO: Array<{ value: TipoEspaco; label: string }> = [
  { value: 'campo', label: 'Campo' },
  { value: 'quadra', label: 'Quadra' },
  { value: 'arena', label: 'Arena' },
  { value: 'salao', label: 'Salão' },
];

const TIPOS_PISO: Array<{ value: TipoPiso; label: string }> = [
  { value: 'grama_natural', label: 'Grama natural' },
  { value: 'sintetico', label: 'Sintético' },
  { value: 'cimento', label: 'Cimento' },
  { value: 'saibro', label: 'Saibro' },
  { value: 'areia', label: 'Areia' },
  { value: 'parquet', label: 'Parquet' },
  { value: 'salao', label: 'Salão' },
];

const COMODIDADES: Array<{ value: Comodidade; label: string }> = [
  { value: 'vestiario', label: 'Vestiário' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'iluminacao_noturna', label: 'Iluminação noturna' },
  { value: 'banheiros', label: 'Banheiros' },
  { value: 'lanchonete', label: 'Lanchonete' },
  { value: 'arquibancada', label: 'Arquibancada' },
];

interface Props {
  estadio: EstadioCompleto;
  onUpdate: (e: EstadioCompleto) => void;
}

export function InformacoesTab({ estadio, onUpdate }: Props) {
  const [form, setForm] = useState({
    nome: estadio.nome,
    endereco: estadio.endereco,
    cidade: estadio.cidade,
    estado: estadio.estado,
    tipoEspaco: (estadio.tipoEspaco as TipoEspaco) ?? 'campo',
    tipoPiso: estadio.tipoPiso as TipoPiso[],
    capacidade: estadio.capacidade || 5,
    comodidades: estadio.comodidades as Comodidade[],
    descricao: estadio.descricao ?? '',
    publicoBuscas: estadio.publicoBuscas,
  });
  const [saving, setSaving] = useState(false);

  function togglePiso(p: TipoPiso) {
    setForm((s) => ({
      ...s,
      tipoPiso: s.tipoPiso.includes(p)
        ? s.tipoPiso.filter((x) => x !== p)
        : [...s.tipoPiso, p],
    }));
  }

  function toggleComodidade(c: Comodidade) {
    setForm((s) => ({
      ...s,
      comodidades: s.comodidades.includes(c)
        ? s.comodidades.filter((x) => x !== c)
        : [...s.comodidades, c],
    }));
  }

  async function handleSave() {
    const nome = form.nome.trim();
    if (!nome) {
      toast.error('Informe o nome do estádio');
      return;
    }
    if (nome.length < 2) {
      toast.error('O nome deve ter pelo menos 2 caracteres');
      return;
    }
    setSaving(true);
    try {
      // PATCH parcial: só envia strings que passam no `estadioUpdateSchema` do API
      // (campos vazios não podem ir como "" — o servidor exige min. 2 caracteres).
      const payload: EstadioUpdateInput = {
        nome,
        tipoEspaco: form.tipoEspaco,
        tipoPiso: form.tipoPiso,
        capacidade: form.capacidade,
        comodidades: form.comodidades,
        descricao: form.descricao.trim() || null,
        publicoBuscas: form.publicoBuscas,
      };
      const endereco = form.endereco.trim();
      if (endereco.length >= 2) payload.endereco = endereco;
      const cidade = form.cidade.trim();
      if (cidade.length >= 2) payload.cidade = cidade;
      const uf = form.estado.trim().toUpperCase();
      if (uf.length === 2) payload.estado = uf;
      const res = await patchMeuEstadio(payload);
      onUpdate(res.estadio);
      toast.success('Informações salvas');
    } catch {
      toast.error('Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Nome do estádio/campo">
        <Input
          value={form.nome}
          onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
          maxLength={80}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium">Tipo de espaço</p>
        <Segmented<TipoEspaco>
          value={form.tipoEspaco}
          onChange={(v) => setForm((s) => ({ ...s, tipoEspaco: v }))}
          options={TIPOS_ESPACO}
          size="sm"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Tipo de piso (múltipla escolha)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TIPOS_PISO.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={form.tipoPiso.includes(p.value)}
                onChange={() => togglePiso(p.value)}
                className="h-4 w-4 rounded border-border bg-surface-2 text-primary focus:ring-primary"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <Field label="Capacidade por time">
        <NumberStepper
          value={form.capacidade}
          onChange={(v) => setForm((s) => ({ ...s, capacidade: v }))}
          min={3}
          max={50}
        />
      </Field>

      <Field label="Endereço completo">
        <Input
          value={form.endereco}
          onChange={(e) => setForm((s) => ({ ...s, endereco: e.target.value }))}
          maxLength={200}
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Cidade" className="col-span-2">
          <Input
            value={form.cidade}
            onChange={(e) => setForm((s) => ({ ...s, cidade: e.target.value }))}
            maxLength={80}
          />
        </Field>
        <Field label="UF">
          <Input
            value={form.estado}
            onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value.toUpperCase() }))}
            maxLength={2}
          />
        </Field>
      </div>

      <Field label="Descrição (opcional)">
        <Textarea
          value={form.descricao}
          onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))}
          rows={3}
          maxLength={500}
          placeholder="Ex: Campo com vestiário, estacionamento e iluminação para jogos noturnos"
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium">Comodidades</p>
        <div className="grid grid-cols-2 gap-1.5">
          {COMODIDADES.map((c) => (
            <label
              key={c.value}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={form.comodidades.includes(c.value)}
                onChange={() => toggleComodidade(c.value)}
                className="h-4 w-4 rounded border-border bg-surface-2 text-primary focus:ring-primary"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
        <div>
          <p className="text-sm font-medium">Meu estádio aparece em buscas de Presidentes</p>
          <p className="text-xs text-muted">
            Necessário para receber solicitações via página pública.
          </p>
        </div>
        <input
          type="checkbox"
          checked={form.publicoBuscas}
          onChange={(e) => setForm((s) => ({ ...s, publicoBuscas: e.target.checked }))}
          className="h-5 w-5 rounded border-border bg-surface-2 text-primary focus:ring-primary"
        />
      </label>

      <Button type="button" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : 'Salvar informações'}
      </Button>
    </div>
  );
}
