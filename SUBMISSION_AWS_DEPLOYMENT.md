# ShopSmart AWS Deployment — Submission Index

**PDC50 Full Stack AI Application Development** · ShopSmart AWS Deployment Learning Guide (13 Nov 2026)
**Developer:** Reighfer Joshua V. Bondoc · BSIT-4A · solo
**Repository:** https://github.com/reighbabs27/PDC50_ShopSmart
**Site URL:** ☐ FILL `https://shopsmart-<a-b-c-d>.sslip.io`

## Required submission items

| Guide asks for | Submitted as | Status |
|---|---|---|
| Site URL | Top of this file | ☐ fill after deploy |
| Updated project / repository | This repository, tag `v1.1.0` | ✅ code done · ☐ commit, tag, push |
| Deployment diagram | `docs/diagrams/aws-deployment.png` (source `.mmd`) | ✅ |
| Short decision record for the chosen architecture | `docs/AWS_DEPLOYMENT_PLAN.md` §2 | ✅ |
| Redacted screenshots or logs | `docs/evidence/` (smoke reports + screenshots) | ☐ after deploy |
| Release note | `docs/RELEASE_NOTE_v1.1.0.md` | ✅ · ☐ fill URL/commit |
| AWS account plan | Plan §4 | ☐ fill from Billing |
| Service names | EC2, EBS, Elastic IP, security group, AWS Budgets (plan §5) | ✅ |
| Region | ap-southeast-1 (Singapore) | ✅ |
| Tested URLs | Smoke evidence file lists every URL | ☐ after deploy |
| Code version | `/api/health` → `version` + `commit`; recorded in smoke evidence | ☐ after deploy |
| Local or hosted release | Release note header | ☐ tick one |
| The two improvements and retests | `docs/AWS_VERIFICATION_RECORD.md` §F | ✅ written · ☐ confirm against exam, fill results |

## Guide section → where it is handled

| Guide section | Implementation | Evidence |
|---|---|---|
| What the deployed app must do | Products, cart, assistant, sign-in, simulated order, private orders | Smoke test, verification §A–B |
| The four parts and their jobs | nginx-served Vite build · Express on EC2 · PostgreSQL on the same host · mock provider adapter | Diagram, plan §3 |
| Understand the AWS account | Plan, credits, expiry, MFA, IAM identity, budget, resource register | Plan §4–5 (☐ fill) |
| Choose an architecture | Decision record: single EC2 host; Layout B supported | Plan §2 |
| Frontend hosting / public config | `VITE_API_URL=/api`, SPA rewrite in nginx, `amplify.yml` for B | Smoke "Direct visit" rows |
| API host: processes and network | systemd unit, `HOST=127.0.0.1`, ports table, security group | Smoke port probes, verification §C |
| AWS identity vs ShopSmart identity | IAM for console; sessions + `canReadOrder` in API | Plan §4, ownership tests |
| Database: persistence and migrations | Additive migration, `migrate deploy`, guarded seed, pre-deploy backup | Plan §8, verification C5 |
| Assistant trust boundary | Selection first, public fields only, ID + price verification, failure labels, mock badge | `assistant-provider.test.js`, B8–B10 |
| What to verify on the hosted version | `scripts/smoke-test.mjs` + manual checklist with expected results written first | `docs/AWS_VERIFICATION_RECORD.md` |
| Use symptoms to locate a problem | Symptom table adapted to this layout | Plan §10 |
| End of the demo | Cleanup steps incl. releasing the Elastic IP | Plan §11 |

## What only you can do (in order)

1. **Pull the new code into git**: review the changes, then `npm install`, `npm run db:migrate`, `npm run check`, try `/account` locally. Commit, `git tag v1.1.0`, push.
2. **Account checks** in the AWS console: plan, credits, expiry, root MFA, an IAM identity for daily work, a zero-spend budget. Screenshot (redacted).
3. **Launch** per plan §9 (Ubuntu 24.04, ap-southeast-1, security group per §6, Elastic IP), then run `deploy/setup-ec2.sh`.
4. **Verify**: `npm run smoke -- https://<your-domain>`, then the manual checks B1–B11, C1–C5, D1–D4.
5. **Fill** every ☐ in the plan, verification record, release note and this file. Commit the evidence.
6. **After grading**: clean up per plan §11 and screenshot the remaining credits.
