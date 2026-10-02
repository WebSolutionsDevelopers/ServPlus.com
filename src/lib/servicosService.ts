import {
  collection,
  collectionGroup,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocsFromCache,
  getDocsFromServer,
  getDocs,
  query,
  where,
  limit
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
 * Extrai o ano e mês no formato YYYY-MM a partir da string de data
 */
export const extrairAnoMes = (dataStr?: string): string => {
  if (!dataStr) {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }
  // Se estiver no formato YYYY-MM-DD
  const matchIso = dataStr.match(/^(\d{4})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}`;
  }
  // Se estiver no formato DD/MM/YYYY
  const matchBr = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchBr) {
    return `${matchBr[3]}-${matchBr[2]}`;
  }
  return dataStr.slice(0, 7);
};

/**
 * Helper para obter a referência da subcoleção de serviços organizada por mês:
 * Caminho: usuarios/{userId}/meses/{anoMes}/servicos
 */
export const getUserMesServicosCollection = (userId: string, anoMes: string) => {
  return collection(db, 'usuarios', userId, 'meses', anoMes, 'servicos');
};

/**
 * Helper para obter o documento agregador do mês:
 * Caminho: usuarios/{userId}/meses/{anoMes}
 */
export const getUserMesDoc = (userId: string, anoMes: string) => {
  return doc(db, 'usuarios', userId, 'meses', anoMes);
};

/**
 * Helper para obter o documento de um serviço em um mês específico:
 * Caminho: usuarios/{userId}/meses/{anoMes}/servicos/{servicoId}
 */
export const getUserMesServicoDoc = (userId: string, anoMes: string, servicoId: string) => {
  return doc(db, 'usuarios', userId, 'meses', anoMes, 'servicos', servicoId);
};

/**
 * Helper da subcoleção legada direta (para compatibilidade e migração transparente):
 * Caminho: usuarios/{userId}/servicos
 */
export const getUserServicosCollection = (userId: string) => {
  return collection(db, 'usuarios', userId, 'servicos');
};

/**
 * Helper de documento na subcoleção legada direta
 */
export const getUserServicoDoc = (userId: string, servicoId: string) => {
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
      if (key === 'fotos' || key === 'userId' || key === 'userEmail' || key === 'id' || key === 'createdAt' || key === 'mesAno') {
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

const getMigratedKey = (userId: string) => `cadservicos_meses_migrated_${userId}`;

/**
 * Migra de forma transparente os dados de coleções antigas para a estrutura particionada por mês
 * (usuarios/{userId}/meses/{anoMes}/servicos/{servicoId})
 */
export const migrarServicosParaPastasMensais = async (userId: string): Promise<ServicoItem[]> => {
  if (!userId) return [];

  const migratedKey = getMigratedKey(userId);
  if (localStorage.getItem(migratedKey) === 'done_v2') {
    return [];
  }

  // Marca imediatamente no localStorage para prevenir execuções concorrentes ou em loop
  localStorage.setItem(migratedKey, 'done_v2');

  const migrados: ServicoItem[] = [];

  try {
    // 1. Migração de documentos da subcoleção legada direta 'usuarios/{userId}/servicos'
    const directColRef = getUserServicosCollection(userId);
    const directSnap = await getDocs(directColRef);
    if (!directSnap.empty) {
      console.log(`[Migração Mensal] Encontrados ${directSnap.size} registros na subcoleção direta. Organizando por mês...`);
      for (const docSnap of directSnap.docs) {
        const data = docSnap.data();
        const anoMes = extrairAnoMes(data.data);
        const ano = parseInt(anoMes.split('-')[0], 10);
        const mes = parseInt(anoMes.split('-')[1], 10);

        // Garante metadados do mês
        await setDoc(getUserMesDoc(userId, anoMes), {
          anoMes,
          ano,
          mes,
          userId,
          atualizadoEm: Date.now()
        }, { merge: true });

        // Copia para a subcoleção do mês
        const novoDocRef = getUserMesServicoDoc(userId, anoMes, docSnap.id);
        const dadosCompletos = {
          ...data,
          mesAno: anoMes,
          ano,
          mes,
          userId
        };
        await setDoc(novoDocRef, dadosCompletos);

        // Deleta da coleção direta antiga
        try {
          await deleteDoc(getUserServicoDoc(userId, docSnap.id));
        } catch (delErr) {
          console.warn(`[Migração Mensal] Não foi possível remover da subcoleção direta ${docSnap.id}:`, delErr);
        }

        migrados.push({
          id: docSnap.id,
          ...(dadosCompletos as Omit<ServicoItem, 'id'>)
        });
      }
    }

    // 2. Migração de documentos antigos remanescentes da coleção raiz legada 'servicos'
    try {
      const rootColRef = collection(db, 'servicos');
      const rootQuery = query(rootColRef, where('userId', '==', userId));
      const rootSnap = await getDocs(rootQuery);
      if (!rootSnap.empty) {
        console.log(`[Migração Mensal] Encontrados ${rootSnap.size} registros na coleção raiz legada. Organizando por mês...`);
        for (const docSnap of rootSnap.docs) {
          const data = docSnap.data();
          const anoMes = extrairAnoMes(data.data);
          const ano = parseInt(anoMes.split('-')[0], 10);
          const mes = parseInt(anoMes.split('-')[1], 10);

          await setDoc(getUserMesDoc(userId, anoMes), {
            anoMes,
            ano,
            mes,
            userId,
            atualizadoEm: Date.now()
          }, { merge: true });

          const novoDocRef = getUserMesServicoDoc(userId, anoMes, docSnap.id);
          const dadosCompletos = {
            ...data,
            mesAno: anoMes,
            ano,
            mes,
            userId
          };
          await setDoc(novoDocRef, dadosCompletos);

          try {
            await deleteDoc(doc(db, 'servicos', docSnap.id));
          } catch (delErr) {}

          migrados.push({
            id: docSnap.id,
            ...(dadosCompletos as Omit<ServicoItem, 'id'>)
          });
        }
      }
    } catch (e) {}

    localStorage.setItem(migratedKey, 'done_v2');
    if (migrados.length > 0) {
      console.log(`[Migração Mensal] Sucesso: ${migrados.length} registros organizados em pastas de meses.`);
    }
    return migrados;
  } catch (err) {
    console.warn('[Migração Mensal] Erro ao particionar dados legados por mês:', err);
    return [];
  }
};

/**
 * Salva um novo serviço particionado diretamente no mês correspondente:
 * Caminho no Firebase: usuarios/{userId}/meses/{anoMes}/servicos/{servicoId}
 */
export const salvarServico = async (servicoData: Omit<ServicoItem, 'id'>): Promise<string> => {
  const currentUserId = servicoData.userId || auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Usuário não autenticado para salvar o serviço');
  }

  const anoMes = extrairAnoMes(servicoData.data);
  const ano = parseInt(anoMes.split('-')[0], 10);
  const mes = parseInt(anoMes.split('-')[1], 10);

  try {
    // 1. Cria ou atualiza os metadados da pasta mensal
    try {
      const mesDocRef = getUserMesDoc(currentUserId, anoMes);
      await setDoc(mesDocRef, {
        anoMes,
        ano,
        mes,
        userId: currentUserId,
        atualizadoEm: Date.now()
      }, { merge: true });
    } catch (mesErr) {
      console.warn('Erro ao atualizar metadados do mês:', mesErr);
    }

    // 2. Salva o serviço na subcoleção do mês correspondente
    const colRef = getUserMesServicosCollection(currentUserId, anoMes);
    const upperData = uppercaseServicoFields(servicoData);
    const dataToSave = cleanForFirestore({
      ...upperData,
      userId: currentUserId,
      mesAno: anoMes,
      ano,
      mes,
      createdAt: Date.now()
    });

    console.log(`Salvando serviço no Firebase particionado no mês ${anoMes}:`, dataToSave);
    const docRef = await addDoc(colRef, dataToSave);
    console.log('Serviço salvo com sucesso no mês', anoMes, 'ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `usuarios/${currentUserId}/meses/${anoMes}/servicos`);
    throw error;
  }
};

/**
 * Atualiza um serviço existente na pasta do mês
 * Se a data do serviço tiver mudado de mês, move o registro com segurança para a nova pasta mensal.
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

  const upperData = uppercaseServicoFields(servicoData);
  const dataToUpdate = cleanForFirestore({
    ...upperData
  });

  const novoAnoMes = servicoData.data ? extrairAnoMes(servicoData.data) : undefined;
  if (novoAnoMes) {
    dataToUpdate.mesAno = novoAnoMes;
    dataToUpdate.ano = parseInt(novoAnoMes.split('-')[0], 10);
    dataToUpdate.mes = parseInt(novoAnoMes.split('-')[1], 10);
  }

  try {
    const locais = getServicosLocais(currentUserId);
    const itemExistente = locais.find((s) => s.id === id);
    const mesAnterior = itemExistente?.data ? extrairAnoMes(itemExistente.data) : (itemExistente?.mesAno || undefined);

    // Se o serviço mudou de mês (ex: de 2026-09 para 2026-10), move para a nova pasta mensal
    if (novoAnoMes && mesAnterior && novoAnoMes !== mesAnterior) {
      console.log(`[Serviço ${id}] Transferindo do mês ${mesAnterior} para ${novoAnoMes}...`);

      const dadosCompletos = cleanForFirestore({
        ...uppercaseServicoFields(itemExistente || {}),
        ...dataToUpdate,
        id,
        userId: currentUserId,
        mesAno: novoAnoMes,
        ano: parseInt(novoAnoMes.split('-')[0], 10),
        mes: parseInt(novoAnoMes.split('-')[1], 10),
        updatedAt: Date.now()
      });

      // 1. Salva no novo mês
      const novoDocRef = getUserMesServicoDoc(currentUserId, novoAnoMes, id);
      await setDoc(novoDocRef, dadosCompletos, { merge: true });

      // Atualiza metadados do novo mês
      await setDoc(getUserMesDoc(currentUserId, novoAnoMes), {
        anoMes: novoAnoMes,
        ano: parseInt(novoAnoMes.split('-')[0], 10),
        mes: parseInt(novoAnoMes.split('-')[1], 10),
        userId: currentUserId,
        atualizadoEm: Date.now()
      }, { merge: true });

      // 2. Remove do mês anterior
      try {
        await deleteDoc(getUserMesServicoDoc(currentUserId, mesAnterior, id));
      } catch (delErr) {
        console.warn(`Aviso ao remover do mês anterior (${mesAnterior}):`, delErr);
      }
      return;
    }

    // Se não mudou de mês ou já sabemos o mês:
    const anoMesAlvo = novoAnoMes || mesAnterior;
    if (anoMesAlvo) {
      const docMesRef = getUserMesServicoDoc(currentUserId, anoMesAlvo, id);
      try {
        await updateDoc(docMesRef, dataToUpdate);
        return;
      } catch (errAtualizarMes) {
        console.warn(`Não encontrado no mês ${anoMesAlvo}, verificando caminhos alternativos...`);
      }
    }

    // Fallback: se estiver na subcoleção direta antiga
    try {
      const legacyDocRef = getUserServicoDoc(currentUserId, id);
      await updateDoc(legacyDocRef, dataToUpdate);
    } catch (legacyErr) {
      if (anoMesAlvo) {
        const docMesRef = getUserMesServicoDoc(currentUserId, anoMesAlvo, id);
        await setDoc(docMesRef, dataToUpdate, { merge: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `usuarios/${currentUserId}/meses/${novoAnoMes || 'desconhecido'}/servicos/${id}`);
    throw error;
  }
};

/**
 * Exclui um serviço da pasta do mês no Firebase
 */
export const excluirServico = async (id: string, userIdParam?: string): Promise<void> => {
  const currentUserId = userIdParam || auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('Usuário não identificado para excluir o serviço');
  }

  try {
    const locais = getServicosLocais(currentUserId);
    const item = locais.find((s) => s.id === id);
    const anoMes = item?.data ? extrairAnoMes(item.data) : (item?.mesAno || undefined);

    let deletado = false;

    if (anoMes) {
      try {
        const docMesRef = getUserMesServicoDoc(currentUserId, anoMes, id);
        await deleteDoc(docMesRef);
        deletado = true;
      } catch (delMesErr) {
        console.warn(`Aviso ao excluir do mês ${anoMes}:`, delMesErr);
      }
    }

    // Também tenta remover do caminho direto legado caso ainda existisse lá
    try {
      const legacyDocRef = getUserServicoDoc(currentUserId, id);
      await deleteDoc(legacyDocRef);
      deletado = true;
    } catch (e) {}

    // Se ainda não encontrou, busca em todos os meses registrados do usuário
    if (!deletado) {
      try {
        const mesesSnap = await getDocs(collection(db, 'usuarios', currentUserId, 'meses'));
        for (const mDoc of mesesSnap.docs) {
          try {
            await deleteDoc(getUserMesServicoDoc(currentUserId, mDoc.id, id));
          } catch (e) {}
        }
      } catch (e) {}
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `usuarios/${currentUserId}/servicos/${id}`);
    throw error;
  }
};

const ADMIN_TODOS_CACHE_KEY = 'cadservicos_admin_todos_cache';

/**
 * Carrega todos os serviços do usuário a partir das pastas de meses do Firebase:
 * 1. Primeiro verifica o localStorage (0 ms, 0 leituras).
 * 2. Se vazio, lê do servidor Firestore.
 */
export const carregarServicosComZeroLeituras = async (userId: string): Promise<ServicoItem[]> => {
  const itensLocais = getServicosLocais(userId);
  if (itensLocais.length > 0) {
    return itensLocais;
  }

  // Tenta sincronizar do servidor
  return await sincronizarServicosDoServidor(userId);
};

/**
 * Sincronização eficiente com as pastas mensais do Firebase:
 * Limita a consulta aos últimos 3 meses para evitar estouro de leituras.
 */
export const sincronizarServicosDoServidor = async (userId: string): Promise<ServicoItem[]> => {
  if (!userId) return [];

  try {
    const mapItems = new Map<string, ServicoItem>();

    // 1. Busca lista de meses do usuário: usuarios/{userId}/meses
    const mesesColRef = collection(db, 'usuarios', userId, 'meses');
    const mesesSnap = await getDocs(mesesColRef);

    // Seleciona no máximo os 3 meses mais recentes ordenados alfabeticamente decrescente
    const mesesRecentes = mesesSnap.docs
      .map((d) => d.id)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 3);

    for (const anoMes of mesesRecentes) {
      try {
        const servicosMesCol = query(getUserMesServicosCollection(userId, anoMes), limit(100));
        const servicosMesSnap = await getDocs(servicosMesCol);
        servicosMesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          mapItems.set(docSnap.id, {
            id: docSnap.id,
            userId,
            mesAno: anoMes,
            ...(data as Omit<ServicoItem, 'id' | 'userId'>)
          });
        });
      } catch (errMes) {
        console.warn(`Erro ao ler serviços do mês ${anoMes}:`, errMes);
      }
    }

    // 2. Verifica também subcoleção legada direta apenas se mapItems estiver vazio
    if (mapItems.size === 0) {
      try {
        const directColRef = query(getUserServicosCollection(userId), limit(100));
        const directSnap = await getDocs(directColRef);
        directSnap.forEach((docSnap) => {
          if (!mapItems.has(docSnap.id)) {
            const data = docSnap.data();
            mapItems.set(docSnap.id, {
              id: docSnap.id,
              userId,
              ...(data as Omit<ServicoItem, 'id' | 'userId'>)
            });
          }
        });
      } catch (e) {}
    }

    const finalItems = Array.from(mapItems.values());
    finalItems.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));

    salvarServicosLocais(userId, finalItems);
    return finalItems;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `usuarios/${userId}/meses`);
    return getServicosLocais(userId);
  }
};

/**
 * Carrega todos os serviços de todos os usuários cadastrados (Exclusivo para Administrador)
 * OTIMIZADO:
 * - Cache em memória/sessão para evitar leituras repetidas em navegações.
 * - Limite rigoroso (limit(300)) para impedir explosão de leituras no collectionGroup.
 * - Elimina o loop recursivo multiplicador de leitura.
 */
export const carregarTodosServicosAdmin = async (
  _usuariosLista?: { uid: string; nome?: string; email?: string }[],
  forceRefresh = false
): Promise<ServicoItem[]> => {
  // 1. Verifica cache de sessão para responder com 0 leituras se já foi consultado
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(ADMIN_TODOS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
  }

  try {
    // 2. Consulta com collectionGroup protegida com LIMIT(300)
    const servicosGroup = query(collectionGroup(db, 'servicos'), limit(300));
    const snap = await getDocs(servicosGroup);
    if (!snap.empty) {
      const items: ServicoItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let parentUserId = data.userId;
        if (!parentUserId) {
          const pathSegments = docSnap.ref.path.split('/');
          const usuariosIdx = pathSegments.indexOf('usuarios');
          if (usuariosIdx !== -1 && pathSegments[usuariosIdx + 1]) {
            parentUserId = pathSegments[usuariosIdx + 1];
          }
        }

        const anoMes = data.mesAno || extrairAnoMes(data.data);

        items.push({
          id: docSnap.id,
          userId: parentUserId || '',
          mesAno: anoMes,
          ...(data as Omit<ServicoItem, 'id' | 'userId'>)
        });
      });
      items.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));

      // Salva no cache de sessão para reutilização imediata (0 leituras)
      try {
        sessionStorage.setItem(ADMIN_TODOS_CACHE_KEY, JSON.stringify(items));
      } catch (e) {}

      return items;
    }
  } catch (err) {
    console.warn('[Admin] Consulta consolidada com collectionGroup finalizada:', err);
  }

  return [];
};

/**
 * Carrega os serviços de um usuário/técnico específico.
 * OTIMIZADO: Verifica o cache local primeiro (0 leituras). Se não houver, busca com limite seguro.
 */
export const carregarServicosDoUsuario = async (userId: string, forceRefresh = false): Promise<ServicoItem[]> => {
  if (!userId) return [];

  // Se não foi forçado, verifica se já temos em cache local
  if (!forceRefresh) {
    const locais = getServicosLocais(userId);
    if (locais.length > 0) {
      return locais;
    }
  }

  try {
    const mapItems = new Map<string, ServicoItem>();

    // 1. Busca meses do usuário (no máximo 3 meses recentes)
    const mesesSnap = await getDocs(collection(db, 'usuarios', userId, 'meses'));
    const mesesRecentes = mesesSnap.docs
      .map((d) => d.id)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 3);

    for (const anoMes of mesesRecentes) {
      try {
        const subQuery = query(getUserMesServicosCollection(userId, anoMes), limit(100));
        const subSnap = await getDocs(subQuery);
        subSnap.forEach((docSnap) => {
          const data = docSnap.data();
          mapItems.set(docSnap.id, {
            id: docSnap.id,
            userId,
            mesAno: anoMes,
            ...(data as Omit<ServicoItem, 'id' | 'userId'>)
          });
        });
      } catch (e) {}
    }

    // 2. Se não encontrou nas pastas de meses, tenta buscar da subcoleção direta com limite
    if (mapItems.size === 0) {
      try {
        const directQuery = query(getUserServicosCollection(userId), limit(100));
        const directSnap = await getDocs(directQuery);
        directSnap.forEach((docSnap) => {
          if (!mapItems.has(docSnap.id)) {
            const data = docSnap.data();
            mapItems.set(docSnap.id, {
              id: docSnap.id,
              userId,
              ...(data as Omit<ServicoItem, 'id' | 'userId'>)
            });
          }
        });
      } catch (e) {}
    }

    const items = Array.from(mapItems.values());
    items.sort((a, b) => (b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)));
    salvarServicosLocais(userId, items);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `usuarios/${userId}/meses`);
    return getServicosLocais(userId);
  }
};
