import { Headers, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as _ from '../src/LegacyRouter.js'

describe('LegacyRouter', () => {
  test.each([
    ['/10.1101/2020.08.27.270835', '/preprints/doi-10.1101-2020.08.27.270835'],
    ['/10.5281/zenodo.3733767', '/preprints/doi-10.5281-zenodo.3733767'],
    ['/blog', 'https://content.prereview.org/'],
    ['/blog?articles_format=grid', 'https://content.prereview.org/'],
    ['/coc', '/code-of-conduct'],
    ['/communities', '/clubs'],
    ['/communities?page=1', '/clubs'],
    ['/communities?search=&page=2&limit=10&offset=0', '/clubs'],
    ['/docs/about', '/about'],
    ['/docs/codeofconduct', '/code-of-conduct'],
    ['/docs/code_of_conduct', '/code-of-conduct'],
    ['/docs/resources', '/resources'],
    ['/edi-statement', '/edia-statement'],
    ['/edia', '/edia-statement'],
    ['/find-a-preprint', '/review-a-preprint'],
    ['/inst/7204/', 'https://www.authorea.com/inst/7204'],
    ['/inst/15119?articles_format=grid&current_inst_tab=statistics', 'https://www.authorea.com/inst/15119'],
    ['/login', '/log-in'],
    ['/login?next=/10.1101/2020.03.24.004655', '/log-in'],
    ['/logout', '/log-out'],
    ['/preprint-journal-clubs', '/live-reviews'],
    ['/prereview.org', '/'],
    ['/PREreview.org', '/'],
    ['/reviews/new', '/review-a-preprint'],
    ['/signup', '/log-in'],
    ['/users/61782', 'https://www.authorea.com/users/61782'],
    ['/users/161073', 'https://www.authorea.com/users/161073'],
    ['/users/173578?articles_format=list&direction=desc&sort=created_at', 'https://www.authorea.com/users/173578'],
    [
      '/users/153686/articles/200859-preprint-info-doc',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
    [
      '/users/174325/articles/208401-基于网络参数的生物标记可以自动找到棘波',
      'https://www.authorea.com/users/174325/articles/208401-%E5%9F%BA%E4%BA%8E%E7%BD%91%E7%BB%9C%E5%8F%82%E6%95%B0%E7%9A%84%E7%94%9F%E7%89%A9%E6%A0%87%E8%AE%B0%E5%8F%AF%E4%BB%A5%E8%87%AA%E5%8A%A8%E6%89%BE%E5%88%B0%E6%A3%98%E6%B3%A2',
    ],
    [
      '/users/153686/articles/200859-preprint-info-doc/_show_article',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints/_show_article',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
    [
      '/users/174325/articles/208401-基于网络参数的生物标记可以自动找到棘波/_show_article',
      'https://www.authorea.com/users/174325/articles/208401-%E5%9F%BA%E4%BA%8E%E7%BD%91%E7%BB%9C%E5%8F%82%E6%95%B0%E7%9A%84%E7%94%9F%E7%89%A9%E6%A0%87%E8%AE%B0%E5%8F%AF%E4%BB%A5%E8%87%AA%E5%8A%A8%E6%89%BE%E5%88%B0%E6%A3%98%E6%B3%A2',
    ],
    ['/)', '/'],
    ['/),', '/'],
  ])('redirects %s', (path, expected) =>
    Effect.gen(function* () {
      const request = HttpServerRequest.fromWeb(new Request(`http://localhost/${path}`))

      const response = yield* Effect.provideService(_.LegacyRouter, HttpServerRequest.HttpServerRequest, request)

      expect(response).toStrictEqual(
        HttpServerResponse.empty({
          status: StatusCodes.MOVED_PERMANENTLY,
          headers: Headers.fromInput({ location: expected }),
        }),
      )
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runSync),
  )
})
