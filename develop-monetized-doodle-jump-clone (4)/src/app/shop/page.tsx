"use client";

import { useRouter } from "next/navigation";
import ShopPanel from "@/components/panels/ShopPanel";

// Отдельный маршрут магазина (для прямого захода по ссылке).
export default function ShopRoute() {
  const router = useRouter();
  return <ShopPanel onBack={() => router.push("/")} />;
}
