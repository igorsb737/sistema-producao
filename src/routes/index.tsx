import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import OrdemProducao from '../pages/OrdemProducao';
import NovaOrdem from '../pages/OrdemProducao/NovaOrdem';
import VisualizarOrdem from '../pages/OrdemProducao/VisualizarOrdem';
import RecebimentoMercadoria from '../pages/OrdemProducao/RecebimentoMercadoria';
import RecebimentoMercadoriaDetalhes from '../pages/OrdemProducao/RecebimentoMercadoriaDetalhes';
import PagamentoOrdens from '../pages/OrdemProducao/PagamentoOrdens';
import PagamentoDetalhes from '../pages/OrdemProducao/PagamentoDetalhes';
import ConciliacaoPagamentos from '../pages/OrdemProducao/ConciliacaoPagamentos';
import Configuracoes from '../pages/Configuracoes';
import Registros from '../pages/Registros';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'ordens',
        element: <OrdemProducao />,
      },
      {
        path: 'ordens/nova',
        element: <NovaOrdem />,
      },
      {
        path: 'ordens/editar/:id',
        element: <NovaOrdem />,
      },
      {
        path: 'ordens/:id',
        element: <VisualizarOrdem />,
      },
      {
        path: 'ordens/recebimento',
        element: <RecebimentoMercadoria />,
      },
      {
        path: 'ordens/recebimento/detalhes',
        element: <RecebimentoMercadoriaDetalhes />,
      },
      {
        path: 'ordens/pagamento',
        element: <PagamentoOrdens />,
      },
      {
        path: 'ordens/pagamento/detalhes',
        element: <PagamentoDetalhes />,
      },
      {
        path: 'ordens/pagamento/conciliacao',
        element: <ConciliacaoPagamentos />,
      },
      {
        path: 'configuracoes',
        element: <Configuracoes />,
      },
      {
        path: 'registros',
        element: <Registros />,
      },
    ],
  },
]);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;
