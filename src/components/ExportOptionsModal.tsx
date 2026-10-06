import React, { useState } from 'react';
import { X, Share2, Download, Eye, FileText, FileSpreadsheet, Check, AlertCircle, Send } from 'lucide-react';
import { ExportData } from '../utils/exportUtils';

interface ExportOptionsModalProps {
  exportData: ExportData | null;
  onClose: () => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({ exportData, onClose }) => {
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);

  if (!exportData) return null;

  const isPdf = exportData.fileType === 'pdf';

  // Handler para Encaminhar / Compartilhar via Web Share API (WhatsApp, E-mail, etc.)
  const handleCompartilhar = async () => {
    setMensagemStatus(null);
    setCompartilhando(true);

    try {
      if (navigator.canShare && navigator.canShare({ files: [exportData.file] })) {
        await navigator.share({
          files: [exportData.file],
          title: exportData.fileName,
          text: `Relatório de Serviços do Dia (${exportData.fileType.toUpperCase()})`
        });
        setMensagemStatus('Arquivo compartilhado com sucesso!');
      } else if (navigator.share) {
        // Tenta compartilhar sem o array de arquivos caso o browser aceite apenas título/url
        await navigator.share({
          title: exportData.fileName,
          text: `Relatório de Serviços: ${exportData.fileName}`
        });
        setMensagemStatus('Compartilhamento concluído!');
      } else {
        setMensagemStatus('Seu navegador não suporta o encaminhamento direto. Use o botão "Salvar no Dispositivo".');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', err);
        setMensagemStatus('Não foi possível encaminhar diretamente. Use o botão "Salvar no Dispositivo".');
      }
    } finally {
      setCompartilhando(false);
    }
  };

  // Handler para Salvar / Baixar no Dispositivo
  const handleSalvarNoDispositivo = () => {
    const link = document.createElement('a');
    link.href = exportData.blobUrl;
    link.download = exportData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMensagemStatus('Download iniciado! O arquivo foi salvo nas Suas Transferências/Downloads.');
  };

  // Handler para Visualizar (Apenas PDF)
  const handleVisualizar = () => {
    window.open(exportData.blobUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isPdf ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Opções do Relatório {exportData.fileType.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-400">Escolha como deseja receber o arquivo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-5 space-y-4">
          
          {/* Card do Arquivo Gerado */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-0.5">
                Arquivo Gerado
              </span>
              <p className="text-xs font-mono font-medium text-slate-200 truncate" title={exportData.fileName}>
                {exportData.fileName}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              PRONTO
            </span>
          </div>

          {/* Mensagens de Feedback */}
          {mensagemStatus && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              <span>{mensagemStatus}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-2.5 pt-1">
            
            {/* Opção 1: Encaminhar / Compartilhar */}
            <button
              onClick={handleCompartilhar}
              disabled={compartilhando}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition active:scale-98 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Encaminhar / Compartilhar (WhatsApp, E-mail)</span>
            </button>

            {/* Opção 2: Salvar no Dispositivo */}
            <button
              onClick={handleSalvarNoDispositivo}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm rounded-xl border border-slate-700/80 flex items-center justify-center gap-2.5 transition active:scale-98"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Salvar no Dispositivo (Baixar)</span>
            </button>

            {/* Opção 3: Visualizar em Nova Aba (Para PDF) */}
            {isPdf && (
              <button
                onClick={handleVisualizar}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Visualizar Relatório na Tela</span>
              </button>
            )}

          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
