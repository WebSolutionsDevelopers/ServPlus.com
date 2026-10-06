import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ServicoItem } from '../types';
import { getValorServico } from './servicoUtils';

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
    const equipLinhas = [
      dv?.snOnt ? `ONT: ${dv.snOnt}` : null,
      dv?.snMesh ? `Mesh: ${dv.snMesh}` : null,
      dv?.snDrop ? `Drop: ${dv.snDrop}` : null,
      (dv?.metragemRolo || dv?.metragemInicial || dv?.metragemFinal)
        ? `Metragem: ${dv.metragemRolo ? dv.metragemRolo + 'm' : ''} (${dv.metragemInicial ?? ''} a ${dv.metragemFinal ?? ''})`
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

export const gerarExcelData = (
  servicos: ServicoItem[],
  userEmail: string
): ExportData => {
  const rows = servicos.map((s, idx) => ({
    '#': idx + 1,
    'Data': s.data ? new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR') : '',
    'Tipo de Atividade': s.tipoAtividade || 'INSTALAÇÃO',
    'Tipo de Serviço': s.tipoServico,
    'Operadora': s.operadora,
    'Valor (R$)': getValorServico(s),
    'Nº SA': s.dadosVisita?.numeroSA || '',
    'Acesso GPON': s.dadosVisita?.acessoGpon || '',
    'Quem Atendeu': s.dadosVisita?.quemAtendeu || '',
    'Contato Cliente': s.dadosVisita?.contatoCliente || '',
    'Endereço': s.localizacao?.endereco || '',
    'Número': s.localizacao?.numero || '',
    'Bairro': s.localizacao?.bairro || '',
    'Cidade': s.localizacao?.cidade || '',
    'Estado': s.localizacao?.estado || '',
    'Metragem Rolo': s.dadosVisita?.metragemRolo ?? '',
    'Metragem Inicial': s.dadosVisita?.metragemInicial ?? '',
    'Metragem Final': s.dadosVisita?.metragemFinal ?? '',
    'S/N ONT': s.dadosVisita?.snOnt || '',
    'S/N Mesh': s.dadosVisita?.snMesh || '',
    'S/N Drop': s.dadosVisita?.snDrop || '',
    'Qtd Conector': s.dadosVisita?.qtdConector ?? '',
    'Qtd Esticador': s.dadosVisita?.qtdEsticador ?? '',
    'Plaqueta': s.dadosVisita?.plaqueta ?? '',
    'Kit Fixa Fio': s.dadosVisita?.kitFixaFio ?? '',
    'Tipo de Caixa': s.dadosVisita?.tipoCdoe || 'CDOE',
    'Nº Caixa': s.dadosVisita?.numCdoe ?? '',
    'Porta Utilizada': s.dadosVisita?.portaUtilizada ?? '',
    'Observações': s.observacoes || '',
    'Qtd Fotos': s.fotos ? s.fotos.length : 0,
    'Técnico Email': s.userEmail || userEmail
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicos');

  // Ajustar larguras das colunas
  const wscols = [
    { wch: 5 },  // #
    { wch: 12 }, // Data
    { wch: 15 }, // Tipo Atividade
    { wch: 20 }, // Tipo Servico
    { wch: 12 }, // Operadora
    { wch: 12 }, // Valor
    { wch: 15 }, // SA
    { wch: 15 }, // GPON
    { wch: 20 }, // Atendeu
    { wch: 15 }, // Contato
    { wch: 30 }, // Endereço
    { wch: 10 }, // Numero
    { wch: 18 }, // Bairro
    { wch: 18 }, // Cidade
    { wch: 8 },  // Estado
  ];
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

