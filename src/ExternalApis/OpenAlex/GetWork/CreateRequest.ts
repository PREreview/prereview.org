import { HttpClientRequest } from '@effect/platform'
import { Doi } from '../../../types/index.ts'

export const CreateRequest = (doi: Doi.Doi) =>
  HttpClientRequest.get(`https://api.openalex.org/works/${Doi.toUrl(doi).href}`)
