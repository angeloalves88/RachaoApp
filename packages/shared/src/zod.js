import { z } from 'zod';
import { NIVEIS_GRUPO, PERFIS, POSICOES, REGRAS_PARTIDA, STATUS_BOLEIRO, STATUS_CONVITE, STATUS_PAGAMENTO, STATUS_PARTIDA, TIPOS_COBRANCA, TIPOS_EVENTO, } from './enums.js';
// -----------------------------------------------------------------------------
// Validadores comuns
// -----------------------------------------------------------------------------
/// Celular brasileiro: 11 digitos (DDD + 9 + 8 digitos)
export const celularBrSchema = z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits.length === 11, {
    message: 'Celular deve ter 11 dígitos (DDD + 9 + 8 dígitos)',
});
export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'E-mail inválido' });
export const senhaSchema = z
    .string()
    .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
    .regex(/[a-z]/, { message: 'Senha deve ter ao menos uma letra minúscula' })
    .regex(/[A-Z]/, { message: 'Senha deve ter ao menos uma letra maiúscula' })
    .regex(/\d/, { message: 'Senha deve ter ao menos um número' });
// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------
export const loginSchema = z.object({
    email: emailSchema,
    senha: z.string().min(1, { message: 'Senha obrigatória' }),
});
export const cadastroSchema = z.object({
    nome: z.string().trim().min(2, { message: 'Nome muito curto' }),
    email: emailSchema,
    celular: celularBrSchema,
    senha: senhaSchema,
});
export const recuperarSenhaSchema = z.object({
    email: emailSchema,
});
export const onboardingSchema = z
    .object({
    perfis: z
        .array(z.enum(PERFIS))
        .min(1, { message: 'Selecione ao menos um perfil' }),
    nomeGrupo: z.string().trim().min(2).optional(),
    cidade: z.string().trim().min(2).optional(),
    nomeEstadio: z.string().trim().min(2).optional(),
    cidadeEstadio: z.string().trim().min(2).optional(),
})
    .refine((data) => !data.perfis.includes('dono_estadio') ||
    (!data.nomeEstadio && !data.cidadeEstadio) ||
    (!!data.nomeEstadio && !!data.cidadeEstadio), { message: 'Informe nome e cidade do estádio.', path: ['nomeEstadio'] });
/**
 * Converte texto em slug url-friendly. Usado para Estadio.slug.
 */
export function slugify(input) {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
}
// -----------------------------------------------------------------------------
// Grupo / Boleiro
// -----------------------------------------------------------------------------
export const ESPORTES_GRUPO = ['futebol', 'futsal', 'society', 'areia'];
export const grupoCreateSchema = z.object({
    nome: z.string().trim().min(2, 'Informe um nome para o grupo').max(40),
    esporte: z.enum(ESPORTES_GRUPO).default('futebol'),
    nivel: z.enum(NIVEIS_GRUPO).default('casual'),
    fotoUrl: z.string().url().optional().nullable(),
    descricao: z.string().trim().max(200).optional().nullable(),
    tipoCobrancaPadrao: z.enum(TIPOS_COBRANCA).optional().nullable(),
});
export const grupoUpdateSchema = grupoCreateSchema.partial().extend({
    status: z.enum(['ativo', 'arquivado']).optional(),
});
/**
 * Schema legado mantido para compatibilidade — equivale ao `grupoCreateSchema`.
 */
export const grupoSchema = grupoCreateSchema;
/**
 * Adicionar co-presidente: pode ser por email ou celular.
 */
export const adicionarCoPresidenteSchema = z
    .object({
    email: emailSchema.optional(),
    celular: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .refine((v) => v.length === 0 || v.length === 11, {
        message: 'Celular deve ter 11 dígitos (DDD + 9 + 8 dígitos)',
    })
        .optional(),
})
    .refine((d) => !!d.email || !!(d.celular && d.celular.length === 11), {
    message: 'Informe e-mail OU celular do co-presidente',
    path: ['email'],
});
/**
 * Boleiro: ao menos celular OU email obrigatorio (segundo T12).
 */
export const boleiroCreateSchema = z
    .object({
    nome: z.string().trim().min(2, 'Informe o nome completo').max(80),
    apelido: z.string().trim().max(40).optional().nullable(),
    posicao: z.enum(POSICOES).optional().nullable(),
    celular: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .refine((v) => v.length === 0 || v.length === 11, {
        message: 'Celular deve ter 11 dígitos',
    })
        .optional()
        .default(''),
    email: emailSchema.optional().nullable(),
})
    .refine((d) => (d.celular && d.celular.length === 11) || !!d.email, {
    message: 'Informe WhatsApp ou e-mail para poder enviar convites',
    path: ['celular'],
});
export const boleiroUpdateSchema = z
    .object({
    nome: z.string().trim().min(2).max(80).optional(),
    apelido: z.string().trim().max(40).optional().nullable(),
    posicao: z.enum(POSICOES).optional().nullable(),
    celular: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .refine((v) => v.length === 0 || v.length === 11, {
        message: 'Celular deve ter 11 dígitos',
    })
        .optional(),
    email: emailSchema.optional().nullable(),
    status: z.enum(STATUS_BOLEIRO).optional(),
})
    .refine((d) => 
// Se ambos vierem, ao menos um deve ser preenchido.
d.celular === undefined && d.email === undefined
    ? true
    : (d.celular && d.celular.length === 11) || !!d.email, { message: 'Informe WhatsApp ou e-mail', path: ['celular'] });
/**
 * Schema legado para compat (boleiro = create).
 */
export const boleiroSchema = boleiroCreateSchema;
// -----------------------------------------------------------------------------
// Partida / Convite / Vaquinha (Bloco 3)
// -----------------------------------------------------------------------------
export const TIPOS_CHAVE_PIX = ['cpf', 'cnpj', 'telefone', 'email', 'aleatoria'];
const _ruleToggle = z
    .object({ ativo: z.boolean() })
    .passthrough();
/**
 * Schema do objeto `regras` (JSON) na Partida. Valida cada toggle e os
 * parametros adicionais (duracao_minutos do cartao_azul, limite de penaltis).
 */
export const regrasPartidaSchema = z
    .object({
    cartao_azul: z
        .object({
        ativo: z.boolean(),
        duracao_minutos: z
            .number()
            .int()
            .positive()
            .max(60)
            .optional(),
    })
        .optional(),
    bloqueio_vermelho: _ruleToggle.optional(),
    bloqueio_inadimplente: _ruleToggle.optional(),
    gol_olimpico_duplo: _ruleToggle.optional(),
    impedimento_ativo: _ruleToggle.optional(),
    penalti_max_por_tempo: z
        .object({
        ativo: z.boolean(),
        limite: z.number().int().positive().max(10).optional(),
    })
        .optional(),
    time_menor_joga: _ruleToggle.optional(),
    goleiro_obrigatorio: _ruleToggle.optional(),
})
    .partial()
    .refine((data) => {
    const knownKeys = REGRAS_PARTIDA;
    return Object.keys(data).every((k) => knownKeys.includes(k));
}, { message: 'Regra de partida desconhecida' });
/**
 * Convidado avulso enviado ao criar partida ou via endpoint dedicado.
 * Ao menos celular ou email obrigatorio para identificar/convidar.
 */
export const convidadoAvulsoCreateSchema = z
    .object({
    /** Reutiliza cadastro global; nome/celular/email opcionais no payload. */
    convidadoAvulsoId: z.string().min(1).optional(),
    nome: z.string().trim().max(80).optional().default(''),
    apelido: z.string().trim().max(40).optional().nullable(),
    celular: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .refine((v) => v === '' || v.length === 11, {
        message: 'Celular deve ter 11 dígitos',
    })
        .optional()
        .default(''),
    email: emailSchema.optional().nullable(),
    posicao: z.enum(POSICOES).optional().nullable(),
})
    .superRefine((d, ctx) => {
    if (d.convidadoAvulsoId)
        return;
    const nome = d.nome?.trim() ?? '';
    if (nome.length < 2) {
        ctx.addIssue({
            code: 'custom',
            path: ['nome'],
            message: 'Informe o nome do convidado',
        });
    }
    if (!(d.celular && d.celular.length === 11) && !d.email) {
        ctx.addIssue({
            code: 'custom',
            path: ['celular'],
            message: 'Informe WhatsApp ou e-mail do convidado',
        });
    }
});
/**
 * Vaquinha embutida na criacao da partida (opcional).
 */
export const vaquinhaCreateSchema = z.object({
    tipoCobranca: z.enum(TIPOS_COBRANCA).default('por_partida'),
    tipoChavePix: z.enum(TIPOS_CHAVE_PIX),
    chavePix: z.string().trim().min(2, 'Informe a chave Pix').max(120),
    valorBoleiroFixo: z.number().nonnegative().max(100000),
    valorConvidadoAvulso: z.number().nonnegative().max(100000),
    dataLimitePagamento: z.coerce.date().optional().nullable(),
    /** Mensalidade: prazo dos convidados; se null, servidor usa data da partida. */
    dataLimitePagamentoConvidados: z.coerce.date().optional().nullable(),
    mesReferencia: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato esperado AAAA-MM')
        .optional()
        .nullable(),
});
/**
 * Atualizacao da vaquinha (T25) — todos os campos opcionais.
 */
export const vaquinhaUpdateSchema = vaquinhaCreateSchema.partial();
/**
 * Atualizacao de status de um pagamento individual (T23).
 * - `pago`: marca dataPagamento = now() se nao informada.
 * - `pendente`: limpa dataPagamento.
 * - `inadimplente`: setado automaticamente quando dataLimite vence (server-side).
 *
 * STATUS_PAGAMENTO e StatusPagamento sao reexportados de @rachao/shared/enums.
 */
export const pagamentoUpdateSchema = z.object({
    status: z.enum(STATUS_PAGAMENTO),
    dataPagamento: z.coerce.date().optional().nullable(),
    observacao: z.string().trim().max(280).optional().nullable(),
});
/**
 * Cobranca em lote via WhatsApp (T24).
 * - Os WhatsApp links sao construidos no servidor a partir do celular do boleiro
 *   substituindo as tags [Nome], [data], [X], [chave].
 * - O cliente abre `wa.me/<num>?text=...` em sequencia.
 */
export const cobrancaLoteSchema = z.object({
    pagamentoIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um boleiro'),
    mensagem: z
        .string()
        .trim()
        .min(5, 'Mensagem muito curta')
        .max(1200, 'Mensagem muito longa'),
});
/**
 * Serie semanal: cria N partidas no mesmo dia da semana e horario, espaçadas de 7 em 7 dias.
 * A primeira ocorrencia e a `dataHora` do payload; N inclui essa primeira (ex.: 4 = 4 quintas).
 */
export const serieSemanalCreateSchema = z.object({
    ocorrencias: z
        .number()
        .int()
        .min(2, 'Informe ao menos 2 ocorrências para série semanal')
        .max(24, 'No máximo 24 semanas de antecedência'),
});
/**
 * Criacao de partida — payload completo do wizard (T13).
 * dataHora deve ser ISO; lista de espera e calculada server-side.
 */
export const partidaCreateSchema = z.object({
    grupoId: z.string().min(1),
    dataHora: z.coerce
        .date()
        .refine((d) => d.getTime() > Date.now() - 60 * 60 * 1000, {
        message: 'A data da partida não pode estar no passado',
    }),
    numTimes: z.number().int().min(2).max(4),
    boleirosPorTime: z.number().int().min(3).max(11),
    /** Reservas extra por time (alem dos titulares). Default 0 mantem compatibilidade. */
    reservasPorTime: z.number().int().min(0).max(8).default(0),
    tempoPartida: z.number().int().min(5).max(120),
    tempoTotal: z.number().int().min(15).max(480),
    localLivre: z.string().trim().max(200).optional().nullable(),
    estadioId: z.string().min(1).optional().nullable(),
    observacoes: z.string().trim().max(500).optional().nullable(),
    tipoCobranca: z.enum(TIPOS_COBRANCA).default('por_partida'),
    regras: regrasPartidaSchema.default({}),
    boleirosIds: z.array(z.string().min(1)).default([]),
    convidadosAvulsos: z.array(convidadoAvulsoCreateSchema).default([]),
    vaquinha: vaquinhaCreateSchema.optional().nullable(),
    serieSemanal: serieSemanalCreateSchema.optional().nullable(),
});
/**
 * Atualizacao parcial — usada para editar partida e mudar status (cancelar).
 */
export const partidaUpdateSchema = partidaCreateSchema
    .omit({
    grupoId: true,
    boleirosIds: true,
    convidadosAvulsos: true,
    vaquinha: true,
    serieSemanal: true,
})
    .partial()
    .extend({
    status: z.enum(STATUS_PARTIDA).optional(),
});
// -----------------------------------------------------------------------------
// Bloco 4 — Presencas / Convites publicos / Notificacoes
// -----------------------------------------------------------------------------
/**
 * Resposta publica do boleiro pelo link /confirmar/[token].
 * Aceita apenas confirmacao ou recusa (o status `pendente`/`lista_espera`
 * volta a ser controlado server-side).
 */
export const conviteResponderSchema = z.object({
    status: z.enum(['confirmado', 'recusado', 'departamento_medico']),
    recado: z.string().trim().max(280).optional().nullable(),
});
/**
 * Atualizacao manual do convite pelo Presidente (T15).
 * Permite override de status e ajustar posicao da lista de espera.
 */
export const convitePresidenteUpdateSchema = z.object({
    status: z.enum(STATUS_CONVITE).optional(),
    posicaoEspera: z.number().int().min(1).max(99).optional().nullable(),
});
export const CANAIS_REENVIO = ['email', 'whatsapp', 'both'];
/**
 * Reenvio de convites em lote (T16). `mensagemPersonalizada` substitui o corpo
 * padrao quando preenchida.
 */
export const reenvioConvitesSchema = z.object({
    conviteIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um convite'),
    canais: z.enum(CANAIS_REENVIO).default('email'),
    mensagemPersonalizada: z.string().trim().max(500).optional().nullable(),
});
/**
 * Filtros e paginacao para GET /api/notificacoes.
 */
export const CATEGORIAS_NOTIFICACAO = ['todas', 'partidas', 'financeiro', 'estadio', 'grupo'];
export const notificacoesListQuerySchema = z.object({
    categoria: z.enum(CATEGORIAS_NOTIFICACAO).default('todas').optional(),
    cursor: z.string().optional(),
    limite: z.coerce.number().int().min(1).max(50).default(30).optional(),
});
// -----------------------------------------------------------------------------
// Bloco 5 — Escalação (T18)
// -----------------------------------------------------------------------------
export const CORES_TIME = ['orange', 'blue', 'green', 'yellow', 'red', 'purple'];
export const sorteioOptionsSchema = z.object({
    balancearPorPosicao: z.boolean().default(false),
    incluirConvidadosAvulsos: z.boolean().default(true),
    seed: z.string().trim().max(64).optional().nullable(),
});
export const escalacaoTimeSchema = z.object({
    nome: z.string().trim().min(1).max(20),
    cor: z.enum(CORES_TIME),
    conviteIds: z.array(z.string().min(1)).min(1, 'Cada time precisa de ao menos um boleiro'),
    /** Reservas opcionais. Default [] mantem compatibilidade com clients antigos. */
    conviteIdsReservas: z.array(z.string().min(1)).default([]),
    capitaoConviteId: z.string().min(1).optional().nullable(),
});
export const escalacaoSaveSchema = z.object({
    times: z.array(escalacaoTimeSchema).min(2).max(4),
});
// -----------------------------------------------------------------------------
// Bloco 6 — Eventos ao vivo (T20–T21) e Resumo (T22)
// -----------------------------------------------------------------------------
/**
 * Campos extras serializados em `Evento.dadosExtras` (JSON). Mantidos como
 * passthrough para suportar regras futuras sem migration.
 */
export const dadosExtrasEventoSchema = z
    .object({
    boleiroSubstitutoId: z.string().min(1).optional().nullable(),
    duracaoAzul: z.number().int().positive().max(120).optional(),
    golOlimpico: z.boolean().optional(),
})
    .partial()
    .passthrough();
/**
 * Criação de evento durante a partida (T20). `clientId` é gerado pelo
 * frontend e usado para idempotência da fila offline (mesmo `clientId` na
 * mesma partida não cria duplicata).
 */
export const eventoCreateSchema = z.object({
    clientId: z.string().min(1).max(64),
    tipo: z.enum(TIPOS_EVENTO),
    timeId: z.string().min(1).optional().nullable(),
    boleiroId: z.string().min(1).optional().nullable(),
    minuto: z.number().int().min(0).max(200).optional().nullable(),
    dadosExtras: dadosExtrasEventoSchema.optional().nullable(),
});
export const eventoUpdateSchema = eventoCreateSchema
    .omit({ clientId: true })
    .partial();
/**
 * Encerrar partida — body vazio. O servidor recalcula `Time.golsFinal` a
 * partir dos eventos `tipo='gol'` e seta `status='encerrada'`.
 */
export const partidaEncerrarSchema = z.object({}).strict();
// -----------------------------------------------------------------------------
// Bloco 8 — Dono do Estadio (T26-T30)
// -----------------------------------------------------------------------------
export const TIPOS_ESPACO = ['campo', 'quadra', 'arena', 'salao'];
export const TIPOS_PISO = [
    'grama_natural',
    'sintetico',
    'cimento',
    'saibro',
    'areia',
    'parquet',
    'salao',
];
export const COMODIDADES = [
    'vestiario',
    'estacionamento',
    'iluminacao_noturna',
    'banheiros',
    'lanchonete',
    'arquibancada',
];
/**
 * T27 - Editar informacoes do estadio (tab Informacoes).
 * Todos os campos sao opcionais para permitir PATCH parcial.
 */
export const estadioUpdateSchema = z.object({
    nome: z.string().trim().min(2).max(80).optional(),
    endereco: z.string().trim().min(2).max(200).optional(),
    cidade: z.string().trim().min(2).max(80).optional(),
    estado: z.string().trim().length(2).optional(),
    tipoEspaco: z.enum(TIPOS_ESPACO).optional(),
    tipoPiso: z.array(z.enum(TIPOS_PISO)).optional(),
    capacidade: z.number().int().min(3).max(50).optional(),
    comodidades: z.array(z.enum(COMODIDADES)).optional(),
    descricao: z.string().trim().max(500).optional().nullable(),
    fotoCapaUrl: z.string().trim().max(500).optional().nullable(),
    fotos: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
    publicoBuscas: z.boolean().optional(),
});
/**
 * Horario disponivel individual.
 */
export const horarioDisponivelSchema = z.object({
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado HH:mm'),
    horaFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado HH:mm'),
    intervaloMinutos: z.number().int().min(0).max(240).default(60),
    ativo: z.boolean().default(true),
});
/**
 * PUT em lote: substitui toda a configuracao da semana.
 */
export const horariosDisponiveisBatchSchema = z.object({
    horarios: z.array(horarioDisponivelSchema).max(21),
});
/**
 * Data bloqueada (feriado / manutencao).
 */
export const dataBloqueadaSchema = z.object({
    data: z.coerce.date(),
    motivo: z.string().trim().max(200).optional().nullable(),
});
/**
 * T29 - Aprovar / recusar solicitacao de vinculo.
 */
export const solicitacaoResponderSchema = z.object({
    acao: z.enum(['aprovar', 'recusar', 'cancelar']),
    motivo: z.string().trim().max(280).optional().nullable(),
});
/**
 * Filtros para listagem de solicitacoes (T29).
 */
export const solicitacoesListQuerySchema = z.object({
    status: z.enum(['todas', 'pendente', 'aprovada', 'recusada', 'cancelada']).default('todas'),
});
// -----------------------------------------------------------------------------
// Bloco 9 — Configuracoes e Perfil (T31-T34)
// -----------------------------------------------------------------------------
/**
 * T31 - Atualizar perfil pessoal.
 * Todos os campos sao opcionais para permitir PATCH parcial.
 * E-mail nao e editavel aqui (gerenciado pelo Supabase Auth).
 */
export const perfilUpdateSchema = z.object({
    nome: z.string().trim().min(2).max(80).optional(),
    apelido: z.string().trim().max(40).optional().nullable(),
    celular: celularBrSchema.optional(),
    cidade: z.string().trim().max(80).optional().nullable(),
    avatarUrl: z.string().trim().max(500).optional().nullable(),
});
/**
 * T31 - Alterar senha (senha atual + nova).
 */
export const alterarSenhaSchema = z
    .object({
    senhaAtual: z.string().min(1, { message: 'Senha atual obrigatória' }),
    senhaNova: senhaSchema,
    confirmacao: z.string().min(1, { message: 'Confirmação obrigatória' }),
})
    .refine((d) => d.senhaNova === d.confirmacao, {
    message: 'Confirmação não confere',
    path: ['confirmacao'],
});
/**
 * T31 - Excluir conta. Exige texto "EXCLUIR" para confirmar.
 */
export const excluirContaSchema = z.object({
    confirmacao: z.literal('EXCLUIR', {
        errorMap: () => ({ message: 'Digite EXCLUIR para confirmar' }),
    }),
});
/**
 * T31 - Ativar perfil adicional (presidente | dono_estadio).
 */
export const ativarPerfilSchema = z.object({
    perfil: z.enum(['presidente', 'dono_estadio']),
});
/**
 * T33 - Eventos de notificacao gerenciados em /configuracoes/notificacoes.
 */
export const EVENTOS_NOTIFICACAO = [
    // Presidente
    'presenca_confirmada',
    'presenca_recusada',
    'lista_espera_promovido',
    'partida_24h',
    'vaquinha_pendente',
    'estadio_aprovado',
    'estadio_recusado',
    'partida_cancelada',
    // Dono do Estadio
    'nova_solicitacao',
    'presidente_cancelou_partida',
];
/**
 * T33 - Atualizar preferencias de notificacao (canais globais + por evento).
 */
export const preferenciasNotificacaoSchema = z.object({
    notifEmail: z.boolean().optional(),
    notifWhatsapp: z.boolean().optional(),
    eventos: z
        .array(z.object({
        evento: z.enum(EVENTOS_NOTIFICACAO),
        canalEmail: z.boolean(),
        canalWhatsapp: z.boolean(),
    }))
        .max(EVENTOS_NOTIFICACAO.length)
        .optional(),
});
/**
 * T34 - Atualizar preferencias gerais do app + padroes para partidas.
 */
export const FORMATOS_HORA = ['24h', '12h'];
export const preferenciasGeraisSchema = z.object({
    prefNumTimes: z.number().int().min(2).max(4).optional().nullable(),
    prefBoleirosPorTime: z.number().int().min(3).max(11).optional().nullable(),
    prefTempoPartida: z.number().int().min(3).max(60).optional().nullable(),
    prefTempoTotal: z.number().int().min(30).max(240).optional().nullable(),
    prefRegrasPadrao: z.array(z.enum(REGRAS_PARTIDA)).optional().nullable(),
    prefFormatoHora: z.enum(FORMATOS_HORA).optional(),
});
/**
 * T32 - Planos disponiveis (UI apenas, sem gateway no MVP).
 */
export const PLANOS = ['trial', 'presidente_mensal', 'estadio_mensal', 'combo_mensal'];
export const escolherPlanoSchema = z.object({
    plano: z.enum(PLANOS),
});
