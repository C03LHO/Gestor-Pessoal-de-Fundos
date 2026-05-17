import { LoginPasskey } from "./LoginPasskey";

type Search = { erro?: string; expired?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const erro = sp?.erro;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="card max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold tracking-tight">Fundos</div>
          <p className="text-xs text-zinc-500 mt-1">Acesso restrito</p>
        </div>

        <form method="POST" action="/api/auth/login" className="space-y-3">
          {/* iOS Safari precisa de username + password para oferecer salvar no Keychain */}
          <input
            type="text"
            name="username"
            defaultValue="fundos"
            autoComplete="username"
            readOnly
            hidden
            aria-hidden
          />
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              autoFocus
              className="input"
            />
          </div>

          {erro === "1" && (
            <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
              Senha incorreta.
            </div>
          )}
          {erro === "bloqueado" && (
            <div className="text-sm text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
              Muitas tentativas. Tente novamente em 1 minuto.
            </div>
          )}
          {erro === "expired" && (
            <div className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              Sua sessão expirou. Faça login novamente.
            </div>
          )}

          <button type="submit" className="btn w-full justify-center">
            Entrar com senha
          </button>
        </form>

        <div className="my-4 flex items-center gap-2 text-[10px] text-zinc-600">
          <div className="flex-1 border-t border-zinc-800" />
          <span>ou</span>
          <div className="flex-1 border-t border-zinc-800" />
        </div>

        <LoginPasskey />

        <p className="text-[10px] text-zinc-500 mt-6 text-center">
          Sem passkey configurado? Entre com senha e adicione em Configurações.
        </p>
      </div>
    </div>
  );
}
