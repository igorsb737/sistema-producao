import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredPermissions?: {
    route: string;
    action?: string;
  };
}

export function PrivateRoute({ children, requiredPermissions }: PrivateRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermissions) {
    const { route, action = 'view' } = requiredPermissions;

    // Admin tem acesso a tudo
    if (user.role === 'admin') {
      return <>{children}</>;
    }

    // Verifica permissões específicas para colaboradores
    const hasPermission = user.permissions?.[route as keyof typeof user.permissions];
    
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }

    if (typeof hasPermission === 'object' && !hasPermission[action as keyof typeof hasPermission]) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
