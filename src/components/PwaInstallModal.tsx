import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Globe,
  Wifi,
  Sparkles,
  Layers
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onNativeInstall: () => void;
  isInstalled?: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onNativeInstall,
  isInstalled = false
}) => {
  const [isIframe, setIsIframe] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  useEffect(() => {
    // Detecta se está rodando dentro de um iFrame (preview do estúdio)
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    // Detecta Sistema Operacional
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isAndroidDevice = /android/i.test(ua);
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsAndroid(isAndroidDevice);
    setIsIOS(isIOSDevice);

    // Verifica status do Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.active) {
          setSwActive(true);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAbrirNovaAba = () => {
    window.open(window.location.href, '_blank');
  };

  const actualPrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null);

  const handleExecutarInstalacao = async () => {
    if (actualPrompt) {
      setInstallStatus('installing');
      try {
        await actualPrompt.prompt();
        const choiceResult = await actualPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.log('[PWA] Usuário aceitou a instalação');
          setInstallStatus('success');
          onNativeInstall();
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          console.log('[PWA] Usuário dispensou a instalação');
          setInstallStatus('dismissed');
        }
      } catch (err) {
        console.error('[PWA] Erro ao chamar prompt nativo:', err);
        setInstallStatus('dismissed');
      }
    } else {
      // Se não há prompt nativo disponível, abre nova aba se for iframe
      if (isIframe) {
        handleAbrirNovaAba();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Instalar Aplicativo (PWA)</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                  Android & Web
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Acesse o app na tela inicial e use 100% offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm text-slate-300">
          
          {/* Status Já Instalado */}
          {isInstalled && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-200">App Já Instalado!</p>
                <p className="text-xs text-emerald-300/80">
                  O ServPlus já está ativo no seu dispositivo como aplicativo nativo.
                </p>
              </div>
            </div>
          )}

          {/* Alerta Importante se estiver dentro de iFrame */}
          {isIframe && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-200 text-sm">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Instalação no Google Chrome</span>
              </div>
              <p className="text-amber-200/90 leading-relaxed text-xs">
                O Google Chrome (incluindo versões recentes do Android) bloqueia instalações diretas quando a página está dentro de janelas incorporadas (iFrame).
              </p>
              <button
                onClick={handleAbrirNovaAba}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <span>Abrir Diretamente no Chrome</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Botão de Instalação Direta se o prompt estiver ativo */}
          {actualPrompt && installStatus !== 'success' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Instalação Direta Pronta</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clique no botão abaixo para adicionar o ícone do <b>ServPlus</b> à sua tela de início instantaneamente.
              </p>
              <button
                onClick={handleExecutarInstalacao}
                disabled={installStatus === 'installing'}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{installStatus === 'installing' ? 'Instalando...' : 'Instalar Aplicativo Agora'}</span>
              </button>
            </div>
          )}

          {installStatus === 'success' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-200">Instalação Concluída!</p>
                <p className="text-xs text-emerald-300/80">
                  O ícone do ServPlus foi adicionado à sua tela inicial.
                </p>
              </div>
            </div>
          )}

          {/* Passo a Passo para Google Chrome no Android */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Como Instalar no Google Chrome (Android)</span>
            </h4>
            <div className="space-y-2 text-xs bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Abra o app no <b>Google Chrome</b> fora do preview.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Toque no botão de <b>3 pontinhos (⋮)</b> no canto superior direito do Chrome.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span>Selecione <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                <span>Confirme em <b>"Instalar"</b> para criar o ícone nativo.</span>
              </div>
            </div>
          </div>

          {/* Passo a Passo para Safari (iPhone / iPad) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>No iPhone / iPad (Safari)</span>
            </h4>
            <div className="space-y-2 text-xs bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Abra no <b>Safari</b> e toque no botão <b>Compartilhar (quadrado com seta ↑)</b>.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Role para baixo e selecione <b>"Adicionar à Tela de Início"</b>.</span>
              </div>
            </div>
          </div>

          {/* Vantagens do PWA */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                <Wifi className="w-3.5 h-3.5" />
                <span>Funciona Offline</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cadastre e consulte serviços mesmo em áreas sem sinal de internet.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Tela Cheia</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sem barras do navegador, com máxima área de visualização para o trabalho.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleAbrirNovaAba}
            className="py-2 px-3 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-xl font-medium flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Nova Guia</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
