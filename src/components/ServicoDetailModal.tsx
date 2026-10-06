import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  User,
  Phone,
  Layers,
  Ruler,
  Cpu,
  FileText,
  Camera,
  ExternalLink,
  DollarSign,
  Send,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { ServicoItem } from '../types';
import { sendServicoToTelegram, ensureTelegramConfig } from '../utils/telegramUtils';
import { getValorServico } from '../utils/servicoUtils';

interface ServicoDetailModalProps {
  servico: ServicoItem | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onOpenTelegramConfig?: () => void;
}

export const ServicoDetailModal: React.FC<ServicoDetailModalProps> = ({
  servico,
  onClose,
  onDelete,
  onOpenTelegramConfig
}) => {
  if (!servico) return null;

  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);
  const [enviandoTelegram, setEnviandoTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const formattedDate = servico.data
    ? new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR')
    : '-';

  const loc = servico.localizacao || {};
  const dv = servico.dadosVisita || {};

  const handleEnviarTelegram = async () => {
    setTelegramStatus(null);
    setEnviandoTelegram(true);

    try {
      const res = await sendServicoToTelegram(servico);
      const destinosStr = res.destinosEnviados && res.destinosEnviados.length > 0
        ? ` (${res.destinosEnviados.join(', ')})`
        : '';
      setTelegramStatus({
        tipo: 'sucesso',
        texto: `Formulário enviado com sucesso para o Telegram${destinosStr}!`
      });
    } catch (err: any) {
      setTelegramStatus({
        tipo: 'erro',
        texto: err.message || 'Erro ao enviar para o Telegram.'
      });
    } finally {
      setEnviandoTelegram(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
              {servico.operadora}
            </span>
            <h2 className="text-base font-bold text-white">
              {servico.tipoServico || servico.tipoAtividade} • {formattedDate}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          
          {/* Status & Valor Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <div>
              <span className="text-xs text-slate-400 block">Técnico Responsável</span>
              <span className="text-sm font-semibold text-white">{servico.userName || servico.userEmail}</span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Ganhos do Serviço</span>
              <span className="text-lg font-bold text-emerald-400">
                R$ {getValorServico(servico).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Localização */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Endereço e Localização
              </h3>

              {loc.latitude && loc.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
                >
                  Abrir no Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-slate-200">
              {loc.endereco ? `${loc.endereco}, ` : ''}
              {loc.numero ? `Nº ${loc.numero}` : ''}
              {loc.bairro ? ` - Bairro ${loc.bairro}` : ''}
            </p>
            <p className="text-xs text-slate-400">
              {loc.cidade ? `${loc.cidade}` : ''}
              {loc.estado ? ` - ${loc.estado}` : ''}
            </p>
          </div>

          {/* Dados da Visita */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <User className="w-4 h-4" /> Detalhes do Atendimento e Equipamentos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Número SA</span>
                <span className="font-semibold text-white">{dv.numeroSA || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Acesso GPON</span>
                <span className="font-semibold text-white">{dv.acessoGpon || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Quem Atendeu</span>
                <span className="font-semibold text-white">{dv.quemAtendeu || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Contato do Cliente</span>
                <span className="font-semibold text-white">{dv.contatoCliente || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Metragem Rolo</span>
                <span className="font-semibold text-white">{dv.metragemRolo ? `${dv.metragemRolo} m` : '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Metragem Inicial / Final</span>
                <span className="font-semibold text-white">
                  {dv.metragemInicial ?? '-'} m / {dv.metragemFinal ?? '-'} m
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">S/N ONT</span>
                <span className="font-semibold text-white">{dv.snOnt || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">S/N Mesh</span>
                <span className="font-semibold text-white">{dv.snMesh || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">S/N Drop</span>
                <span className="font-semibold text-white">{dv.snDrop || '-'}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Materiais (Conector / Esticador)</span>
                <span className="font-semibold text-white">
                  Conector: {dv.qtdConector ?? '-'} | Esticador: {dv.qtdEsticador ?? '-'}
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Plaqueta / Fixa Fio</span>
                <span className="font-semibold text-white">
                  Plaqueta: {dv.plaqueta ?? '-'} | Kit: {dv.kitFixaFio ?? '-'}
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Nº {dv.tipoCdoe || 'CDOE'} / Porta</span>
                <span className="font-semibold text-white">
                  {dv.tipoCdoe || 'CDOE'}: {dv.numCdoe ?? '-'} | Porta: {dv.portaUtilizada ?? '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {servico.observacoes && (
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Observações
              </h3>
              <p className="text-slate-300 whitespace-pre-wrap">{servico.observacoes}</p>
            </div>
          )}

          {/* Galeria de Fotos */}
          {servico.fotos && servico.fotos.length > 0 && (
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Fotos Anexadas ({servico.fotos.length})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {servico.fotos.map((foto, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFotoExpandida(foto)}
                    className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-square bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <img
                      src={foto}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                      Expandir
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Telegram */}
          {telegramStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2.5 ${
                telegramStatus.tipo === 'sucesso'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {telegramStatus.tipo === 'sucesso' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{telegramStatus.texto}</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-800/90 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnviarTelegram}
              disabled={enviandoTelegram}
              className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-950/40 flex items-center gap-2 transition text-xs active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{enviandoTelegram ? 'Enviando...' : 'Enviar para o Telegram'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {onDelete && servico.id && (
              <button
                onClick={() => {
                  if (servico.id) {
                    onDelete(servico.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl transition text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition text-xs"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>

      {/* Lightbox para foto expandida */}
      {fotoExpandida && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFotoExpandida(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={fotoExpandida}
              alt="Foto Expandida"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setFotoExpandida(null)}
              className="absolute -top-10 right-0 text-white bg-slate-800 p-2 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
