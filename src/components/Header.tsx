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
  CheckCircle2,
  Database,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { isUserAdmin } from '../utils/adminUtils';
import { BackendType, PHP_API_BASE_URL } from '../config/backendConfig';

interface HeaderProps {
  user: User | { uid: string; email?: string | null; displayName?: string | null };
  onOpenNovoCadastro: () => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
  totalServicos: number;
  onOpenTelegramConfig?: () => void;
  onOpenPwaModal?: () => void;
  onOpenMigracaoFirebase?: () => void;
  onSincronizar?: () => void;
  sincronizando?: boolean;
  isPwaInstalled?: boolean;
  backend?: BackendType;
  onToggleBackend?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenNovoCadastro,
  onExportarPDF,
  onExportarExcel,
  totalServicos,
  onOpenTelegramConfig,
  onOpenPwaModal,
  onOpenMigracaoFirebase,
  onSincronizar,
  sincronizando = false,
  isPwaInstalled = false,
  backend = 'mysql',
  onToggleBackend,
  onSignOut
}) => {
  const isAdmin = isUserAdmin(user.email);

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                  Serviços do Dia
                </h1>
                {/* Badge do Servidor Ativo */}
                {onToggleBackend ? (
                  <button
                    type="button"
                    onClick={onToggleBackend}
                    title={`Clique para alternar o servidor (Ativo: ${backend === 'mysql' ? 'MySQL em ' + PHP_API_BASE_URL : 'Firebase'})`}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                      backend === 'mysql'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    <span>{backend === 'mysql' ? 'MySQL (Hostinger)' : 'Firebase'}</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Database className="w-3 h-3" />
                    <span>{backend === 'mysql' ? 'MySQL' : 'Firebase'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <UserIcon className="w-3 h-3 text-slate-500" />
                {user.displayName || user.email?.split('@')[0] || 'Técnico'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {/* Sair Mobile */}
            <button
              onClick={handleSignOut}
              title="Sair da conta"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
            className="flex-1 md:flex-initial py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Cadastrar Serviço</span>
          </button>

          {/* Botão Instalar App (PWA) no Desktop */}
          {onOpenPwaModal && (
            <button
              onClick={onOpenPwaModal}
              title={isPwaInstalled ? 'Aplicativo PWA Instalado' : 'Instalar Aplicativo PWA no Android / PC'}
              className={`hidden sm:flex py-2.5 px-3 rounded-xl border text-xs font-semibold items-center gap-1.5 transition active:scale-95 cursor-pointer ${
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

          {/* Botão Sincronizar com o Banco de Dados */}
          {onSincronizar && (
            <button
              onClick={onSincronizar}
              disabled={sincronizando}
              title={`Sincronizar dados com o banco de dados (${backend === 'mysql' ? 'MySQL' : 'Firebase'})`}
              className="py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${sincronizando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          )}

          {/* Botão de Migração do Firebase para o MySQL */}
          {onOpenMigracaoFirebase && (
            <button
              onClick={onOpenMigracaoFirebase}
              title="Buscar registros do Firebase e passar para o MySQL"
              className="py-2.5 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Migrar do Firebase</span>
            </button>
          )}

          {/* Botão de Configuração do Telegram Apenas para o Administrador */}
          {isAdmin && onOpenTelegramConfig && (
            <button
              onClick={onOpenTelegramConfig}
              title="Configurar Token do Bot e ID do Grupo Telegram"
              className="py-2.5 px-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileText className="w-4 h-4 text-red-400" />
              <span>PDF</span>
            </button>

            <button
              onClick={onExportarExcel}
              disabled={totalServicos === 0}
              title="Exportar para Excel"
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>

          {/* Sair Desktop */}
          <button
            onClick={handleSignOut}
            title="Sair da conta"
            className="hidden md:flex p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>

      </div>
    </header>
  );
};
