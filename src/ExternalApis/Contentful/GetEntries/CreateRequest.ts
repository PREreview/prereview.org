import { HttpClientRequest, type UrlParams } from '@effect/platform'
import { Effect, identity, pipe } from 'effect'
import { ContentfulConfig, UsePreviewApi } from '../ContentfulConfig.ts'

export const CreateRequest = Effect.fnUntraced(function* (urlParams: UrlParams.Input = {}) {
  const config = yield* ContentfulConfig
  const usePreviewApi = yield* UsePreviewApi

  return pipe(
    HttpClientRequest.get(
      `${usePreviewApi ? 'https://preview.contentful.com' : 'https://cdn.contentful.com'}/spaces/${config.spaceId}/environments/${config.environmentId}/entries`,
    ),
    HttpClientRequest.accept('application/vnd.contentful.delivery.v1+json'),
    HttpClientRequest.bearerToken(usePreviewApi ? config.previewAccessToken : config.accessToken),
    usePreviewApi ? HttpClientRequest.setHeader('Cache-Control', 'no-store') : identity,
    HttpClientRequest.setUrlParams(urlParams),
    HttpClientRequest.setUrlParam('locale', '*'),
  )
})
