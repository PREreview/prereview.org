import { HttpClientRequest, type UrlParams } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { ContentfulConfig } from '../ContentfulConfig.ts'
import type { ContentfulId } from '../Types.ts'

export const CreateRequest = Effect.fnUntraced(function* (id: ContentfulId, urlParams: UrlParams.Input = {}) {
  const config = yield* ContentfulConfig

  return pipe(
    HttpClientRequest.get(
      `https://cdn.contentful.com/spaces/${config.spaceId}/environments/${config.environmentId}/entries/${id}`,
    ),
    HttpClientRequest.accept('application/vnd.contentful.delivery.v1+json'),
    HttpClientRequest.bearerToken(config.accessToken),
    HttpClientRequest.setUrlParams(urlParams),
  )
})
