import React from 'react';
import { Filter, Calendar, RefreshCw, Layers } from 'lucide-react';
import { FiltroState, PresetFiltroData } from '../types';

interface FiltroBarProps {
  filtro: FiltroState;
  onChangeFiltro: (novoFiltro: FiltroState) => void;
  onResetFiltro: () => void;
}

export const FiltroBar: React.FC<FiltroBarProps> = ({
  filtro,
  onChangeFiltro,
  onResetFiltro
}) => {
  // Helper para obter datas formatadas YYYY-MM-DD em fuso local
  const getFormattedDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setPreset = (preset: PresetFiltroData) => {
    const hoje = new Date();
    let inicio = '';
    let fim = getFormattedDate(hoje);

    if (preset === 'hoje') {
      inicio = fim;
    } else if (preset === 'ontem') {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      inicio = getFormattedDate(ontem);
      fim = inicio;
    } else if (preset === '7dias') {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - 6);
      inicio = getFormattedDate(d);
    } else if (preset === '30dias') {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - 29);
      inicio = getFormattedDate(d);
    }

    onChangeFiltro({
      ...filtro,
      preset,
      dataInicio: inicio,
      dataFim: fim
    });
  };

  const handleMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // Formato "YYYY-MM"
    if (!value) return;

    const [ano, mes] = value.split('-').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);

    onChangeFiltro({
      ...filtro,
      preset: 'mes',
      mesAno: value,
      dataInicio: getFormattedDate(primeiroDia),
      dataFim: getFormattedDate(ultimoDia)
    });
  };

  const handleDataInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFiltro({
      ...filtro,
      preset: 'customizado',
      dataInicio: e.target.value
    });
  };

  const handleDataFimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFiltro({
      ...filtro,
      preset: 'customizado',
      dataFim: e.target.value
    });
  };

  const handleTipoAtividadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeFiltro({
      ...filtro,
      tipoAtividade: e.target.value
    });
  };

  const handleOperadoraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeFiltro({
      ...filtro,
      operadora: e.target.value
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
      
      {/* Linha 1: Título e Botões Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filtro de Período e Atividades</span>
        </div>

        {/* Botoes de Atalho Rapido: Hoje, Ontem, 7 Dias, 30 Dias */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreset('hoje')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filtro.preset === 'hoje'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => setPreset('ontem')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filtro.preset === 'ontem'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Ontem
          </button>

          <button
            type="button"
            onClick={() => setPreset('7dias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filtro.preset === '7dias'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            7 Dias
          </button>

          <button
            type="button"
            onClick={() => setPreset('30dias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filtro.preset === '30dias'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            30 Dias
          </button>

          <button
            type="button"
            onClick={onResetFiltro}
            title="Limpar todos os filtros"
            className="p-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl transition ml-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Linha 2: Campos de Data (Mês, Data Início, Data Fim) e Seleção de Atividade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        
        {/* Opção Escolher Mês */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Escolher Mês</label>
          <div className="relative">
            <input
              type="month"
              value={filtro.mesAno || ''}
              onChange={handleMesChange}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Data de Início */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Data Início</label>
          <input
            type="date"
            value={filtro.dataInicio || ''}
            onChange={handleDataInicioChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data de Fim */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Data Fim</label>
          <input
            type="date"
            value={filtro.dataFim || ''}
            onChange={handleDataFimChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tipo de Atividade / Serviço */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Tipo de Serviço</label>
          <select
            value={filtro.tipoAtividade}
            onChange={handleTipoAtividadeChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="INSTALAÇÃO">INSTALAÇÃO</option>
            <option value="REPARO">REPARO</option>
            <option value="MUDANÇA DE ENDEREÇO">MUDANÇA DE ENDEREÇO</option>
            <option value="REMANEJAMENTO">REMANEJAMENTO</option>
          </select>
        </div>

        {/* Operadora */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Operadora</label>
          <select
            value={filtro.operadora}
            onChange={handleOperadoraChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas as Operadoras</option>
            <option value="TIM">TIM</option>
            <option value="NIO">NIO</option>
            <option value="ALGAR">ALGAR</option>
            <option value="LIGA">LIGA</option>
          </select>
        </div>

      </div>

    </div>
  );
};
