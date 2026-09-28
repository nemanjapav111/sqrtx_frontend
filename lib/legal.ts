// The version of each legal document, shown at the top of its page (/terms, /privacy). The API records the version that
// was current when a user accepted (CURRENT_TERMS_VERSION and CURRENT_PRIVACY_VERSION in the backend's
// src/onboarding/onboarding.constants.ts): whenever the text of a document changes, raise the number HERE and THERE,
// so the version a user accepted is always the text that was on the page.
export const TERMS_VERSION = "1";
export const PRIVACY_VERSION = "1";

// The facts the documents need that only the owner knows. Both pages use these, so each one is filled in once, here.
// Everything still in [square brackets] is not filled in yet, and the pages say so at the top. Search this file and
// app/terms, app/privacy for "[" before launch.
//
// sqrtx is first tested WITHOUT a registered company, so the operator is a person. Both documents say so (Terms sections
// 1 and 12, Privacy section 1). When a company is set up: change `operator` to the company's name, remove the "run by
// an individual" sentences, raise both versions, and tell users (Terms section 12 lets the agreement move to the company).
export const LEGAL = {
  operator: "[Your full legal name]", // the person (later the company) behind sqrtx: the "we" of both documents
  address: "[Postal address]", // shown publicly. For a person this is a home address unless a business address or PO box is used
  email: "[Contact email for legal and privacy questions]", // a dedicated address, not a personal one
  updated: "[Date this version was published]",
};
