import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import OrdemProducao from '../pages/OrdemProducao';
import NovaOrdem from '../pages/OrdemProducao/NovaOrdem';
import Configuracoes from '../pages/Configuracoes';
import Produtos from '../pages/Produtos';

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
        path: 'configuracoes',
        element: <Configuracoes />,
      },
      {
        path: 'produtos',
        element: <Produtos />,
      },
    ],
  },
]);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;
