import React from 'react';
import { DollarSign, RefreshCw } from 'lucide-react';
import { ServicoItem } from '../types';
import { isInstalacao, isMudancaEndereco, getValorServico } from '../utils/servicoUtils';

interface MeusGanhosCardProps {
  servicosFiltrados?: ServicoItem[];
  periodoTexto?: string;
  totalGanhos?: number;
  totalServicos?: number;
  labelGanhos?: string;
  onSincronizar?: () => void;
  sincronizando?: boolean;
}

export const MeusGanhosCard: React.FC<MeusGanhosCardProps> = ({
  servicosFiltrados = [],
  periodoTexto,
  totalGanhos: totalGanhosProp,
  totalServicos: totalServicosProp,
  labelGanhos,
  onSincronizar,
  sincronizando = false
}) => {
  const lista = Array.isArray(servicosFiltrados) ? servicosFiltrados : [];

  const totalInstalacoes = lista.filter((s) => isInstalacao(s)).length;
  const totalMudancas = lista.filter((s) => isMudancaEndereco(s)).length;
  const totalOutrosServicos = lista.length - totalInstalacoes - totalMudancas;

  const totalGanhos = totalGanhosProp !== undefined
    ? totalGanhosProp
    : lista.reduce((acc, s) => acc + getValorServico(s), 0);

  const displayPeriodo = periodoTexto || 'Hoje';
  const displayLabel = labelGanhos || 'Meus Ganhos';
  const totalQtd = totalServicosProp !== undefined ? totalServicosProp : lista.length;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="justify-between w-full flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Resumo de Faturamento</span>
              <span className="text-slate-500">• {displayPeriodo}</span>
            </div>

            {/* BOTÃO DE SINCRONIZAR NO CARD */}
            {onSincronizar && (
              <button
                type="button"
                onClick={onSincronizar}
                disabled={sincronizando}
                title="Sincronizar dados com a nuvem Firebase"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 text-xs font-semibold transition active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${sincronizando ? 'animate-spin' : ''}`} />
                <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-400">{displayLabel}:</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight">
                R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Valor acumulado com base no filtro aplicado ({totalQtd} serviço{totalQtd === 1 ? '' : 's'})
          </p>
        </div>

        {/* Estatísticas detalhadas */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
          <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <span className="block text-[11px] text-blue-400 font-medium">Instalações</span>
            <span className="text-base font-bold text-white">{totalInstalacoes}</span>
            <span className="block text-[9px] text-slate-400">R$ 100,00</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="block text-[11px] text-emerald-400 font-medium">Mud. Endereço</span>
            <span className="text-base font-bold text-white">{totalMudancas}</span>
            <span className="block text-[9px] text-slate-400">R$ 100,00</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
            <span className="block text-[11px] text-purple-400 font-medium">Outros</span>
            <span className="text-base font-bold text-white">{totalOutrosServicos}</span>
            <span className="block text-[9px] text-slate-400">Reparo/Rem</span>
          </div>
        </div>
      </div>
    </div>
  );
};
