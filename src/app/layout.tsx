import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { SocketProvider } from "@/context/SocketContext";
import StealAlertWrapper from "@/components/bonuses/StealAlertWrapper";
import WheelEventWrapper from "@/components/bonuses/WheelEventWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Theobank",
  description: "Votre banque virtuelle pour la soirée enchères",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-grid min-h-screen`}>
        <AuthProvider>
          <ToastProvider>
            <SocketProvider>
              <StealAlertWrapper />
              <WheelEventWrapper />
              {children}
            </SocketProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
