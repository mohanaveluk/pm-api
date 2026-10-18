import {
  materialRequisitionReviewOutcomeSubject, materialRequisitionReviewOutcomeTemplate,
  materialRequisitionReviewRequestSubject, materialRequisitionReviewRequestTemplate,
  RequisitionMailSummary,
} from './material-requisition-review-template';
import {
  materialRequisitionApprovalOutcomeSubject, materialRequisitionApprovalOutcomeTemplate,
  materialRequisitionApprovalRequestTemplate,
} from './material-requisition-approval-template';

const summary: RequisitionMailSummary = {
  mrNumber: 'MR-0007',
  trackingId: 'TRK-2026-0007',
  projectCode: '0042',
  projectName: 'Unit 4 <Expansion>',
  clientName: 'Gulf Petrochemical',
  wbs: '0003 — Piping',
  budgetHead: 'CAPEX',
  requiredOnSiteDate: '2026-11-15',
  itemCount: 12,
  lines: Array.from({ length: 12 }, (_, i) => ({
    lineNumber: i + 1, materialCode: `MAT-${i + 1}`, materialDescription: 'Pipe', uom: 'M', requestedQty: 10,
  })),
  requestedBy: 'req@example.com',
  requestedByName: 'Priya Menon',
  submittedAt: '2026-10-17T10:00:00Z',
};

describe('material requisition email templates', () => {
  it('asks reviewers to review, with the details, the lines and the link', () => {
    const data = {
      ...summary, reviewUrl: 'https://app/material-requisitions/reviews/1', round: 1, resubmitted: false,
      reviewers: ['Reviewer One'], approvers: ['Approver One'],
    };
    const html = materialRequisitionReviewRequestTemplate(data);
    expect(materialRequisitionReviewRequestSubject(data)).toContain('Review requested: Material Requisition MR-0007');
    expect(html).toContain('under your review');
    expect(html).toContain('TRK-2026-0007');
    expect(html).toContain('https://app/material-requisitions/reviews/1');
    expect(html).toContain('Nov 15, 2026');
    // Ten lines shown, the rest summarised; user text is escaped.
    expect(html).toContain('…and 2 more lines');
    expect(html).toContain('Unit 4 &lt;Expansion&gt;');
    expect(html).not.toContain('<Expansion>');
  });

  it('tells reviewers what changed on a resubmission', () => {
    const html = materialRequisitionReviewRequestTemplate({
      ...summary, reviewUrl: 'u', round: 2, resubmitted: true, reviewers: [], approvers: [],
      returnComments: [{ name: 'Reviewer One', role: 'Reviewer', decision: 'RETURNED', comments: 'Add the MTO ref', at: null }],
    });
    expect(html).toContain('requested changes');
    expect(html).toContain('Add the MTO ref');
  });

  it('explains a return to the requester', () => {
    const data = {
      ...summary, decision: 'RETURNED' as const, decidedBy: 'Reviewer One', decidedByEmail: 'r1@example.com',
      decidedAt: new Date(), comments: 'Quantities do not match the MTO', actionUrl: 'https://app/edit',
    };
    expect(materialRequisitionReviewOutcomeSubject(data)).toBe(
      'Material Requisition MR-0007 returned for clarification by Reviewer One',
    );
    expect(materialRequisitionReviewOutcomeTemplate(data)).toContain('Quantities do not match the MTO');
  });

  it('asks approvers to approve, with the review comments', () => {
    const html = materialRequisitionApprovalRequestTemplate({
      ...summary, approvalUrl: 'https://app/material-requisitions/approvals/1', approvers: ['Approver One'],
      reviewedAt: new Date(),
      reviewComments: [{ name: 'Reviewer One', role: 'Reviewer', decision: 'REVIEWED', comments: 'Checked', at: new Date() }],
    });
    expect(html).toContain('ready for approval');
    expect(html).toContain('Checked');
    expect(html).toContain('https://app/material-requisitions/approvals/1');
  });

  it('announces the approval outcome', () => {
    const data = {
      ...summary, decision: 'APPROVED' as const, decidedBy: 'Approver One', decidedByEmail: 'a1@example.com',
      decidedAt: new Date(), comments: null, reviewComments: [], approvalComments: [], viewUrl: 'https://app/view',
    };
    expect(materialRequisitionApprovalOutcomeSubject(data)).toBe('Material Requisition MR-0007 approved by Approver One');
    expect(materialRequisitionApprovalOutcomeTemplate(data)).toContain('Material Requisition Approved');
  });
});
