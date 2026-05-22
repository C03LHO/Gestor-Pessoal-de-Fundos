import "@/styles/globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AutoSync } from "@/components/mercado/AutoSync";
import { BuscaGlobal } from "@/components/ux/BuscaGlobal";
import { AnonimizarToggle } from "@/components/ux/AnonimizarToggle";
import { PullToRefresh } from "@/components/ux/PullToRefresh";
import { RegistrarSW } from "@/components/ux/RegistrarSW";
import { ToastProvider } from "@/components/ux/Toast";
import { CarteiraSwitcher } from "@/components/layout/CarteiraSwitcher";
import { validarSessao } from "@/lib/auth-guard";
import { getCarteiraAtiva, listarCarteiras } from "@/lib/carteira";

export const metadata = {
  title: "Fundos — Gestão de FIIs",
  description: "Acompanhe sua carteira de FIIs e a trajetória até sua meta de renda passiva.",
  manifest: "/manifest.webmanifest",
  applicationName: "Fundos",
  appleWebApp: {
    capable: true, title: "Fundos",
    statusBarStyle: "black-translucent" as const,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await validarSessao();
  const { id: ativaId, tipo } = await getCarteiraAtiva();
  const carteiras = await listarCarteiras();

  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <ToastProvider>
        <RegistrarSW />
        <PullToRefresh />
        <div className="flex">
          <Sidebar tipo={tipo} />
          <main
            className="flex-1 p-4 md:p-10 pb-28 md:pb-10 max-w-7xl mx-auto w-full"
            style={{
              paddingTop: "max(1rem, env(safe-area-inset-top))",
              paddingBottom: "max(6rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
            }}
          >
            {/* mobile fix: flex-wrap evita overflow horizontal em 375px */}
            <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
              <CarteiraSwitcher ativaId={ativaId} carteiras={carteiras} />
              <div className="flex gap-2 flex-shrink-0">
                <BuscaGlobal />
                <AnonimizarToggle />
                <AutoSync />
              </div>
            </div>
            {children}
          </main>
        </div>
        <BottomNav tipo={tipo} />
        </ToastProvider>
      </body>
    </html>
  );
}
