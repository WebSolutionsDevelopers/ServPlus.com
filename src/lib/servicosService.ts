rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regra da subcoleção de serviços por usuário
    match /usuarios/{userId}/servicos/{servicoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Documento de perfil do usuário e configurações
    match /usuarios/{userId} {
      allow read, write: if request.auth != null;
    }
    // Permissão para coleção raiz legada (necessário para ler/mover durante migração)
    match /servicos/{servicoId} {
      allow read, write: if request.auth != null;
    }
    match /config/{configId} {
      allow read, write: if request.auth != null;
    }
  }
}
