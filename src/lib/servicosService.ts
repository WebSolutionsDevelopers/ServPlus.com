import {
  collection,
  doc,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { ServicoItem } from '../types';

// Referência para a subcoleção do usuário no Firestore
const getUserServicosCollection = (userId: string) => {
  return collection(db, 'usuarios', userId, 'servicos');
};

// Chave do LocalStorage
const getStorageKey = (userId: string) => `cadservicos_items_${userId}`;

// Salvar no LocalStorage (para cache offline)
export const salvarServicosLocais = (userId: string, items: ServicoItem[]) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  } catch (e) {
    console.warn('Erro ao salvar dados no localStorage:', e);
  }
};

/**
 * Força uma ressincronização pontual com o servidor Firestore na subcoleção do usuário
 */
export const sincronizarServicosDoServidor = async (userId: string): Promise<ServicoItem[]> => {
  const colRef = getUserServicosCollection(userId);

  // Busca todos os documentos da subcoleção no servidor Firestore
  const serverSnap = await getDocs(colRef);
  const items: ServicoItem[] = [];

  serverSnap.forEach((docSnap) => {
    items.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ServicoItem, 'id'>)
    });
  });

  // Ordena por data decrescente e timestamp de criação
  items.sort((a, b) => 
    b.data !== a.data ? b.data.localeCompare(a.data) : (b.createdAt || 0) - (a.createdAt || 0)
  );

  // Salva no cache local (0 leituras nas próximas aberturas)
  salvarServicosLocais(userId, items);

  return items;
};
