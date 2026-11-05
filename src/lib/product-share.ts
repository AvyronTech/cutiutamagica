export type ProductShareTarget = {
  id: "whatsapp" | "telegram" | "email" | "sms" | "facebook";
  label: string;
  group: "mesaje" | "retele";
  href: string;
};

type ProductShareInput = {
  id: string;
  name: string;
  tagline: string;
};

export function productCanonicalUrl(productId: string) {
  return `https://cutiutamagica.eu${productPath(productId)}`;
}

export function productShareMessage(name: string, tagline: string) {
  return `Am găsit ${name} de la Cutiuța Magică — ${tagline}`;
}

export function productShareTargets({
  id,
  name,
  tagline,
}: ProductShareInput): ProductShareTarget[] {
  const url = productCanonicalUrl(id);
  const message = productShareMessage(name, tagline);
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
  ];
}
import { productPath } from "@/lib/product-url";
