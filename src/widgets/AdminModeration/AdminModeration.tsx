import { useEffect, useState } from "react";
import { Check, X, Loader2, ChevronLeft, ChevronRight, Eye, AlertTriangle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listModerationQueue,
  approveModerationItem,
  rejectModerationItem,
  listOpenReports,
  listCatalogReviews,
  reviewCatalog,
  resolveReport,
  moderateProduct,
  listPendingVerifications,
  getVerificationDetail,
  reviewVerification,
  type ProductModerationItem,
  type ContentReportItem,
  type CatalogReviewItem,
  type VerificationListResponse,
  type VerificationDetailResponse,
  type VerificationStatus,
} from "../../shared/api/platformClient";
import { Card } from "../../shared/ui/Card/Card";
import { Modal } from "../../shared/ui/Modal/Modal";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError } from "../../shared/api/httpClient";

export function AdminModeration() {
  const { t } = useTranslation();
  const toast = useToast();
  const { state } = useAuth();
  const permissions = new Set(state.session?.platformMembership?.permissions ?? []);

  const [queue, setQueue] = useState<ProductModerationItem[]>([]);
  const [queuePage, setQueuePage] = useState(0);
  const [queueTotalPages, setQueueTotalPages] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);

  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [catalogReviews, setCatalogReviews] = useState<CatalogReviewItem[]>([]);
  const [busyId, setBusyId] = useState("");
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const [rejectTarget, setRejectTarget] = useState<ProductModerationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [verifications, setVerifications] = useState<VerificationListResponse[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(true);
  const [verificationPriorityFilter, setVerificationPriorityFilter] = useState<"STANDARD" | "EXPEDITED" | null>(null);
  const [verificationDetail, setVerificationDetail] = useState<VerificationDetailResponse | null>(null);
  const [verificationDetailBusy, setVerificationDetailBusy] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  const loadQueue = (page: number) => {
    setQueueLoading(true);
    listModerationQueue(page, 20)
      .then(res => {
        setQueue(res.content);
        setQueueTotalPages(res.totalPages);
      })
      .catch(() => setQueue([]))
      .finally(() => setQueueLoading(false));
  };

  useEffect(() => {
    loadQueue(queuePage);
  }, [queuePage]);

  useEffect(() => {
    listOpenReports().then(setReports).catch(() => setReports([]));
    listCatalogReviews().then(setCatalogReviews).catch(() => setCatalogReviews([]));
  }, []);

  const loadVerifications = (priority?: "STANDARD" | "EXPEDITED" | null) => {
    setVerificationsLoading(true);
    listPendingVerifications(priority ?? undefined)
      .then(setVerifications)
      .catch(() => setVerifications([]))
      .finally(() => setVerificationsLoading(false));
  };

  useEffect(() => {
    loadVerifications(verificationPriorityFilter);
  }, [verificationPriorityFilter]);

  const openVerificationDetail = async (businessId: string) => {
    setVerificationDetailBusy(true);
    setVerificationDetail(null);
    try {
      const detail = await getVerificationDetail(businessId);
      setVerificationDetail(detail);
    } catch {
      setVerificationDetail(null);
    } finally {
      setVerificationDetailBusy(false);
    }
  };

  const handleReviewVerification = async (businessId: string, status: VerificationStatus) => {
    if (!reviewComment.trim() && status !== "APPROVED") return;
    setVerificationDetailBusy(true);
    try {
      const result = await reviewVerification(businessId, { status, comment: reviewComment });
      setVerificationDetail(result);
      setVerifications(prev => prev.filter(v => v.businessId !== businessId));
      setReviewComment("");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setVerificationDetailBusy(false);
    }
  };

  const handleApprove = async (productId: string) => {
    setBusyId(productId);
    try {
      await approveModerationItem(productId);
      setQueue(prev => prev.filter(p => p.productId !== productId));
      toast.show(t("platform.moderation.approved"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setBusyId(rejectTarget.productId);
    try {
      await rejectModerationItem(rejectTarget.productId, rejectReason);
      setQueue(prev => prev.filter(p => p.productId !== rejectTarget.productId));
      toast.show(t("platform.moderation.rejected"), "success");
      setRejectTarget(null);
      setRejectReason("");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const handleCatalogReview = async (businessId: string, approved: boolean) => {
    setBusyId(businessId);
    try {
      await reviewCatalog(businessId, approved);
      setCatalogReviews(prev => prev.filter(r => r.businessId !== businessId));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const handleResolveReport = async (report: ContentReportItem, status: "RESOLVED" | "REJECTED") => {
    const resolution = resolutions[report.id]?.trim();
    if (!resolution) return;
    setBusyId(report.id);
    try {
      await resolveReport(report.id, status, resolution);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const handleModerateTarget = async (report: ContentReportItem) => {
    setBusyId(report.id);
    try {
      await moderateProduct(report.targetId, true);
      toast.show(t("platform.moderation.applied"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const isAutoRejected = (item: ProductModerationItem) =>
    item.moderationNote?.startsWith("Auto-rejected");

  const isManualReview = (item: ProductModerationItem) =>
    item.moderationNote?.startsWith("Manual review");

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.moderation")}</h1>
        <p className="fcw-body-s fcw-text-secondary">{t("platform.moderation.subtitle")}</p>
      </div>

      <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
        <div className="fcw-flex-between">
          <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.moderation.queueTitle")}</h2>
          {!queueLoading && (
            <span className="fcw-body-s fcw-text-secondary">
              {t("platform.moderation.pendingCount", { count: queue.length })}
            </span>
          )}
        </div>
        {queueLoading ? <Loading /> : queue.length === 0 ? (
          <Card padding="md">
            <p className="fcw-body-s fcw-text-secondary">{t("platform.moderation.queueEmpty")}</p>
          </Card>
        ) : (
          <>
            {queue.map(item => (
              <Card key={item.productId} padding="lg">
                <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                  <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                      <span className="fcw-body fcw-weight-semibold">{item.productName}</span>
                      <span className="fcw-body-s fcw-text-secondary">{item.businessName}</span>
                      <span className="fcw-body-xs fcw-text-tertiary">
                        {new Date(item.createdAt).toLocaleString("ru-KZ")}
                      </span>
                    </div>
                    <div className="fcw-flex" style={{ gap: "0.5rem", flexShrink: 0 }}>
                      {isAutoRejected(item) ? (
                        <span className="admin-badge admin-badge--rejected">
                          {t("platform.moderation.autoRejected")}
                        </span>
                      ) : isManualReview(item) ? (
                        <span className="admin-badge admin-badge--pending" style={{ color: "#f59e0b", borderColor: "#f59e0b" }}>
                          {t("platform.moderation.manualReview")}
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge--pending">
                          {t("platform.moderation.pending")}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.moderationNote && (
                    <p className={`fcw-body-xs ${isAutoRejected(item) ? "" : ""}`} style={{
                      color: isAutoRejected(item) ? "var(--fcw-color-error, #ef4444)" : "var(--fcw-color-text-tertiary)",
                      margin: 0,
                    }}>
                      {item.moderationNote}
                    </p>
                  )}
                  {!isAutoRejected(item) && (
                    <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                      <button
                        className="fcw-btn fcw-btn-primary fcw-btn-sm"
                        disabled={busyId === item.productId}
                        onClick={() => handleApprove(item.productId)}
                      >
                        {busyId === item.productId ? <Loader2 size={14} className="fcw-spin" /> : <Check size={14} />}
                        {t("platform.moderation.approve")}
                      </button>
                      <button
                        className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                        disabled={busyId === item.productId}
                        onClick={() => { setRejectTarget(item); setRejectReason(""); }}
                      >
                        <X size={14} />
                        {t("platform.moderation.reject")}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {queueTotalPages > 1 && (
              <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", justifyContent: "center" }}>
                <button
                  className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                  disabled={queuePage === 0}
                  onClick={() => setQueuePage(p => p - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="fcw-body-s fcw-text-secondary">{queuePage + 1} / {queueTotalPages}</span>
                <button
                  className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                  disabled={queuePage >= queueTotalPages - 1}
                  onClick={() => setQueuePage(p => p + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {permissions.has("MODERATE_CONTENT") && (
        <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
          <div className="fcw-flex-between">
            <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.verification.title")}</h2>
            <div className="fcw-flex" style={{ gap: "0.5rem" }}>
              <button
                className={`fcw-btn fcw-btn-sm ${!verificationPriorityFilter ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                onClick={() => setVerificationPriorityFilter(null)}
              >
                {t("platform.verification.filterAll")}
              </button>
              <button
                className={`fcw-btn fcw-btn-sm ${verificationPriorityFilter === "STANDARD" ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                onClick={() => setVerificationPriorityFilter("STANDARD")}
              >
                {t("platform.verification.priority.STANDARD")}
              </button>
              <button
                className={`fcw-btn fcw-btn-sm ${verificationPriorityFilter === "EXPEDITED" ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                onClick={() => setVerificationPriorityFilter("EXPEDITED")}
              >
                {t("platform.verification.priority.EXPEDITED")}
              </button>
            </div>
          </div>
          {verificationsLoading ? <Loading /> : verifications.length === 0 ? (
            <Card padding="md">
              <p className="fcw-body-s fcw-text-secondary">{t("platform.verification.empty")}</p>
            </Card>
          ) : (
            verifications.map(v => (
              <Card key={v.businessId} padding="lg">
                <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", alignItems: "center" }}>
                  <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                    <span className="fcw-body fcw-weight-semibold">{v.businessName}</span>
                    <span className="fcw-body-xs fcw-text-tertiary">
                      {t(`platform.verification.status.${v.status}`)} · {t(`platform.verification.priority.${v.priority}`)} · {new Date(v.createdAt).toLocaleString("ru-KZ")}
                    </span>
                  </div>
                  <button
                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                    disabled={verificationDetailBusy}
                    onClick={() => openVerificationDetail(v.businessId)}
                  >
                    <Eye size={14} />
                    {t("platform.verification.review")}
                  </button>
                </div>
              </Card>
            ))
          )}
        </section>
      )}

      {verificationDetail && (
        <Modal open onClose={() => { setVerificationDetail(null); setReviewComment(""); }}>
          <div className="fcw-flex-col" style={{ gap: "1rem", padding: "1rem", minWidth: 420, maxWidth: 560 }}>
            <div className="fcw-flex-between">
              <h3 className="fcw-h3" style={{ margin: 0 }}>{verificationDetail.businessName}</h3>
              <span className={`admin-badge admin-badge--${verificationDetail.status === "PENDING" ? "pending" : verificationDetail.status === "APPROVED" ? "approved" : verificationDetail.status === "REJECTED" ? "rejected" : "pending"}`}>
                {t(`platform.verification.status.${verificationDetail.status}`)}
              </span>
            </div>
            <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
              <span className="fcw-label">{t("platform.verification.proofs")}</span>
              {verificationDetail.binIin && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.binIin")}</span>
                  <span className="fcw-body-s">{verificationDetail.binIin}</span>
                </div>
              )}
              {verificationDetail.phone && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.phone")}</span>
                  <span className="fcw-body-s">{verificationDetail.phone}</span>
                </div>
              )}
              {verificationDetail.corporateEmail && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.corporateEmail")}</span>
                  <span className="fcw-body-s">{verificationDetail.corporateEmail}</span>
                </div>
              )}
              {verificationDetail.twoGisUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.twoGisUrl")}</span>
                  <a href={verificationDetail.twoGisUrl} target="_blank" rel="noopener noreferrer" className="fcw-body-s">{verificationDetail.twoGisUrl}</a>
                </div>
              )}
              {verificationDetail.kaspiUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.kaspiUrl")}</span>
                  <a href={verificationDetail.kaspiUrl} target="_blank" rel="noopener noreferrer" className="fcw-body-s">{verificationDetail.kaspiUrl}</a>
                </div>
              )}
              {verificationDetail.ozonUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.ozonUrl")}</span>
                  <a href={verificationDetail.ozonUrl} target="_blank" rel="noopener noreferrer" className="fcw-body-s">{verificationDetail.ozonUrl}</a>
                </div>
              )}
              {verificationDetail.wildberriesUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.wildberriesUrl")}</span>
                  <a href={verificationDetail.wildberriesUrl} target="_blank" rel="noopener noreferrer" className="fcw-body-s">{verificationDetail.wildberriesUrl}</a>
                </div>
              )}
              {verificationDetail.websiteUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.websiteUrl")}</span>
                  <a href={verificationDetail.websiteUrl} target="_blank" rel="noopener noreferrer" className="fcw-body-s">{verificationDetail.websiteUrl}</a>
                </div>
              )}
              {verificationDetail.instagramUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.instagramUrl")}</span>
                  <span className="fcw-body-s">{verificationDetail.instagramUrl}</span>
                </div>
              )}
              {verificationDetail.telegramUrl && (
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("platform.verification.field.telegramUrl")}</span>
                  <span className="fcw-body-s">{verificationDetail.telegramUrl}</span>
                </div>
              )}
            </div>
            {verificationDetail.history.length > 0 && (
              <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                <span className="fcw-label">{t("platform.verification.history")}</span>
                {verificationDetail.history.map((h, i) => (
                  <div key={i} className="fcw-flex-col" style={{ gap: "0.125rem", padding: "0.5rem", background: "var(--fcw-surface-secondary)", borderRadius: "var(--fcw-radius-sm)" }}>
                    <span className="fcw-body-xs fcw-text-tertiary">
                      {h.fromStatus ? t(`platform.verification.status.${h.fromStatus}`) : "—"} → {t(`platform.verification.status.${h.toStatus}`)} · {new Date(h.createdAt).toLocaleString("ru-KZ")}
                    </span>
                    {h.comment && <span className="fcw-body-s">{h.comment}</span>}
                  </div>
                ))}
              </div>
            )}
            {verificationDetail.status === "PENDING" && (
              <>
                <textarea
                  className="fcw-input"
                  rows={2}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder={t("platform.verification.comment")}
                />
                <div className="fcw-flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                    disabled={verificationDetailBusy}
                    onClick={() => handleReviewVerification(verificationDetail.businessId, "NEEDS_INFO")}
                  >
                    <AlertTriangle size={14} />
                    {t("platform.verification.requestInfo")}
                  </button>
                  <button
                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                    disabled={verificationDetailBusy}
                    onClick={() => handleReviewVerification(verificationDetail.businessId, "REJECTED")}
                  >
                    <X size={14} />
                    {t("platform.verification.reject")}
                  </button>
                  <button
                    className="fcw-btn fcw-btn-primary fcw-btn-sm"
                    disabled={verificationDetailBusy || !reviewComment.trim()}
                    onClick={() => handleReviewVerification(verificationDetail.businessId, "APPROVED")}
                  >
                    <ShieldCheck size={14} />
                    {t("platform.verification.approve")}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {catalogReviews.length > 0 && (
        <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
          <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.moderation.catalogReviews")}</h2>
          {catalogReviews.map(item => (
            <Card key={item.businessId} padding="lg">
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem" }}>
                <div>
                  <span className="fcw-body fcw-weight-semibold">{item.businessName}</span>
                  <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0" }}>
                    {t("platform.moderation.catalogReviewHint")}
                  </p>
                </div>
                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busyId === item.businessId} onClick={() => handleCatalogReview(item.businessId, true)}>
                    {t("platform.moderation.approve")}
                  </button>
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={busyId === item.businessId} onClick={() => handleCatalogReview(item.businessId, false)}>
                    {t("platform.moderation.restrict")}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {reports.length > 0 && (
        <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
          <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.moderation.title")}</h2>
          {reports.map(report => (
            <Card key={report.id} padding="lg">
              <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                  <span className="fcw-body fcw-weight-semibold">
                    {t(`platform.moderation.target.${report.targetType}`)} · {report.reasonCode}
                  </span>
                  <span className="fcw-body-xs fcw-text-tertiary">{report.reporterName}</span>
                </div>
                {report.details && <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{report.details}</p>}
                <textarea
                  className="fcw-input"
                  rows={2}
                  value={resolutions[report.id] ?? ""}
                  placeholder={t("platform.moderation.resolution")}
                  onChange={e => setResolutions(prev => ({ ...prev, [report.id]: e.target.value }))}
                />
                <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busyId === report.id || !resolutions[report.id]?.trim()} onClick={() => handleResolveReport(report, "RESOLVED")}>
                    {t("platform.moderation.resolve")}
                  </button>
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={busyId === report.id || !resolutions[report.id]?.trim()} onClick={() => handleResolveReport(report, "REJECTED")}>
                    {t("platform.moderation.dismiss")}
                  </button>
                  {report.targetType === "PRODUCT" && permissions.has("MODERATE_CONTENT") && (
                    <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={busyId === report.id} onClick={() => handleModerateTarget(report)}>
                      {t("platform.moderation.hideProduct")}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {rejectTarget && (
        <Modal open onClose={() => setRejectTarget(null)}>
          <div className="fcw-flex-col" style={{ gap: "1rem", padding: "1rem", minWidth: 360 }}>
            <h3 className="fcw-h3" style={{ margin: 0 }}>{t("platform.moderation.rejectTitle")}</h3>
            <p className="fcw-body-s fcw-text-secondary">
              {rejectTarget.productName} — {rejectTarget.businessName}
            </p>
            <textarea
              className="fcw-input"
              rows={3}
              placeholder={t("platform.moderation.rejectReason")}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="fcw-flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={() => setRejectTarget(null)}>
                {t("platform.users.cancel")}
              </button>
              <button
                className="fcw-btn fcw-btn-primary"
                disabled={busyId === rejectTarget.productId || !rejectReason.trim()}
                onClick={handleReject}
              >
                {busyId === rejectTarget.productId ? <Loader2 size={14} className="fcw-spin" /> : null}
                {t("platform.moderation.reject")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
