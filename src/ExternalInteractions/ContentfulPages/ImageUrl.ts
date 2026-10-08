import { UrlParams } from '@effect/platform'
import { Array } from 'effect'

const widelySupportedContentTypes = ['image/jpeg', 'image/png', 'image/gif']

export const fallbackFormat = (contentType: string): UrlParams.UrlParams =>
  Array.contains(widelySupportedContentTypes, contentType) ? UrlParams.empty : UrlParams.fromInput({ fm: 'jpg' })
