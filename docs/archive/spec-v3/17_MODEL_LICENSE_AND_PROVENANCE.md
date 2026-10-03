# 17 — Model License and Provenance Policy

**Version:** 3.0.0  
**Status:** Authoritative

---

## 1. Critical Distinction

**SOFTWARE LICENSE ≠ MODEL LICENSE ≠ MODEL WEIGHT REDISTRIBUTION RIGHTS ≠ MODEL HOSTING RIGHTS**

Using Handy's MIT-licensed code does NOT automatically grant Soravo rights to redistribute or commercially use the models Handy supports.

Each model must be independently verified. Unknown licenses remain BLOCKED until verified.

---

## 2. Required Fields

For every supported model, document:

| Field | Description |
|---|---|
| model | Model name/identifier |
| version | Exact version/commit |
| publisher | Organization or individual publishing the model |
| upstream_source | Official upstream source URL |
| exact_artifact | Specific file/download URL |
| license | License text or identifier |
| commercial_use | Allowed/Not allowed/Unknown |
| redistribution | Allowed/Not allowed/Unknown |
| derivative_use | Allowed/Not allowed/Unknown |
| attribution | Required attribution text |
| checksum | SHA-256 or other hash |
| hosting_restrictions | Any restrictions on hosting |
| mirror_restrictions | Any restrictions on mirroring |
| status | VERIFIED / PENDING / BLOCKED |
| evidence/source | Link to license/communication |
| last_verified_date | Date of verification |

---

## 3. Verification Requirements

### 3.1 Must Be VERIFIED

- License text explicitly permits commercial use
- License text explicitly permits redistribution (if Soravo redistributes)
- Exact artifact provenance documented
- Checksum verified

### 3.2 Must Be BLOCKED

- Unknown or unspecified license
- License forbids commercial use
- License forbids redistribution
- Artifact source unverified

---

## 4. Verification Process

1. **Identify exact source** — Where does the model come from?
2. **Retrieve license** — What does the license say?
3. **Check commercial rights** — Is commercial use explicitly permitted?
4. **Check redistribution rights** — Is redistribution explicitly permitted?
5. **Record attribution requirements** — What must be displayed?
6. **Verify artifact integrity** — Checksum/verification
7. **Document all findings** — Record in provenance log

---

## 5. Model Categories

### 5.1 Parakeet

| Model | Status | Notes |
|---|---|---|
| Parakeet V2 | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Parakeet V3 | BLOCKED | Hosted on blob.handy.computer; license unverified |

### 5.2 Whisper

| Model | Status | Notes |
|---|---|---|
| Whisper variants | BLOCKED | Hosted on blob.handy.computer; license unverified |

### 5.3 Other Models

| Model | Status | Notes |
|---|---|---|
| Moonshine | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Sense Voice | BLOCKED | Hosted on blob.handy.computer; license unverified |

---

## 6. Actions Required

1. **Contact Handy/CJPais** — Obtain explicit license terms for all models
2. **Document license texts** — Preserve exact license text
3. **Verify commercial rights** — Confirm commercial use is permitted
4. **Verify redistribution** — Confirm redistribution is permitted (if needed)
5. **Update manifest** — Populate model catalog with verified data

---

## 7. Blocking Rules

**DO NOT proceed with model distribution or commercial release if:**

- Any required model has status BLOCKED
- License verification is incomplete
- Redistribution rights are unclear (for models Soravo redistributes)

---

## 8. Model Manifest Policy

Every released version must include:
- Verified model manifests
- Checksums
- License references
- Attribution text

The manifest must be signed or cryptographically verifiable.

---

## 9. Mirror/Hosting Policy

If Soravo hosts models directly:
- Explicit hosting rights must be verified
- Mirror restrictions must be documented
- Attribution requirements must be fulfilled

---

## 10. Audit Trail

Every model verification must be documented in:
- docs/COMPLIANCE/model-licenses.md
- Model manifest JSON
- Release notes (for distribution)

---

## 11. Unknown = Blocked

If a model's license cannot be verified within 30 days of project start, mark it BLOCKED and:
- Remove from supported models
- Find alternatives with verified licenses
- Document the decision

**Never convert an unknown license into an assumption.**
