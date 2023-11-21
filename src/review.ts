import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from './club-details'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from './html'
import { pageNotFound } from './http-error'
import { PageResponse } from './response'
import { clubProfileMatch, preprintReviewsMatch, profileMatch, reviewMatch } from './routes'
import { renderDate } from './time'
import type { ClubId } from './types/club-id'
import type { PreprintId } from './types/preprint-id'
import { isPseudonym } from './types/pseudonym'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  addendum?: Html
  authors: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  club?: ClubId
  doi: Doi
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
    url: URL
  }
  structured: boolean
  text: Html
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable' | 'not-found' | 'removed', Prereview>
}

const getPrereview = (
  id: number,
): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found' | 'removed', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const review = (id: number): RT.ReaderTask<GetPrereviewEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
    RTE.match(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('removed', () => removedMessage)
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )

const failureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to show the PREreview now.</p>

    <p>Please try again later.</p>
  `,
})

const removedMessage = PageResponse({
  status: Status.Gone,
  title: plainText`PREreview removed`,
  main: html`
    <h1>PREreview removed</h1>

    <p>We’ve removed this PREreview.</p>
  `,
})

function createPage({ id, review }: { id: number; review: Prereview }) {
  return PageResponse({
    title: plainText`${review.structured ? 'Structured ' : ''}PREreview of “${review.preprint.title}”`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: review.preprint.id })}" class="back">See other reviews</a>
      <a href="${review.preprint.url.href}" class="forward">Read the preprint</a>
    `,
    main: html`
      <header>
        <h1>
          ${review.structured ? 'Structured ' : ''}PREreview of
          <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
            >${review.preprint.title}</cite
          >
        </h1>

        <div class="byline">
          <span class="visually-hidden">Authored</span> by
          ${pipe(review.authors, RNEA.map(displayAuthor), formatList('en'))}
          ${review.club
            ? html`of the
                <a href="${format(clubProfileMatch.formatter, { id: review.club })}">${getClubName(review.club)}</a>`
            : ''}
        </div>

        <dl>
          <div>
            <dt>Published</dt>
            <dd>${renderDate(review.published)}</dd>
          </div>
          <div>
            <dt>DOI</dt>
            <dd class="doi" translate="no">${review.doi}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>
              ${match(review.license)
                .with(
                  'CC-BY-4.0',
                  () => html`
                    <a href="https://creativecommons.org/licenses/by/4.0/">
                      <dfn>
                        <abbr title="Attribution 4.0 International"><span translate="no">CC BY 4.0</span></abbr>
                      </dfn>
                    </a>
                  `,
                )
                .exhaustive()}
            </dd>
          </div>
        </dl>
      </header>

      <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
        ${fixHeadingLevels(1, review.text)}
      </div>

      ${review.addendum
        ? html`
            <h2>Addendum</h2>

            ${fixHeadingLevels(2, review.addendum)}
          `
        : ''}
    `,
    skipToLabel: 'prereview',
    canonical: format(reviewMatch.formatter, { id }),
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
