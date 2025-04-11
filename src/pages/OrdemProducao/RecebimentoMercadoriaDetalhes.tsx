import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrdemProducao } from '../../hooks/useOrdemProducao';
import { useBling } from '../../hooks/useBling';
import { getSizeWeight } from '../../utils/sorting';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ptBR from 'date-fns/locale/pt-BR';
import { format } from 'date-fns';

interface RecebimentoItem {
  ordemNumero: string;
  gradeId: string;
  nome: string;
  quantidadePrevista: number;
  quantidadeRecebida: number;
  quantidadeTotalRecebida: number;
  dataRecebimento: Date;
}

function RecebimentoMercadoriaDetalhes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ordens, loading, error, registrarRecebimento } = useOrdemProducao();
  const { registrarEntradaEstoque } = useBling();
  const [itensRecebimento, setItensRecebimento] = useState<RecebimentoItem[]>([]);
  const [dataRecebimentoGlobal, setDataRecebimentoGlobal] = useState<Date>(new Date());
  const [enviandoParaBling, setEnviandoParaBling] = useState(false);
  const [errosBling, setErrosBling] = useState<string[]>([]);

  useEffect(() => {
    const ordensParam = searchParams.get('ordens');
    if (!ordensParam) {
      navigate('/ordens/recebimento');
      return;
    }

    const numerosOrdens = ordensParam.split(',');
    const ordensRecebimento = ordens.filter((ordem) =>
      numerosOrdens.includes(ordem.informacoesGerais.numero)
    );

    // Agrupa os itens por ordem
    const itensPorOrdem: { [key: string]: RecebimentoItem[] } = {};
    
    ordensRecebimento.forEach((ordem) => {
      const numeroOrdem = ordem.informacoesGerais.numero;
      itensPorOrdem[numeroOrdem] = [];
      
      Object.entries(ordem.grades).forEach(([gradeId, grade]) => {
        const totalRecebido = (grade.recebimentos || []).reduce(
          (total, rec) => total + rec.quantidade,
          0
        );

        itensPorOrdem[numeroOrdem].push({
          ordemNumero: numeroOrdem,
          gradeId,
          nome: grade.nome,
          quantidadePrevista: grade.quantidadePrevista,
          quantidadeRecebida: 0,
          quantidadeTotalRecebida: totalRecebido,
          dataRecebimento: dataRecebimentoGlobal,
        });
      });

      // Ordena os itens desta ordem por tamanho
      itensPorOrdem[numeroOrdem].sort((a, b) => {
        const aWeight = getSizeWeight(a.nome);
        const bWeight = getSizeWeight(b.nome);
        return aWeight.weight - bWeight.weight;
      });
    });

    // Concatena todos os itens ordenados
    const itensOrdenados = Object.values(itensPorOrdem).flat();
    setItensRecebimento(itensOrdenados);
  }, [ordens, searchParams, navigate]);

  const handleQuantidadeChange = (index: number, value: string) => {
    const quantidade = parseInt(value) || 0;
    setItensRecebimento((prev) => {
      const newItens = [...prev];
      newItens[index] = {
        ...newItens[index],
        quantidadeRecebida: quantidade,
      };
      return newItens;
    });
  };

  const handleDataChange = (data: Date | null) => {
    if (!data) return;
    setDataRecebimentoGlobal(data);
    setItensRecebimento((prev) =>
      prev.map((item) => ({
        ...item,
        dataRecebimento: data,
      }))
    );
  };

  const handleEntrarMercadoria = async () => {
    try {
      setEnviandoParaBling(true);
      setErrosBling([]);
      
      // Filtra apenas itens com quantidade recebida maior que 0
      const itensParaReceber = itensRecebimento.filter(
        (item) => item.quantidadeRecebida > 0
      );

      if (itensParaReceber.length === 0) {
        alert('Nenhuma quantidade informada para recebimento');
        setEnviandoParaBling(false);
        return;
      }

      // Encontra a ordem correspondente para cada item
      for (const item of itensParaReceber) {
        const ordem = ordens.find(
          (o) => o.informacoesGerais.numero === item.ordemNumero
        );

        if (!ordem) continue;

        // Formata a data no padrão dd-MM-yyyy
        const dataFormatada = format(item.dataRecebimento, 'dd-MM-yyyy');

        // Prepara observações para o Bling
        const observacoes = `UP ${item.ordemNumero} - Qtd: ${item.quantidadeRecebida} - Data: ${dataFormatada}`;
        
        try {
          // Primeiro, registra entrada no estoque do Bling
          await registrarEntradaEstoque(
            item.nome,
            item.quantidadeRecebida,
            observacoes
          );
          
          // Somente após sucesso no Bling, registra o recebimento no sistema interno
          await registrarRecebimento(ordem.id, item.gradeId, {
            quantidade: item.quantidadeRecebida,
            data: dataFormatada,
          });
        } catch (err) {
          // Captura erros específicos do Bling
          const mensagemErro = err instanceof Error 
            ? `Erro ao enviar ${item.nome} para o Bling: ${err.message}`
            : `Erro ao enviar ${item.nome} para o Bling`;
          
          setErrosBling(prev => [...prev, mensagemErro]);
          console.error(mensagemErro, err);
        }
      }

      if (errosBling.length > 0) {
        // Se houve erros no Bling, mas o recebimento interno foi registrado
        alert(`Recebimento registrado com sucesso, mas houve erros ao enviar para o Bling. Verifique o console para mais detalhes.`);
      } else {
        alert('Recebimento registrado com sucesso e enviado para o Bling!');
      }
      
      navigate('/ordens/recebimento');
    } catch (err) {
      console.error('Erro ao registrar recebimento:', err);
      alert('Erro ao registrar recebimento. Tente novamente.');
    } finally {
      setEnviandoParaBling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, mt: 2 }}>
        <Typography variant="h5">Detalhes do Recebimento</Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/ordens/recebimento')}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={handleEntrarMercadoria}
            disabled={itensRecebimento.every((item) => item.quantidadeRecebida === 0) || enviandoParaBling}
          >
            {enviandoParaBling ? 'Processando...' : 'Entrar Mercadoria'}
          </Button>
        </Box>
      </Box>

      {errosBling.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#ffebee' }}>
          <Typography variant="subtitle1" color="error" gutterBottom>
            Erros ao enviar para o Bling:
          </Typography>
          <ul>
            {errosBling.map((erro, index) => (
              <li key={index}>
                <Typography variant="body2" color="error">
                  {erro}
                </Typography>
              </li>
            ))}
          </ul>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
          <DatePicker
            label="Data de Recebimento"
            value={dataRecebimentoGlobal}
            onChange={handleDataChange}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                variant: 'outlined',
              },
            }}
          />
        </LocalizationProvider>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ordem</TableCell>
              <TableCell>Item/Grade</TableCell>
              <TableCell align="right">Quantidade Prevista</TableCell>
              <TableCell align="right">Total Recebido</TableCell>
              <TableCell align="right">Quantidade a Receber</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itensRecebimento.reduce((acc: React.ReactNode[], item, index, array) => {
              // Verifica se é o primeiro item ou se a ordem mudou
              const isNewOrder = index === 0 || array[index - 1].ordemNumero !== item.ordemNumero;
              // Adiciona espaçamento entre ordens diferentes
              if (isNewOrder && index !== 0) {
                acc.push(
                  <TableRow key={`spacer-${item.ordemNumero}`}>
                    <TableCell 
                      colSpan={5} 
                      sx={{ 
                        padding: '16px 0',
                        border: 'none',
                        backgroundColor: '#424242'
                      }} 
                    />
                  </TableRow>
                );
              }

              acc.push(
                <TableRow 
                  key={`${item.ordemNumero}-${item.gradeId}`}
                  sx={{ 
                    '&:hover': {
                      backgroundColor: '#e3f2fd'
                    }
                  }}
                >
                  <TableCell>{item.ordemNumero}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell align="right">{item.quantidadePrevista}</TableCell>
                  <TableCell align="right">{item.quantidadeTotalRecebida}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantidadeRecebida || ''}
                      onChange={(e) => handleQuantidadeChange(index, e.target.value)}
                      inputProps={{
                        min: 0,
                        max: item.quantidadePrevista - item.quantidadeTotalRecebida,
                      }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                </TableRow>
              );

              return acc;
            }, [])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default RecebimentoMercadoriaDetalhes;
