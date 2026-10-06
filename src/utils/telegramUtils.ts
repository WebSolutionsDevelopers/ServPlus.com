import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ServicoItem,
  Localizacao,
  DadosVisita,
  TelegramConfig,
  ModoEnvioTelegram,
  UsuarioTelegramConfigItem
} from '../types';

const STORAGE_KEY_TOKEN = 'cadservicos_telegram_token';
const STORAGE_KEY_CHAT_ID = 'cadservicos_telegram_chat_id';
const STORAGE_KEY_MODO_ENVIO = 'cadservicos_telegram_modo_envio';

export const getTelegramConfig = (): TelegramConfig => {
  return {
    botToken: localStorage.getItem(STORAGE_KEY_TOKEN) || '',
    chatId: localStorage.getItem(STORAGE_KEY_CHAT_ID) || '',
    grupoChatId: localStorage.getItem(STORAGE_KEY_CHAT_ID) || '',
    modoEnvio: (localStorage.getItem(STORAGE_KEY_MODO_ENVIO) as 'ambos' | 'grupo' | 'privado') || 'ambos'
  };
};

export interface ResolvedTelegramRoute {
  botToken: string;
  modoEnvioEfetivo: 'ambos' | 'grupo' | 'privado';
  destinos: Array<{
    tipo: 'grupo' | 'privado';
    chatId: string;
    label: string;
  }>;
}

/**
 * Garante o carregamento das configurações do Telegram.
 * Se informado userId, busca o perfil específico do técnico e resolve os destinos (Grupo, Privado ou Ambos).
 */
export const ensureTelegramConfig = async (userId?: string): Promise<TelegramConfig> => {
  let config = getTelegramConfig();

  try {
    const configDoc = doc(db, 'config', 'telegram');
    const snap = await getDoc(configDoc);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.botToken) {
        const cleanToken = String(data.botToken).trim();
        const globalGrupo = String(data.grupoChatId || data.chatId || '').trim();
        const globalModo = (data.modoEnvio as 'ambos' | 'grupo' | 'privado') || 'ambos';
        const userConfigs = (data.userConfigs || {}) as Record<string, UsuarioTelegramConfigItem>;
        const userChatIds = (data.userChatIds || {}) as Record<string, string>;

        if (cleanToken) {
          localStorage.setItem(STORAGE_KEY_TOKEN, cleanToken);
        }
        if (globalGrupo) {
          localStorage.setItem(STORAGE_KEY_CHAT_ID, globalGrupo);
        }
        localStorage.setItem(STORAGE_KEY_MODO_ENVIO, globalModo);

        return {
          botToken: cleanToken || config.botToken,
          chatId: globalGrupo || config.chatId,
          grupoChatId: globalGrupo || config.grupoChatId,
          modoEnvio: globalModo,
          userConfigs: userConfigs,
          userChatIds: userChatIds
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar configuração do Telegram do Firestore:', err);
  }

  return config;
};

/**
 * Resolve os destinos de envio para um determinado usuário com base na configuração do administrador e do técnico.
 */
export const resolveDestinosTelegram = async (userId?: string): Promise<ResolvedTelegramRoute> => {
  const config = await ensureTelegramConfig(userId);
  const botToken = config.botToken.trim();

  let globalGrupo = (config.grupoChatId || config.chatId || '').trim();
  let globalModo: 'ambos' | 'grupo' | 'privado' = config.modoEnvio || 'ambos';

  let userPrivado = '';
  let userGrupo = '';
  let userModo: ModoEnvioTelegram = 'padrao';

  // 1. Tenta recuperar do mapa consolidado
  if (userId && config.userConfigs && config.userConfigs[userId]) {
    const uc = config.userConfigs[userId];
    userPrivado = (uc.privadoChatId || '').trim();
    userGrupo = (uc.grupoChatId || '').trim();
    userModo = uc.modoEnvio || 'padrao';
  } else if (userId && config.userChatIds && config.userChatIds[userId]) {
    userPrivado = String(config.userChatIds[userId]).trim();
  }

  // 2. Se ainda não achou dados do usuário, consulta o documento do usuário
  if (userId && (!userPrivado || userModo === 'padrao')) {
    try {
      const userDocSnap = await getDoc(doc(db, 'usuarios', userId));
      if (userDocSnap.exists()) {
        const uData = userDocSnap.data();
        if (uData.telegramPrivadoChatId) userPrivado = String(uData.telegramPrivadoChatId).trim();
        else if (uData.telegramChatId) userPrivado = String(uData.telegramChatId).trim();
        if (uData.telegramGrupoChatId) userGrupo = String(uData.telegramGrupoChatId).trim();
        if (uData.telegramModoEnvio) userModo = uData.telegramModoEnvio as ModoEnvioTelegram;
      }
    } catch (e) {
      // continua com os valores disponíveis
    }
  }

  const modoEfetivo: 'ambos' | 'grupo' | 'privado' =
    userModo && userModo !== 'padrao' ? userModo : globalModo;

  const grupoFinal = userGrupo || globalGrupo;
  const privadoFinal = userPrivado;

  const destinos: Array<{ tipo: 'grupo' | 'privado'; chatId: string; label: string }> = [];

  if (modoEfetivo === 'ambos') {
    if (grupoFinal) {
      destinos.push({ tipo: 'grupo', chatId: grupoFinal, label: 'Grupo de Atendimento' });
    }
    if (privadoFinal && privadoFinal !== grupoFinal) {
      destinos.push({ tipo: 'privado', chatId: privadoFinal, label: 'Privado do Técnico' });
    }
  } else if (modoEfetivo === 'grupo') {
    if (grupoFinal) {
      destinos.push({ tipo: 'grupo', chatId: grupoFinal, label: 'Grupo de Atendimento' });
    }
  } else if (modoEfetivo === 'privado') {
    if (privadoFinal) {
      destinos.push({ tipo: 'privado', chatId: privadoFinal, label: 'Privado do Técnico' });
    } else if (grupoFinal) {
      // Fallback caso o privado não esteja preenchido ainda
      destinos.push({ tipo: 'grupo', chatId: grupoFinal, label: 'Grupo (Fallback: Privado não configurado)' });
    }
  }

  return {
    botToken,
    modoEnvioEfetivo: modoEfetivo,
    destinos
  };
};

export const saveTelegramConfig = async (
  botToken: string,
  grupoChatId: string,
  modoEnvio: 'ambos' | 'grupo' | 'privado' = 'ambos',
  userConfigs?: Record<string, UsuarioTelegramConfigItem>
): Promise<void> => {
  const cleanToken = botToken.trim();
  const cleanGrupo = grupoChatId.trim();

  localStorage.setItem(STORAGE_KEY_TOKEN, cleanToken);
  localStorage.setItem(STORAGE_KEY_CHAT_ID, cleanGrupo);
  localStorage.setItem(STORAGE_KEY_MODO_ENVIO, modoEnvio);

  try {
    const configDoc = doc(db, 'config', 'telegram');
    const payload: Record<string, any> = {
      botToken: cleanToken,
      chatId: cleanGrupo,
      grupoChatId: cleanGrupo,
      modoEnvio: modoEnvio,
      updatedAt: Date.now()
    };
    if (userConfigs) {
      payload.userConfigs = userConfigs;
    }

    await setDoc(configDoc, payload, { merge: true });
  } catch (err) {
    console.warn('Erro ao persistir configuração do Telegram no Firestore:', err);
  }
};

export const subscribeTelegramConfig = (onChange?: (config: TelegramConfig) => void) => {
  try {
    const configDoc = doc(db, 'config', 'telegram');
    return onSnapshot(
      configDoc,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.botToken) {
            const token = String(data.botToken).trim();
            const grupo = String(data.grupoChatId || data.chatId || '').trim();
            const modo = (data.modoEnvio as 'ambos' | 'grupo' | 'privado') || 'ambos';

            localStorage.setItem(STORAGE_KEY_TOKEN, token);
            localStorage.setItem(STORAGE_KEY_CHAT_ID, grupo);
            localStorage.setItem(STORAGE_KEY_MODO_ENVIO, modo);

            if (onChange) {
              onChange({
                botToken: token,
                chatId: grupo,
                grupoChatId: grupo,
                modoEnvio: modo,
                userConfigs: data.userConfigs,
                userChatIds: data.userChatIds
              });
            }
          }
        }
      },
      (err) => {
        console.warn('Erro ao escutar configuração do Telegram no Firestore:', err);
      }
    );
  } catch (e) {
    console.warn('Erro ao inicializar escuta da config do Telegram:', e);
    return () => {};
  }
};

/**
 * Formata um item de serviço para uma mensagem elegante em HTML para o Telegram.
 */
export const formatTelegramMessage = (servico: Omit<ServicoItem, 'id'> | ServicoItem): string => {
  const dataFmt = servico.data
    ? new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'Não informada';

  const loc = (servico.localizacao || {}) as Partial<Localizacao>;
  const dv = (servico.dadosVisita || {}) as Partial<DadosVisita>;

  // Formatação de endereço
  const enderecoLinhas: string[] = [];
  if (loc.endereco) enderecoLinhas.push(`${loc.endereco}${loc.numero ? `, Nº ${loc.numero}` : ''}`);
  if (loc.bairro) enderecoLinhas.push(`Bairro: ${loc.bairro}`);
  if (loc.cidade || loc.estado) enderecoLinhas.push(`${loc.cidade || ''}${loc.estado ? ` - ${loc.estado}` : ''}`);

  const mapsUrl = (loc.latitude && loc.longitude)
    ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
    : null;

  // Cálculo da metragem de cabo usada
  let metragemStr = '';
  if (typeof dv.metragemInicial === 'number' && typeof dv.metragemFinal === 'number') {
    const usada = Math.abs(dv.metragemFinal - dv.metragemInicial);
    metragemStr = `${usada}m (Início: ${dv.metragemInicial}m | Fim: ${dv.metragemFinal}m)`;
  } else if (dv.metragemRolo) {
    metragemStr = `${dv.metragemRolo}m`;
  }

  // Montagem da mensagem HTML
  let msg = `<b>📋 RELATÓRIO DE SERVIÇO TÉCNICO</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `<b>🏢 Operadora:</b> ${servico.operadora || '-'}\n`;
  msg += `<b>🛠️ Serviço:</b> ${servico.tipoServico || servico.tipoAtividade || '-'}\n`;
  msg += `<b>📅 Data:</b> ${dataFmt}\n`;
  msg += `<b>👤 Técnico:</b> ${servico.userName || servico.userEmail || 'Técnico'}\n\n`;

  msg += `<b>📍 LOCALIZAÇÃO</b>\n`;
  if (enderecoLinhas.length > 0) {
    msg += `${enderecoLinhas.join('\n')}\n`;
  } else {
    msg += `Endereço não informado\n`;
  }
  if (mapsUrl) {
    msg += `<a href="${mapsUrl}">🗺️ Ver no Google Maps</a>\n`;
  }
  msg += `\n`;

  msg += `<b>📄 DADOS DA VISITA</b>\n`;
  msg += `• <b>Nº SA:</b> ${dv.numeroSA || '-'}\n`;
  msg += `• <b>Acesso GPON:</b> ${dv.acessoGpon || '-'}\n`;
  msg += `• <b>Quem atendeu:</b> ${dv.quemAtendeu || '-'}\n`;
  msg += `• <b>Contato Cliente:</b> ${dv.contatoCliente || '-'}\n\n`;

  msg += `<b>📦 EQUIPAMENTOS & MATERIAIS</b>\n`;
  if (metragemStr) msg += `• <b>Metragem Drop:</b> ${metragemStr}\n`;
  if (dv.snOnt) msg += `• <b>SN ONT:</b> <code>${dv.snOnt}</code>\n`;
  if (dv.snMesh) msg += `• <b>SN Mesh:</b> <code>${dv.snMesh}</code>\n`;
  if (dv.snDrop) msg += `• <b>SN Drop:</b> <code>${dv.snDrop}</code>\n`;
  if (dv.qtdConector) msg += `• <b>Conectores:</b> ${dv.qtdConector}\n`;
  if (dv.qtdEsticador) msg += `• <b>Esticadores:</b> ${dv.qtdEsticador}\n`;
  if (dv.plaqueta) msg += `• <b>Plaqueta:</b> ${dv.plaqueta}\n`;
  if (dv.kitFixaFio) msg += `• <b>Kit Fixa-Fio:</b> ${dv.kitFixaFio}\n`;
  if (dv.numCdoe || dv.portaUtilizada) {
    const rotuloCdo = dv.tipoCdoe || 'CDOE';
    msg += `• <b>${rotuloCdo}:</b> ${dv.numCdoe || '-'} | <b>Porta:</b> ${dv.portaUtilizada || '-'}\n`;
  }
  msg += `\n`;

  if (servico.observacoes) {
    msg += `<b>📝 OBSERVAÇÕES</b>\n`;
    msg += `${servico.observacoes}\n\n`;
  }

  return msg;
};

/**
 * Testa as credenciais do Telegram enviando uma mensagem simples para um chat ou grupo específico.
 */
export const testTelegramConnection = async (
  botToken: string,
  chatId: string,
  nomeDestino?: string,
  tipoDestino: 'Grupo' | 'Privado' | 'Central' = 'Central'
): Promise<boolean> => {
  if (!botToken || !chatId) {
    throw new Error('Informe o Bot Token e o Chat ID para testar.');
  }

  const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
  const body = {
    chat_id: chatId.trim(),
    text: `🤖 <b>CadServiços</b>: Conexão com o Telegram validada com sucesso!\n` +
          `📌 Tipo de Destino: <b>${tipoDestino}</b>` +
          `${nomeDestino ? `\n👤 Responsável: <b>${nomeDestino}</b>` : ''}\n` +
          `✅ As fichas de atendimento serão enviadas para este destino conforme as regras do Administrador.`,
    parse_mode: 'HTML'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || 'Falha ao enviar mensagem de teste para o Telegram.');
  }

  return true;
};

const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Envia um álbum de fotos ou fotos individuais para um Chat ID específico do Telegram.
 */
const enviarFotosParaChat = async (botToken: string, chatId: string, fotos: string[]): Promise<void> => {
  if (!fotos || fotos.length === 0) return;

  if (fotos.length === 1) {
    const photo = fotos[0];
    if (photo.startsWith('data:image')) {
      const blob = dataURLtoBlob(photo);
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'foto_servico_1.jpg');

      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
    } else if (photo.startsWith('http')) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photo
        })
      });
    }
  } else {
    // 2 ou mais fotos -> Envia todas juntas em um álbum com sendMediaGroup (sem legendas)
    const formData = new FormData();
    formData.append('chat_id', chatId);

    const mediaGroup: any[] = [];
    const maxPhotos = Math.min(fotos.length, 10);

    for (let i = 0; i < maxPhotos; i++) {
      const item = fotos[i];
      const attachName = `photo_${i}`;

      if (item.startsWith('data:image')) {
        const blob = dataURLtoBlob(item);
        formData.append(attachName, blob, `foto_${i + 1}.jpg`);
        mediaGroup.push({
          type: 'photo',
          media: `attach://${attachName}`
        });
      } else if (item.startsWith('http')) {
        mediaGroup.push({
          type: 'photo',
          media: item
        });
      }
    }

    formData.append('media', JSON.stringify(mediaGroup));

    const mediaResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
      method: 'POST',
      body: formData
    });

    const mediaResult = await mediaResponse.json();
    if (!mediaResponse.ok || !mediaResult.ok) {
      console.warn(`Falha no sendMediaGroup para ${chatId}:`, mediaResult);
    }
  }
};

/**
 * Envia o texto formatado do formulário para um Chat ID específico.
 */
const enviarTextoParaChat = async (botToken: string, chatId: string, textoHtml: string): Promise<boolean> => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: textoHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Falha ao enviar mensagem para ${chatId}.`);
  }
  return true;
};

/**
 * Envia os dados do formulário do serviço para o Telegram.
 * Respeita a regra configurada pelo Administrador:
 * - Apenas Grupo
 * - Apenas Privado do Técnico
 * - Ambos (Grupo e Privado ao mesmo tempo)
 */
export const sendServicoToTelegram = async (
  servico: Omit<ServicoItem, 'id'> | ServicoItem,
  customConfig?: TelegramConfig
): Promise<{ sucessos: number; total: number; destinosEnviados: string[] }> => {
  const targetUserId = servico.userId;

  let botToken = '';
  let destinos: Array<{ tipo: 'grupo' | 'privado'; chatId: string; label: string }> = [];

  if (customConfig && customConfig.botToken) {
    botToken = customConfig.botToken.trim();
    if (customConfig.chatId) {
      destinos.push({ tipo: 'grupo', chatId: customConfig.chatId.trim(), label: 'Grupo/Chat' });
    }
  } else {
    const route = await resolveDestinosTelegram(targetUserId);
    botToken = route.botToken;
    destinos = route.destinos;
  }

  if (!botToken) {
    throw new Error('Telegram não configurado pelo administrador. Token do Bot não definido.');
  }

  if (destinos.length === 0) {
    throw new Error('Nenhum destino (Grupo ou Chat Privado) configurado pelo Administrador para este envio.');
  }

  const messageHtml = formatTelegramMessage(servico);
  const fotos = servico.fotos || [];

  let sucessos = 0;
  const destinosEnviados: string[] = [];
  const erros: string[] = [];

  for (const destino of destinos) {
    try {
      // 1. Envia fotos se houver
      if (fotos.length > 0) {
        await enviarFotosParaChat(botToken, destino.chatId, fotos).catch((err) => {
          console.warn(`Erro ao enviar fotos para ${destino.label} (${destino.chatId}):`, err);
        });
      }

      // 2. Envia relatório formatado
      await enviarTextoParaChat(botToken, destino.chatId, messageHtml);
      sucessos++;
      destinosEnviados.push(`${destino.label} (${destino.chatId})`);
    } catch (err: any) {
      console.warn(`Erro ao enviar para destino ${destino.label}:`, err);
      erros.push(`${destino.label}: ${err.message || 'Erro de envio'}`);
    }
  }

  if (sucessos === 0) {
    throw new Error(`Falha ao enviar para o Telegram:\n${erros.join('\n')}`);
  }

  return {
    sucessos,
    total: destinos.length,
    destinosEnviados
  };
};
