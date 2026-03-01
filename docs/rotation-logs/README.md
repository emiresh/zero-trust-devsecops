# 🔄 Secret Rotation Logs

This directory contains automated logs of secret rotation operations performed by the GitHub Actions workflow.

## 📋 Contents

| File | Description |
|------|-------------|
| [rotation-history.md](rotation-history.md) | Complete history of all secret rotation operations |

## 📖 About Rotation Logs

### Purpose
The rotation-history.md file automatically tracks every secret rotation operation, providing:
- Audit trail for compliance and security reviews
- Troubleshooting information for failed rotations
- Historical record of when secrets were last rotated
- Links to workflow runs and commits for full context

### Log Format
Each rotation entry includes:
- **Timestamp**: When the rotation occurred
- **Namespace**: Which environment was rotated (dev/staging/prod)
- **Secret Type**: Which secrets were rotated (all/mongodb/pagerduty)
- **Triggered By**: GitHub user who initiated the rotation
- **Status**: Whether MongoDB and PagerDuty secrets were successfully rotated
- **Workflow Run**: Direct link to GitHub Actions run
- **Commit**: Git commit hash of the rotation

### Automated Maintenance
- Logs are automatically appended by the [Secret Rotation Workflow](../workflows/SECRET-ROTATION-WORKFLOW.md)
- No manual editing required
- Entries are sorted chronologically (newest first)

## 🔗 Related Documentation

- [Secret Rotation Workflow](../workflows/SECRET-ROTATION-WORKFLOW.md) - How the automation works
- [Security Overview](../security/SECURITY-OVERVIEW.md#secret-management) - Secret management strategy
- [SealedSecrets Guide](../security/SEALEDSECRETS-PERMANENT-KEY.md) - How secrets are encrypted

## 🔍 Usage Examples

### Check Last Rotation
```bash
head -20 docs/rotation-logs/rotation-history.md
```

### Find Rotations for Specific Namespace
```bash
grep -A 8 "Namespace: prod" docs/rotation-logs/rotation-history.md
```

### Count Total Rotations
```bash
grep -c "^## Rotation:" docs/rotation-logs/rotation-history.md
```

### View Recent Failed Rotations
```bash
grep -B 2 "false" docs/rotation-logs/rotation-history.md
```

---

**Note**: This is an auto-generated log directory. Do not manually edit rotation-history.md unless troubleshooting workflow issues.
