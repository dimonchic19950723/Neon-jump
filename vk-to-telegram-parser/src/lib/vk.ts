import { cache } from "react";

const VK_API_VERSION = process.env.VK_API_VERSION || "5.199";

export type VkWallPost = {
  id: number;
  owner_id: number;
  date: number; // unix
  text?: string;
  attachments?: Array<
    | { type: "photo"; photo: { sizes: { url: string; width: number; height: number; type?: string }[] } }
    | Record<string, any>
  >;
};

export type VkWallGetResponse = {
  response?: {
    count: number;
    items: VkWallPost[];
  };
  error?: {
    error_code: number;
    error_msg: string;
  };
};

export function parseVkDomain(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/^(https?:\/\/)?(www\.)?vk\.com\/(.+)$/i);
  if (urlMatch) {
    return urlMatch[3].split(/[/?#]/)[0];
  }
  return trimmed;
}

export const getWall = cache(async function getWall(domain: string, options?: { count?: number; filter?: string }) {
  const token = process.env.VK_ACCESS_TOKEN;
  if (!token) throw new Error("VK_ACCESS_TOKEN is not set");
  const params = new URLSearchParams({
    v: VK_API_VERSION,
    access_token: token,
    domain,
    count: String(options?.count ?? 10),
    filter: options?.filter ?? "owner",
  });
  const url = `https://api.vk.com/method/wall.get?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as VkWallGetResponse;
  if (!res.ok || data.error) {
    throw new Error(data.error ? `${data.error.error_code}: ${data.error.error_msg}` : `VK API error ${res.status}`);
  }
  return data.response!;
});

export function extractPhotoUrls(post: VkWallPost): string[] {
  const photos: string[] = [];
  for (const att of post.attachments ?? []) {
    if ((att as any).type === "photo" && (att as any).photo?.sizes) {
      const sizes = (att as any).photo.sizes as { url: string; width: number; height: number; type?: string }[];
      const best = sizes.reduce((a, b) => ((b.width ?? 0) * (b.height ?? 0) > (a.width ?? 0) * (a.height ?? 0) ? b : a), sizes[0]);
      if (best?.url) photos.push(best.url);
    }
  }
  return photos;
}

export function buildPostLink(ownerId: number, postId: number): string {
  return `https://vk.com/wall${ownerId}_${postId}`;
}
