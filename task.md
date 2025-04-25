# Plano de Implementação dos Dashboards

Este documento serve como um guia de implementação e acompanhamento para os dashboards do sistema de produção. Cada dashboard será implementado incrementalmente, com tarefas específicas que podem ser marcadas como concluídas à medida que avançamos.

## Dashboard 1: Visão Geral da Produção

### Tarefas
- [ ] Implementar componente de cartões para KPIs principais
  - [ ] Total de ordens ativas vs. finalizadas
  - [ ] Total de camisetas em produção
  - [ ] Média de tempo de produção
  - [ ] Taxa de cumprimento de prazos
- [ ] Implementar gráfico de tendência de volume de produção mensal
- [ ] Implementar gráfico de tempo médio de ciclo de produção
- [ ] Adicionar filtros por período
- [ ] Otimizar consultas ao Firebase para melhorar performance

## Dashboard 2: Eficiência de Produção

### Tarefas
- [X] Implementar componente para exibição de rendimento de materiais
  - [X] Rendimento médio de malha (camisetas/kg)
  - [X] Comparativo entre tipos de malha
- [X] Implementar gráfico de variação de rendimento ao longo do tempo
- [X] Implementar análise de desperdício
  - [X] Relação malha utilizada vs. camisetas produzidas
- [X] Adicionar filtros por tipo de malha e período
- [X] Implementar alertas para rendimentos abaixo do esperado
- [X] Melhorias adicionais solicitadas
  - [X] Análise de rendimento por item (não apenas por tipo de malha)
  - [X] Filtro inteligente por item com suporte a pesquisa combinada (ex: "Adulto & preto")
  - [X] Opção para selecionar item específico através de lista dropdown
  - [X] Filtros de data (data de criação do lote e data de lançamento da malha)

## Dashboard 3: Conciliação Financeira

### Tarefas
- [ ] Implementar componente de análise de pagamentos
  - [ ] Total de pagamentos por período
  - [ ] Valor médio por camiseta
  - [ ] Comparativo pagamentos vs. conciliações
- [ ] Implementar gráfico de tempo entre produção e conciliação
- [ ] Implementar análise de rentabilidade por ordem
  - [ ] Custo de material vs. valor recebido
  - [ ] Margem por tipo de produto
- [ ] Adicionar filtros por cliente e tipo de serviço
- [ ] Implementar exportação de relatórios em CSV/Excel

## Dashboard 4: Fluxo de Produção

### Tarefas
- [ ] Implementar visualização de funil de produção
  - [ ] Número de ordens em cada estágio
  - [ ] Tempo médio em cada estágio
- [ ] Implementar identificação de gargalos no processo
- [ ] Criar mapa de calor de atividade
  - [ ] Dias/períodos com maior volume de recebimentos
  - [ ] Dias/períodos com maior volume de lançamentos
- [ ] Adicionar filtros por período e tipo de produto
- [ ] Implementar alertas para ordens paradas há muito tempo em um estágio

## Dashboard 5: Qualidade e Desempenho

### Tarefas
- [ ] Implementar análise de fornecedores
  - [ ] Desempenho de entrega por fornecedor
  - [ ] Qualidade por fornecedor
- [ ] Implementar métricas de conformidade de produção
  - [ ] % de ordens com recebimentos completos
  - [ ] % de ordens com conciliações completas
- [ ] Adicionar filtros por fornecedor e período
- [ ] Implementar sistema de classificação de fornecedores

## Tarefas Gerais de Infraestrutura

### Tarefas
- [X] Decisão de implementação: Começar pelo Dashboard 2 (Eficiência de Produção)
- [X] Criar estrutura de abas superiores para navegação entre os dashboards
- [X] Criar estrutura de componentes reutilizáveis para os dashboards
- [ ] Implementar sistema de filtros globais
- [ ] Otimizar consultas ao Firebase para dashboards
- [ ] Implementar caching de dados para melhorar performance
- [ ] Criar testes automatizados para os componentes de dashboard
- [ ] Documentar a API de dados para os dashboards

## Notas de Implementação

### Prioridades
1. Dashboard de Visão Geral da Produção (prioridade alta)
2. Dashboard de Fluxo de Produção (prioridade alta)
3. Dashboard de Conciliação Financeira (prioridade média)
4. Dashboard de Eficiência de Produção (prioridade média)
5. Dashboard de Qualidade e Desempenho (prioridade baixa)

### Abordagem
- Implementar um dashboard por vez, começando pelos componentes mais simples
- Focar em soluções simples e evitar duplicação de código
- Garantir que o código funcione em todos os ambientes (desenvolvimento, teste, produção)
- Manter os arquivos organizados e com menos de 300 linhas
- Implementar testes para cada componente

### Log de Progresso
| Data | Dashboard | Tarefa | Status | Observações |
|------|-----------|--------|--------|-------------|
| 24/04/2025 | Eficiência de Produção | Implementar componente para exibição de rendimento de materiais | Concluído | Implementado rendimento médio, comparativo por tipo de malha e relação malha/camisetas |
| 24/04/2025 | Geral | Criar estrutura de abas para navegação | Concluído | Implementada estrutura com 5 abas para todos os dashboards |
| 24/04/2025 | Eficiência de Produção | Implementar gráfico de variação de rendimento | Concluído | Adicionado gráfico de linha com filtro por tipo de malha |
| 24/04/2025 | Eficiência de Produção | Adicionar filtros por tipo de malha | Concluído | Implementado filtro de tipo de malha para o gráfico de rendimento |
| 24/04/2025 | Eficiência de Produção | Implementar alertas para rendimentos abaixo do esperado | Concluído | Adicionados alertas para tipos de malha com rendimento abaixo de 80% da meta |
| 24/04/2025 | Eficiência de Produção | Análise de rendimento por item | Concluído | Adicionado gráfico de barras para visualização de rendimento por item |
| 24/04/2025 | Eficiência de Produção | Filtro inteligente por item | Concluído | Implementado filtro com suporte a pesquisa combinada usando o operador & |
| 24/04/2025 | Eficiência de Produção | Filtros de data | Concluído | Adicionados filtros por data de criação e data de lançamento da malha |
| 24/04/2025 | Eficiência de Produção | Adicionar filtro por lista de itens | Concluído | Implementada opção para alternar entre filtro por texto e seleção direta de item específico |
