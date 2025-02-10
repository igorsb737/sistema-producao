import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import OrdemProducao from '../pages/OrdemProducao';
import NovaOrdem from '../pages/OrdemProducao/NovaOrdem';
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
