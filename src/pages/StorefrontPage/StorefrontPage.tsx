import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Instagram,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Store,
} from "lucide-react";
import { getBrandProfile } from "../../shared/api/askClient";
import type { BrandProfileDto } from "../../shared/api/dto";
import { useChat } from "../../widgets/ChatPanel/ChatContext";

export function StorefrontPage() {
  const { businessId = "" } = useParams();
  const navigate = useNavigate();
  const { openChat } = useChat();
  const [profile, setProfile] = useState<BrandProfileDto | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    getBrandProfile(businessId)
      .then(setProfile)
      .catch(reason => setError(reason instanceof Error ? reason.message : "Не удалось загрузить профиль"))
      .finally(() => setBusy(false));
  }, [businessId]);

  if (busy) {
    return (
      <main id="main-content" className="ask-storefront-loading">
        <Loader2 className="fcw-animate-spin" size={30} />
      </main>
    );
  }

  if (!profile || error) {
    return (
      <main id="main-content" className="ask-page">
        <div className="ask-empty ask-surface">
          <div>
            <Store size={42} />
            <h2>Профиль бизнеса недоступен</h2>
            <p>{error || "Бизнес ещё не заполнил публичную информацию"}</p>
            <button type="button" className="ask-secondary-button" onClick={() => navigate(-1)}>
              <ArrowLeft size={17} />
              Назад
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasContacts = Boolean(
    profile.number || profile.email || profile.instagramUrl || profile.telegramUrl || profile.websiteUrl,
  );

  return (
    <main id="main-content" className="ask-storefront-page">
      <button type="button" className="ask-storefront-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={17} />
        Назад к поиску
      </button>

      <article className="ask-storefront-surface ask-surface">
        <header className="ask-storefront-identity">
          <div className="ask-storefront-identity__main">
            <div
              className="ask-storefront-logo"
              style={{
                backgroundColor: profile.brandColor || undefined,
                backgroundImage: profile.logoUrl ? `url(${profile.logoUrl})` : undefined,
              }}
            >
              {!profile.logoUrl && <Store size={32} />}
            </div>
            <div>
              <h1>{profile.businessName || "Бизнес"}</h1>
            </div>
          </div>
          <button
            type="button"
            className="ask-storefront-share"
            aria-label="Поделиться"
            onClick={() => navigator.share?.({ title: profile.businessName, url: window.location.href })}
          >
            <Share2 size={19} />
          </button>
        </header>

        {profile.coverUrl && (
          <div
            className="ask-storefront-cover"
            style={{
              backgroundColor: profile.brandColor || undefined,
              backgroundImage: `url(${profile.coverUrl})`,
            }}
          />
        )}

        {profile.description && (
          <section className="ask-storefront-about">
            <h2>О компании</h2>
            <p>{profile.description}</p>
          </section>
        )}

        {hasContacts && (
          <section className="ask-storefront-contact">
            <h2>Контакты</h2>
            <div className="ask-storefront-contact__list">
              {profile.number && (
                <a href={`tel:${profile.number}`}>
                  <Phone size={19} />
                  <span><small>Телефон</small>{profile.number}</span>
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`}>
                  <Mail size={19} />
                  <span><small>Email</small>{profile.email}</span>
                </a>
              )}
              {profile.instagramUrl && (
                <a href={profile.instagramUrl} target="_blank" rel="noreferrer">
                  <Instagram size={19} />
                  <span><small>Социальная сеть</small>Instagram</span>
                  <ExternalLink size={14} />
                </a>
              )}
              {profile.telegramUrl && (
                <a href={profile.telegramUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={19} />
                  <span><small>Мессенджер</small>Telegram</span>
                  <ExternalLink size={14} />
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noreferrer">
                  <Globe size={19} />
                  <span><small>Сайт</small>{profile.websiteUrl.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </section>
        )}

        <footer className="ask-storefront-actions">
          <button
            type="button"
            className="ask-primary-button"
            onClick={() => openChat({
              id: businessId,
              resultType: "SERVICE",
              title: profile.businessName || "Обращение",
              brandName: profile.businessName,
              brandColor: profile.brandColor,
              imageUrl: profile.logoUrl,
              businessId,
              businessProfile: profile,
            })}
          >
            <MessageCircle size={19} />
            Написать в чат
          </button>
        </footer>
      </article>
    </main>
  );
}
