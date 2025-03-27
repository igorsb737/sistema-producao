import { jsPDF } from 'jspdf';
import { OrdemProducao } from '../hooks/useOrdemProducao';

export const generateOrdemPDF = (ordem: OrdemProducao) => {
  try {
    // Criar um novo documento PDF
    const doc = new jsPDF();
    
    // Configurações de estilo monocromático
    const blackColor = '#000000';
    const grayColor = '#666666';
    
    // Título do documento
    doc.setFontSize(16);
    doc.setTextColor(blackColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ordem de Produção #${ordem.informacoesGerais.numero}`, 105, 15, { align: 'center' });
    
    // Linha divisória
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.5);
    doc.line(14, 20, 196, 20);
    
    // Cabeçalho com borda
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.1);
    doc.rect(14, 25, 182, 45, 'S');
    
    // Melhor distribuição do espaço vertical no cabeçalho
    const headerStartY = 32;
    const headerLineSpacing = 9; // Reduzido para evitar que o texto saia do container
    
    // Informações gerais - coluna da esquerda
    doc.setFontSize(9);
    doc.setTextColor(blackColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 20, headerStartY);
    doc.text('Data de Início:', 20, headerStartY + headerLineSpacing);
    doc.text('Data de Entrega:', 20, headerStartY + headerLineSpacing * 2);
    doc.text('Total de Camisetas:', 20, headerStartY + headerLineSpacing * 3);
    
    // Valores - coluna da esquerda
    doc.setFont('helvetica', 'normal');
    doc.text(ordem.informacoesGerais.cliente, 60, headerStartY);
    doc.text(ordem.informacoesGerais.dataInicio, 60, headerStartY + headerLineSpacing);
    doc.text(ordem.informacoesGerais.dataEntrega, 60, headerStartY + headerLineSpacing * 2);
    doc.text(ordem.informacoesGerais.totalCamisetas.toString(), 60, headerStartY + headerLineSpacing * 3);
    
    // Informações do item - coluna da direita (movida mais para a esquerda)
    const rightColumnX = 95; // Movido mais para a esquerda
    const rightValueX = 125; // Movido mais para a esquerda
    
    doc.setFont('helvetica', 'bold');
    doc.text('Item:', rightColumnX, headerStartY);
    doc.text('Malha:', rightColumnX, headerStartY + headerLineSpacing);
    doc.text('Previsão Malha:', rightColumnX, headerStartY + headerLineSpacing * 2);
    doc.text('Ribana:', rightColumnX, headerStartY + headerLineSpacing * 3);
    doc.text('Previsão Ribana:', rightColumnX, headerStartY + headerLineSpacing * 4);
    
    // Valores - coluna da direita
    doc.setFont('helvetica', 'normal');
    
    // Função para quebrar texto em múltiplas linhas
    const wrapText = (text: string, maxWidth: number) => {
      return doc.splitTextToSize(text, maxWidth);
    };
    
    // Usar múltiplas linhas para textos longos com largura reduzida para evitar extrapolação
    // Reduzido a largura máxima para evitar que o texto saia do container
    const maxTextWidth = 60;
    const itemLines = wrapText(ordem.solicitacao.item.nome, maxTextWidth);
    const malhaLines = wrapText(ordem.solicitacao.malha.nome, maxTextWidth);
    const ribanaLines = wrapText(ordem.solicitacao.ribana.nome, maxTextWidth);
    
    // Ajustar tamanho da fonte para textos longos
    const fontSize = 8;
    doc.setFontSize(fontSize);
    
    doc.text(itemLines, rightValueX, headerStartY);
    doc.text(malhaLines, rightValueX, headerStartY + headerLineSpacing);
    doc.text(ordem.solicitacao.previsoes.malha.toString(), rightValueX, headerStartY + headerLineSpacing * 2);
    doc.text(ribanaLines, rightValueX, headerStartY + headerLineSpacing * 3);
    doc.text(ordem.solicitacao.previsoes.ribana.toString(), rightValueX, headerStartY + headerLineSpacing * 4);
    
    // Observações
    let yPos = 80;
    
    // Título da seção de observações com borda
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.5);
    doc.rect(14, yPos - 6, 182, 8, 'S');
    doc.setTextColor(blackColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', 105, yPos - 1, { align: 'center' });
    
    // Conteúdo das observações
    doc.setTextColor(blackColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Quebrar texto longo em múltiplas linhas
    const observacao = ordem.informacoesGerais.observacao || '-';
    const splitObservacao = doc.splitTextToSize(observacao, 180);
    
    // Retângulo para as observações
    const obsHeight = splitObservacao.length * 5 + 4;
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.1);
    doc.rect(14, yPos + 2, 182, obsHeight, 'S');
    
    doc.text(splitObservacao, 16, yPos + 8);
    
    // Atualizar posição Y após as observações
    yPos = yPos + obsHeight + 10;
    
    // Título da tabela de grades com borda
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.5);
    doc.rect(14, yPos - 6, 182, 8, 'S');
    doc.setTextColor(blackColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GRADES', 105, yPos - 1, { align: 'center' });
    
    // Preparar dados para a tabela
    const grades = Object.values(ordem.grades);
    
    // Calcular o tamanho da fonte com base na quantidade de itens
    let tableFontSize = 8; // Tamanho padrão
    let rowHeight = 12; // Altura maior para acomodar duas linhas
    
    if (grades.length > 30) {
      tableFontSize = 6;
      rowHeight = 10;
    } else if (grades.length > 20) {
      tableFontSize = 7;
      rowHeight = 11;
    }
    
    // Configurações da tabela
    const startX = 14;
    const tableWidth = 182;
    const col1Width = 100;
    const col2Width = 41;
    const col3Width = 41;
    
    // Desenhar cabeçalho da tabela
    yPos += 2;
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.1);
    doc.rect(startX, yPos, tableWidth, rowHeight, 'S');
    
    // Texto do cabeçalho
    doc.setTextColor(blackColor);
    doc.setFontSize(tableFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text('Item Grade', startX + 5, yPos + rowHeight / 2, { align: 'left', baseline: 'middle' });
    doc.text('Qtd. Prevista', startX + col1Width + col2Width / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' });
    doc.text('Qtd. Entregue', startX + col1Width + col2Width + col3Width / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' });
    
    // Linhas verticais do cabeçalho
    doc.setDrawColor(blackColor);
    doc.setLineWidth(0.1);
    doc.line(startX + col1Width, yPos, startX + col1Width, yPos + rowHeight);
    doc.line(startX + col1Width + col2Width, yPos, startX + col1Width + col2Width, yPos + rowHeight);
    
    // Desenhar linhas da tabela
    doc.setTextColor(blackColor);
    doc.setFont('helvetica', 'normal');
    
    // Calcular o número total de itens
    const itemCount = grades.length;
    
    grades.forEach((grade, index) => {
      yPos += rowHeight;
      
      // Bordas da linha
      doc.setDrawColor(blackColor);
      doc.setLineWidth(0.1);
      doc.rect(startX, yPos, tableWidth, rowHeight, 'S');
      
      // Linhas verticais
      doc.line(startX + col1Width, yPos, startX + col1Width, yPos + rowHeight);
      doc.line(startX + col1Width + col2Width, yPos, startX + col1Width + col2Width, yPos + rowHeight);
      
      // Quebrar nome da grade em múltiplas linhas se necessário
      const gradeLines = wrapText(grade.nome, col1Width - 10);
      
      // Ajustar tamanho da fonte para grades com texto longo
      doc.setFontSize(tableFontSize);
      
      // Texto da linha - alinhado à esquerda e centralizado verticalmente
      doc.text(gradeLines, startX + 5, yPos + rowHeight / 2, { 
        align: 'left', 
        baseline: 'middle' 
      });
      
      doc.text(grade.quantidadePrevista.toString(), startX + col1Width + col2Width / 2, yPos + rowHeight / 2, { 
        align: 'center', 
        baseline: 'middle' 
      });
    });
    
    // Adicionar rodapé
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    const currentDate = new Date().toLocaleDateString('pt-BR');
    doc.text(
      `Gerado em ${currentDate}`,
      14,
      doc.internal.pageSize.height - 10
    );
    
    // Adicionar informações de contato no rodapé
    doc.text(
      'Sistema de Ordem de Produção',
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    
    // Salvar o PDF com o nome da ordem
    doc.save(`ordem-producao-${ordem.informacoesGerais.numero}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar o PDF. Verifique o console para mais detalhes.');
  }
};
