import { HttpClientRequest } from '@effect/platform'
import type { Doi } from '../../../types/index.ts'

export const CreateRequest = (doi: Doi.Doi) =>
  HttpClientRequest.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
