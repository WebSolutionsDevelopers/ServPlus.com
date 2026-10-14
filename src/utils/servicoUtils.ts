import { ServicoItem } from '../types';

/**
 * Normaliza uma string removendo acentos, espaços extras e convertendo para maiúsculas
 */
export const normalizeText = (str?: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
};

/**
 * Verifica de forma insensível a maiúsculas/minúsculas e acentos se o serviço é uma Instalação.
 * Se o tipo de serviço for 'MUDANÇA DE ENDEREÇO', 'REPARO', 'REMANEJAMENTO', 'MANUTENÇÃO', 'SUPORTE', etc.,
 * ele NUNCA é classificado como instalação.
 */
export const isInstalacao = (s: { tipoServico?: string; tipoAtividade?: string } | null | undefined): boolean => {
  if (!s) return false;
  const serv = normalizeText(s.tipoServico);
  const ativ = normalizeText(s.tipoAtividade);

  // 1. Se o tipo de serviço for explicitamente Mudança de endereço, Reparo ou Remanejamento
  if (
    serv.includes('MUDAN') ||
    serv.includes('REPAR') ||
    serv.includes('REMANEJ') ||
    serv.includes('MANUTEN') ||
    serv.includes('SUPORT')
  ) {
    return false;
  }

  // 2. Se o tipoServico for explicitamente Instalação
  if (serv.includes('INSTALAC')) {
    return true;
  }

  // 3. Se tipoServico não estiver definido, verifica tipoAtividade
  if (
    ativ.includes('MUDAN') ||
    ativ.includes('REPAR') ||
    ativ.includes('REMANEJ') ||
    ativ.includes('MANUTEN') ||
    ativ.includes('SUPORT')
  ) {
    return false;
  }

  return ativ.includes('INSTALAC');
};

/**
 * Verifica de forma insensível a maiúsculas/minúsculas e acentos se o serviço é uma Mudança de Endereço.
 */
export const isMudancaEndereco = (s: { tipoServico?: string; tipoAtividade?: string } | null | undefined): boolean => {
  if (!s) return false;
  const serv = normalizeText(s.tipoServico);
  const ativ = normalizeText(s.tipoAtividade);
  return serv.includes('MUDAN') || ativ.includes('MUDAN');
};

/**
 * Retorna o tipo de serviço normalizado para comparações e filtros
 */
export const matchTipoServicoOuAtividade = (
  s: { tipoServico?: string; tipoAtividade?: string },
  filtroTipo: string
): boolean => {
  if (!filtroTipo || filtroTipo === 'Todos') return true;
  const filtroNorm = normalizeText(filtroTipo);
  const servNorm = normalizeText(s.tipoServico);
  const ativNorm = normalizeText(s.tipoAtividade);

  // Se o filtro for INSTALAÇÃO
  if (filtroNorm.includes('INSTALAC')) {
    return isInstalacao(s);
  }

  // Se o filtro for MUDANÇA DE ENDEREÇO
  if (filtroNorm.includes('MUDAN')) {
    return servNorm.includes('MUDAN') || ativNorm.includes('MUDAN');
  }

  // Se o filtro for REPARO
  if (filtroNorm.includes('REPAR')) {
    return servNorm.includes('REPAR') || ativNorm.includes('REPAR');
  }

  // Se o filtro for REMANEJAMENTO
  if (filtroNorm.includes('REMANEJ')) {
    return servNorm.includes('REMANEJ') || ativNorm.includes('REMANEJ');
  }

  // Comparação padrão direta
  return servNorm === filtroNorm || ativNorm === filtroNorm;
};

/**
 * Calcula o valor do serviço:
 * - Instalação: R$ 100,00
 * - Mudança de Endereço: R$ 100,00
 * - Outros serviços: R$ 0,00 (ou valor numérico customizado se especificado > 0)
 */
export const getValorServico = (s: Partial<ServicoItem>): number => {
  if (s.valor !== undefined && s.valor !== null && !isNaN(Number(s.valor))) {
    if (Number(s.valor) > 0) {
      return Number(s.valor);
    }
  }
  return (isInstalacao(s) || isMudancaEndereco(s)) ? 100 : 0;
};

/**
 * Calcula a quantidade de metros utilizada do rolo de cabo drop
 * com base na diferença entre a metragem final e inicial.
 */
export const calcularMetragemUtilizada = (
  dadosVisita?: {
    metragemInicial?: number | string;
    metragemFinal?: number | string;
    metragemRolo?: number | string;
  } | null
): number | null => {
  if (!dadosVisita) return null;
  const { metragemInicial, metragemFinal } = dadosVisita;

  const temInicial =
    metragemInicial !== '' &&
    metragemInicial !== null &&
    metragemInicial !== undefined &&
    !isNaN(Number(metragemInicial));

  const temFinal =
    metragemFinal !== '' &&
    metragemFinal !== null &&
    metragemFinal !== undefined &&
    !isNaN(Number(metragemFinal));

  if (temInicial && temFinal) {
    return Math.abs(Number(metragemFinal) - Number(metragemInicial));
  }

  return null;
};

/**
 * Converte qualquer formato de data (DD/MM/YYYY, YYYY-MM-DD, timestamp, etc.)
 * para o padrão ISO YYYY-MM-DD
 */
export const formatarDataParaIso = (dataStr?: string | null): string => {
  if (!dataStr) return '';
  const limpo = dataStr.trim();
  
  // Se já estiver no formato YYYY-MM-DD
  const matchIso = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  // Se estiver no formato DD/MM/YYYY
  const matchBr = limpo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBr) {
    const dia = matchBr[1].padStart(2, '0');
    const mes = matchBr[2].padStart(2, '0');
    const ano = matchBr[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Tenta parser padrão de Date
  try {
    const d = new Date(limpo);
    if (!isNaN(d.getTime())) {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
  } catch (e) {}

  return limpo.slice(0, 10);
};

/**
 * Formata uma data para exibição no padrão brasileiro DD/MM/YYYY
 */
export const formatarDataExibicao = (dataStr?: string | null): string => {
  if (!dataStr) return '-';
  const iso = formatarDataParaIso(dataStr);
  if (!iso || !iso.includes('-')) return dataStr;
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

