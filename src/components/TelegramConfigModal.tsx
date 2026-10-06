import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Save,
  ShieldCheck,
  Lock,
  Crown,
  Users,
  Search,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Radio,
  Share2,
  UserCheck
} from 'lucide-react';
import {
  ensureTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection
} from '../utils/telegramUtils';
import {
  listarTodosUsuarios,
  salvarTelegramUsuario,
  aplicarTelegramAdminParaTodos
} from '../lib/usuariosService';
import { isUserAdmin } from '../utils/adminUtils';
import { UsuarioItem, ModoEnvioTelegram, UsuarioTelegramConfigItem } from '../types';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userEmail?: string;
  currentUserId?: string;
  userName?: string;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userEmail = '',
  currentUserId = '',
  userName = ''
}) => {
  // Estados principais de configuração do Administrador
  const [botToken, setBotToken] = useState('');
  const [adminGrupoChatId, setAdminGrupoChatId] = useState('');
  const [modoEnvioPadrao, setModoEnvioPadrao] = useState<'ambos' | 'grupo' | 'privado'>('ambos');

  // Lista de usuários cadastrados e mapa individual
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [userConfigsMap, setUserConfigsMap] = useState<Record<string, UsuarioTelegramConfigItem>>({});
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState('');

  // Estados de ações e loading
  const [testandoGeral, setTestandoGeral] = useState(false);
  const [testandoUserAction, setTestandoUserAction] = useState<string | null>(null);
  const [salvandoGeral, setSalvandoGeral] = useState(false);
  const [aplicandoParaTodos, setAplicandoParaTodos] = useState(false);
  const [salvandoUserId, setSalvandoUserId] = useState<string | null>(null);

  // Feedback e UI
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [confirmarAplicarTodos, setConfirmarAplicarTodos] = useState(false);

  const isAdmin = isUserAdmin(userEmail);

  // Carregar dados ao abrir a modal
  useEffect(() => {
    if (isOpen) {
      setMensagemStatus(null);
      setConfirmarAplicarTodos(false);
      setFiltroBusca('');

      // 1. Carrega configuração principal
      ensureTelegramConfig().then((cfg) => {
        setBotToken(cfg.botToken || '');
        const grupo = cfg.grupoChatId || cfg.chatId || '';
        setAdminGrupoChatId(grupo);
        setModoEnvioPadrao(cfg.modoEnvio || 'ambos');

        if (cfg.userConfigs) {
          setUserConfigsMap(cfg.userConfigs);
        }
      });

      // 2. Carrega lista de usuários cadastrados se for Admin
      if (isAdmin) {
        setCarregandoUsuarios(true);
        listarTodosUsuarios()
          .then((lista) => {
            let listaFinal = lista;
            if (listaFinal.length === 0 && currentUserId) {
              listaFinal = [
                {
                  uid: currentUserId,
                  email: userEmail,
                  nome: userName || userEmail.split('@')[0] || 'Administrador',
                  telegramPrivadoChatId: '',
                  telegramGrupoChatId: adminGrupoChatId,
                  telegramModoEnvio: 'padrao'
                }
              ];
            }

            setUsuarios(listaFinal);

            // Sincroniza mapa com as configurações de cada usuário
            const mapa: Record<string, UsuarioTelegramConfigItem> = {};
            listaFinal.forEach((u) => {
              mapa[u.uid] = {
                privadoChatId: u.telegramPrivadoChatId || u.telegramChatId || '',
                grupoChatId: u.telegramGrupoChatId || '',
                modoEnvio: u.telegramModoEnvio || 'padrao'
              };
            });
            setUserConfigsMap((prev) => ({ ...mapa, ...prev }));
          })
          .catch((err) => {
            console.warn('Erro ao listar usuários:', err);
          })
          .finally(() => {
            setCarregandoUsuarios(false);
          });
      }
    }
  }, [isOpen, isAdmin, userEmail, currentUserId, userName]);

  if (!isOpen) return null;

  // Atualizar campo específico de um técnico no estado local
  const handleUserConfigChange = (
    uid: string,
    field: keyof UsuarioTelegramConfigItem,
    value: string
  ) => {
    setUserConfigsMap((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || {}),
        [field]: value
      }
    }));
  };

  // Salvar configuração individual de um técnico
  const handleSalvarUsuarioIndividual = async (uid: string) => {
    if (!isAdmin) return;
    const configTecnico = userConfigsMap[uid] || {};

    setSalvandoUserId(uid);
    setMensagemStatus(null);
    try {
      await salvarTelegramUsuario(uid, {
        privadoChatId: configTecnico.privadoChatId || '',
        grupoChatId: configTecnico.grupoChatId || '',
        modoEnvio: configTecnico.modoEnvio || 'padrao'
      });
      setMensagemStatus({
        tipo: 'sucesso',
        texto: 'Configuração do Telegram do técnico salva com sucesso!'
      });
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: err.message || 'Erro ao salvar configuração do técnico.'
      });
    } finally {
      setSalvandoUserId(null);
    }
  };

  // Testar conexão para um técnico (Privado, Grupo ou Ambos)
  const handleTestarTecnico = async (
    u: UsuarioItem,
    tipoTeste: 'privado' | 'grupo' | 'ambos'
  ) => {
    const configTecnico = userConfigsMap[u.uid] || {};
    const privadoId = (configTecnico.privadoChatId || u.telegramPrivadoChatId || '').trim();
    const grupoId = (configTecnico.grupoChatId || u.telegramGrupoChatId || adminGrupoChatId || '').trim();

    if (!botToken.trim()) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Preencha o Token do Bot antes de realizar testes.'
      });
      return;
    }

    const actionKey = `${u.uid}_${tipoTeste}`;
    setTestandoUserAction(actionKey);
    setMensagemStatus(null);

    try {
      if (tipoTeste === 'privado') {
        if (!privadoId) {
          throw new Error(`O Chat ID Privado de ${u.nome} não está preenchido.`);
        }
        await testTelegramConnection(botToken, privadoId, u.nome, 'Privado');
        setMensagemStatus({
          tipo: 'sucesso',
          texto: `🎉 Mensagem de teste enviada com sucesso no PRIVADO de ${u.nome} (Chat ID: ${privadoId})!`
        });
      } else if (tipoTeste === 'grupo') {
        if (!grupoId) {
          throw new Error('Nenhum ID de Grupo definido para este técnico ou para o Administrador.');
        }
        await testTelegramConnection(botToken, grupoId, u.nome, 'Grupo');
        setMensagemStatus({
          tipo: 'sucesso',
          texto: `🎉 Mensagem de teste enviada com sucesso no GRUPO de ${u.nome} (Chat ID: ${grupoId})!`
        });
      } else if (tipoTeste === 'ambos') {
        let erros: string[] = [];
        let sucessos = 0;

        if (grupoId) {
          try {
            await testTelegramConnection(botToken, grupoId, u.nome, 'Grupo');
            sucessos++;
          } catch (e: any) {
            erros.push(`Grupo: ${e.message}`);
          }
        }
        if (privadoId && privadoId !== grupoId) {
          try {
            await testTelegramConnection(botToken, privadoId, u.nome, 'Privado');
            sucessos++;
          } catch (e: any) {
            erros.push(`Privado: ${e.message}`);
          }
        }

        if (sucessos === 0) {
          throw new Error(`Falha nos testes:\n${erros.join('\n')}`);
        } else {
          setMensagemStatus({
            tipo: 'sucesso',
            texto: `🎉 Teste executado com sucesso para ${u.nome}! (${sucessos} destino(s) validado(s)).`
          });
        }
      }
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: `Falha no teste: ${err.message || 'Verifique se o usuário já deu /start no bot.'}`
      });
    } finally {
      setTestandoUserAction(null);
    }
  };

  // Replicar as configurações do Administrador para todos os técnicos
  const handleAplicarParaTodos = async () => {
    if (!isAdmin) return;

    if (!botToken.trim() || !adminGrupoChatId.trim()) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Preencha o Token do Bot e o ID do Grupo do Administrador antes de aplicar para todos.'
      });
      setConfirmarAplicarTodos(false);
      return;
    }

    setAplicandoParaTodos(true);
    setMensagemStatus(null);

    try {
      const res = await aplicarTelegramAdminParaTodos(
        botToken,
        adminGrupoChatId,
        modoEnvioPadrao,
        {
          definirModoEnvioParaTodos: true,
          definirGrupoParaTodos: true
        }
      );

      // Atualiza o estado local do mapa
      const novoMapa: Record<string, UsuarioTelegramConfigItem> = { ...userConfigsMap };
      usuarios.forEach((u) => {
        novoMapa[u.uid] = {
          ...(novoMapa[u.uid] || {}),
          grupoChatId: adminGrupoChatId.trim(),
          modoEnvio: 'padrao'
        };
      });
      setUserConfigsMap(novoMapa);

      setMensagemStatus({
        tipo: 'sucesso',
        texto: `🚀 Configuração aplicada com sucesso para todos os ${res.total || usuarios.length} técnicos cadastrados!`
      });
      setConfirmarAplicarTodos(false);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: err.message || 'Erro ao aplicar configurações para todos.'
      });
    } finally {
      setAplicandoParaTodos(false);
    }
  };

  // Salvar tudo
  const handleSalvarTudo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAdmin) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Apenas o administrador possui permissão para alterar as configurações do Telegram.'
      });
      return;
    }

    if (!botToken.trim() || !adminGrupoChatId.trim()) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Preencha o Token do Bot e o ID do Grupo do Administrador.'
      });
      return;
    }

    setSalvandoGeral(true);
    setMensagemStatus(null);

    try {
      // 1. Salva no documento config/telegram
      await saveTelegramConfig(botToken, adminGrupoChatId, modoEnvioPadrao, userConfigsMap);

      // 2. Salva as configs de cada usuário individual
      const updates = usuarios.map((u) => {
        const c = userConfigsMap[u.uid] || {};
        return salvarTelegramUsuario(u.uid, {
          privadoChatId: c.privadoChatId,
          grupoChatId: c.grupoChatId,
          modoEnvio: c.modoEnvio
        });
      });
      await Promise.all(updates);

      setMensagemStatus({
        tipo: 'sucesso',
        texto: 'Todas as configurações do Telegram e dos técnicos foram salvas com sucesso!'
      });

      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: err.message || 'Erro ao salvar configurações do Telegram.'
      });
    } finally {
      setSalvandoGeral(false);
    }
  };

  // Testar conexão geral com o Grupo do Admin
  const handleTestarGeral = async () => {
    setMensagemStatus(null);
    if (!botToken.trim() || !adminGrupoChatId.trim()) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Preencha o Token do Bot e o ID do Grupo do Administrador antes de testar.'
      });
      return;
    }

    setTestandoGeral(true);
    try {
      await testTelegramConnection(botToken, adminGrupoChatId, 'Central de Atendimento', 'Grupo');
      setMensagemStatus({
        tipo: 'sucesso',
        texto: '🎉 Mensagem enviada com sucesso para o Grupo do Administrador! Verifique o Telegram.'
      });
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: `Falha no teste: ${err.message || 'Verifique se o bot foi adicionado como administrador no grupo.'}`
      });
    } finally {
      setTestandoGeral(false);
    }
  };

  // Filtrar lista de usuários para busca
  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = filtroBusca.toLowerCase().trim();
    if (!termo) return true;
    const config = userConfigsMap[u.uid] || {};
    return (
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (config.privadoChatId || '').includes(termo) ||
      (config.grupoChatId || '').includes(termo)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800/90 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Configuração de Envio para o Telegram
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Autonomia Exclusiva do Administrador
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-700 text-slate-300 font-medium px-2 py-0.5 rounded-full border border-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Somente Leitura
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina o envio para Grupo, Privado do técnico ou ambos simultaneamente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-xl transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm flex-1 custom-scrollbar">

          {/* Aviso se não for Admin */}
          {!isAdmin && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Painel de Acesso Exclusivo do Administrador</p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Apenas o administrador (<b>juliano.jcavalheiro@gmail.com</b>) tem a autonomia para alterar o bot, os grupos e as regras de envio individual de cada técnico.
                </p>
              </div>
            </div>
          )}

          {/* Status Message */}
          {mensagemStatus && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn ${
                mensagemStatus.tipo === 'sucesso'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : mensagemStatus.tipo === 'info'
                  ? 'bg-sky-500/10 border border-sky-500/30 text-sky-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              {mensagemStatus.tipo === 'sucesso' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : mensagemStatus.tipo === 'info' ? (
                <Sparkles className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span className="leading-relaxed whitespace-pre-line">{mensagemStatus.texto}</span>
            </div>
          )}

          {/* Seção 1: Credenciais do Bot, Grupo Central e Modo de Envio Padrão */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Credenciais Principais & Opções de Envio do Administrador</span>
              </div>
              <button
                type="button"
                onClick={handleTestarGeral}
                disabled={testandoGeral || !botToken.trim() || !adminGrupoChatId.trim()}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                <span>{testandoGeral ? 'Testando...' : 'Testar Grupo Central'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Bot Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Token da API do Bot (BotFather)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="Ex: 1234567890:ABCdefGHIjklMNO..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 font-mono text-xs transition disabled:opacity-50"
                />
              </div>

              {/* ID do Grupo Central / Padrão */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ID do Grupo de Sua Escolha (Padrão Central)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="Ex: -1001928374650"
                  value={adminGrupoChatId}
                  onChange={(e) => setAdminGrupoChatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 font-mono text-xs transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Escolha do Modo de Envio Padrão do Administrador */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Onde o formulário deve ser enviado? (Modo de Envio Padrão)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opção 1: Ambos */}
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setModoEnvioPadrao('ambos')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    modoEnvioPadrao === 'ambos'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-950/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                      <Share2 className="w-3.5 h-3.5" /> No Grupo E no Privado
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      modoEnvioPadrao === 'ambos' ? 'border-sky-400 bg-sky-500' : 'border-slate-600'
                    }`}>
                      {modoEnvioPadrao === 'ambos' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Envia simultaneamente para o Grupo central e no privado de cada técnico.
                  </p>
                </button>

                {/* Opção 2: Somente Grupo */}
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setModoEnvioPadrao('grupo')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    modoEnvioPadrao === 'grupo'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-950/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                      <Users className="w-3.5 h-3.5" /> Somente para o Grupo
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      modoEnvioPadrao === 'grupo' ? 'border-sky-400 bg-sky-500' : 'border-slate-600'
                    }`}>
                      {modoEnvioPadrao === 'grupo' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Envia apenas para o Grupo de atendimento escolhido.
                  </p>
                </button>

                {/* Opção 3: Somente Privado */}
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setModoEnvioPadrao('privado')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    modoEnvioPadrao === 'privado'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-950/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                      <MessageSquare className="w-3.5 h-3.5" /> Somente no Privado
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      modoEnvioPadrao === 'privado' ? 'border-sky-400 bg-sky-500' : 'border-slate-600'
                    }`}>
                      {modoEnvioPadrao === 'privado' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Envia apenas para o chat privado individual de cada técnico.
                  </p>
                </button>
              </div>
            </div>

            {/* Ação do Administrador: Replicar Regras para Todos os Técnicos */}
            {isAdmin && (
              <div className="mt-3 p-3.5 bg-gradient-to-r from-sky-950/50 to-indigo-950/40 border border-sky-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Aplicar Grupo & Modo de Envio para Todos os Técnicos</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Replica o Grupo Central e o Modo de Envio escolhido acima para todos os técnicos cadastrados de uma só vez.
                  </p>
                </div>

                {confirmarAplicarTodos ? (
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setConfirmarAplicarTodos(false)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAplicarParaTodos}
                      disabled={aplicandoParaTodos}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
                    >
                      {aplicandoParaTodos ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Aplicando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Confirmar Replicar</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarAplicarTodos(true)}
                    disabled={!botToken.trim() || !adminGrupoChatId.trim()}
                    className="w-full sm:w-auto px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-md border border-sky-400/30 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Replicar para Todos</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seção 2: Configuração Individual por Técnico Cadastrado */}
          {isAdmin && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                    <span>2. Destinos & Regras por Técnico Cadastrado</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      {usuarios.length} {usuarios.length === 1 ? 'técnico' : 'técnicos'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Defina o Chat ID Privado de cada técnico e customize o modo de envio individualmente se desejar
                  </p>
                </div>

                {/* Filtro de Busca */}
                {usuarios.length > 2 && (
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar técnico..."
                      value={filtroBusca}
                      onChange={(e) => setFiltroBusca(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500"
                    />
                  </div>
                )}
              </div>

              {/* Lista de Técnicos */}
              {carregandoUsuarios ? (
                <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Carregando técnicos cadastrados...</span>
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800/80">
                  Nenhum técnico encontrado com o filtro aplicado.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {usuariosFiltrados.map((u) => {
                    const isCurrentUserAdmin = isUserAdmin(u.email);
                    const config = userConfigsMap[u.uid] || {};
                    const userPrivado = config.privadoChatId ?? u.telegramPrivadoChatId ?? '';
                    const userGrupo = config.grupoChatId ?? u.telegramGrupoChatId ?? '';
                    const userModo = config.modoEnvio ?? u.telegramModoEnvio ?? 'padrao';
                    
                    const estaSalvando = salvandoUserId === u.uid;

                    return (
                      <div
                        key={u.uid}
                        className={`p-3.5 rounded-xl border transition ${
                          isCurrentUserAdmin
                            ? 'bg-amber-950/15 border-amber-900/40'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Linha 1: Dados do Usuário e Modo de Envio */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCurrentUserAdmin
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {u.nome ? u.nome.charAt(0).toUpperCase() : 'T'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-200 text-xs truncate">
                                  {u.nome || 'Técnico'}
                                </span>
                                {isCurrentUserAdmin && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {u.email}
                              </span>
                            </div>
                          </div>

                          {/* Seletor do Modo de Envio do Técnico */}
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-400 shrink-0 font-medium">
                              Modo de Envio:
                            </label>
                            <select
                              value={userModo}
                              onChange={(e) =>
                                handleUserConfigChange(u.uid, 'modoEnvio', e.target.value as ModoEnvioTelegram)
                              }
                              className="bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-medium transition cursor-pointer"
                            >
                              <option value="padrao">Padrão ({modoEnvioPadrao === 'ambos' ? 'Ambos' : modoEnvioPadrao === 'grupo' ? 'Grupo' : 'Privado'})</option>
                              <option value="ambos">Ambos (Grupo e Privado)</option>
                              <option value="grupo">Somente Grupo</option>
                              <option value="privado">Somente Privado</option>
                            </select>
                          </div>
                        </div>

                        {/* Linha 2: Campos de ID Privado e ID Grupo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5">
                          {/* Chat ID Privado */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                              <span>Chat ID Privado do Técnico:</span>
                              <span className="text-[10px] text-slate-500 font-normal">Ex: 123456789</span>
                            </label>
                            <input
                              type="text"
                              placeholder="ID Privado (obtido no @myidbot)"
                              value={userPrivado}
                              onChange={(e) => handleUserConfigChange(u.uid, 'privadoChatId', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600 font-mono text-xs transition"
                            />
                          </div>

                          {/* Grupo Específico */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                              <span>Grupo de Envio:</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {userGrupo ? 'Customizado' : 'Usando Central Padrão'}
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder={adminGrupoChatId ? `Padrão: ${adminGrupoChatId}` : 'ID do Grupo (-100...)'}
                              value={userGrupo}
                              onChange={(e) => handleUserConfigChange(u.uid, 'grupoChatId', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600 font-mono text-xs transition"
                            />
                          </div>
                        </div>

                        {/* Linha 3: Botões de Teste e Salvar Individual */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-slate-800/50">
                          {/* Testar Privado */}
                          <button
                            type="button"
                            onClick={() => handleTestarTecnico(u, 'privado')}
                            disabled={!botToken.trim() || !userPrivado || testandoUserAction === `${u.uid}_privado`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-medium rounded-lg border border-slate-700 transition flex items-center gap-1 disabled:opacity-40"
                            title="Testar envio apenas no privado deste técnico"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{testandoUserAction === `${u.uid}_privado` ? 'Testando...' : 'Testar Privado'}</span>
                          </button>

                          {/* Testar Grupo */}
                          <button
                            type="button"
                            onClick={() => handleTestarTecnico(u, 'grupo')}
                            disabled={!botToken.trim() || (!userGrupo && !adminGrupoChatId) || testandoUserAction === `${u.uid}_grupo`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-medium rounded-lg border border-slate-700 transition flex items-center gap-1 disabled:opacity-40"
                            title="Testar envio no grupo deste técnico"
                          >
                            <Users className="w-3 h-3" />
                            <span>{testandoUserAction === `${u.uid}_grupo` ? 'Testando...' : 'Testar Grupo'}</span>
                          </button>

                          {/* Salvar Técnico */}
                          <button
                            type="button"
                            onClick={() => handleSalvarUsuarioIndividual(u.uid)}
                            disabled={estaSalvando}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg shadow transition flex items-center gap-1 disabled:opacity-40"
                            title="Salvar alterações deste técnico"
                          >
                            {estaSalvando ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Salvar Técnico</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Guia & Instruções Retráteis */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2">
            <button
              type="button"
              onClick={() => setMostrarAjuda(!mostrarAjuda)}
              className="w-full flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Como descobrir os IDs de Grupo e Chat Privado de cada técnico?</span>
              </span>
              <span className="text-slate-500">{mostrarAjuda ? '▲ Ocultar Guia' : '▼ Ver Instruções'}</span>
            </button>

            {mostrarAjuda && (
              <div className="pt-2 text-xs text-slate-300 space-y-2.5 border-t border-slate-800/80 leading-relaxed">
                <p>
                  <b>1. Como obter o ID de um GRUPO:</b> Adicione o bot <code>@myidbot</code> ou <code>@getidsbot</code> dentro do grupo no Telegram e digite <code>/getgroupid</code>. O ID de grupos sempre inicia com <code>-100...</code> (exemplo: <code>-1001928374650</code>). Certifique-se de adicionar o seu bot oficial como administrador no grupo!
                </p>
                <p>
                  <b>2. Como obter o ID PRIVADO de um TÉCNICO:</b>
                  <br />
                  a) O técnico deve primeiro abrir a conversa privada com o seu bot no Telegram e clicar em <b>"Começar" (ou digitar /start)</b>.
                  <br />
                  b) Em seguida, o técnico pode conversar com o <code>@myidbot</code> e digitar <code>/getid</code> para descobrir seu ID numérico pessoal (exemplo: <code>987654321</code>).
                  <br />
                  c) Você (Administrador) insere esse número no campo <b>Chat ID Privado</b> do técnico nesta tela.
                </p>
                <p>
                  <b>3. Modos de Envio Disponíveis:</b>
                  <br />
                  • <b>No Grupo E no Privado (Ambos)</b>: Ao cadastrar ou reenviar uma ficha, ela é postada no grupo central e uma cópia é entregue diretamente no Telegram pessoal do técnico.
                  <br />
                  • <b>Somente para o Grupo</b>: A ficha é postada apenas no grupo de atendimento.
                  <br />
                  • <b>Somente no Privado</b>: A ficha é entregue apenas no chat privado do técnico responsável.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition"
          >
            Fechar
          </button>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSalvarTudo}
                disabled={salvandoGeral}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-900/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {salvandoGeral ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Tudo...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Todas as Configurações</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
