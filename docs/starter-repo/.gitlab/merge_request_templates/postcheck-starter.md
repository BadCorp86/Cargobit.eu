# feat(postcheck): add starter governance-postcheck service (python, docker, k8s)

## Kurzbeschreibung
**Was:** Starter-Repo `governance-postcheck` mit minimalem Python PostCheck Service, Dockerfile, Kubernetes-Deployment und Tests.  
**Warum:** Automatisierte Canary PostChecks für Governance-Workflows (Health Score Validierung vor Promotion).

## Enthaltene Dateien
- governance-postcheck/app/main.py  
- governance-postcheck/app/postcheck.py  
- governance-postcheck/app/requirements.txt  
- governance-postcheck/Dockerfile  
- governance-postcheck/k8s/deployment.yaml  
- governance-postcheck/tests/test_postcheck.py  
- governance-postcheck/README.md  
- .gitignore

## How to test lokal
1. Build: `docker build -t registry.example.com/governance-postcheck:local governance-postcheck/`  
2. Run: `docker run -e PROM_URL=http://<prom-host>:9090 -p 8443:8443 registry.example.com/governance-postcheck:local`  
3. Beispiel Request:
```bash
curl -X POST http://localhost:8443/postcheck \
  -H "Content-Type: application/json" \
  -d '{"partner":"p","endpoint":"e","region":"r","required_health":85,"window":300}'
```
4. Unit Tests: `pytest governance-postcheck/tests`

## CI Checks (erwartet)
- Python: `pip install -r governance-postcheck/app/requirements.txt` und `pytest`  
- Container Security Scan (z. B. Trivy) vor Push in Registry  
- YAML Lint für `k8s/deployment.yaml` falls CI vorhanden

## Voraussetzungen vor Merge
- Image Registry URL in `governance-postcheck/k8s/deployment.yaml` an interne Registry anpassen.  
- `PROM_URL` in Deployment auf interne Prometheus-URL setzen.  
- TLS/Authentication für Prod-Endpoint planen (nicht im Starter enthalten).

## Merge-Kriterien
- [ ] CI grün (Unit Tests bestanden)  
- [ ] Observability Team und SRE Lead haben Review freigegeben  
- [ ] Image Tagging/Registry-Plan dokumentiert in MR-Kommentare

## Reviewer-Checklist
- [ ] `app/postcheck.py` Logik und Fehlerbehandlung geprüft  
- [ ] Tests laufen lokal/CI grün  
- [ ] Dockerfile minimal; SCA-Scan geplant  
- [ ] `k8s/deployment.yaml` Image-URL und `PROM_URL` angepasst  
- [ ] Operational: Health/Readiness Probes und Logging ergänzt (Empfehlung vor Prod)

## Suggested Reviewers / Teams (konkret)
- `@cargobit/observability-team`  
- `@cargobit/sre-lead`  
- `@cargobit/platform-security`
