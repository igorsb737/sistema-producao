import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import { Login } from '../pages/Login';
import { Unauthorized } from '../pages/Unauthorized';
import { PrivateRoute } from '../components/PrivateRoute';
import OrdemProducao from '../pages/OrdemProducao';
import NovaOrdem from '../pages/OrdemProducao/NovaOrdem';
import VisualizarOrdem from '../pages/OrdemProducao/VisualizarOrdem';
import RecebimentoMercadoria from '../pages/OrdemProducao/RecebimentoMercadoria';
import RecebimentoMercadoriaDetalhes from '../pages/OrdemProducao/RecebimentoMercadoriaDetalhes';
import PagamentoOrdens from '../pages/OrdemProducao/PagamentoOrdens';
import PagamentoDetalhes from '../pages/OrdemProducao/PagamentoDetalhes';
import ConciliacaoPagamentos from '../pages/OrdemProducao/ConciliacaoPagamentos';
import ConciliacaoDetalhes from '../pages/OrdemProducao/ConciliacaoDetalhes';
import RelatorioConciliacoes from '../pages/OrdemProducao/RelatorioConciliacoes';
import { LancamentoMalha } from '../pages/OrdemProducao/LancamentoMalha';
import Configuracoes from '../pages/Configuracoes';
import Registros from '../pages/Registros';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <PrivateRoute requiredPermissions={{ route: 'dashboard' }}>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens',
        element: (
          <PrivateRoute requiredPermissions={{ route: 'ordemProducao' }}>
            <OrdemProducao />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/nova',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'ordemProducao', action: 'create' }}
          >
            <NovaOrdem />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/editar/:id',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'ordemProducao', action: 'create' }}
          >
            <NovaOrdem />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/:id',
        element: (
          <PrivateRoute requiredPermissions={{ route: 'ordemProducao' }}>
            <VisualizarOrdem />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/recebimento',
        element: (
          <PrivateRoute requiredPermissions={{ route: 'recebimentos' }}>
            <RecebimentoMercadoria />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/recebimento/detalhes',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'recebimentos', action: 'create' }}
          >
            <RecebimentoMercadoriaDetalhes />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/pagamento',
        element: (
          <PrivateRoute requiredPermissions={{ route: 'pagamentos' }}>
            <PagamentoOrdens />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/pagamento/detalhes',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'pagamentos', action: 'create' }}
          >
            <PagamentoDetalhes />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/pagamento/conciliacao',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'pagamentos', action: 'conciliar' }}
          >
            <ConciliacaoPagamentos />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/pagamento/conciliacao/detalhes',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'pagamentos', action: 'conciliar' }}
          >
            <ConciliacaoDetalhes />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/pagamento/relatorio-conciliacoes',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'pagamentos', action: 'conciliar' }}
          >
            <RelatorioConciliacoes />
          </PrivateRoute>
        ),
      },
      {
        path: 'ordens/lancamento-malha',
        element: (
          <PrivateRoute
            requiredPermissions={{ route: 'lancamentoMalha', action: 'create' }}
          >
            <LancamentoMalha />
          </PrivateRoute>
        ),
      },
      {
        path: 'configuracoes',
        element: (
          <PrivateRoute>
            <Configuracoes />
          </PrivateRoute>
        ),
      },
      {
        path: 'registros',
        element: (
          <PrivateRoute requiredPermissions={{ route: 'registros' }}>
            <Registros />
          </PrivateRoute>
        ),
      },
    ],
  },
]);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;
