import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "ContratoIA — Gestión Inteligente de Informes",
  description: "Plataforma SaaS con IA para automatizar la generación de informes mensuales de contratistas. Gestiona alcances, evidencias y genera documentos Word automáticamente.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
