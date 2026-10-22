import { useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { productCanonicalUrl, productShareMessage, productShareTargets } from "@/lib/product-share";

type ProductShareProps = {
  id: string;
  name: string;
  tagline: string;
  image: string;
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
  linkedin: Linkedin,
};

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = iconByChannel[channel];
  if (Icon) return <Icon className="product-share__channel-icon" aria-hidden />;

  const mark = channel === "pinterest" ? "P" : channel === "bluesky" ? "B" : "X";
  return (
    <span className="product-share__brand-mark" aria-hidden>
      {mark}
    </span>
  );
}

export function ProductShare({ id, name, tagline, image }: ProductShareProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = productCanonicalUrl(id);
  const message = productShareMessage(name, tagline);
  const targets = productShareTargets({ id, name, tagline, image });

  async function recordRewardShare(channel: string) {
    if (!["native", "facebook", "linkedin", "pinterest", "x", "bluesky"].includes(channel)) return;
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
    setExpanded(true);
  }

  const featured = targets.filter(({ id: channel }) =>
    ["whatsapp", "facebook", "telegram"].includes(channel),
  );
  const groups = [
    { id: "mesaje", label: "Trimite direct" },
    { id: "retele", label: "Publică pe o rețea" },
  ] as const;

  return (
    <section className="product-share" aria-labelledby={`share-${id}`}>
      <div className="product-share__heading">
        <span className="product-share__emblem" aria-hidden>
          <Share2 />
        </span>
        <span>
          <strong id={`share-${id}`}>Trimite mai departe povestea</strong>
          <small>Distribuie exact această cutiuță, fără cont obligatoriu.</small>
        </span>
      </div>

      <div className="product-share__quick" aria-label="Opțiuni rapide de distribuire">
        <button type="button" onClick={shareNative} className="product-share__native">
          <Share2 aria-hidden />
          <span>Distribuie</span>
        </button>
        {featured.map((target) => (
          <a
            key={target.id}
            href={target.href}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="product-share__quick-link"
            data-channel={target.id}
            onClick={() => void recordRewardShare(target.id)}
            aria-label={`Distribuie pe ${target.label}`}
          >
            <ChannelIcon channel={target.id} />
            <span>{target.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="product-share__quick-link"
          aria-label={copied ? "Link copiat" : "Copiază linkul produsului"}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          <span>{copied ? "Copiat" : "Copiază"}</span>
        </button>
      </div>

      <button
        type="button"
        className="product-share__expand"
        aria-expanded={expanded}
        aria-controls={`share-options-${id}`}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Ascunde canalele" : "Vezi toate cele 9 canale"}
        <ChevronDown aria-hidden />
      </button>

      <div id={`share-options-${id}`} className="product-share__options" data-expanded={expanded}>
        <div className="product-share__options-inner">
          {groups.map((group) => (
            <div key={group.id} className="product-share__group">
              <p>{group.label}</p>
              <div>
                {targets
                  .filter((target) => target.group === group.id)
                  .map((target) => {
                    const isAppLink = target.id === "email" || target.id === "sms";
                    return (
                      <a
                        key={target.id}
                        href={target.href}
                        target={isAppLink ? undefined : "_blank"}
                        rel={isAppLink ? undefined : "nofollow noopener noreferrer"}
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
