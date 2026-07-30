# Azure Single-Container Deployment Strategy

This document details the single-container deployment strategy for the **Invoice Review Application** to Microsoft Azure within resource group **`rg-invoice-review`** (`centralindia`).

---

## 1. Container Routing & Service Architecture

```
                         ┌──────────────────────────────┐
                         │ Azure Files mount /app/data  │
                         │ (SQLite & uploads storage)   │
                         └──────────────▲───────────────┘
                                        │
┌────────────────┐     ┌────────────────┴───────────────┐     ┌────────────────────────────────┐
│                │     │                                │ ───>│ di-invoice-review-harsh        │
│                │ ───>│ /api and /health               │     │ (Azure Document Intelligence)  │
│ uvicorn :8000  │     │                                │     └────────────────────────────────┘
│                │     └────────────────────────────────┘     ┌────────────────────────────────┐
│                │                                            │ rg-invoice-review-harsh-foundry│
│                │     ┌────────────────────────────────┐ ───>│ (Azure AI Foundry / OpenAI)    │
│                │ ───>│ Static SPA from frontend/dist  │     └────────────────────────────────┘
└────────────────┘     └────────────────────────────────┘
```

---

## 2. Resource Tiers, Standing Costs & Cleanup Matrix

| Resource | Tier / SKU | Standing Cost (Typical Demo) | Cleanup Command |
|---|---|---|---|
| **Azure Container Registry** | `Basic` | Small monthly fee while it exists | `az acr delete --name acrinvoicereviewharsh --resource-group rg-invoice-review` |
| **Container Apps Environment** | `Consumption` | ~€0 when idle | `az containerapp env delete --name env-invoice-review --resource-group rg-invoice-group` |
| **Container App** | `Consumption` (0.25 vCPU, 0.5 GiB) | Pay only while replicas run; **scales to 0** | `az containerapp delete --name app-invoice-review --resource-group rg-invoice-review` |
| **Storage Account + Azure Files** | `Standard_LRS` (small file share) | Cents for a tiny SQLite / uploads share | `az storage account delete --name stinvrevharsh --resource-group rg-invoice-review` |
| **Log Analytics Workspace** | `Pay-as-you-go` | Small ingestion while logging | Deleted automatically with Environment |

---

## 3. Persistent Volume Storage
- **Storage Share**: `share-invoice-review` on Storage Account `stinvrevharsh`.
- **Mount Point**: `/app/backend/data` inside the container.
- **Role**: Ensures that the SQLite database (`invoice_review.db`) and uploaded document files (`uploads/`) persist across container scale-to-zero and restart events.

---

## 4. Provisioning Commands Reference

```bash
# 1. Create Azure Container Registry (ACR)
az acr create \
  --resource-group rg-invoice-review \
  --name acrinvoicereviewharsh \
  --sku Basic \
  --admin-enabled true

# 2. Create Storage Account & Azure File Share
az storage account create \
  --resource-group rg-invoice-review \
  --name stinvrevharsh \
  --location centralindia \
  --sku Standard_LRS

STORAGE_KEY=$(az storage account keys list -g rg-invoice-review -n stinvrevharsh --query "[0].value" -o tsv)

az storage share create \
  --account-name stinvrevharsh \
  --account-key $STORAGE_KEY \
  --name share-invoice-review

# 3. Cloud Build Container Image
az acr build \
  --registry acrinvoicereviewharsh \
  --image invoice-review:v1 .

# 4. Create Container Apps Environment
az containerapp env create \
  --name env-invoice-review \
  --resource-group rg-invoice-review \
  --location centralindia

# 5. Link Storage Share to Container Apps Environment
az containerapp env storage set \
  --name env-invoice-review \
  --resource-group rg-invoice-review \
  --storage-name data-volume \
  --azure-file-account-name stinvrevharsh \
  --azure-file-account-key $STORAGE_KEY \
  --azure-file-share-name share-invoice-review \
  --access-mode ReadWrite

# 6. Deploy Container App with Mount & Scale-to-Zero
az containerapp create \
  --name app-invoice-review \
  --resource-group rg-invoice-review \
  --environment env-invoice-review \
  --image acrinvoicereviewharsh.azurecr.io/invoice-review:v1 \
  --ingress external \
  --target-port 8000 \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    APP_PASSWORD="Northstar2026!Review" \
    ALLOWED_ORIGIN="*"
```
