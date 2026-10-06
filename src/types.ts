export type TipoAtividade = 'INSTALAÇÃO' | 'MANUTENÇÂO' | 'SUPORTE' | string;

export type TipoServico = 'INSTALAÇÃO' | 'REPARO' | 'MUDANÇA DE ENDEREÇO' | 'REMANEJAMENTO';

export type Operadora = 'TIM' | 'NIO' | 'ALGAR' | 'LIGA';

export interface Localizacao {
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
}

export interface DadosVisita {
  numeroSA: string;
  acessoGpon: string;
  quemAtendeu: string;
  contatoCliente: string; // formato telefone
  metragemRolo: number | '';
  metragemInicial: number | '';
  metragemFinal: number | '';
  snOnt: string;
  snMesh?: string;
  snDrop: string;
  qtdConector: number | '';
  qtdEsticador: number | '';
  plaqueta: number | '';
  kitFixaFio: number | '';
  tipoCdoe?: 'CDOE' | 'CDOI';
  numCdoe: number | '';
  portaUtilizada: number | '';
}

export interface ServicoItem {
  id?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  tipoAtividade: string; // ex: "Instalação"
  tipoServico: TipoServico;
  operadora: Operadora;
  data: string; // YYYY-MM-DD
  createdAt: number; // timestamp
  localizacao: Localizacao;
  dadosVisita: DadosVisita;
  observacoes: string;
  fotos: string[]; // array de base64 data URLs (max 8)
  valor: number; // 100 reais por instalação
}

export type PresetFiltroData = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' | 'customizado';

export interface FiltroState {
  preset: PresetFiltroData;
  mesAno: string; // ex: "2026-08"
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  tipoAtividade: string; // "Todos" ou valor específico
  operadora: string; // "Todas" ou valor específico
}

export type ModoEnvioTelegram = 'ambos' | 'grupo' | 'privado' | 'padrao';

export interface UsuarioTelegramConfigItem {
  privadoChatId?: string;
  grupoChatId?: string;
  modoEnvio?: ModoEnvioTelegram;
}

export interface UsuarioItem {
  uid: string;
  email: string;
  nome: string;
  telegramChatId?: string; // Compatibilidade retroativa
  telegramPrivadoChatId?: string; // ID do Chat privado do técnico
  telegramGrupoChatId?: string; // ID do Grupo específico do técnico (opcional)
  telegramModoEnvio?: ModoEnvioTelegram; // 'ambos' | 'grupo' | 'privado' | 'padrao'
  telegramBotToken?: string;
  ultimoAcesso?: number;
  createdAt?: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string; // ID padrão do Grupo do Administrador
  grupoChatId?: string;
  modoEnvio?: 'ambos' | 'grupo' | 'privado';
  userConfigs?: Record<string, UsuarioTelegramConfigItem>;
  userChatIds?: Record<string, string>;
  updatedAt?: number;
}
