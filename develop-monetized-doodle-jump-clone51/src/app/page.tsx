"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Menu from "@/components/Menu";
import Welcome from "@/components/Welcome";
import WalletPanel from "@/components/panels/WalletPanel";
import ShopPanel from "@/components/panels/ShopPanel";
import type { PublicPlayer } from "@/components/game/GameCanvas";
import type { SettingsMap } from "@/lib/economy";
import { api, clearToken, setToken as saveToken } from "@/lib/client-api";
import { Loader2 } from "lucide-react";

// Canvas-движок — самый большой клиентский модуль. Загружаем его только
// после нажатия «Играть», а не вместе с первым экраном.
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0b0620] text-white">
      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
        Запускаем мир…
      </p>
    </div>
  ),
});

const FALLBACK_SETTINGS: SettingsMap = {
  adLink: "",
  adCode: "",
  cpm: "120",
  playerShare: "50",
  coinRate: "1000",
  minWithdraw: "100",
  milestoneBonus: "50",
};

export default function Home() {
  const [screen, setScreen] = useState<"menu" | "welcome" | "game" | "wallet" | "shop">("menu");
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [player, setPlayer] = useState<PublicPlayer | null>(null);
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    localStorage.removeItem("neonjump_player_id"); // устаревший ключ

    // Не блокируем первый рендер: оба запроса идут параллельно в фоне.
    const settingsRequest = api<{ settings: SettingsMap }>("/api/settings", {
      retries: 1,
    });
    const sessionRequest = api<{ player: PublicPlayer }>("/api/me", {
      retries: 1,
    });

    void Promise.all([settingsRequest, sessionRequest]).then(([s, me]) => {
      if (s.ok && s.data) setSettings(s.data.settings);
      if (me.ok && me.data?.player) setPlayer(me.data.player);
      setSessionChecking(false);
    });
  }, []);

  const auth = useCallback(
    async (username: string, password: string, mode: "login" | "register") => {
      setAuthBusy(true);
      setAuthError("");
      const r = await api<{ player: PublicPlayer; token: string }>(
        `/api/auth/${mode}`,
        { method: "POST", body: { username, password } },
      );
      if (r.ok && r.data) {
        saveToken(r.data.token);
        setPlayer(r.data.player);
        setAuthMode(mode);
        setScreen("welcome");
      } else {
        setAuthError(
          r.networkError
            ? "Нет связи с сервером — попробуй ещё раз"
            : r.error ?? "Ошибка авторизации",
        );
      }
      setAuthBusy(false);
    },
    [],
  );

  const logout = useCallback(() => {
    void api("/api/auth/logout", { method: "POST", retries: 0 });
    clearToken();
    setPlayer(null);
    setScreen("menu");
  }, []);

  const handleUpdate = useCallback((p: PublicPlayer) => setPlayer(p), []);

  // Игра сообщила, что сессия окончательно потеряна
  const handleAuthLost = useCallback(() => {
    clearToken();
    setPlayer(null);
    setScreen("menu");
    setAuthError("Сессия завершена — войди в аккаунт заново");
  }, []);

  if (screen === "wallet") {
    return (
      <WalletPanel
        onBack={() => setScreen("menu")}
        onPlayerSync={handleUpdate}
        initialPlayer={player}
        initialSettings={settings ?? FALLBACK_SETTINGS}
      />
    );
  }

  if (screen === "shop") {
    return (
      <ShopPanel
        onBack={() => setScreen("menu")}
        onPlay={() => setScreen("game")}
        onPlayerSync={handleUpdate}
        initialPlayer={player}
      />
    );
  }

  if (screen === "welcome" && player) {
    return (
      <Welcome
        player={player}
        mode={authMode}
        onPlay={() => setScreen("game")}
        onMenu={() => setScreen("menu")}
        onShop={() => setScreen("shop")}
        onWallet={() => setScreen("wallet")}
      />
    );
  }

  if (screen === "game" && player) {
    return (
      <GameCanvas
        player={player}
        settings={settings ?? FALLBACK_SETTINGS}
        onPlayerUpdate={handleUpdate}
        onAuthLost={handleAuthLost}
        onExit={() => setScreen("menu")}
      />
    );
  }

  return (
    <Menu
      player={player}
      settings={settings}
      sessionChecking={sessionChecking}
      authBusy={authBusy}
      authError={authError}
      onAuth={auth}
      onLogout={logout}
      onPlay={() => setScreen("game")}
      onShop={() => setScreen("shop")}
      onWallet={() => setScreen("wallet")}
    />
  );
}
