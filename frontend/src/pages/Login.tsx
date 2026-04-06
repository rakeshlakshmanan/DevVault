import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, Bookmark, Sparkles, FolderOpen } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

const BLOBS = [
  { color: 'bg-purple-600/30', size: 'w-96 h-96', x: '-top-20 -left-20', delay: 0 },
  { color: 'bg-cyan-500/20', size: 'w-80 h-80', x: 'top-1/3 -right-20', delay: 1.5 },
  { color: 'bg-violet-500/20', size: 'w-64 h-64', x: 'bottom-10 left-1/4', delay: 3 },
  { color: 'bg-indigo-500/20', size: 'w-72 h-72', x: '-bottom-10 right-1/3', delay: 2 },
];

const FEATURES = [
  { icon: Bookmark, label: 'Save anything', color: 'text-purple-400' },
  { icon: Sparkles, label: 'AI summaries', color: 'text-cyan-400' },
  { icon: FolderOpen, label: 'Collections', color: 'text-violet-400' },
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 10 + 8,
  delay: Math.random() * 5,
}));

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setEmail('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.register(email, username, password);
      login(
        { userId: res.userId, username: res.username, email: res.email },
        res.accessToken,
        res.refreshToken
      );
      navigate('/');
    } catch {
      setError('Incorrect email or password');
      setEmail('');
      setPassword('');
      setUsername('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">

      {/* Animated gradient blobs */}
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute ${blob.size} ${blob.color} ${blob.x} rounded-full blur-3xl`}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, delay: blob.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-4 flex rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/30 border border-white/10">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-purple-900/80 via-indigo-900/80 to-cyan-900/60 p-10 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Brain size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">DevVault</span>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-white leading-tight">
                Your developer
                <br />
                <span className="bg-gradient-to-r from-purple-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                  knowledge vault.
                </span>
              </h2>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                Save, organize, and revisit everything that makes you a better developer.
              </p>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {FEATURES.map(({ icon: Icon, label, color }, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-sm text-white/70">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.p
            className="text-xs text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Built for developers, by developers.
          </motion.p>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 bg-[#0d0d14]/90 backdrop-blur-xl p-8 md:p-10 flex flex-col justify-center">

          {/* Mode tabs */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-8 gap-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
                  mode === m
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-900/40'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="yourhandle"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-shadow"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </motion.button>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
