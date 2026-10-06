import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  Wrench,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Zap,
  Download,
  Smartphone
} from 'lucide-react';
import { PwaInstallModal } from './PwaInstallModal';

export const AuthScreen: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(true); // Default to register new user as requested
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [pwaModalAberto, setPwaModalAberto] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detecta instalação ou prompt
    if (typeof window !== 'undefined') {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
      if ((window as any).isAppInstalled || window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }

      const handlePwaReady = (e: any) => {
        setDeferredPrompt(e.detail || (window as any).deferredPwaPrompt);
      };

      const handlePwaInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('pwa-prompt-ready', handlePwaReady);
      window.addEventListener('pwa-installed', handlePwaInstalled);

      return () => {
        window.removeEventListener('pwa-prompt-ready', handlePwaReady);
        window.removeEventListener('pwa-installed', handlePwaInstalled);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      if (isRegistering) {
        if (!nome.trim()) {
          throw new Error('Por favor, informe seu nome completo.');
        }
        if (senha.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), senha);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: nome.trim()
          });
        }
        setSucesso('Conta criada com sucesso! Redirecionando...');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
        setSucesso('Login efetuado com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro de Autenticação Firebase:', err);
      let msg = 'Ocorreu um erro ao processar. Verifique os dados digitados.';
      
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        msg = 'O cadastro por E-mail/Senha precisa ser habilitado no Firebase Console. Você pode clicar no botão "Acesso Rápido" abaixo para entrar imediatamente!';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'E-mail ou senha incorretos. Se não possui conta, clique em "Cadastrar Novo Usuário".';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado no sistema. Alterne para a opção "Fazer Login".';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha é fraca. Utilize no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido. Exemplo: nome@provedor.com';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Falha de conexão com a internet ou servidor do Firebase.';
      } else if (err.message) {
        msg = err.message;
      }
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  const handleAcessoRapido = async () => {
    setErro('');
    setSucesso('');
    setCarregando(true);
    try {
      const userCred = await signInAnonymously(auth);
      if (userCred.user && !userCred.user.displayName) {
        await updateProfile(userCred.user, {
          displayName: 'Técnico de Campo'
        });
      }
      setSucesso('Conectado em modo técnico rápido!');
    } catch (err: any) {
      console.error('Erro no Acesso Rápido:', err);
      setErro('Não foi possível realizar o acesso rápido no momento. ' + (err.message || ''));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-3 text-white">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ServPlus</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRegistering ? 'Cadastre sua conta de técnico' : 'Acesse seu painel técnico'}
          </p>
        </div>

        {/* Botão de Instalação PWA na tela de Login */}
        <button
          type="button"
          onClick={() => setPwaModalAberto(true)}
          className="w-full py-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <Smartphone className="w-4 h-4 text-blue-400" />
          <span>{isInstalled ? 'App PWA Ativo no Aparelho' : 'Instalar Aplicativo PWA no Android / Celular'}</span>
        </button>

        {/* Mensagens de Alerta */}
        {erro && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Aviso</span>
              <span>{erro}</span>
            </div>
          </div>
        )}

        {sucesso && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Tabs de seleção entre Cadastro e Login */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              isRegistering
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastrar Novo Usuário
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setErro('');
              setSucesso('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              !isRegistering
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar (Já tenho conta)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Nome Completo do Técnico *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              E-mail *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@provedor.com"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Senha * (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
          >
            {carregando ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Cadastrar Conta no Firebase
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar com E-mail
              </>
            )}
          </button>
        </form>

        {/* Divisora e Botão de Acesso Rápido */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-center">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Ou acesse sem criar senha</span>
          </div>

          <button
            type="button"
            onClick={handleAcessoRapido}
            disabled={carregando}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Acesso Rápido Técnico (Sem Senha)</span>
          </button>
        </div>

      </div>

      {/* Modal de Instalação PWA */}
      <PwaInstallModal
        isOpen={pwaModalAberto}
        onClose={() => setPwaModalAberto(false)}
        deferredPrompt={deferredPrompt}
        onNativeInstall={() => setDeferredPrompt(null)}
        isInstalled={isInstalled}
      />
    </div>
  );
};
