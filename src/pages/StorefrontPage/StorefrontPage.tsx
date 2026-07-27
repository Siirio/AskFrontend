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

  return (
    <main id="main-content" className="ask-storefront-page">
      <button type="button" className="ask-storefront-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={17} />
        Назад к поиску
      </button>

      <div className="ask-storefront-layout">
        <article className="ask-storefront-main">
          <header className="ask-storefront-identity ask-surface">
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
              {profile.description && <p>{profile.description}</p>}
            </div>
            <div className="ask-storefront-share">
              <button
                type="button"
                aria-label="Поделиться"
                onClick={() => navigator.share?.({ title: profile.businessName, url: window.location.href })}
              >
                <Share2 size={19} />
              </button>
            </div>
          </header>

          <section
            className="ask-storefront-cover ask-surface"
            style={{
              backgroundColor: profile.brandColor || undefined,
              backgroundImage: profile.coverUrl ? `url(${profile.coverUrl})` : undefined,
            }}
          >
            {!profile.coverUrl && (
              <div>
                <Store size={54} />
                <span>{profile.businessName}</span>
              </div>
            )}
          </section>

          {profile.description && (
            <section className="ask-storefront-about ask-surface">
              <h2>О компании</h2>
              <p>{profile.description}</p>
            </section>
          )}
        </article>

        <aside className="ask-storefront-contact">
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
              matchReasons: [],
            })}
          >
            <MessageCircle size={19} />
            Написать в чат
          </button>

          <section className="ask-surface">
            <h2>Контакты</h2>
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
            {!profile.number && !profile.email && !profile.instagramUrl && !profile.telegramUrl && !profile.websiteUrl && (
              <p>Бизнес пока не добавил публичные контакты</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
