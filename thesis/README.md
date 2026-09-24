# Thesis and Paper

**Automating Continuous Compliance in DevSecOps Through Zero Trust: A
Kubernetes Microservices Reference Implementation**
EMIM Ekanayaka, Master of Information Security (MIS), University of Colombo
School of Computing (UCSC), 2026. Supervisor: Roshan N. Rajapakse.

## Contents

- **[`FINAL_REPORT.pdf`](FINAL_REPORT.pdf)** - the complete, submitted final
  report (76 pages): full literature review, design rationale, implementation
  detail, evaluation (NIST SP 800-207 mapping, MITRE ATT&CK coverage, pipeline
  gate testing), discussion, and appendices with the complete policy, rule,
  and pipeline specifications. This is the authoritative, citable account of
  the research.
- **[`ieee-paper/`](ieee-paper/)** - a condensed, nine-page IEEE
  conference-format version of the same research (`paper.tex`, `paper.pdf`),
  built with the IEEEtran LaTeX class. It is derived from and consistent with
  `FINAL_REPORT.pdf`, restructured and shortened for publication-style
  reading. To rebuild it: `tectonic paper.tex` from within `ieee-paper/` (or
  any LaTeX distribution with the `IEEEtran` class installed).
- **[`diagrams/`](diagrams/)** - architecture and flow diagrams (Mermaid
  source `.mmd` files plus rendered `.png`), used in both documents.

## Citing This Work

See [`../CITATION.cff`](../CITATION.cff), or cite directly:

> E. Ekanayaka, "Automating Continuous Compliance in DevSecOps Through Zero
> Trust: A Kubernetes Microservices Reference Implementation," Master's
> thesis, University of Colombo School of Computing (UCSC), 2026.

The thesis and paper are licensed under CC BY 4.0 - see
[`../LICENSE-DOCS`](../LICENSE-DOCS). The accompanying implementation (the
rest of this repository) is licensed under MIT - see [`../LICENSE`](../LICENSE).
