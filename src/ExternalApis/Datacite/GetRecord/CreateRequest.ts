import { HttpClientRequest } from 'effect/http'
import type { Doi } from '../../../types/index.ts'

export const CreateRequest = (doi: Doi.Doi) =>
  HttpClientRequest.get(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`)
