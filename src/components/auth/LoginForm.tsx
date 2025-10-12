import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Inloggad!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Kunde inte logga in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <Input
        type="email"
        label="E-post"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="din@email.com"
        required
        autoComplete="email"
      />

      <Input
        type="password"
        label="Lösenord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Loggar in...' : 'Logga in'}
      </Button>
    </form>
  );
}
