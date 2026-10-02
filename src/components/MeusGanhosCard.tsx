import React from 'react';
import { DollarSign, TrendingUp, CheckCircle, Radio } from 'lucide-react';
import { ServicoItem } from '../types';
import { isInstalacao, getValorServico } from '../utils/servicoUtils';

interface MeusGanhosCardProps {
  servicosFiltrados: ServicoItem[];
  periodoTexto: string;
}

export const MeusGanhosCard: React.FC<MeusGanhosCardProps> = ({
  servicosFiltrados,
  periodoTexto
}) => {
  // Contagem de instalações (insensível a maiúsculas/minúsculas e acentos)
  const totalInstalacoes = servicosFiltrados.filter((s) => isInstalacao(s)).length;

  const totalOutrosServicos = servicosFiltrados.length - totalInstalacoes;

  // Valor total acumulado (instalações = R$100,00 cada; ou campo valor caso especificado)
  const totalGanhos = servicosFiltrados.reduce((acc, s) => acc + getValorServico(s), 0);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      
      {/* Background Subtle Accent */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Resumo de Faturamento</span>
            <span className="text-slate-500">• {periodoTexto}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-slate-400">Meus Ganhos:</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight">
              R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Valor acumulado com base no filtro aplicado ({servicosFiltrados.length} serviço{servicosFiltrados.length === 1 ? '' : 's'})
          </p>
        </div>

        {/* Stats breakdown */}
        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/50">
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <span className="block text-xs text-blue-400 font-medium">Instalações</span>
            <span className="text-lg font-bold text-white">{totalInstalacoes}</span>
            <span className="block text-[10px] text-slate-400">(R$ 100,00 ea)</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
            <span className="block text-xs text-purple-400 font-medium">Outros Serviços</span>
            <span className="text-lg font-bold text-white">{totalOutrosServicos}</span>
            <span className="block text-[10px] text-slate-400">(Reparo/Mud/Rem)</span>
          </div>
        </div>

      </div>

    </div>
  );
};
