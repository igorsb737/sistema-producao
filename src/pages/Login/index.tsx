import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CircularProgress } from '@mui/material';

const schema = yup.object({
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
});

type FormInputs = {
  email: string;
  password: string;
};

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data: FormInputs) => {
    setIsLoading(true);
    setError('');

    try {
      await signIn(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Email ou senha inválidos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">SP</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Produção</h2>
          <p className="text-sm text-gray-600 mt-1">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {errors.email.message}
              </motion.p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
            {errors.password && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {errors.password.message}
              </motion.p>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-2 text-sm text-red-600 bg-red-50 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
          >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Entrar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
