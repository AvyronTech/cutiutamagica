import { useState } from "react";
import { Check, Copy, Facebook, Mail, MessageCircle, Send, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { productCanonicalUrl, productShareMessage, productShareTargets } from "@/lib/product-share";

type ProductShareProps = {
  id: string;
  name: string;
  tagline: string;
};

const iconByChannel: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  sms: Smartphone,
  facebook: Facebook,
};

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = iconByChannel[channel];
  return Icon ? <Icon className="product-share__channel-icon" aria-hidden /> : null;
}

export function ProductShare({ id, name, tagline }: ProductShareProps) {
  const [copied, setCopied] = useState(false);
  const url = productCanonicalUrl(id);
  const message = productShareMessage(name, tagline);
  const targets = productShareTargets({ id, name, tagline });

  async function recordRewardShare(channel: string) {
    if (channel !== "native" && channel !== "facebook") return;
    try {
      const response = await fetch("/api/v1/customer/rewards/share", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, productId: id, actionId: crypto.randomUUID() }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: { awarded?: boolean; stars?: number; limitReached?: boolean };
      };
      if (payload.data?.awarded)
        toast.success(`+${payload.data.stars} Magic Star ✦`, {
          description: "Povestea a fost adăugată în jurnalul contului tău.",
          duration: 2600,
        });
    } catch {
      // Distribuirea rămâne funcțională chiar dacă jurnalul de fidelitate nu răspunde.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Linkul cutiuței a fost copiat.", { duration: 2200 });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Linkul nu a putut fi copiat automat.", {
        description: "Îl poți copia din bara de adresă.",
        duration: 3000,
      });
    }
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: message, url });
        await recordRewardShare("native");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <section className="product-share" aria-labelledby={`share-${id}`}>
      <div className="product-share__heading">
        <span className="product-share__emblem" aria-hidden>
          <Share2 />
        </span>
        <strong id={`share-${id}`}>Trimite povestea mai departe</strong>
      </div>

      <div className="product-share__channels" aria-label="Canale de distribuire">
        <button type="button" onClick={shareNative} className="product-share__native">
          <Share2 aria-hidden />
          <span>Distribuie</span>
        </button>
        {targets.map((target) => {
          const isAppLink = target.id === "email" || target.id === "sms";
          return (
            <a
              key={target.id}
              href={target.href}
              target={isAppLink ? undefined : "_blank"}
              rel={isAppLink ? undefined : "nofollow noopener noreferrer"}
              className="product-share__channel"
              data-channel={target.id}
              onClick={() => {
                if (target.group === "retele") void recordRewardShare(target.id);
              }}
            >
              <ChannelIcon channel={target.id} />
              <span>{target.label}</span>
            </a>
          );
        })}
      </div>
      <div className="product-share__footer">
        <button
          type="button"
          onClick={copyLink}
          className="product-share__copy"
          aria-label={copied ? "Link copiat" : "Copiază linkul produsului"}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          <span>{copied ? "Link copiat" : "Copiază linkul"}</span>
        </button>
      </div>
    </section>
  );
}
