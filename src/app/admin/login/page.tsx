import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-graphite-950 px-4 tech-grid">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-accent-500 font-display font-bold text-graphite-950">K</span>
          <div>
            <div className="font-display text-sm font-bold uppercase">Панель управления</div>
            <div className="text-xs text-graphite-500">Вход для сотрудников</div>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
