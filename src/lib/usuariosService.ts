import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { UsuarioItem, ModoEnvioTelegram, UsuarioTelegramConfigItem } from '../types';

/**
 * Registra ou atualiza o perfil do usuário logado na coleção 'usuarios'
 */
export const registrarOuAtualizarUsuario = async (user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<void> => {
  if (!user.uid) return;

  try {
    const userDocRef = doc(db, 'usuarios', user.uid);
    const existingSnap = await getDoc(userDocRef);

    const dadosAtualizados: Partial<UsuarioItem> = {
      uid: user.uid,
      email: user.email || '',
      nome: user.displayName || user.email?.split('@')[0] || 'Técnico',
      ultimoAcesso: Date.now()
    };

    if (!existingSnap.exists()) {
      dadosAtualizados.createdAt = Date.now();
    }

    await setDoc(userDocRef, dadosAtualizados, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar perfil do usuário no Firestore:', err);
  }
};

/**
 * Lista todos os usuários cadastrados na coleção 'usuarios' com suas configurações do Telegram
 */
export const listarTodosUsuarios = async (): Promise<UsuarioItem[]> => {
  try {
    const usuariosCol = collection(db, 'usuarios');
    const snapshot = await getDocs(usuariosCol);
    
    const lista: UsuarioItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const privChat = data.telegramPrivadoChatId || data.telegramChatId || '';
      lista.push({
        uid: docSnap.id,
        email: data.email || '',
        nome: data.nome || data.displayName || data.email?.split('@')[0] || 'Técnico',
        telegramChatId: privChat,
        telegramPrivadoChatId: privChat,
        telegramGrupoChatId: data.telegramGrupoChatId || '',
        telegramModoEnvio: (data.telegramModoEnvio as ModoEnvioTelegram) || 'padrao',
        telegramBotToken: data.telegramBotToken || '',
        ultimoAcesso: data.ultimoAcesso || data.createdAt || 0,
        createdAt: data.createdAt || 0
      });
    });

    // Ordenar por nome alfabético
    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    return lista;
  } catch (err) {
    console.warn('Erro ao listar usuários do Firestore:', err);
    return [];
  }
};

/**
 * Salva a configuração individual do Telegram de um usuário/técnico específico.
 * Somente executado pelo Administrador.
 */
export const salvarTelegramUsuario = async (
  uid: string,
  config: {
    privadoChatId?: string;
    grupoChatId?: string;
    modoEnvio?: ModoEnvioTelegram;
  }
): Promise<void> => {
  if (!uid) return;

  const cleanPrivado = (config.privadoChatId || '').trim();
  const cleanGrupo = (config.grupoChatId || '').trim();
  const modoEnvio = config.modoEnvio || 'padrao';

  // 1. Atualiza no documento do usuário
  const userDocRef = doc(db, 'usuarios', uid);
  await setDoc(
    userDocRef,
    {
      telegramChatId: cleanPrivado, // legado
      telegramPrivadoChatId: cleanPrivado,
      telegramGrupoChatId: cleanGrupo,
      telegramModoEnvio: modoEnvio,
      updatedAt: Date.now()
    },
    { merge: true }
  );

  // 2. Atualiza no documento consolidado config/telegram
  try {
    const configDocRef = doc(db, 'config', 'telegram');
    const configSnap = await getDoc(configDocRef);
    const data = configSnap.exists() ? configSnap.data() : {};
    const userConfigs = (data.userConfigs || {}) as Record<string, UsuarioTelegramConfigItem>;
    const userChatIds = (data.userChatIds || {}) as Record<string, string>;

    userConfigs[uid] = {
      privadoChatId: cleanPrivado,
      grupoChatId: cleanGrupo,
      modoEnvio: modoEnvio
    };

    if (cleanPrivado) {
      userChatIds[uid] = cleanPrivado;
    } else {
      delete userChatIds[uid];
    }

    await setDoc(
      configDocRef,
      {
        userConfigs,
        userChatIds,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Erro ao sincronizar userConfigs no config/telegram:', err);
  }
};

/**
 * Aplica as configurações do Telegram do Administrador para todos os usuários cadastrados.
 * Permite definir o Token, Grupo Padrão e Modo de Envio global.
 */
export const aplicarTelegramAdminParaTodos = async (
  adminBotToken: string,
  adminGrupoChatId: string,
  modoEnvioPadrao: 'ambos' | 'grupo' | 'privado' = 'ambos',
  opcoes?: {
    definirModoEnvioParaTodos?: boolean;
    definirGrupoParaTodos?: boolean;
  }
): Promise<{ total: number }> => {
  const cleanToken = adminBotToken.trim();
  const cleanGrupoChatId = adminGrupoChatId.trim();

  if (!cleanToken || !cleanGrupoChatId) {
    throw new Error('Preencha o Token do Bot e o ID do Grupo do Administrador antes de aplicar.');
  }

  const snapshot = await getDocs(collection(db, 'usuarios'));
  const configDocRef = doc(db, 'config', 'telegram');
  const existingConfigSnap = await getDoc(configDocRef);
  const existingData = existingConfigSnap.exists() ? existingConfigSnap.data() : {};
  
  const userConfigs = (existingData.userConfigs || {}) as Record<string, UsuarioTelegramConfigItem>;
  const userChatIds = (existingData.userChatIds || {}) as Record<string, string>;
  const promises: Promise<any>[] = [];

  snapshot.forEach((docSnap) => {
    const uid = docSnap.id;
    const current = userConfigs[uid] || {};

    const novoModo: ModoEnvioTelegram = opcoes?.definirModoEnvioParaTodos ? modoEnvioPadrao : (current.modoEnvio || 'padrao');
    const novoGrupo = opcoes?.definirGrupoParaTodos ? cleanGrupoChatId : (current.grupoChatId || cleanGrupoChatId);

    userConfigs[uid] = {
      ...current,
      grupoChatId: novoGrupo,
      modoEnvio: novoModo
    };

    // Atualiza o documento de cada usuário no Firestore
    const userRef = doc(db, 'usuarios', uid);
    promises.push(
      setDoc(
        userRef,
        {
          telegramGrupoChatId: novoGrupo,
          telegramModoEnvio: novoModo,
          updatedAt: Date.now()
        },
        { merge: true }
      )
    );
  });

  // Salva no config/telegram
  promises.push(
    setDoc(
      configDocRef,
      {
        botToken: cleanToken,
        chatId: cleanGrupoChatId,
        grupoChatId: cleanGrupoChatId,
        modoEnvio: modoEnvioPadrao,
        userConfigs,
        userChatIds,
        updatedAt: Date.now()
      },
      { merge: true }
    )
  );

  await Promise.all(promises);

  // Atualiza no LocalStorage local
  localStorage.setItem('cadservicos_telegram_token', cleanToken);
  localStorage.setItem('cadservicos_telegram_chat_id', cleanGrupoChatId);

  return { total: snapshot.size };
};
