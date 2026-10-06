import React from 'react';
import {
  MapPin,
  Calendar,
  User,
  Phone,
  Eye,
  Trash2,
  Edit2,
  Camera,
  CheckCircle2,
  DollarSign,
  Tag
} from 'lucide-react';
import { ServicoItem } from '../types';
import { getValorServico } from '../utils/servicoUtils';

interface ServicoCardProps {
  servico: ServicoItem;
  onView: (servico: ServicoItem) => void;
  onEdit: (servico: ServicoItem) => void;
  onDelete: (id: string) => void;
}

export const ServicoCard: React.FC<ServicoCardProps> = ({
  servico,
  onView,
  onEdit,
  onDelete
}) => {
  const getOperadoraColor = (op: string) => {
    switch (op) {
      case 'NIO':
        return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'TIM':
        return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
      case 'ALGAR':
        return 'bg-amber-600/20 text-amber-400 border-amber-500/30';
      case 'LIGA':
        return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const formattedDate = servico.data
    ? new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR')
    : '-';

  const valorExibicao = getValorServico(servico);

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between gap-4 group">
      
      {/* Card Header: Operadora, Tipo Servico e Valor */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getOperadoraColor(servico.operadora)}`}>
            {servico.operadora}
          </span>

          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {servico.tipoServico || servico.tipoAtividade}
          </span>
        </div>

        {/* Valor R$ 100,00 */}
        <div className="text-right">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40 inline-flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            R$ {valorExibicao.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Main Info */}
      <div className="space-y-2 text-xs text-slate-300">
        
        {/* Data & SA */}
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {formattedDate}
          </span>
          {servico.dadosVisita?.numeroSA && (
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono text-[11px]">
              SA: {servico.dadosVisita.numeroSA}
            </span>
          )}
        </div>

        {/* Cliente & Contato */}
        {servico.dadosVisita?.quemAtendeu && (
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{servico.dadosVisita.quemAtendeu}</span>
            {servico.dadosVisita.contatoCliente && (
              <span className="text-slate-400 font-normal">({servico.dadosVisita.contatoCliente})</span>
            )}
          </div>
        )}

        {/* Endereço */}
        {(servico.localizacao?.endereco || servico.localizacao?.bairro) && (
          <div className="flex items-start gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {servico.localizacao.endereco}
              {servico.localizacao.numero ? `, ${servico.localizacao.numero}` : ''}
              {servico.localizacao.bairro ? ` - ${servico.localizacao.bairro}` : ''}
              {servico.localizacao.cidade ? `, ${servico.localizacao.cidade}` : ''}
            </span>
          </div>
        )}

      </div>

      {/* Footer / Meta and Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        
        {/* Photos badge */}
        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span>{servico.fotos?.length || 0} fotos</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(servico)}
            title="Visualizar detalhes"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(servico)}
            title="Editar cadastro"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 rounded-lg transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => servico.id && onDelete(servico.id)}
            title="Excluir cadastro"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
