# AI Security Collector - Security Status

## Container Security Scan Results

Last Updated: March 2, 2026

### Known System-Level Vulnerabilities (Accepted Risk)

These vulnerabilities exist in the base Debian Bookworm image and currently have no fixes available from the vendor. They are documented, tracked, and accepted as residual risk.

#### Critical Vulnerabilities (2)

| CVE ID | Package | Severity | Status | Justification |
|--------|---------|----------|--------|---------------|
| CVE-2025-7458 | libsqlite3-0 (3.40.1-2+deb12u2) | CRITICAL | Tracked | SQLite integer overflow. Waiting for Debian security team to release patched version. Application does not directly use SQLite functionality. |
| CVE-2023-45853 | zlib1g (1:1.2.13.dfsg-1) | CRITICAL | Accepted | Heap-based buffer overflow in zipOpenNewFileInZip4_6. Vendor marked as "will_not_fix". Impact: Low - application does not use zip file operations. |

#### High Vulnerabilities (1)

| CVE ID | Package | Severity | Status | Justification |
|--------|---------|----------|--------|---------------|
| CVE-2026-0861 | libc-bin, libc6 (2.36-9+deb12u13) | HIGH | Tracked | glibc integer overflow in memalign. No fix available from vendor yet. Using latest Debian stable version. |

### Security Gate Policy

**Current Settings:**
- **Critical vulnerabilities threshold:** 3 (allows for known system CVEs)
- **High vulnerabilities threshold:** 10 (warning only)

**Rationale:**
- System-level vulnerabilities in base OS images often have no immediate fixes
- Security gate focuses on preventing NEW critical vulnerabilities while tracking known ones
- All Python package vulnerabilities must be resolved (0 tolerance)

### Mitigation Strategies

1. **Regular Scanning:** Container is scanned on every build via Trivy
2. **Update Monitoring:** Automated monitoring for security updates to base image
3. **Minimal Attack Surface:** 
   - Using slim base image (reduced package count)
   - Running as non-root user (UID 1000)
   - No shell access in production
4. **Network Isolation:** Pod runs in isolated namespace with NetworkPolicies
5. **Runtime Protection:** Falco monitors runtime behavior for exploitation attempts

### Python Package Security

All Python package vulnerabilities are addressed:

| Package | Version | Security Fixes |
|---------|---------|----------------|
| torch | >=2.6.0 | CVE-2025-32434 (CRITICAL) ✅ |
| aiohttp | >=3.13.3 | CVE-2025-69223 (HIGH) ✅ |
| starlette | >=0.40.0 | CVE-2024-47874 (HIGH) ✅ |
| python-multipart | >=0.0.22 | CVE-2024-53981, CVE-2026-24486 (HIGH) ✅ |

### Review Schedule

- **Weekly:** Check for Debian security updates
- **Monthly:** Re-evaluate accepted risks
- **Per Build:** Full container scan with security gate

### Escalation

If critical vulnerabilities exceed threshold (3) or high vulnerabilities exceed 10:
1. Build fails automatically
2. Security team notification
3. Emergency patch review required

---

**Note:** This document is auto-updated by the CI/CD pipeline. Manual changes will be overwritten.
