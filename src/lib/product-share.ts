export type ProductShareTarget = {
  id: string;
  label: string;
  group: "mesaje" | "retele";
  href: string;
};

type ProductShareInput = {
  id: string;
  name: string;
  tagline: string;
  image: string;
};

export function productCanonicalUrl(productId: string) {
  return `https://cutiutamagica.eu/produs/${encodeURIComponent(productId)}`;
}

export function productShareMessage(name: string, tagline: string) {
  return `Am găsit ${name} de la Cutiuța Magică — ${tagline}`;
}

export function productShareTargets({
  id,
  name,
  tagline,
  image,
}: ProductShareInput): ProductShareTarget[] {
  const url = productCanonicalUrl(id);
  const message = productShareMessage(name, tagline);
  const absoluteImage = image.startsWith("http") ? image : `https://cutiutamagica.eu${image}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(message);
  const messageWithUrl = encodeURIComponent(`${message}\n${url}`);

  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      group: "mesaje",
      href: `https://wa.me/?text=${messageWithUrl}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      group: "mesaje",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      id: "email",
      label: "Email",
      group: "mesaje",
      href: `mailto:?subject=${encodeURIComponent(`O idee de cadou: ${name}`)}&body=${messageWithUrl}`,
    },
    {
      id: "sms",
      label: "SMS",
      group: "mesaje",
      href: `sms:?body=${messageWithUrl}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      group: "retele",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      group: "retele",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: "pinterest",
      label: "Pinterest",
      group: "retele",
      href: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(absoluteImage)}&description=${encodedMessage}`,
    },
    {
      id: "x",
      label: "X",
      group: "retele",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      id: "bluesky",
      label: "Bluesky",
      group: "retele",
      href: `https://bsky.app/intent/compose?text=${messageWithUrl}`,
    },
  ];
}
