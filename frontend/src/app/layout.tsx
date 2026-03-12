import WalletContextProvider from "./WalletContextProvider";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export const metadata = {
  title: "Solareign",
  description: "A mobile-first blockchain tactical RPG on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200">
        <WalletContextProvider>
          <div className="flex flex-col min-h-screen">
            <header className="px-4 py-4 flex items-center justify-between bg-slate-900 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Solareign
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-500">
                  ALPHA
                </span>
              </div>
            </header>
            <main className="flex-1 max-w-lg mx-auto w-full p-4 relative">
              {children}
            </main>
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
