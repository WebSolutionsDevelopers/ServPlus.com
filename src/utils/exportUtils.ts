import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ServicoItem } from '../types';
import { getValorServico, calcularMetragemUtilizada } from './servicoUtils';

export interface ExportData {
  file: File;
  blobUrl: string;
  fileName: string;
  fileType: 'pdf' | 'excel';
  mimetype: string;
}

export const gerarPDFData = (
  servicos: ServicoItem[],
  totalGanhos: number,
  periodoDescricao: string,
  userEmail: string
): ExportData => {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Título e Cabeçalho
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175); // Azul
  doc.text('Relatório Completo de Serviços e Equipamentos', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // Cinza
  doc.text(`Técnico: ${userEmail}`, 14, 22);
  doc.text(`Período: ${periodoDescricao}`, 14, 27);
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 32);

  // Total Registros
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(`Total Registros: ${servicos.length}`, 280, 25, { align: 'right' });

  // Linha divisória
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 35, 280, 35);

  // Tabela
  const tableData = servicos.map((s, idx) => {
    const dataFmt = s.data ? new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    const operadora = s.operadora || '-';
    const tipoServico = s.tipoServico || s.tipoAtividade || '-';

    // Endereço Completo
    const loc = s.localizacao;
    const enderecoCompleto = [
      loc?.endereco ? `${loc.endereco}${loc.numero ? ', ' + loc.numero : ''}` : '',
      loc?.bairro ? `Bairro: ${loc.bairro}` : '',
      loc?.cidade ? `${loc.cidade}${loc.estado ? ' - ' + loc.estado : ''}` : ''
    ].filter(Boolean).join('\n') || 'Endereço não informado';

    // Dados da Visita
    const dv = s.dadosVisita;
    const dadosVisitaLinhas = [
      dv?.numeroSA ? `SA/OS: ${dv.numeroSA}` : null,
      dv?.acessoGpon ? `GPON: ${dv.acessoGpon}` : null,
      dv?.quemAtendeu ? `Atendeu: ${dv.quemAtendeu}` : null,
      dv?.contatoCliente ? `Contato: ${dv.contatoCliente}` : null,
      (dv?.numCdoe || dv?.portaUtilizada) ? `${dv?.tipoCdoe || 'CDOE'}: ${dv.numCdoe || '-'} | Porta: ${dv.portaUtilizada || '-'}` : null
    ].filter(Boolean).join('\n') || '-';

    // Equipamentos & Materiais
    const metrosUtilizadosCalc = calcularMetragemUtilizada(dv);
    const equipLinhas = [
      dv?.snOnt ? `ONT: ${dv.snOnt}` : null,
      dv?.snMesh ? `Mesh: ${dv.snMesh}` : null,
      dv?.snDrop ? `Drop: ${dv.snDrop}` : null,
      (dv?.metragemRolo || dv?.metragemInicial || dv?.metragemFinal)
        ? `Metragem: ${dv.metragemRolo ? dv.metragemRolo + 'm' : ''} (${dv.metragemInicial ?? ''} a ${dv.metragemFinal ?? ''}${metrosUtilizadosCalc !== null ? ` | Usado: ${metrosUtilizadosCalc}m` : ''})`
        : null,
      (dv?.qtdConector || dv?.qtdEsticador || dv?.plaqueta || dv?.kitFixaFio)
        ? `Mat: Conect(${dv.qtdConector || 0}) Estic(${dv.qtdEsticador || 0}) Plaq(${dv.plaqueta || 0}) FixaFio(${dv.kitFixaFio || 0})`
        : null
    ].filter(Boolean).join('\n') || 'Sem equipamentos';

    return [
      idx + 1,
      dataFmt,
      `${operadora}\n${tipoServico}`,
      enderecoCompleto,
      dadosVisitaLinhas,
      equipLinhas
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [[
      '#',
      'Data',
      'Operadora / Serviço',
      'Endereço Completo',
      'Dados da Visita',
      'Equipamentos & Materiais'
    ]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 40 },
      3: { cellWidth: 60 },
      4: { cellWidth: 65 },
      5: { cellWidth: 71 }
    }
  });

  const pdfBlob = doc.output('blob');
  const fileName = `relatorio_servicos_${new Date().toISOString().slice(0, 10)}.pdf`;
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);

  return {
    file,
    blobUrl,
    fileName,
    fileType: 'pdf',
    mimetype: 'application/pdf'
  };
};

export interface ExcelColumnOption {
  id: string;
  label: string;
  category: string;
  description?: string;
  defaultSelected: boolean;
  wch: number;
  getValue: (s: ServicoItem, idx: number, userEmail: string) => any;
}

export const EXCEL_COLUMNS: ExcelColumnOption[] = [
  // Categoria: Identificação & Serviço
  {
    id: 'index',
    label: '#',
    category: 'Identificação & Serviço',
    description: 'Numeração sequencial do registro',
    defaultSelected: true,
    wch: 5,
    getValue: (_, idx) => idx + 1
  },
  {
    id: 'data',
    label: 'Data',
    category: 'Identificação & Serviço',
    description: 'Data de realização do serviço',
    defaultSelected: true,
    wch: 12,
    getValue: (s) => (s.data ? new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR') : '')
  },
  {
    id: 'tecnicoNome',
    label: 'Nome do Técnico',
    category: 'Identificação & Serviço',
    description: 'Nome registrado do técnico',
    defaultSelected: true,
    wch: 22,
    getValue: (s) => s.userName || ''
  },
  {
    id: 'tecnicoEmail',
    label: 'E-mail do Técnico',
    category: 'Identificação & Serviço',
    description: 'E-mail da conta do técnico',
    defaultSelected: false,
    wch: 25,
    getValue: (s, _, userEmail) => s.userEmail || userEmail
  },
  {
    id: 'tipoAtividade',
    label: 'Tipo de Atividade',
    category: 'Identificação & Serviço',
    description: 'Instalação, Manutenção, Suporte, etc.',
    defaultSelected: true,
    wch: 18,
    getValue: (s) => s.tipoAtividade || 'INSTALAÇÃO'
  },
  {
    id: 'tipoServico',
    label: 'Tipo de Serviço',
    category: 'Identificação & Serviço',
    description: 'Instalação, Reparo, Mudança de Endereço...',
    defaultSelected: true,
    wch: 22,
    getValue: (s) => s.tipoServico || ''
  },
  {
    id: 'operadora',
    label: 'Operadora',
    category: 'Identificação & Serviço',
    description: 'TIM, NIO, ALGAR, LIGA, etc.',
    defaultSelected: true,
    wch: 14,
    getValue: (s) => s.operadora || ''
  },
  {
    id: 'valor',
    label: 'Valor (R$)',
    category: 'Identificação & Serviço',
    description: 'Valor calculado da remuneração',
    defaultSelected: true,
    wch: 12,
    getValue: (s) => getValorServico(s)
  },

  // Categoria: Cliente & OS
  {
    id: 'numeroSA',
    label: 'Nº SA',
    category: 'Cliente & OS',
    description: 'Número da Solicitação ou Ordem de Serviço',
    defaultSelected: true,
    wch: 16,
    getValue: (s) => s.dadosVisita?.numeroSA || ''
  },
  {
    id: 'acessoGpon',
    label: 'Acesso GPON',
    category: 'Cliente & OS',
    description: 'Código de acesso ou identificador GPON',
    defaultSelected: true,
    wch: 16,
    getValue: (s) => s.dadosVisita?.acessoGpon || ''
  },
  {
    id: 'quemAtendeu',
    label: 'Quem Atendeu',
    category: 'Cliente & OS',
    description: 'Nome da pessoa que atendeu o técnico',
    defaultSelected: true,
    wch: 20,
    getValue: (s) => s.dadosVisita?.quemAtendeu || ''
  },
  {
    id: 'contatoCliente',
    label: 'Contato Cliente',
    category: 'Cliente & OS',
    description: 'Telefone ou WhatsApp de contato',
    defaultSelected: true,
    wch: 18,
    getValue: (s) => s.dadosVisita?.contatoCliente || ''
  },

  // Categoria: Endereço & Localização
  {
    id: 'endereco',
    label: 'Endereço',
    category: 'Endereço & Localização',
    description: 'Rua, Avenida ou Logradouro',
    defaultSelected: true,
    wch: 30,
    getValue: (s) => s.localizacao?.endereco || ''
  },
  {
    id: 'numero',
    label: 'Número',
    category: 'Endereço & Localização',
    description: 'Número do imóvel / residência',
    defaultSelected: true,
    wch: 10,
    getValue: (s) => s.localizacao?.numero || ''
  },
  {
    id: 'bairro',
    label: 'Bairro',
    category: 'Endereço & Localização',
    description: 'Bairro da instalação',
    defaultSelected: true,
    wch: 18,
    getValue: (s) => s.localizacao?.bairro || ''
  },
  {
    id: 'cidade',
    label: 'Cidade',
    category: 'Endereço & Localização',
    description: 'Cidade da instalação',
    defaultSelected: true,
    wch: 18,
    getValue: (s) => s.localizacao?.cidade || ''
  },
  {
    id: 'estado',
    label: 'Estado',
    category: 'Endereço & Localização',
    description: 'UF do estado',
    defaultSelected: true,
    wch: 8,
    getValue: (s) => s.localizacao?.estado || ''
  },

  // Categoria: Fibra & Metragens
  {
    id: 'metrosUtilizados',
    label: 'Metros Utilizados (m)',
    category: 'Fibra & Metragens',
    description: 'Metragem gasta (Final - Inicial)',
    defaultSelected: true,
    wch: 20,
    getValue: (s) => {
      const m = calcularMetragemUtilizada(s.dadosVisita);
      return m !== null ? m : '';
    }
  },
  {
    id: 'metragemRolo',
    label: 'Metragem Rolo (m)',
    category: 'Fibra & Metragens',
    description: 'Tamanho total do rolo / bobina',
    defaultSelected: false,
    wch: 18,
    getValue: (s) => s.dadosVisita?.metragemRolo ?? ''
  },
  {
    id: 'metragemInicial',
    label: 'Metragem Inicial (m)',
    category: 'Fibra & Metragens',
    description: 'Marcação inicial no cabo',
    defaultSelected: false,
    wch: 18,
    getValue: (s) => s.dadosVisita?.metragemInicial ?? ''
  },
  {
    id: 'metragemFinal',
    label: 'Metragem Final (m)',
    category: 'Fibra & Metragens',
    description: 'Marcação final no cabo',
    defaultSelected: false,
    wch: 18,
    getValue: (s) => s.dadosVisita?.metragemFinal ?? ''
  },

  // Categoria: Equipamentos & Números de Série
  {
    id: 'snOnt',
    label: 'S/N ONT',
    category: 'Equipamentos & Números de Série',
    description: 'Número de série da ONT instalada',
    defaultSelected: true,
    wch: 18,
    getValue: (s) => s.dadosVisita?.snOnt || ''
  },
  {
    id: 'snMesh',
    label: 'S/N Mesh',
    category: 'Equipamentos & Números de Série',
    description: 'Número de série do roteador Mesh',
    defaultSelected: false,
    wch: 18,
    getValue: (s) => s.dadosVisita?.snMesh || ''
  },
  {
    id: 'snDrop',
    label: 'S/N Drop',
    category: 'Equipamentos & Números de Série',
    description: 'Serial ou identificador do drop',
    defaultSelected: false,
    wch: 18,
    getValue: (s) => s.dadosVisita?.snDrop || ''
  },

  // Categoria: Caixa & Rede Externa
  {
    id: 'tipoCdoe',
    label: 'Tipo de Caixa',
    category: 'Caixa & Rede Externa',
    description: 'Tipo da caixa (CDOE ou CDOI)',
    defaultSelected: true,
    wch: 14,
    getValue: (s) => s.dadosVisita?.tipoCdoe || 'CDOE'
  },
  {
    id: 'numCdoe',
    label: 'Nº Caixa',
    category: 'Caixa & Rede Externa',
    description: 'Número de identificação da caixa',
    defaultSelected: true,
    wch: 10,
    getValue: (s) => s.dadosVisita?.numCdoe ?? ''
  },
  {
    id: 'portaUtilizada',
    label: 'Porta Utilizada',
    category: 'Caixa & Rede Externa',
    description: 'Porta utilizada no splitter da caixa',
    defaultSelected: true,
    wch: 14,
    getValue: (s) => s.dadosVisita?.portaUtilizada ?? ''
  },

  // Categoria: Materiais Utilizados
  {
    id: 'qtdConector',
    label: 'Qtd Conector',
    category: 'Materiais Utilizados',
    description: 'Quantidade de conectores montados',
    defaultSelected: false,
    wch: 13,
    getValue: (s) => s.dadosVisita?.qtdConector ?? ''
  },
  {
    id: 'qtdEsticador',
    label: 'Qtd Esticador',
    category: 'Materiais Utilizados',
    description: 'Quantidade de esticadores/alças',
    defaultSelected: false,
    wch: 13,
    getValue: (s) => s.dadosVisita?.qtdEsticador ?? ''
  },
  {
    id: 'plaqueta',
    label: 'Plaqueta',
    category: 'Materiais Utilizados',
    description: 'Plaqueta de identificação utilizada',
    defaultSelected: false,
    wch: 10,
    getValue: (s) => s.dadosVisita?.plaqueta ?? ''
  },
  {
    id: 'kitFixaFio',
    label: 'Kit Fixa Fio',
    category: 'Materiais Utilizados',
    description: 'Fixa fio / grampos utilizados',
    defaultSelected: false,
    wch: 13,
    getValue: (s) => s.dadosVisita?.kitFixaFio ?? ''
  },

  // Categoria: Observações & Mídia
  {
    id: 'observacoes',
    label: 'Observações',
    category: 'Observações & Mídia',
    description: 'Anotações gerais do serviço',
    defaultSelected: true,
    wch: 28,
    getValue: (s) => s.observacoes || ''
  },
  {
    id: 'qtdFotos',
    label: 'Qtd Fotos',
    category: 'Observações & Mídia',
    description: 'Quantidade de fotos anexadas',
    defaultSelected: false,
    wch: 10,
    getValue: (s) => (s.fotos ? s.fotos.length : 0)
  }
];

export const gerarExcelData = (
  servicos: ServicoItem[],
  userEmail: string,
  colunasSelecionadasIds?: string[]
): ExportData => {
  // Determinar quais colunas usar
  let colunasAtivas: ExcelColumnOption[] = [];
  if (colunasSelecionadasIds && colunasSelecionadasIds.length > 0) {
    colunasAtivas = EXCEL_COLUMNS.filter((col) => colunasSelecionadasIds.includes(col.id));
  }
  // Se não foi passada seleção ou nenhuma bateu, usa todas as colunas
  if (colunasAtivas.length === 0) {
    colunasAtivas = EXCEL_COLUMNS;
  }

  const rows = servicos.map((s, idx) => {
    const rowObj: Record<string, any> = {};
    for (const col of colunasAtivas) {
      rowObj[col.label] = col.getValue(s, idx, userEmail);
    }
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicos');

  // Ajustar larguras das colunas ativas
  const wscols = colunasAtivas.map((c) => ({ wch: c.wch }));
  worksheet['!cols'] = wscols;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `servicos_executados_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const file = new File([excelBlob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const blobUrl = URL.createObjectURL(excelBlob);

  return {
    file,
    blobUrl,
    fileName,
    fileType: 'excel',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
};

