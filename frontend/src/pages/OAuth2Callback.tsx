import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function OAuth2Callback() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const username     = params.get('username');
    const email        = params.get('email');

    if (accessToken && refreshToken && userId && username && email) {
      login({ userId, username, email }, accessToken, refreshToken);
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex items-center gap-3 text-white/60">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Signing you in...</span>
      </div>
    </div>
  );
}
