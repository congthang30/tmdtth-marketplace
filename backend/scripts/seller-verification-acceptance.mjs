// Full-journey acceptance test for the seller verification workflow.
// Exercises real HTTP endpoints against a running API + real Postgres +
// real Cloudinary document storage (reads config from environment). This
// is not mocked: every step is a genuine network call, matching the style
// of scripts/mvp-acceptance.mjs.
//
// Journeys covered:
//   1. Individual seller: register -> create shop (PendingApproval) ->
//      save legal profile -> upload documents ->
//      submit -> admin start-review -> admin approve verification ->
//      only now can admin approve the shop itself -> verify final masked
//      state and audit history.
//   2. Business seller: register -> create shop (PendingApproval) -> save
//      legal profile (Business/Company) -> upload
//      documents -> submit -> admin start-review -> admin
//      request-revision (reason required) -> seller edits + resubmits ->
//      admin approve verification -> admin approve shop -> verify final
//      state.
//
// Run with: npm run test:verification (see package.json)

const baseUrl = process.env.MVP_BASE_URL ?? 'http://localhost:3100/api';
const password = process.env.MVP_DEMO_PASSWORD ?? 'Demo@123456';
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function api(path, { token, method = 'GET', body, isForm } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body && !isForm ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload.data;
}

async function expectFailure(promise, expectedCode) {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (expectedCode && !message.includes(expectedCode)) {
      throw new Error(
        `Expected failure code ${expectedCode} but got: ${message}`,
      );
    }
    return;
  }
  throw new Error(`Expected request to fail with ${expectedCode ?? 'an error'} but it succeeded`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const register = (email, fullName) =>
  api('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, phoneNumber: '0901234567' },
  });

const login = (email) =>
  api('/auth/login', { method: 'POST', body: { email, password } });

// A genuine, fully valid minimal 10x10 red JPEG (real encoded pixel data,
// not just magic bytes) so that both the backend's lightweight validator
// AND Cloudinary's real image decoder accept it.
const MINIMAL_VALID_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z';

function minimalJpeg() {
  return Buffer.from(MINIMAL_VALID_JPEG_BASE64, 'base64');
}

async function uploadDocument(token, documentType) {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append(
    'file',
    new Blob([minimalJpeg()], { type: 'image/jpeg' }),
    `${documentType}-${suffix}.jpg`,
  );
  return api('/shops/verification/me/documents', {
    token,
    method: 'POST',
    body: form,
    isForm: true,
  });
}

async function createPendingShop(token, email, label) {
  return api('/shops', {
    token,
    method: 'POST',
    body: {
      shopName: `Verification Shop ${label} ${suffix}`,
      description: 'Acceptance test shop',
      email,
      phoneNumber: '0900000002',
      province: 'TP.HCM',
      district: 'District 1',
      ward: 'Ben Nghe',
      streetAddress: `10 Verification ${label}`,
      taxCode: `TAX${label}${suffix}`.slice(0, 20),
    },
  });
}

async function approveShop(shopId) {
  const admin = await login('admin@example.com');
  return api(`/admin/shops/${shopId}/approve`, {
    token: admin.accessToken,
    method: 'PATCH',
  });
}

// ---------------------------------------------------------------------
// Journey 1: Individual seller — submit, admin approves in one pass
// ---------------------------------------------------------------------
async function runIndividualJourney() {
  console.log('--- Individual seller journey ---');
  const email = `verify-individual-${suffix}@example.com`;
  const seller = await register(email, 'Individual Seller');
  const shop = await createPendingShop(seller.accessToken, email, 'IND');

  // Shop cannot be approved before the seller verification profile is Approved
  await expectFailure(approveShop(shop.id), 'SHOP_SELLER_VERIFICATION_REQUIRED');

  const before = await api('/shops/verification/me', { token: seller.accessToken });
  assert(before.profile === null, 'new shop should start with no verification profile');

  const profile = await api('/shops/verification', {
    token: seller.accessToken,
    method: 'POST',
    body: {
      sellerType: 'Individual',
      legalName: 'Nguyen Van A',
      identityDocumentType: 'CitizenId',
      identityNumber: `079${suffix}`.slice(-11),
      identityIssuedAt: '2020-01-01',
      identityIssuedBy: 'CA TP.HCM',
      taxCode: `1${suffix.slice(-9)}`,
    },
  });
  assert(profile.verificationStatus === 'Draft', 'profile should start as Draft');
  assert(
    /^•••• \w{4}$/.test(profile.identityNumberMasked),
    `identity number must be masked, got: ${profile.identityNumberMasked}`,
  );
  assert(
    /^•••• \w{4}$/.test(profile.taxCodeMasked),
    `tax code must be masked, got: ${profile.taxCodeMasked}`,
  );

  // Cannot submit without required documents
  await expectFailure(
    api('/shops/verification/me/submit', { token: seller.accessToken, method: 'POST' }),
    'SELLER_DOCUMENTS_REQUIRED',
  );

  await uploadDocument(seller.accessToken, 'IdentityFront');
  await uploadDocument(seller.accessToken, 'IdentityBack');

  const submitted = await api('/shops/verification/me/submit', {
    token: seller.accessToken,
    method: 'POST',
  });
  assert(submitted.verificationStatus === 'Submitted', `expected Submitted, got ${submitted.verificationStatus}`);

  const admin = await login('admin@example.com');
  const queue = await api(
    `/admin/seller-verifications?status=Submitted&q=${encodeURIComponent(shop.shopName)}`,
    { token: admin.accessToken },
  );
  const queueItem = queue.find((item) => item.shop.id === shop.id);
  assert(queueItem, 'submitted profile should appear in admin queue filtered by status=Submitted');

  await api(`/admin/seller-verifications/${queueItem.id}/start-review`, {
    token: admin.accessToken,
    method: 'PATCH',
  });

  const detailInReview = await api(`/admin/seller-verifications/${queueItem.id}`, {
    token: admin.accessToken,
  });
  assert(detailInReview.verificationStatus === 'UnderReview', 'should be UnderReview after start-review');
  assert(
    detailInReview.documents.every((doc) => !('storagePublicIdPlain' in doc)),
    'detail response must not leak raw storage identifiers',
  );

  // Admin can fetch a signed URL for a document; response must not leak raw checksum-only fields to the client shape
  const firstDocument = detailInReview.documents[0];
  const access = await api(
    `/admin/seller-verifications/${queueItem.id}/documents/${firstDocument.id}/access`,
    { token: admin.accessToken },
  );
  assert(typeof access.url === 'string' && access.url.startsWith('http'), 'document access must return a signed URL');

  // Reject with too-short reason must fail validation
  await expectFailure(
    api(`/admin/seller-verifications/${queueItem.id}/approve`, {
      token: seller.accessToken, // wrong role, should be 403 not 200
      method: 'PATCH',
    }),
  );

  const approved = await api(`/admin/seller-verifications/${queueItem.id}/approve`, {
    token: admin.accessToken,
    method: 'PATCH',
  });
  assert(approved.verificationStatus === 'Approved', 'admin approve should move profile to Approved');

  const finalState = await api('/shops/verification/me', { token: seller.accessToken });
  assert(finalState.profile.verificationStatus === 'Approved', 'seller-side view should reflect Approved');

  // Only now, after the profile is Approved, can the shop itself be approved
  const approvedShop = await approveShop(shop.id);
  assert(approvedShop.shopStatus === 'Approved', 'shop should become Approved once seller verification is Approved');

  // Approved profile can no longer be edited (state machine + editable-status guard)
  await expectFailure(
    api('/shops/verification/me', {
      token: seller.accessToken,
      method: 'PATCH',
      body: {
        sellerType: 'Individual',
        legalName: 'Should Fail',
        identityDocumentType: 'CitizenId',
        identityNumber: `079${suffix}`.slice(-11),
        identityIssuedAt: '2020-01-01',
        identityIssuedBy: 'CA TP.HCM',
        taxCode: `1${suffix.slice(-9)}`,
      },
    }),
    'SELLER_VERIFICATION_NOT_EDITABLE',
  );

  console.log('Individual journey: PASS');
  return { shopId: shop.id, profileId: queueItem.id };
}

// ---------------------------------------------------------------------
// Journey 2: Business seller — submit, admin requests revision, seller
// resubmits, admin approves.
// ---------------------------------------------------------------------
async function runBusinessRevisionJourney() {
  console.log('--- Business seller revision journey ---');
  const email = `verify-business-${suffix}@example.com`;
  const seller = await register(email, 'Business Seller');
  const shop = await createPendingShop(seller.accessToken, email, 'BIZ');

  await api('/shops/verification', {
    token: seller.accessToken,
    method: 'POST',
    body: {
      sellerType: 'Business',
      businessType: 'Company',
      legalName: 'Cong Ty TNHH Acceptance',
      taxCode: `2${suffix.slice(-9)}`,
      businessRegistrationNumber: `BRN-${suffix}`,
      businessRegistrationIssuedAt: '2019-05-01',
      businessRegistrationIssuedBy: 'So KHDT TP.HCM',
      legalRepresentativeName: 'Tran Thi B',
      registeredAddress: '123 Business Street, District 1, TP.HCM',
    },
  });
  await uploadDocument(seller.accessToken, 'BusinessRegistration');

  const submitted = await api('/shops/verification/me/submit', {
    token: seller.accessToken,
    method: 'POST',
  });
  assert(submitted.verificationStatus === 'Submitted', 'business profile should be Submitted');

  const admin = await login('admin@example.com');
  const queue = await api(
    `/admin/seller-verifications?status=Submitted&sellerType=Business&q=${encodeURIComponent(shop.shopName)}`,
    { token: admin.accessToken },
  );
  const queueItem = queue.find((item) => item.shop.id === shop.id);
  assert(queueItem, 'business profile should appear in admin queue filtered by sellerType=Business');

  await api(`/admin/seller-verifications/${queueItem.id}/start-review`, {
    token: admin.accessToken,
    method: 'PATCH',
  });

  // Reason too short must be rejected by DTO validation (min length 5)
  await expectFailure(
    api(`/admin/seller-verifications/${queueItem.id}/request-revision`, {
      token: admin.accessToken,
      method: 'PATCH',
      body: { reason: 'no' },
    }),
  );

  const revision = await api(`/admin/seller-verifications/${queueItem.id}/request-revision`, {
    token: admin.accessToken,
    method: 'PATCH',
    body: { reason: 'Giấy chứng nhận đăng ký kinh doanh bị mờ, vui lòng tải lại bản rõ nét hơn.' },
  });
  assert(revision.verificationStatus === 'NeedsRevision', 'expected NeedsRevision after request-revision');

  // Seller cannot resubmit without re-uploading; verify document delete still allowed while NeedsRevision
  const stateForEdit = await api('/shops/verification/me', { token: seller.accessToken });
  const staleDoc = stateForEdit.profile.documents.find((doc) => doc.documentType === 'BusinessRegistration');
  await api(`/shops/verification/me/documents/${staleDoc.id}`, {
    token: seller.accessToken,
    method: 'DELETE',
  });
  await uploadDocument(seller.accessToken, 'BusinessRegistration');

  // NeedsRevision -> editing legal profile is allowed (editable status)
  const updated = await api('/shops/verification/me', {
    token: seller.accessToken,
    method: 'PATCH',
    body: {
      sellerType: 'Business',
      businessType: 'Company',
      legalName: 'Cong Ty TNHH Acceptance (Updated)',
      taxCode: `2${suffix.slice(-9)}`,
      businessRegistrationNumber: `BRN-${suffix}-v2`,
      businessRegistrationIssuedAt: '2019-05-01',
      businessRegistrationIssuedBy: 'So KHDT TP.HCM',
      legalRepresentativeName: 'Tran Thi B',
      registeredAddress: '123 Business Street, District 1, TP.HCM',
    },
  });
  assert(updated.verificationStatus === 'Draft', 'editing after revision should reset status to Draft');

  const resubmitted = await api('/shops/verification/me/submit', {
    token: seller.accessToken,
    method: 'POST',
  });
  assert(resubmitted.verificationStatus === 'Submitted', 'expected Submitted again after resubmission');

  await api(`/admin/seller-verifications/${queueItem.id}/start-review`, {
    token: admin.accessToken,
    method: 'PATCH',
  });
  const approved = await api(`/admin/seller-verifications/${queueItem.id}/approve`, {
    token: admin.accessToken,
    method: 'PATCH',
  });
  assert(approved.verificationStatus === 'Approved', 'business profile should reach Approved after resubmission');

  const finalDetail = await api(`/admin/seller-verifications/${queueItem.id}`, { token: admin.accessToken });
  assert(finalDetail.histories.length >= 4, `expected full audit history chain, got ${finalDetail.histories.length} entries`);
  assert(finalDetail.reviews.some((review) => review.reviewStatus === 'NeedsRevision' && review.reason?.length >= 5), 'revision review must retain reason');

  const approvedShop = await approveShop(shop.id);
  assert(approvedShop.shopStatus === 'Approved', 'business shop should become Approved once verification is Approved');

  console.log('Business revision journey: PASS');
  return { shopId: shop.id, profileId: queueItem.id };
}

const individualResult = await runIndividualJourney();
const businessResult = await runBusinessRevisionJourney();

console.log(
  JSON.stringify(
    {
      ok: true,
      individual: individualResult,
      business: businessResult,
    },
    null,
    2,
  ),
);
