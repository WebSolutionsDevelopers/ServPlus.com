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
 * Calcula o valor do serviço com fallback para R$ 100 em caso de instalação
 */
export const getValorServico = (s: Partial<ServicoItem>): number => {
  if (s.valor !== undefined && s.valor !== null && !isNaN(Number(s.valor))) {
    return Number(s.valor);
  }
  return isInstalacao(s) ? 100 : 0;
};
