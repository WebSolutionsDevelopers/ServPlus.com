import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Share2,
  CheckSquare,
  Square,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
  FolderCheck,
  MapPin,
  Cpu,
  UserCheck,
  Wrench,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { ServicoItem } from '../types';
import { EXCEL_COLUMNS, ExcelColumnOption, gerarExcelData, ExportData } from '../utils/exportUtils';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicos: ServicoItem[];
  userEmail: string;
  onExportReady: (exportData: ExportData) => void;
}

const STORAGE_KEY = 'servplus_selected_excel_columns_v1';

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  servicos,
  userEmail,
  onExportReady
}) => {
  // Inicializar colunas selecionadas a partir do localStorage ou dos padrões
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filtrar apenas IDs válidos
          const validIds = parsed.filter((id) => EXCEL_COLUMNS.some((c) => c.id === id));
          if (validIds.length > 0) return validIds;
        }
      }
    } catch (e) {
      console.error('Erro ao ler colunas salvas:', e);
    }
    // Fallback: colunas com defaultSelected = true
    return EXCEL_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id);
  });

  const [busca, setBusca] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Salvar no localStorage sempre que houver alteração
  useEffect(() => {
    if (selectedColumnIds.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedColumnIds));
      } catch (e) {
        console.error('Erro ao salvar preferências de colunas:', e);
      }
    }
  }, [selectedColumnIds]);

  // Agrupar colunas por categoria
  const categorias = useMemo(() => {
    const map = new Map<string, ExcelColumnOption[]>();
    for (const col of EXCEL_COLUMNS) {
      if (!map.has(col.category)) {
        map.set(col.category, []);
      }
      map.get(col.category)!.push(col);
    }
    return Array.from(map.entries()).map(([nome, colunas]) => ({
      nome,
      colunas
    }));
  }, []);

  // Filtrar colunas de acordo com a busca
  const categoriasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return categorias;

    return categorias
      .map((cat) => ({
        ...cat,
        colunas: cat.colunas.filter(
          (c) =>
            c.label.toLowerCase().includes(termo) ||
            (c.description && c.description.toLowerCase().includes(termo)) ||
            cat.nome.toLowerCase().includes(termo)
        )
      }))
      .filter((cat) => cat.colunas.length > 0);
  }, [categorias, busca]);

  if (!isOpen) return null;

  // Toggle de coluna individual
  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle de categoria inteira
  const toggleCategoria = (colunasDaCategoria: ExcelColumnOption[]) => {
    const idsDaCategoria = colunasDaCategoria.map((c) => c.id);
    const todasMarcadas = idsDaCategoria.every((id) => selectedColumnIds.includes(id));

    if (todasMarcadas) {
      // Desmarcar todas do grupo
      setSelectedColumnIds((prev) => prev.filter((id) => !idsDaCategoria.includes(id)));
    } else {
      // Marcar todas do grupo
      setSelectedColumnIds((prev) => Array.from(new Set([...prev, ...idsDaCategoria])));
    }
  };

  // Presets rápidos
  const handleSelecionarTodas = () => {
    setSelectedColumnIds(EXCEL_COLUMNS.map((c) => c.id));
    setFeedbackMsg('Todas as 32 colunas foram selecionadas!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDesmarcarTodas = () => {
    setSelectedColumnIds([]);
    setFeedbackMsg('Todas as colunas foram desmarcadas.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRestaurarPadrao = () => {
    const padrao = EXCEL_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id);
    setSelectedColumnIds(padrao);
    setFeedbackMsg('Seleção padrão restaurada com sucesso!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handlePresetResumido = () => {
    const resumidoIds = [
      'index',
      'data',
      'tecnicoNome',
      'tipoServico',
      'operadora',
      'valor',
      'numeroSA',
      'acessoGpon',
      'quemAtendeu',
      'metrosUtilizados',
      'snOnt'
    ];
    setSelectedColumnIds(resumidoIds);
    setFeedbackMsg('Preset "Resumo / Faturamento" aplicado!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handlePresetEndereco = () => {
    const enderecoIds = [
      'index',
      'data',
      'numeroSA',
      'acessoGpon',
      'quemAtendeu',
      'contatoCliente',
      'endereco',
      'numero',
      'bairro',
      'cidade',
      'estado'
    ];
    setSelectedColumnIds(enderecoIds);
    setFeedbackMsg('Preset "Endereços & Contato" aplicado!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Gerar dados e baixar diretamente
  const handleBaixarDireto = () => {
    if (selectedColumnIds.length === 0) return;
    const exportResult = gerarExcelData(servicos, userEmail, selectedColumnIds);
    
    // Dispara o download automático no navegador
    const link = document.createElement('a');
    link.href = exportResult.blobUrl;
    link.download = exportResult.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  // Gerar dados e abrir modal de compartilhamento / opções
  const handleGerarECompartilhar = () => {
    if (selectedColumnIds.length === 0) return;
    const exportResult = gerarExcelData(servicos, userEmail, selectedColumnIds);
    onExportReady(exportResult);
    onClose();
  };

  const totalColunas = EXCEL_COLUMNS.length;
  const colunasSelecionadasCount = selectedColumnIds.length;
  const hasSelection = colunasSelecionadasCount > 0;

  // Obter ícone para categoria
  const getCategoriaIcon = (nome: string) => {
    switch (nome) {
      case 'Identificação & Serviço':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'Cliente & OS':
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'Endereço & Localização':
        return <MapPin className="w-4 h-4 text-amber-400" />;
      case 'Fibra & Metragens':
        return <SlidersHorizontal className="w-4 h-4 text-purple-400" />;
      case 'Equipamentos & Números de Série':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'Caixa & Rede Externa':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'Materiais Utilizados':
        return <Wrench className="w-4 h-4 text-rose-400" />;
      case 'Observações & Mídia':
        return <FileText className="w-4 h-4 text-slate-400" />;
      default:
        return <FolderCheck className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Personalizar Exportação Excel</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  .XLSX
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {servicos.length} {servicos.length === 1 ? 'serviço selecionado' : 'serviços selecionados'} • Escolha quais colunas deseja incluir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros Rápidos, Busca e Presets */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800/80 space-y-2.5 shrink-0">
          
          {/* Campo de Busca e Contador */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar coluna por nome ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-medium">
              <span className="text-slate-400">Selecionadas:</span>
              <span className={`px-2 py-0.5 rounded-lg font-bold border ${
                colunasSelecionadasCount === 0
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {colunasSelecionadasCount} de {totalColunas}
              </span>
            </div>
          </div>

          {/* Botões de Presets Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              onClick={handleSelecionarTodas}
              className="py-1 px-2.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700/80 transition flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Marcar Todas</span>
            </button>

            <button
              onClick={handleDesmarcarTodas}
              className="py-1 px-2.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-300 rounded-lg border border-slate-700/80 transition flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Desmarcar Todas</span>
            </button>

            <button
              onClick={handleRestaurarPadrao}
              className="py-1 px-2.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
              <span>Padrão Completo</span>
            </button>

            <button
              onClick={handlePresetResumido}
              className="py-1 px-2.5 text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-purple-300 hover:text-purple-200 rounded-lg border border-purple-500/30 transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Resumo / Faturamento</span>
            </button>

            <button
              onClick={handlePresetEndereco}
              className="py-1 px-2.5 text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-lg border border-amber-500/30 transition flex items-center gap-1"
            >
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>Endereços & Contato</span>
            </button>
          </div>

          {/* Feedback temporário */}
          {feedbackMsg && (
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {!hasSelection && (
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Marque ao menos 1 coluna para poder gerar o arquivo Excel.</span>
            </div>
          )}

        </div>

        {/* Lista de Colunas Agrupadas com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-800/60">
          {categoriasFiltradas.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma coluna encontrada para "{busca}".
            </div>
          ) : (
            categoriasFiltradas.map(({ nome, colunas }, idx) => {
              const idsDoGrupo = colunas.map((c) => c.id);
              const qtdMarcadasNoGrupo = idsDoGrupo.filter((id) => selectedColumnIds.includes(id)).length;
              const todasDoGrupoMarcadas = qtdMarcadasNoGrupo === colunas.length && colunas.length > 0;

              return (
                <div key={nome} className={idx > 0 ? 'pt-4' : ''}>
                  {/* Cabeçalho da Categoria */}
                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2">
                      {getCategoriaIcon(nome)}
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {nome}
                      </h4>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {qtdMarcadasNoGrupo}/{colunas.length}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleCategoria(colunas)}
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition"
                    >
                      {todasDoGrupoMarcadas ? 'Desmarcar grupo' : 'Marcar grupo'}
                    </button>
                  </div>

                  {/* Grid de Colunas do Grupo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {colunas.map((col) => {
                      const isSelected = selectedColumnIds.includes(col.id);

                      return (
                        <div
                          key={col.id}
                          onClick={() => toggleColumn(col.id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 hover:bg-emerald-500/15'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-950/70'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-semibold leading-tight truncate ${
                                isSelected ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {col.label}
                            </p>
                            {col.description && (
                              <p className="text-[10px] text-slate-500 leading-normal mt-0.5 truncate">
                                {col.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            As colunas selecionadas serão salvas para suas próximas exportações.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>

            {/* Opção 1: Compartilhar / Enviar */}
            <button
              onClick={handleGerarECompartilhar}
              disabled={!hasSelection}
              title="Gerar e abrir opções de envio por WhatsApp / E-mail"
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Compartilhar</span>
            </button>

            {/* Opção 2: Baixar Direto (.xlsx) */}
            <button
              onClick={handleBaixarDireto}
              disabled={!hasSelection}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Excel</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
