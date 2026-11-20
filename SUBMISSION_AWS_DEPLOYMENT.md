# ShopSmart AWS Deployment — Submission Index

**PDC50 Full Stack AI Application Development** · ShopSmart AWS Deployment Learning Guide (13 Nov 2026)
**Developer:** Reighfer Joshua V. Bondoc · BSIT-4A · solo
**Repository:** https://github.com/reighbabs27/PDC50_ShopSmart
**Site URL:** https://shopsmart-13-210-209-254.sslip.io

## Required submission items

| Guide asks for | Submitted as | Status |
|---|---|---|
| Site URL | Top of this file | ✅ |
| Updated project / repository | This repository, tag `v1.1.0` | ✅ pushed, tag `v1.1.0` = `7331c33` |
| Deployment diagram | `docs/diagrams/aws-deployment.png` (source `.mmd`) | ✅ |
| Short decision record for the chosen architecture | `docs/AWS_DEPLOYMENT_PLAN.md` §2 | ✅ |
| Redacted screenshots or logs | `docs/evidence/` (2 smoke reports, server check log, screenshots) | ✅ |
| Release note | `docs/RELEASE_NOTE_v1.1.0.md` | ✅ |
| AWS account plan | Plan §4: Free plan, US$110.23 credits, 171 days left (`docs/evidence/account-free-plan-credits.jpg`) | ✅ |
| Service names | EC2, EBS, Elastic IP, security group, AWS Budgets (plan §5) | ✅ |
| Region | ap-southeast-2 (Sydney) | ✅ |
| Tested URLs | Smoke evidence file lists every URL | ✅ |
| Code version | `/api/health` → `version` + `commit`; recorded in smoke evidence | ✅ 1.1.0 / 7331c33 |
| Local or hosted release | Release note header | ✅ Hosted |
| The two improvements and retests | `docs/AWS_VERIFICATION_RECORD.md` §F | ✅ retested (☐ confirm the two match your exam) |

## Guide section → where it is handled

| Guide section | Implementation | Evidence |
|---|---|---|
| What the deployed app must do | Products, cart, assistant, sign-in, simulated order, private orders | Smoke test, verification §A–B |
| The four parts and their jobs | nginx-served Vite build · Express on EC2 · PostgreSQL on the same host · mock provider adapter | Diagram, plan §3 |
| Understand the AWS account | Plan, credits, expiry, MFA, IAM identity, budget, resource register | Plan §4–5 ✅ |
| Choose an architecture | Decision record: single EC2 host; Layout B supported | Plan §2 |
| Frontend hosting / public config | `VITE_API_URL=/api`, SPA rewrite in nginx, `amplify.yml` for B | Smoke "Direct visit" rows |
| API host: processes and network | systemd unit, `HOST=127.0.0.1`, ports table, security group | Smoke port probes, verification §C |
| AWS identity vs ShopSmart identity | IAM for console; sessions + `canReadOrder` in API | Plan §4, ownership tests |
| Database: persistence and migrations | Additive migration, `migrate deploy`, guarded seed, pre-deploy backup | Plan §8, verification C5 |
| Assistant trust boundary | Selection first, public fields only, ID + price verification, failure labels, mock badge | `assistant-provider.test.js`, B8–B10 |
| What to verify on the hosted version | `scripts/smoke-test.mjs` + manual checklist with expected results written first | `docs/AWS_VERIFICATION_RECORD.md` |
| Use symptoms to locate a problem | Symptom table adapted to this layout | Plan §10 |
| End of the demo | Cleanup steps incl. releasing the Elastic IP | Plan §11 |

## Status (20 November 2026)

Done: code pushed and tagged `v1.1.0` · account checked (Free plan, US$110.23 credits, 171 days left, Sydney only) · zero-spend budget · EC2 + Elastic IP + security group in ap-southeast-2 · `setup-ec2.sh` run (HTTPS via Let's Encrypt) · smoke 27/27 twice (before and after reboot) · all manual checks B1–B11 · server checks C1–C5 · D1–D4 · `npm run check` passed · evidence in `docs/evidence/`.

Open items for the owner:
1. **Root MFA is not enabled** (`AccountMFAEnabled: 0`). Enable it and add a redacted screenshot to `docs/evidence/`.
2. **Confirm** the two improvements in verification §F match the two your exam names.
3. **After grading:** clean up per plan §11 (only `Project=ShopSmart` resources, not AutoHub) and screenshot the remaining credits.
4. Verify the AWS Budgets email (sent to your AUF address) so the alert can reach you.
