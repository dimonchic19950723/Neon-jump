import { useEffect, useState } from "react";
import NeonJump from "./game/NeonJump";
import Landing from "./Landing";
import Admin from "./Admin";
import Brand from "./Brand";
import Auth from "./Auth";
import { getCurrentAccount } from "./game/auth";

function getRoute(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export default function App() {
  const [route, setRoute] = useState(getRoute());
  const [screen, setScreen] = useState<"home" | "game">("home");
  const [account, setAccount] = useState(getCurrentAccount());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route.startsWith("/admin")) return <Admin />;
  if (route.startsWith("/brand")) return <Brand />;

  // нет активного аккаунта → экран входа / регистрации / гостя
  if (!account) return <Auth onDone={() => setAccount(getCurrentAccount())} />;

  if (screen === "game") {
    return (
      <div className="game-open">
        <NeonJump onExit={() => setScreen("home")} />
      </div>
    );
  }

  return (
    <Landing
      onPlay={() => setScreen("game")}
      onAccountChange={() => setAccount(getCurrentAccount())}
    />
  );
}
