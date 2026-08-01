import { apiFetch } from '../../lib/api'
import type { PublicStudent } from './types'

export async function fetchPublicStudent(studentId: number) {
  const payload = await apiFetch<{ profile: PublicStudent }>(`/api/students/${studentId}/`)
  return payload.profile
}
