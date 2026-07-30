import { apiBaseUrl } from './env'
import type {
  AccountingOverrideRequest,
  CorrectionEmailResponse,
  CorrectionRequest,
  DecisionRequest,
  DocumentResponse,
  GlAccountItem,
} from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, init)
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const form = new FormData()
  form.append('file', file)
  return request<DocumentResponse>('/api/documents', {
    method: 'POST',
    body: form,
  })
}

export async function listDocuments(): Promise<DocumentResponse[]> {
  return request<DocumentResponse[]>('/api/documents')
}

export async function getDocument(id: string): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${id}`)
}

export async function deleteDocument(id: string): Promise<void> {
  return request<void>(`/api/documents/${id}`, { method: 'DELETE' })
}

export async function applyCorrections(
  id: string,
  body: CorrectionRequest,
): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function overrideGl(
  id: string,
  body: AccountingOverrideRequest,
): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${id}/accounting`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function setDecision(
  id: string,
  body: DecisionRequest,
): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function draftCorrectionEmail(
  id: string,
): Promise<CorrectionEmailResponse> {
  return request<CorrectionEmailResponse>(`/api/documents/${id}/correction-email`, {
    method: 'POST',
  })
}

// ─── Accounting ───────────────────────────────────────────────────────────────

export async function listGlAccounts(): Promise<GlAccountItem[]> {
  return request<GlAccountItem[]>('/api/accounting/gl-accounts')
}
