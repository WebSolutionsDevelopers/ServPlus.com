import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Camera,
  Trash2,
  Save,
  Navigation,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Phone,
  Ruler,
  Cpu,
  Layers,
  FileText,
  Send,
  Settings
} from 'lucide-react';
import { ServicoItem, Operadora, TipoServico } from '../types';
import { sendServicoToTelegram, ensureTelegramConfig } from '../utils/telegramUtils';
import { isInstalacao, normalizeText } from '../utils/servicoUtils';

interface ServicoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (servico: Omit<ServicoItem, 'id'>) => Promise<void>;
  userId: string;
  userEmail: string;
  userName?: string;
  servicoParaEditar?: ServicoItem | null;
  onOpenTelegramConfig?: () => void;
}

export const ServicoFormModal: React.FC<ServicoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userId,
  userEmail,
  userName,
  servicoParaEditar,
  onOpenTelegramConfig
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Form States
  const [tipoAtividade, setTipoAtividade] = useState<string>('INSTALAÇÃO');
  const [tipoServico, setTipoServico] = useState<TipoServico>('INSTALAÇÃO');
  const [operadora, setOperadora] = useState<Operadora>('NIO');
  const [data, setData] = useState<string>(todayStr);

  // Localização
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [obtendoGps, setObtendoGps] = useState(false);
  const [gpsMensagem, setGpsMensagem] = useState('');

  // Dados da Visita
  const [numeroSA, setNumeroSA] = useState('');
  const [acessoGpon, setAcessoGpon] = useState('');
  const [quemAtendeu, setQuemAtendeu] = useState('');
  const [contatoCliente, setContatoCliente] = useState('');
  const [metragemRolo, setMetragemRolo] = useState<number | ''>('');
  const [metragemInicial, setMetragemInicial] = useState<number | ''>('');
  const [metragemFinal, setMetragemFinal] = useState<number | ''>('');
  const [snOnt, setSnOnt] = useState('');
  const [snMesh, setSnMesh] = useState('');
  const [snDrop, setSnDrop] = useState('');
  const [qtdConector, setQtdConector] = useState<number | ''>('');
  const [qtdEsticador, setQtdEsticador] = useState<number | ''>('');
  const [plaqueta, setPlaqueta] = useState<number | ''>('');
  const [kitFixaFio, setKitFixaFio] = useState<number | ''>('');
  const [tipoCdoe, setTipoCdoe] = useState<'CDOE' | 'CDOI'>('CDOE');
  const [numCdoe, setNumCdoe] = useState<number | ''>('');
  const [portaUtilizada, setPortaUtilizada] = useState<number | ''>('');

  // Observações e Fotos
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  // Feedback states
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [enviarTelegram, setEnviarTelegram] = useState(true);

  // Verificar estado de configuração do Telegram
  useEffect(() => {
    if (isOpen) {
      setEnviarTelegram(true);
      ensureTelegramConfig().catch((err) => console.warn('Erro ao carregar Telegram config:', err));
    }
  }, [isOpen]);

  // Preencher se for edição
  useEffect(() => {
    if (servicoParaEditar) {
      setTipoAtividade(servicoParaEditar.tipoAtividade || 'INSTALAÇÃO');

      const normServico = normalizeText(servicoParaEditar.tipoServico);
      if (normServico.includes('REPAR')) {
        setTipoServico('REPARO');
      } else if (normServico.includes('MUDAN')) {
        setTipoServico('MUDANÇA DE ENDEREÇO');
      } else if (normServico.includes('REMANEJ')) {
        setTipoServico('REMANEJAMENTO');
      } else {
        setTipoServico('INSTALAÇÃO');
      }

      setOperadora((servicoParaEditar.operadora?.toUpperCase() as Operadora) || 'NIO');
      setData(servicoParaEditar.data || todayStr);

      if (servicoParaEditar.localizacao) {
        setEndereco(servicoParaEditar.localizacao.endereco || '');
        setNumero(servicoParaEditar.localizacao.numero || '');
        setBairro(servicoParaEditar.localizacao.bairro || '');
        setCidade(servicoParaEditar.localizacao.cidade || '');
        setEstado(servicoParaEditar.localizacao.estado || '');
        setLatitude(servicoParaEditar.localizacao.latitude);
        setLongitude(servicoParaEditar.localizacao.longitude);
      }

      if (servicoParaEditar.dadosVisita) {
        const dv = servicoParaEditar.dadosVisita;
        setNumeroSA(dv.numeroSA || '');
        setAcessoGpon(dv.acessoGpon || '');
        setQuemAtendeu(dv.quemAtendeu || '');
        setContatoCliente(dv.contatoCliente || '');
        setMetragemRolo(dv.metragemRolo ?? '');
        setMetragemInicial(dv.metragemInicial ?? '');
        setMetragemFinal(dv.metragemFinal ?? '');
        setSnOnt(dv.snOnt || '');
        setSnMesh(dv.snMesh || '');
        setSnDrop(dv.snDrop || '');
        setQtdConector(dv.qtdConector ?? '');
        setQtdEsticador(dv.qtdEsticador ?? '');
        setPlaqueta(dv.plaqueta ?? '');
        setKitFixaFio(dv.kitFixaFio ?? '');
        setTipoCdoe((dv.tipoCdoe as 'CDOE' | 'CDOI') || 'CDOE');
        setNumCdoe(dv.numCdoe ?? '');
        setPortaUtilizada(dv.portaUtilizada ?? '');
      }

      setObservacoes(servicoParaEditar.observacoes || '');
      setFotos(servicoParaEditar.fotos || []);
    }
  }, [servicoParaEditar]);

  // Formatação de telefone no padrão (XX) XXXXX-XXXX
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    setContatoCliente(value);
  };

  // Capturar Localização GPS com Geocodificação Reversa Nominatim
  const capturarGPS = () => {
    if (!navigator.geolocation) {
      setGpsMensagem('Geolocalização não é suportada por este navegador.');
      return;
    }

    setObtendoGps(true);
    setGpsMensagem('Solicitando permissão e obtendo coordenadas do GPS...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        setGpsMensagem(`GPS Capturado: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}. Buscando endereço...`);

        try {
          // Busca endereço por geocodificação reversa
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.address || {};
            
            const logradouro = addr.road || addr.pedestrian || addr.street || addr.suburb || '';
            const num = addr.house_number || '';
            const b = addr.neighbourhood || fontBairro(addr);
            const cid = addr.city || addr.town || addr.municipality || '';
            const est = addr.state || '';

            if (logradouro) setEndereco(logradouro);
            if (num) setNumero(num);
            if (b) setBairro(b);
            if (cid) setCidade(cid);
            if (est) setEstado(est);

            setGpsMensagem('Localização capturada e endereço preenchido! Você pode editar se necessário.');
          } else {
            setGpsMensagem('Coordenadas capturadas! Preencha ou edite os detalhes do endereço.');
          }
        } catch (e) {
          console.error('Erro na geocodificação reversa:', e);
          setGpsMensagem('Coordenadas GPS capturadas! Você pode preencher/editar o endereço.');
        } finally {
          setObtendoGps(false);
        }
      },
      (error) => {
        console.error('Erro de GPS:', error);
        setObtendoGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMensagem('Permissão para uso do GPS foi negada.');
        } else {
          setGpsMensagem('Não foi possível obter a localização. Tente novamente ou digite manualmente.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const fontBairro = (addr: any) => {
    return addr.suburb || addr.district || addr.quarter || '';
  };

  // Compressão e Upload de Fotos (Max 8 fotos)
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotos.length >= 8) {
      alert('Você já atingiu o limite máximo de 8 fotos.');
      return;
    }

    const disponivel = 8 - fotos.length;
    const arquivosParaProcessar = (Array.from(files) as File[]).slice(0, disponivel);

    arquivosParaProcessar.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensiona para max 600px mantendo proporção e comprime JPEG para ~30-50KB por foto
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 600;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.50);
            setFotos((prev) => (prev.length < 8 ? [...prev, compressedDataUrl] : prev));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ''; // reseta campo
  };

  const removerFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm('');

    if (!operadora) {
      setErroForm('Selecione uma operadora.');
      return;
    }

    setSalvando(true);

    try {
      // Cálculo do valor: R$ 100 por Instalação
      const valorServico = isInstalacao({ tipoServico, tipoAtividade }) ? 100 : 0;

      const nomeExibicao = userName || (userEmail ? userEmail.split('@')[0] : 'Técnico de Campo');

      const toUpper = (val?: string | null) => (val ? val.trim().toUpperCase() : '');

      const novoServico: Omit<ServicoItem, 'id'> = {
        userId,
        userEmail: userEmail || 'tecnico@anonimo.local',
        userName: toUpper(nomeExibicao),
        tipoAtividade: toUpper(tipoAtividade) || 'INSTALAÇÃO',
        tipoServico: (toUpper(tipoServico) as TipoServico) || 'INSTALAÇÃO',
        operadora: (toUpper(operadora) as Operadora) || 'NIO',
        data,
        createdAt: Date.now(),
        localizacao: {
          endereco: toUpper(endereco),
          numero: toUpper(numero),
          bairro: toUpper(bairro),
          cidade: toUpper(cidade),
          estado: toUpper(estado),
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {})
        },
        dadosVisita: {
          numeroSA: toUpper(numeroSA),
          acessoGpon: toUpper(acessoGpon),
          quemAtendeu: toUpper(quemAtendeu),
          contatoCliente: toUpper(contatoCliente),
          metragemRolo: metragemRolo === '' ? '' : Number(metragemRolo),
          metragemInicial: metragemInicial === '' ? '' : Number(metragemInicial),
          metragemFinal: metragemFinal === '' ? '' : Number(metragemFinal),
          snOnt: toUpper(snOnt),
          snMesh: toUpper(snMesh),
          snDrop: toUpper(snDrop),
          qtdConector: qtdConector === '' ? '' : Number(qtdConector),
          qtdEsticador: qtdEsticador === '' ? '' : Number(qtdEsticador),
          plaqueta: plaqueta === '' ? '' : Number(plaqueta),
          kitFixaFio: kitFixaFio === '' ? '' : Number(kitFixaFio),
          tipoCdoe: tipoCdoe || 'CDOE',
          numCdoe: numCdoe === '' ? '' : Number(numCdoe),
          portaUtilizada: portaUtilizada === '' ? '' : Number(portaUtilizada)
        },
        observacoes: toUpper(observacoes),
        fotos: fotos || [],
        valor: valorServico
      };

      await onSave(novoServico);

      // Envia os dados do formulário automaticamente para o Telegram se a opção estiver ativada
      if (enviarTelegram) {
        try {
          await sendServicoToTelegram(novoServico);
        } catch (tgErr: any) {
          console.warn('Registro salvo no banco de dados, mas falhou no envio para o Telegram:', tgErr);
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Erro detalhado ao salvar serviço:', err);
      const detalhes = err?.message || 'Erro de conexão ou gravação no banco.';
      setErroForm(`Falha ao salvar no banco de dados: ${detalhes}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {servicoParaEditar ? 'Editar Cadastro de Serviço' : 'Novo Cadastro de Serviço'}
              </h2>
              <p className="text-xs text-slate-400">Preencha todos os dados da instalação executada no dia</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          
          {erroForm && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}

          {/* SECTION 1: Identificação e Atividade */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> 1. Identificação do Serviço
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Atividade</label>
                <input
                  type="text"
                  value={tipoAtividade}
                  onChange={(e) => setTipoAtividade(e.target.value)}
                  placeholder="INSTALAÇÃO"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Serviço *</label>
                <select
                  value={tipoServico}
                  onChange={(e) => {
                    const novoTipo = e.target.value as TipoServico;
                    setTipoServico(novoTipo);
                    if (!tipoAtividade || tipoAtividade === 'INSTALAÇÃO' || tipoAtividade === 'Instalação' || tipoAtividade === tipoServico) {
                      setTipoAtividade(novoTipo);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INSTALAÇÃO">INSTALAÇÃO</option>
                  <option value="REPARO">REPARO</option>
                  <option value="MUDANÇA DE ENDEREÇO">MUDANÇA DE ENDEREÇO</option>
                  <option value="REMANEJAMENTO">REMANEJAMENTO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Operadora *</label>
                <select
                  value={operadora}
                  onChange={(e) => setOperadora(e.target.value as Operadora)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TIM">TIM</option>
                  <option value="NIO">NIO</option>
                  <option value="ALGAR">ALGAR</option>
                  <option value="LIGA">LIGA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Data Atual *</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>
          </div>

          {/* SECTION 2: Localização e Captura GPS */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> 2. Localização (Endereço e GPS)
              </h3>

              {/* Botão para capturar GPS do celular */}
              <button
                type="button"
                onClick={capturarGPS}
                disabled={obtendoGps}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
              >
                {obtendoGps ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Capturar Localização GPS</span>
              </button>
            </div>

            {gpsMensagem && (
              <p className="text-xs text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsMensagem}</span>
              </p>
            )}

            {/* Campos de endereço editáveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-slate-300 mb-1">Endereço</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Avenida, Alameda..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Número</label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs font-medium text-slate-300 mb-1">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white uppercase focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Dados da Visita */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> 3. Dados da Visita e Equipamentos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número da SA</label>
                <input
                  type="text"
                  value={numeroSA}
                  onChange={(e) => setNumeroSA(e.target.value)}
                  placeholder="Ex: SA-9821"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Acesso GPON</label>
                <input
                  type="text"
                  value={acessoGpon}
                  onChange={(e) => setAcessoGpon(e.target.value)}
                  placeholder="Ex: GPON-01/02"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Quem atendeu a visita</label>
                <input
                  type="text"
                  value={quemAtendeu}
                  onChange={(e) => setQuemAtendeu(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contato do Cliente (Telefone)</label>
                <input
                  type="text"
                  value={contatoCliente}
                  onChange={handleTelefoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Metragens */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Metragem do Rolo (m)</label>
                <input
                  type="number"
                  value={metragemRolo}
                  onChange={(e) => setMetragemRolo(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1000"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Metragem Inicial (m)</label>
                <input
                  type="number"
                  value={metragemInicial}
                  onChange={(e) => setMetragemInicial(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="100"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Metragem Final (m)</label>
                <input
                  type="number"
                  value={metragemFinal}
                  onChange={(e) => setMetragemFinal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="185"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cálculo automático de Metragem Utilizada */}
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col justify-center">
                <span className="text-[11px] text-slate-400 font-medium">Cabo Utilizado Calc.</span>
                <span className="text-base font-bold text-indigo-400">
                  {typeof metragemFinal === 'number' && typeof metragemInicial === 'number'
                    ? `${Math.max(0, metragemFinal - metragemInicial)} metros`
                    : '-'}
                </span>
              </div>

              {/* S/N ONT, Mesh e Drop */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">S/N ONT</label>
                <input
                  type="text"
                  value={snOnt}
                  onChange={(e) => setSnOnt(e.target.value)}
                  placeholder="Serial ONT"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">S/N Mesh</label>
                <input
                  type="text"
                  value={snMesh}
                  onChange={(e) => setSnMesh(e.target.value)}
                  placeholder="Serial Mesh"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">S/N Drop</label>
                <input
                  type="text"
                  value={snDrop}
                  onChange={(e) => setSnDrop(e.target.value)}
                  placeholder="Serial Drop"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Materiais Utilizados */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Qtd Conector</label>
                <input
                  type="number"
                  value={qtdConector}
                  onChange={(e) => setQtdConector(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Qtd Esticador</label>
                <input
                  type="number"
                  value={qtdEsticador}
                  onChange={(e) => setQtdEsticador(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plaqueta</label>
                <input
                  type="number"
                  value={plaqueta}
                  onChange={(e) => setPlaqueta(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kit Fixa Fio</label>
                <input
                  type="number"
                  value={kitFixaFio}
                  onChange={(e) => setKitFixaFio(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Caixa</label>
                <select
                  value={tipoCdoe}
                  onChange={(e) => setTipoCdoe(e.target.value as 'CDOE' | 'CDOI')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CDOE">CDOE</option>
                  <option value="CDOI">CDOI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nº {tipoCdoe}</label>
                <input
                  type="number"
                  value={numCdoe}
                  onChange={(e) => setNumCdoe(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="04"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Porta Utilizada</label>
                <input
                  type="number"
                  value={portaUtilizada}
                  onChange={(e) => setPortaUtilizada(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="08"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>
          </div>

          {/* SECTION 4: Observações */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
              4. Observações da Instalação
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite detalhes adicionais sobre o serviço, dificuldades encontradas ou orientações passadas ao cliente..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SECTION 5: Fotos (Até 8 fotos) */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> 5. Fotos da Instalação (Máx. 8)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Anexe até 8 fotos da instalação (ONT, CTO, fachada, cabo, medidor)
                </p>
              </div>

              <span className="text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                {fotos.length} / 8 fotos
              </span>
            </div>

            {/* Area de Upload de Fotos */}
            {fotos.length < 8 && (
              <div>
                <label className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-blue-500/80 bg-slate-900/80 hover:bg-slate-900 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition">
                  <Camera className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-medium text-slate-300">
                    Clique aqui para Tirar Foto ou Selecionar Imagens
                  </span>
                  <span className="text-[10px] text-slate-500">Imagens serão otimizadas para o banco de dados</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Grid de Pré-visualização das Fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-square bg-slate-950">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removerFoto(index)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-red-600/90 text-white rounded-lg opacity-90 group-hover:opacity-100 hover:bg-red-500 transition shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer / Form Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            
            {/* Opção Telegram */}
            <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 px-3 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enviarTelegram}
                  onChange={(e) => setEnviarTelegram(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Enviar para Telegram ao salvar</span>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
              >
                {salvando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Registro</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};
