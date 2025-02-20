import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { CssBaseline } from '@mui/material';
import { theme } from './theme';
import Routes from './routes';
import 'dayjs/locale/pt-br';
import { AuthProvider } from './hooks/useAuth.tsx';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
          <CssBaseline />
          <Routes />
        </LocalizationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
