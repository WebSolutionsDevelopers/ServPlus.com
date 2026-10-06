import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocsFromCache,
  getDocsFromServer,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ServicoItem } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Chave para cache no LocalStorage
const getStorageKey = (userId: string) => `cadservicos_items_${userId}`;

/**
 * Helper para obter a referência da subcoleção de serviços do usuário
 */
const getUserServicosCollection = (userId: string) => {
  return collection(db, 'usuarios', userId, 'servicos');
};

/**
 * Helper para obter a referência de um documento específico da subcoleção do usuário
 */
const getUserServicoDoc = (userId: string, servicoId: string) => {
  return doc(db, 'usuarios', userId, 'servicos', servicoId);
};

/**
 * Obtém os serviços armazenados no localStorage do navegador (0 leituras do Firestore)
 */
export const getServicosLocais = (userId: string): ServicoItem[] => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

/**
 * Salva a lista de serviços no localStorage do navegador
 */
export const salvarServicosLocais = (userId: string, items: ServicoItem[]) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  } catch (e) {
    console.warn('Erro ao salvar dados no localStorage:', e);
  }
};

// Função auxiliar para converter todos os campos de texto do serviço para UPPERCASE
function uppercaseServicoFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => uppercaseServicoFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const uppercased: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (key === 'fotos' || key === 'userId' || key === 'userEmail' || key === 'id' || key === 'createdAt') {
        uppercased[key] = value;
      } else if (typeof value === 'string') {
        uppercased[key] = value.toUpperCase();
      } else if (typeof value === 'object' && value !== null) {
        uppercased[key] = uppercaseServicoFields(value);
      } else {
        uppercased[key] = value;
      }
    }
    return uppercased as T;
  }
  if (typeof obj === 'string') {
    return obj.toUpperCase() as unknown as T;
  }
  return obj;
}

// Função auxiliar para remover valores undefined (o Firestore não aceita undefined em objetos)
function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Migra de forma transparente os dados da coleção legada 'servicos' para a subcoleção 'usuarios/{userId}/servicos'
 */
export const migrarServicosLegadosParaSubcolecao = async (userId: string): Promise<ServicoItem[]> => {
  if (!userId) return [];
  const oldColRef = collection(db, 'servicos');
  const q = query(oldColRef, where('userId', '==', userId));

  try {
    const snap = await getDocs(q);
    if (snap.empty) return [];

    console.log(`[Migração] Encontrados ${snap.size} registros na coleção antiga 'servicos' para o usuário ${userId}. Migrando...`);
    const migrados: ServicoItem[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const newDocRef = getUserServicoDoc(userId, docSnap.id);

      // Copia para a subcoleção
      await setDoc(newDocRef, data);

      // Deleta da coleção antiga
      try {
        await deleteDoc(doc(db, 'servicos', docSnap.id));
      } catch (delErr) {
        console.warn(`[Migração] Registro copiado, mas não foi possível remover do antigo 'servicos/${docSnap.id}':`, delErr);
      }

      migrados.push({
        id: docSnap.id,
        ...(data as Omit<ServicoItem, 'id'>)
      });
    }

    console.log(`[Migração] Migração concluída com sucesso para ${migrados.length} registros.`);
    return migrados;
  } catch (err) {
    console.warn('[Migração] Erro ao buscar/migrar registros antigos:', err);
    return [];
  }
};

/**
 * Salva um novo serviço na subcoleção do usuário logado 'usuarios/{userId}/servicos'
 */
export const salvarServico = async (servicoData: Omit<ServicoItem, 'id'>): Promise<string> => {
  const currentUserId = servicoData.userId || auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Usuário não autenticado para salvar o serviço');
  }

  try {
    const colRef = getUserServicosCollection(currentUserId);
    const upperData = uppercaseServicoFields(servicoData);
    const dataToSave = cleanForFirestore({
      ...upperData,
      userId: currentUserId,
      createdAt: Date.now()
    });
    console.log(`Salvando serviço na subcoleção 'usuarios/${currentUserId}/servicos':`, dataToSave);
    const docRef = await addDoc(colRef, dataToSave);
    console.log('Serviço salvo com sucesso, ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `usuarios/${currentUserId}/servicos`);
    throw error;
  }
};

/**
 * Atualiza um serviço existente na subcoleção do usuário
 */
export const atualizarServico = async (
  id: string,
  servicoData: Partial<ServicoItem>,
  userIdParam?: string
): Promise<void> => {
  const currentUserId = userIdParam || servicoData.userId || auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Usuário não identificado para atualizar o serviço');
  }

  try {
    const docRef = getUserServicoDoc(currentUserId, id);
    const upperData = uppercaseServicoFields(servicoData);
    const dataToUpdate = cleanForFirestore({
      ...upperData
    });
    console.log(`Atualizando serviço ${id} em usuarios/${currentUserId}/servicos:`, dataToUpdate);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `usuarios/${currentUserId}/servicos/${id}`);
    throw error;
  }
};

/**
 * Exclui um serviço da subcoleção do usuário (e da coleção antiga se ainda existir lá)
 */
export const excluirServico = async (id: string, userIdParam?: string): Promise<void> => {
  const currentUserId = userIdParam || auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Usuário não identificado para excluir o serviço');
  }

  try {
    const docRef = getUserServicoDoc(currentUserId, id);
    await deleteDoc(docRef);

    // Tenta remover também da coleção antiga por garantia
    try {
      await deleteDoc(doc(db, 'servicos', id));
    } catch (e) {
      // Ignorar se já não existir
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `usuarios/${currentUserId}/servicos/${id}`);
    throw error;
  }
};

/**
 * Carrega os serviços do usuário com ESTRATÉGIA ZERO-READ LEITURAS FIRESTORE:
 * 1. Primeiro verifica o localStorage (0 ms, 0 leituras).
 * 2. Tenta buscar do Cache Offline do Firestore (IndexedDB) via getDocsFromCache() na subcoleção.
 * 3. Se necessário, busca do servidor e realiza migração de dados antigos automaticamente.
 */
export const carregarServicosComZeroLeituras = async (userId: string): Promise<ServicoItem[]> => {
  const itensLocais = getServicosLocais(userId);
  if (itensLocais.length > 0) {
    // Roda verificação de migração em segundo plano se houver registros antigos remanescentes
    migrarServicosLegadosParaSubcolecao(userId).then((migrados) => {
      if (migrados.length > 0) {
        // Se houve migração, atualiza lista mesclando novos
        sincronizarServicosDoServidor(userId).catch(() => {});
      }
    });
    return itensLocais;
  }

  const colRef = getUserServicosCollection(userId);

  // 1. Tentar ler do cache offline do Firestore da subcoleção
  try {
    const cacheSnap = await getDocsFromCache(colRef);
    if (!cacheSnap.empty) {
      const items: ServicoItem[] = [];
      cacheSnap.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ServicoItem, 'id'>)
        });
      });
      items.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));
      salvarServicosLocais(userId, items);
      return items;
    }
  } catch (e) {
    // Cache miss
  }

  // 2. Tenta buscar da subcoleção no servidor
  try {
    const serverSnap = await getDocsFromServer(colRef);
    const items: ServicoItem[] = [];
    serverSnap.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ServicoItem, 'id'>)
      });
    });

    // 3. Verifica e migra dados antigos da coleção 'servicos' se existirem
    const migrados = await migrarServicosLegadosParaSubcolecao(userId);

    // Mescla itens se houver migração
    const mapItems = new Map<string, ServicoItem>();
    items.forEach((item) => mapItems.set(item.id, item));
    migrados.forEach((item) => mapItems.set(item.id, item));

    const finalItems = Array.from(mapItems.values());
    finalItems.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));

    salvarServicosLocais(userId, finalItems);
    return finalItems;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `usuarios/${userId}/servicos`);
    return itensLocais;
  }
};

/**
 * Força uma ressincronização pontual com o servidor Firestore na subcoleção do usuário
 */
export const sincronizarServicosDoServidor = async (userId: string): Promise<ServicoItem[]> => {
  // Executa a migração caso existam dados legados pendentes
  const migrados = await migrarServicosLegadosParaSubcolecao(userId);

  const colRef = getUserServicosCollection(userId);
  const serverSnap = await getDocs(colRef);
  const items: ServicoItem[] = [];
  serverSnap.forEach((docSnap) => {
    items.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ServicoItem, 'id'>)
    });
  });

  const mapItems = new Map<string, ServicoItem>();
  items.forEach((item) => mapItems.set(item.id, item));
  migrados.forEach((item) => mapItems.set(item.id, item));

  const finalItems = Array.from(mapItems.values());
  finalItems.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));

  salvarServicosLocais(userId, finalItems);
  return finalItems;
};




