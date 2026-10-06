import React from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  PlusCircle,
  LogOut,
  User as UserIcon,
  FileSpreadsheet,
  FileText,
  Wrench,
  Send,
  Crown,
  Download,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { isUserAdmin } from '../utils/adminUtils';

interface HeaderProps {
  user: User;
  onOpenNovoCadastro: () => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
  totalServicos: number;
  onOpenTelegramConfig?: () => void;
  onOpenPwaModal?: () => void;
  isPwaInstalled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenNovoCadastro,
  onExportarPDF,
  onExportarExcel,
  totalServicos,
  onOpenTelegramConfig,
  onOpenPwaModal,
  isPwaInstalled = false
}) => {
  const isAdmin = isUserAdmin(user.email);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand & User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>Serviços do Dia</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-slate-500" />
                {user.displayName || user.email?.split('@')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {/* Botão PWA no Mobile Header */}
            {onOpenPwaModal && (
              <button
                onClick={onOpenPwaModal}
                title={isPwaInstalled ? 'App PWA Instalado' : 'Instalar App no Android / Celular'}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                  isPwaInstalled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30 animate-pulse'
                }`}
              >
                {isPwaInstalled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-[11px]">PWA</span>
              </button>
            )}

            {/* Sair Mobile */}
            <button
              onClick={handleSignOut}
              title="Sair da conta"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons: Novo Cadastro, PWA e Exportações */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Botão Novo Cadastro no topo */}
          <button
            onClick={onOpenNovoCadastro}
            className="flex-1 md:flex-initial py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Adicionar Novo Cadastro</span>
          </button>

          {/* Botão Instalar App (PWA) no Desktop */}
          {onOpenPwaModal && (
            <button
              onClick={onOpenPwaModal}
              title={isPwaInstalled ? 'Aplicativo PWA Instalado' : 'Instalar Aplicativo PWA no Android / PC'}
              className={`hidden sm:flex py-2.5 px-3 rounded-xl border text-xs font-semibold items-center gap-1.5 transition active:scale-95 ${
                isPwaInstalled
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border-blue-500/40 shadow-sm'
              }`}
            >
              {isPwaInstalled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PWA Ativo</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-400 animate-bounce" />
                  <span>Instalar PWA</span>
                </>
              )}
            </button>
          )}

          {/* Botão de Configuração do Telegram Apenas para o Administrador */}
          {isAdmin && onOpenTelegramConfig && (
            <button
              onClick={onOpenTelegramConfig}
              title="Configurar Token do Bot e ID do Grupo Telegram"
              className="py-2.5 px-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Config Bot</span>
              <Crown className="w-3 h-3 text-amber-400" />
            </button>
          )}

          {/* Botões de Exportação */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={onExportarPDF}
              disabled={totalServicos === 0}
              title="Exportar para PDF"
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 text-red-400" />
              <span>PDF</span>
            </button>

            <button
              onClick={onExportarExcel}
              disabled={totalServicos === 0}
              title="Exportar para Excel"
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>

          {/* Sair Desktop */}
          <button
            onClick={handleSignOut}
            title="Sair da conta"
            className="hidden md:flex p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>

      </div>
    </header>
  );
};
