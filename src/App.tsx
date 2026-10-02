import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  carregarServicosComZeroLeituras,
  sincronizarServicosDoServidor,
  getServicosLocais,
  salvarServicosLocais,
  salvarServico,
  atualizarServico,
  excluirServico
} from './lib/servicosService';
import { ServicoItem, FiltroState } from './types';
import { isInstalacao, getValorServico, normalizeText, matchTipoServicoOuAtividade } from './utils/servicoUtils';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { MeusGanhosCard } from './components/MeusGanhosCard';
import { FiltroBar } from './components/FiltroBar';
import { BarraBuscaServicos } from './components/BarraBuscaServicos';
import { ServicoCard } from './components/ServicoCard';
import { ServicoFormModal } from './components/ServicoFormModal';
import { ServicoDetailModal } from './components/ServicoDetailModal';
import { ExportOptionsModal } from './components/ExportOptionsModal';
import { TelegramConfigModal } from './components/TelegramConfigModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { ensureTelegramConfig } from './utils/telegramUtils';
import { registrarOuAtualizarUsuario } from './lib/usuariosService';
import { gerarPDFData, gerarExcelData, ExportData } from './utils/exportUtils';
import { Wrench, PlusCircle, AlertCircle, CheckCircle, Search, HardDrive, RefreshCw, Zap, Download, Smartphone } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authCarregando, setAuthCarregando] = useState(true);
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [carregandoServicos, setCarregandoServicos] = useState(true);
  const [sincronizandoNuvem, setSincronizandoNuvem] = useState(false);

  // PWA State
  const [pwaModalAberto, setPwaModalAberto] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [pwaBannerDismissed, setPwaBannerDismissed] = useState(false);

  // Helper para obter a data de hoje formatada YYYY-MM-DD
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayFormatted();

  // Estado do Filtro - Padrão "Hoje"
  const [filtro, setFiltro] = useState<FiltroState>({
    preset: 'hoje',
    mesAno: todayStr.slice(0, 7),
    dataInicio: todayStr,
    dataFim: todayStr,
    tipoAtividade: 'Todos',
    operadora: 'Todas'
  });

  // Estado de Busca por Texto
  const [termoBusca, setTermoBusca] = useState('');

  // Modal Controls
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [servicoParaEditar, setServicoParaEditar] = useState<ServicoItem | null>(null);
  const [servicoParaDetalhe, setServicoParaDetalhe] = useState<ServicoItem | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [telegramConfigAberto, setTelegramConfigAberto] = useState(false);

  // Monitorar Eventos de Instalação do PWA
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
      if ((window as any).isAppInstalled || window.matchMedia('(display-mode: standalone)').matches) {
        setIsPwaInstalled(true);
      }

      const handlePwaReady = (e: any) => {
        setDeferredPrompt(e.detail || (window as any).deferredPwaPrompt);
      };

      const handlePwaInstalled = () => {
        setIsPwaInstalled(true);
        setDeferredPrompt(null);
        setMensagemSucesso('Aplicativo instalado na tela inicial com sucesso!');
        setTimeout(() => setMensagemSucesso(''), 5000);
      };

      window.addEventListener('pwa-prompt-ready', handlePwaReady);
      window.addEventListener('pwa-installed', handlePwaInstalled);

      return () => {
        window.removeEventListener('pwa-prompt-ready', handlePwaReady);
        window.removeEventListener('pwa-installed', handlePwaInstalled);
      };
    }
  }, []);

  // Monitorar Autenticação no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthCarregando(false);
      if (currentUser) {
        registrarOuAtualizarUsuario({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        }).catch((err) => console.warn('Erro ao sincronizar perfil do usuário:', err));
      }
    });

    return () => unsubscribe();
  }, []);

  // Carregar configuração do Telegram (local ou cache)
  useEffect(() => {
    ensureTelegramConfig().catch(() => {});
  }, []);

  // Carregar Serviços com Estratégia Zero-Leituras (LocalStorage -> Cache -> Fallback)
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) {
      setServicos([]);
      setCarregandoServicos(false);
      return;
    }

    // 1. Carrega do localStorage imediatamente (0 ms, 0 leituras)
    const locais = getServicosLocais(userId);
    if (locais.length > 0) {
      setServicos(locais);
      setCarregandoServicos(false);
    } else {
      setCarregandoServicos(true);
    }

    // 2. Tenta carregar do cache offline do Firestore com 0 leituras do servidor
    carregarServicosComZeroLeituras(userId)
      .then((dados) => {
        setServicos(dados);
        setCarregandoServicos(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar serviços com zero leituras:', err);
        setCarregandoServicos(false);
      });
  }, [userId]);

  // Função para ressincronizar manualmente com a nuvem quando desejado
  const handleSincronizarNuvem = async () => {
    if (!userId) return;
    setSincronizandoNuvem(true);
    try {
      const dadosNuvem = await sincronizarServicosDoServidor(userId);
      setServicos(dadosNuvem);
      setMensagemSucesso('Serviços sincronizados com a nuvem!');
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao sincronizar com nuvem:', err);
      alert('Não foi possível sincronizar com a nuvem.');
    } finally {
      setSincronizandoNuvem(false);
    }
  };

  // Filtragem dos serviços cadastrados
  const servicosFiltrados = servicos.filter((s) => {
    // 1. Filtro por Busca de Texto Livre
    if (termoBusca.trim()) {
      const termoNorm = normalizeText(termoBusca);
      const dv = s.dadosVisita || {};
      const loc = s.localizacao || {};

      const camposBusca = [
        s.tipoServico,
        s.tipoAtividade,
        s.operadora,
        s.data,
        s.userName,
        s.userEmail,
        s.observacoes,
        dv.numeroSA,
        dv.acessoGpon,
        dv.quemAtendeu,
        dv.contatoCliente,
        dv.snOnt,
        dv.snMesh,
        dv.snDrop,
        dv.numCdoe ? String(dv.numCdoe) : '',
        dv.portaUtilizada ? String(dv.portaUtilizada) : '',
        dv.tipoCdoe,
        loc.endereco,
        loc.numero,
        loc.bairro,
        loc.cidade,
        loc.estado
      ];

      const matchTexto = camposBusca.some((campo) =>
        campo ? normalizeText(String(campo)).includes(termoNorm) : false
      );

      if (!matchTexto) return false;
    }

    // 2. Filtro por Data Início e Data Fim
    if (filtro.dataInicio && s.data < filtro.dataInicio) return false;
    if (filtro.dataFim && s.data > filtro.dataFim) return false;

    // 3. Filtro por Tipo de Atividade / Serviço (insensível a maiúsculas/minúsculas e acentos)
    if (filtro.tipoAtividade && filtro.tipoAtividade !== 'Todos') {
      if (!matchTipoServicoOuAtividade(s, filtro.tipoAtividade)) return false;
    }

    // 4. Filtro por Operadora
    if (filtro.operadora && filtro.operadora !== 'Todas') {
      if (s.operadora !== filtro.operadora) return false;
    }

    return true;
  });

  // Cálculo de Ganhos no filtro atual
  const totalGanhosFiltrados = servicosFiltrados.reduce((acc, s) => acc + getValorServico(s), 0);

  // Descrição amigável do período ativo do filtro
  const getPeriodoDescricao = () => {
    if (filtro.preset === 'hoje') return 'Hoje';
    if (filtro.preset === 'ontem') return 'Ontem';
    if (filtro.preset === '7dias') return 'Últimos 7 dias';
    if (filtro.preset === '30dias') return 'Últimos 30 dias';
    if (filtro.preset === 'mes' && filtro.mesAno) return `Mês ${filtro.mesAno}`;
    if (filtro.dataInicio && filtro.dataFim) {
      return `${filtro.dataInicio} até ${filtro.dataFim}`;
    }
    return 'Todos os períodos';
  };

  // Feedback de Sucesso ao Salvar
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Handlers com Atualização Otimista
  const handleSalvarServico = async (servicoData: Omit<ServicoItem, 'id'>) => {
    try {
      if (servicoParaEditar && servicoParaEditar.id) {
        const editId = servicoParaEditar.id;
        const servicoAtualizado: ServicoItem = {
          ...servicoParaEditar,
          ...servicoData
        };

        // Atualização local imediata (0 leituras)
        const novaLista = servicos.map((s) => (s.id === editId ? servicoAtualizado : s));
        setServicos(novaLista);
        if (userId) salvarServicosLocais(userId, novaLista);

        // Envia alteração ao Firestore em background
        await atualizarServico(editId, servicoData, userId);
        setMensagemSucesso('Serviço atualizado com sucesso!');
      } else {
        // Envia criação para o Firestore (1 escrita, 0 leituras)
        const newId = await salvarServico(servicoData);
        const novoServico: ServicoItem = {
          id: newId,
          ...servicoData,
          createdAt: Date.now()
        };

        // Atualização local imediata (0 leituras)
        const novaLista = [novoServico, ...servicos].sort((a, b) =>
          b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)
        );
        setServicos(novaLista);
        if (userId) salvarServicosLocais(userId, novaLista);

        setMensagemSucesso('Serviço salvo com sucesso!');
      }

      // Ajusta o filtro para garantir que o serviço recém-salvo fique visível na lista
      setFiltro((prev) => {
        let novaDataInicio = prev.dataInicio;
        let novaDataFim = prev.dataFim;

        if (!novaDataInicio || servicoData.data < novaDataInicio) {
          novaDataInicio = servicoData.data;
        }
        if (!novaDataFim || servicoData.data > novaDataFim) {
          novaDataFim = servicoData.data;
        }

        return {
          ...prev,
          preset: 'customizado',
          dataInicio: novaDataInicio,
          dataFim: novaDataFim,
          tipoAtividade: 'Todos',
          operadora: 'Todas'
        };
      });

      // Limpar mensagem de sucesso após 4 segundos
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (error: any) {
      console.error('Erro ao salvar no Firestore:', error);
      throw error;
    }
  };

  const handleExcluirServico = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de serviço?')) {
      try {
        // Exclusão local imediata (0 leituras)
        const novaLista = servicos.filter((s) => s.id !== id);
        setServicos(novaLista);
        if (userId) salvarServicosLocais(userId, novaLista);

        // Envia exclusão para o Firestore em background
        await excluirServico(id, userId);
      } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Não foi possível excluir o serviço.');
      }
    }
  };

  const handleResetFiltro = () => {
    setFiltro({
      preset: 'hoje',
      mesAno: todayStr.slice(0, 7),
      dataInicio: todayStr,
      dataFim: todayStr,
      tipoAtividade: 'Todos',
      operadora: 'Todas'
    });
  };

  // Carregamento Inicial do Firebase Auth
  if (authCarregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Carregando aplicativo...</p>
      </div>
    );
  }

  // Se não estiver logado -> Tela de Login/Cadastro
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header com Botão "+ Novo Cadastro", PWA e Config Telegram para Admin */}
      <Header
        user={user}
        onOpenNovoCadastro={() => {
          setServicoParaEditar(null);
          setModalFormAberto(true);
        }}
        onExportarPDF={() =>
          setExportData(
            gerarPDFData(
              servicosFiltrados,
              totalGanhosFiltrados,
              getPeriodoDescricao(),
              user.email || ''
            )
          )
        }
        onExportarExcel={() =>
          setExportData(gerarExcelData(servicosFiltrados, user.email || ''))
        }
        totalServicos={servicosFiltrados.length}
        onOpenTelegramConfig={() => setTelegramConfigAberto(true)}
        onOpenPwaModal={() => setPwaModalAberto(true)}
        isPwaInstalled={isPwaInstalled}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {mensagemSucesso && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center justify-between gap-3 shadow-lg transition animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="font-semibold">{mensagemSucesso}</span>
            </div>
            <button
              onClick={() => setMensagemSucesso('')}
              className="text-xs text-emerald-400/80 hover:text-emerald-200 font-bold px-2 py-1 rounded-lg hover:bg-emerald-500/20"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Campo "Meus Ganhos" e Estatísticas do Filtro Aplicado */}
        <MeusGanhosCard
          servicosFiltrados={servicosFiltrados}
          periodoTexto={getPeriodoDescricao()}
        />

        {/* Bar de Filtros (Hoje, Ontem, 7d, 30d, Mês, Início/Fim, Atividade) */}
        <FiltroBar
          filtro={filtro}
          onChangeFiltro={setFiltro}
          onResetFiltro={handleResetFiltro}
        />

        {/* Barra de Busca de Ordens de Serviço (Acima de Serviços Registrados) */}
        <BarraBuscaServicos
          termoBusca={termoBusca}
          onChangeBusca={setTermoBusca}
          totalEncontrados={servicosFiltrados.length}
          totalGeral={servicos.length}
          onLimparBusca={() => setTermoBusca('')}
        />

        {/* Lista e Grid dos Serviços Cadastrados */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <span>
                Serviços Registrados ({servicosFiltrados.length}
                {termoBusca && ` de ${servicos.length}`})
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                Zero Leituras Firestore
              </span>

              <button
                onClick={handleSincronizarNuvem}
                disabled={sincronizandoNuvem}
                title="Sincronizar dados com a nuvem Firebase"
                className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${sincronizandoNuvem ? 'animate-spin' : ''}`} />
                <span>{sincronizandoNuvem ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>

          {carregandoServicos ? (
            <div className="py-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              <span className="inline-block w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-2" />
              <p className="text-sm text-slate-400">Carregando registros de serviço...</p>
            </div>
          ) : servicosFiltrados.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-slate-800/80 text-slate-500">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-base font-semibold text-slate-300">
                {termoBusca
                  ? `Nenhum serviço encontrado para "${termoBusca}"`
                  : 'Nenhum serviço encontrado'}
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                {termoBusca ? (
                  <span>
                    Não encontramos nenhuma ordem de serviço compatível com o termo digitado. Tente pesquisar por outro número de SA, endereço, cliente ou limpe a busca.
                  </span>
                ) : (
                  <span>
                    Não há registros para o período ou filtro selecionado ({getPeriodoDescricao()}). Clique no botão abaixo para adicionar um novo cadastro.
                  </span>
                )}
              </p>
              {termoBusca ? (
                <button
                  onClick={() => setTermoBusca('')}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
                >
                  Limpar Busca e Ver Todos
                </button>
              ) : (
                <button
                  onClick={() => {
                    setServicoParaEditar(null);
                    setModalFormAberto(true);
                  }}
                  className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Adicionar Novo Cadastro</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicosFiltrados.map((item) => (
                <ServicoCard
                  key={item.id}
                  servico={item}
                  onView={(s) => setServicoParaDetalhe(s)}
                  onEdit={(s) => {
                    setServicoParaEditar(s);
                    setModalFormAberto(true);
                  }}
                  onDelete={handleExcluirServico}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Modais */}
      <ServicoFormModal
        isOpen={modalFormAberto}
        onClose={() => {
          setModalFormAberto(false);
          setServicoParaEditar(null);
        }}
        onSave={handleSalvarServico}
        userId={user.uid}
        userEmail={user.email || ''}
        userName={user.displayName || undefined}
        servicoParaEditar={servicoParaEditar}
        onOpenTelegramConfig={() => setTelegramConfigAberto(true)}
      />

      <ServicoDetailModal
        servico={servicoParaDetalhe}
        onClose={() => setServicoParaDetalhe(null)}
        onDelete={handleExcluirServico}
        onOpenTelegramConfig={() => setTelegramConfigAberto(true)}
      />

      <ExportOptionsModal
        exportData={exportData}
        onClose={() => setExportData(null)}
      />

      <TelegramConfigModal
        isOpen={telegramConfigAberto}
        onClose={() => setTelegramConfigAberto(false)}
        userEmail={user.email || ''}
        currentUserId={user.uid}
        userName={user.displayName || user.email || ''}
      />

      {/* Modal de Instalação PWA */}
      <PwaInstallModal
        isOpen={pwaModalAberto}
        onClose={() => setPwaModalAberto(false)}
        deferredPrompt={deferredPrompt}
        onNativeInstall={() => setDeferredPrompt(null)}
        isInstalled={isPwaInstalled}
      />

      {/* Banner Flutuante de Instalação Mobile PWA (se não instalado e não dispensado) */}
      {!isPwaInstalled && !pwaBannerDismissed && (
        <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 bg-slate-900/95 border border-blue-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white leading-tight truncate">Instalar no Android</p>
              <p className="text-[11px] text-slate-400 truncate">Acesso rápido & 100% offline</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setPwaModalAberto(true)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={() => setPwaBannerDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition text-xs"
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
