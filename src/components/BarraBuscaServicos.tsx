import React from 'react';
import { Search, X, Layers, Filter } from 'lucide-react';

interface BarraBuscaServicosProps {
  termoBusca: string;
  onChangeBusca: (termo: string) => void;
  totalEncontrados: number;
  totalGeral: number;
  onLimparBusca: () => void;
}

export const BarraBuscaServicos: React.FC<BarraBuscaServicosProps> = ({
  termoBusca,
  onChangeBusca,
  totalEncontrados,
  totalGeral,
  onLimparBusca
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Campo de Entrada de Busca */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-blue-400" />
          </div>

          <input
            type="text"
            id="input-busca-servicos"
            value={termoBusca}
            onChange={(e) => onChangeBusca(e.target.value)}
            placeholder="Buscar por Nº SA, Cliente, Endereço, Bairro, SN ONT, GPON, CDOE, Técnico..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 transition-all outline-none"
          />

          {termoBusca && (
            <button
              type="button"
              id="btn-limpar-busca-servicos"
              onClick={onLimparBusca}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
              title="Limpar busca"
            >
              <div className="p-1 hover:bg-slate-800 rounded-full">
                <X className="w-3.5 h-3.5" />
              </div>
            </button>
          )}
        </div>

        {/* Tags / Indicador de Resultados */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {termoBusca ? (
            <div className="flex items-center gap-1.5 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-xl font-medium animate-fadeIn">
              <span>
                {totalEncontrados} {totalEncontrados === 1 ? 'resultado compatível' : 'resultados compatíveis'}
              </span>
              <button
                type="button"
                onClick={onLimparBusca}
                className="ml-1 text-[11px] underline text-blue-400 hover:text-blue-200 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium px-2 py-1">
              <span>Busca rápida por qualquer dado da OS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
