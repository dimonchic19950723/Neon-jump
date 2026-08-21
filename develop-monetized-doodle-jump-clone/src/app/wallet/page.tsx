"use client";

import { useRouter } from "next/navigation";
import WalletPanel from "@/components/panels/WalletPanel";

// Отдельный маршрут кошелька (для прямого захода по ссылке).
// Внутри игры кошелёк открывается без перехода — как экран на главной.
export default function WalletRoute() {
  const router = useRouter();
  return <WalletPanel onBack={() => router.push("/")} />;
}
