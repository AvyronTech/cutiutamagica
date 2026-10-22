export const approvalSources = ["admin_dashboard", "codex_conversation"] as const;

export type ApprovalSource = (typeof approvalSources)[number];
export type ApprovalDecision = "approved" | "rejected";

export type ApprovalReceiptSummary = {
  source: ApprovalSource;
  decision: ApprovalDecision;
};

type ApprovalRow = {
  id: string;
  status: string;
  expires_at: string | null;
  proposed_action_json: string;
  approval_code: string;
  revision_ref: string;
  action_snapshot_json: string;
  min_approvals: number;
  allowed_sources_json: string;
  required_sources_json: string;
};

export class ApprovalDecisionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export function approvalPolicyForRisk(riskLevel: string) {
  return riskLevel === "critical"
    ? {
        minApprovals: 2,
        requiredSources: ["admin_dashboard", "codex_conversation"] as ApprovalSource[],
      }
    : { minApprovals: 1, requiredSources: [] as ApprovalSource[] };
}

export function evaluateApprovalQuorum(
  receipts: ApprovalReceiptSummary[],
  minApprovals: number,
  requiredSources: ApprovalSource[],
) {
  const rejected = receipts.some((receipt) => receipt.decision === "rejected");
  const approvedSources = new Set(
    receipts.filter((receipt) => receipt.decision === "approved").map((receipt) => receipt.source),
  );
  return {
    rejected,
    approvedCount: approvedSources.size,
    missingSources: requiredSources.filter((source) => !approvedSources.has(source)),
    approved:
      !rejected &&
      approvedSources.size >= minApprovals &&
      requiredSources.every((source) => approvedSources.has(source)),
  };
}

function parseSources(value: string): ApprovalSource[] {
  try {
    const sources = JSON.parse(value) as unknown;
    if (!Array.isArray(sources)) return [];
    return sources.filter((source): source is ApprovalSource =>
      approvalSources.includes(source as ApprovalSource),
    );
  } catch {
    return [];
  }
}

async function readApproval(db: D1Database, approvalId: string) {
  return db
    .prepare(
      `SELECT request.id, request.status, request.expires_at, request.proposed_action_json,
              requirement.approval_code, requirement.revision_ref,
              requirement.action_snapshot_json, requirement.min_approvals,
              requirement.allowed_sources_json, requirement.required_sources_json
       FROM approval_requests AS request
       JOIN approval_requirements AS requirement
         ON requirement.approval_request_id = request.id
       WHERE request.id = ?1`,
    )
    .bind(approvalId)
    .first<ApprovalRow>();
}

async function readReceiptSummaries(db: D1Database, approvalId: string) {
  const result = await db
    .prepare(
      `SELECT source, decision FROM approval_receipts
       WHERE approval_request_id = ?1 ORDER BY created_at`,
    )
    .bind(approvalId)
    .all<ApprovalReceiptSummary>();
  return result.results;
}

export async function recordApprovalDecision(
  db: D1Database,
  input: {
    approvalId: string;
    source: ApprovalSource;
    decision: ApprovalDecision;
    approvalCode: string;
    revisionRef: string;
    evidenceReference?: string;
    idempotencyKey: string;
    actorAdminUserId: string;
    actorLabel: string;
  },
) {
  const approval = await readApproval(db, input.approvalId);
  if (!approval) {
    throw new ApprovalDecisionError("Aprobarea nu există.", 404, "APPROVAL_NOT_FOUND");
  }

  const existingReceipt = await db
    .prepare(
      `SELECT approval_request_id, source, decision FROM approval_receipts
       WHERE idempotency_key = ?1`,
    )
    .bind(input.idempotencyKey)
    .first<{ approval_request_id: string; source: ApprovalSource; decision: ApprovalDecision }>();
  if (existingReceipt) {
    if (
      existingReceipt.approval_request_id !== input.approvalId ||
      existingReceipt.source !== input.source ||
      existingReceipt.decision !== input.decision
    ) {
      throw new ApprovalDecisionError(
        "Cheia de idempotency a fost folosită pentru altă decizie.",
        409,
        "IDEMPOTENCY_CONFLICT",
      );
    }
    const receipts = await readReceiptSummaries(db, input.approvalId);
    const quorum = evaluateApprovalQuorum(
      receipts,
      approval.min_approvals,
      parseSources(approval.required_sources_json),
    );
    const recoveredStatus = quorum.rejected ? "rejected" : quorum.approved ? "approved" : "pending";
    if (approval.status === "pending" && recoveredStatus !== "pending") {
      const reviewedAt = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            `UPDATE approval_requests SET status = ?1, reviewed_by = ?2, reviewed_at = ?3
             WHERE id = ?4 AND status = 'pending'`,
          )
          .bind(recoveredStatus, input.actorAdminUserId, reviewedAt, input.approvalId),
        db
          .prepare(
            `INSERT INTO audit_log (
               id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
               after_json, metadata_json
             ) VALUES (?1, ?2, ?3, 'approval.multisource.recovered', 'approval_request',
               ?4, ?5, ?6)`,
          )
          .bind(
            crypto.randomUUID(),
            input.actorAdminUserId,
            input.actorLabel,
            input.approvalId,
            JSON.stringify({ status: recoveredStatus, quorum }),
            JSON.stringify({ idempotencyKey: input.idempotencyKey }),
          ),
      ]);
    }
    return {
      approvalId: input.approvalId,
      status: approval.status === "pending" ? recoveredStatus : approval.status,
      quorum,
      idempotent: true,
    };
  }

  if (approval.status !== "pending") {
    throw new ApprovalDecisionError(
      "Aprobarea nu mai este în așteptare.",
      409,
      "APPROVAL_NOT_PENDING",
    );
  }
  if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) {
    await db
      .prepare(
        "UPDATE approval_requests SET status = 'expired' WHERE id = ?1 AND status = 'pending'",
      )
      .bind(input.approvalId)
      .run();
    throw new ApprovalDecisionError("Aprobarea a expirat.", 409, "APPROVAL_EXPIRED");
  }
  if (approval.approval_code !== input.approvalCode) {
    throw new ApprovalDecisionError(
      "Codul aprobării nu corespunde cererii.",
      409,
      "APPROVAL_CODE_MISMATCH",
    );
  }
  if (approval.revision_ref !== input.revisionRef) {
    throw new ApprovalDecisionError(
      "Revizia s-a schimbat și necesită o aprobare nouă.",
      409,
      "APPROVAL_REVISION_MISMATCH",
    );
  }
  if (approval.proposed_action_json !== approval.action_snapshot_json) {
    throw new ApprovalDecisionError(
      "Acțiunea propusă s-a schimbat după crearea aprobării.",
      409,
      "APPROVAL_SCOPE_CHANGED",
    );
  }
  const allowedSources = parseSources(approval.allowed_sources_json);
  if (!allowedSources.includes(input.source)) {
    throw new ApprovalDecisionError(
      "Sursa de aprobare nu este permisă.",
      403,
      "APPROVAL_SOURCE_NOT_ALLOWED",
    );
  }
  if (input.source === "codex_conversation" && !input.evidenceReference?.trim()) {
    throw new ApprovalDecisionError(
      "Aprobarea din Codex necesită o referință de conversație.",
      400,
      "CODEX_EVIDENCE_REQUIRED",
    );
  }

  const receiptId = `receipt_${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    await db
      .prepare(
        `INSERT INTO approval_receipts (
           id, approval_request_id, source, decision, actor_admin_user_id, actor_label,
           evidence_reference, revision_ref, action_snapshot_json, idempotency_key
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(
        receiptId,
        input.approvalId,
        input.source,
        input.decision,
        input.actorAdminUserId,
        input.actorLabel,
        input.evidenceReference?.trim() || null,
        approval.revision_ref,
        approval.action_snapshot_json,
        input.idempotencyKey,
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      throw new ApprovalDecisionError(
        "Această sursă a înregistrat deja o decizie.",
        409,
        "APPROVAL_SOURCE_ALREADY_USED",
      );
    }
    throw error;
  }

  const receipts = await readReceiptSummaries(db, input.approvalId);
  const quorum = evaluateApprovalQuorum(
    receipts,
    approval.min_approvals,
    parseSources(approval.required_sources_json),
  );
  const status = quorum.rejected ? "rejected" : quorum.approved ? "approved" : "pending";
  const reviewedAt = status === "pending" ? null : new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `UPDATE approval_requests
         SET status = ?1, reviewed_by = CASE WHEN ?1 = 'pending' THEN reviewed_by ELSE ?2 END,
             reviewed_at = CASE WHEN ?1 = 'pending' THEN reviewed_at ELSE ?3 END
         WHERE id = ?4 AND status = 'pending'`,
      )
      .bind(status, input.actorAdminUserId, reviewedAt, input.approvalId),
    db
      .prepare(
        `INSERT INTO audit_log (
           id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
           after_json, metadata_json
         ) VALUES (?1, ?2, ?3, 'approval.multisource.decision', 'approval_request',
           ?4, ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        input.actorAdminUserId,
        input.actorLabel,
        input.approvalId,
        JSON.stringify({ decision: input.decision, source: input.source, status, quorum }),
        JSON.stringify({ evidenceReference: input.evidenceReference ?? null }),
      ),
  ]);

  return { approvalId: input.approvalId, status, quorum, idempotent: false };
}

export async function expireStaleApprovalRequests(db: D1Database, now = new Date()) {
  const result = await db
    .prepare(
      `UPDATE approval_requests SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at <= ?1`,
    )
    .bind(now.toISOString())
    .run();
  return Number(result.meta.changes ?? 0);
}
