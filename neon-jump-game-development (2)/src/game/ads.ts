// ── Neon Jump · рекламные провайдеры ────────────────────────────────
// "demo"   — офлайн-заглушка с таймером (текущий вид оверлея в игре)
// "yandex" — SDK Яндекс.Игр: полноэкранная реклама + rewarded video
//            с настоящими колбэками (нужна игра в консоли developers.yandex.ru/games)
// "custom" — свой HTML/JS-код или iframe-ссылка любой рекламной сети
//            (рендерится внутри игрового оверлея)

import { getSettings } from "./store";

export type AdKind = "interstitial" | "rewarded";

interface YsdkAdv {
  showFullscreenAdv(opts: {
    callbacks?: {
      onOpen?: () => void;
      onClose?: (wasShown: boolean) => void;
      onError?: (error: object) => void;
    };
  }): void;
  showRewardedVideo(opts: {
    callbacks?: {
      onOpen?: () => void;
      onRewarded?: () => void;
      onClose?: (wasShown: boolean) => void;
      onError?: (error: object) => void;
    };
  }): void;
}

interface Ysdk {
  adv: YsdkAdv;
}

declare global {
  interface Window {
    YaGames?: { init(): Promise<Ysdk> };
  }
}

let ysdkPromise: Promise<Ysdk | null> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(el);
  });
}

async function getYsdk(): Promise<Ysdk | null> {
  if (!ysdkPromise) {
    ysdkPromise = (async () => {
      try {
        if (!window.YaGames) await loadScript("https://yandex.ru/games/sdk/v2");
        if (!window.YaGames) return null;
        return await window.YaGames.init();
      } catch {
        return null;
      }
    })();
  }
  return ysdkPromise;
}

/**
 * Пытается показать рекламу через настоящую сеть (Яндекс.Игры).
 * Возвращает true, если сеть взяла показ на себя (придёт колбэк onDone).
 * Возвращает false — тогда игра показывает встроенный оверлей (demo/custom)
 * и засчитывает просмотр по таймеру.
 */
export async function playAd(
  kind: AdKind,
  onDone: (completed: boolean) => void
): Promise<boolean> {
  if (getSettings().provider !== "yandex") return false;

  const ysdk = await getYsdk();
  if (!ysdk) return false;

  try {
    if (kind === "interstitial") {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: () => onDone(true),
          onError: () => onDone(false),
        },
      });
    } else {
      let rewarded = false;
      ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: () => {
            rewarded = true;
          },
          onClose: () => onDone(rewarded),
          onError: () => onDone(false),
        },
      });
    }
    return true;
  } catch {
    return false;
  }
}
