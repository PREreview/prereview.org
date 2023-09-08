import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as I from 'fp-ts/Identity'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { get } from 'spectacles-ts'
import textClipper from 'text-clipper'
import { match, P as p } from 'ts-pattern'
import { getClubName } from './club-details'
import type { ClubId } from './club-id'
import { type Html, fixHeadingLevels, html, plainText, rawHtml, sendHtml } from './html'
import { addCanonicalLinkHeader, notFound } from './middleware'
import { page } from './page'
import { type Preprint, getPreprint } from './preprint'
import type { PreprintId } from './preprint-id'
import { isPseudonym } from './pseudonym'
import { preprintReviewsMatch, profileMatch, reviewMatch, writeReviewMatch } from './routes'
import { renderDate } from './time'
import { type User, maybeGetUser } from './user'

export interface Prereview {
  authors: ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  club?: ClubId
  id: number
  language?: LanguageCode
  text: Html
}

interface RapidPrereview {
  author: {
    name: string
    orcid?: Orcid
  }
  questions: {
    availableCode: 'yes' | 'unsure' | 'na' | 'no'
    availableData: 'yes' | 'unsure' | 'na' | 'no'
    coherent: 'yes' | 'unsure' | 'na' | 'no'
    ethics: 'yes' | 'unsure' | 'na' | 'no'
    future: 'yes' | 'unsure' | 'na' | 'no'
    limitations: 'yes' | 'unsure' | 'na' | 'no'
    methods: 'yes' | 'unsure' | 'na' | 'no'
    newData: 'yes' | 'unsure' | 'na' | 'no'
    novel: 'yes' | 'unsure' | 'na' | 'no'
    peerReview: 'yes' | 'unsure' | 'na' | 'no'
    recommend: 'yes' | 'unsure' | 'na' | 'no'
    reproducibility: 'yes' | 'unsure' | 'na' | 'no'
  }
}

export interface GetPrereviewsEnv {
  getPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export interface GetRapidPrereviewsEnv {
  getRapidPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<RapidPrereview>>
}

const sendPage = (args: {
  preprint: Preprint
  reviews: ReadonlyArray<Prereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
  user?: User
}) =>
  pipe(
    RM.rightReader(createPage(args)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => addCanonicalLinkHeader(preprintReviewsMatch.formatter, { id: args.preprint.id })),
    RM.ichainMiddlewareK(sendHtml),
  )

const getPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews(id)))

const getRapidPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetRapidPrereviewsEnv, 'unavailable', ReadonlyArray<RapidPrereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getRapidPrereviews }) => getRapidPrereviews(id)))

export const preprintReviews = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.chainReaderTaskEitherKW(preprint =>
    pipe(
      RTE.Do,
      RTE.let('preprint', () => preprint),
      RTE.apS('rapidPrereviews', getRapidPrereviews(preprint.id)),
      RTE.apSW('reviews', getPrereviews(preprint.id)),
    ),
  ),
  RM.apSW('user', maybeGetUser),
  RM.ichainW(sendPage),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => pipe(maybeGetUser, RM.ichainW(showFailureMessage)))
      .exhaustive(),
  ),
)

const showFailureMessage = flow(
  fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

function failureMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the preprint and its PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createPage({
  preprint,
  reviews,
  rapidPrereviews,
  user,
}: {
  preprint: Preprint
  reviews: ReadonlyArray<Prereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
  user?: User
}) {
  return page({
    title: plainText`PREreviews of “${preprint.title.text}”`,
    content: html`
      <h1 class="visually-hidden">
        PREreviews of
        <cite lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}"
          >${preprint.title.text}</cite
        >
      </h1>

      <aside id="preprint-details" tabindex="0" aria-label="Preprint details">
        <article aria-labelledby="preprint-title">
          <header>
            <h2 lang="${preprint.title.language}" dir="${getLangDir(preprint.title.language)}" id="preprint-title">
              ${preprint.title.text}
            </h2>

            <div class="byline">
              <span class="visually-hidden">Authored</span> by
              ${pipe(preprint.authors, RNEA.map(displayAuthor), formatList('en'))}
            </div>

            <dl>
              <div>
                <dt>Posted</dt>
                <dd>${renderDate(preprint.posted)}</dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>
                  ${match(preprint.id.type)
                    .with('africarxiv', () => 'AfricArXiv Preprints')
                    .with('arxiv', () => 'arXiv')
                    .with('authorea', () => 'Authorea')
                    .with('biorxiv', () => 'bioRxiv')
                    .with('chemrxiv', () => 'ChemRxiv')
                    .with('eartharxiv', () => 'EarthArXiv')
                    .with('ecoevorxiv', () => 'EcoEvoRxiv')
                    .with('edarxiv', () => 'EdArXiv')
                    .with('engrxiv', () => 'engrXiv')
                    .with('medrxiv', () => 'medRxiv')
                    .with('metaarxiv', () => 'MetaArXiv')
                    .with('osf', () => 'OSF Preprints')
                    .with('philsci', () => 'PhilSci-Archive')
                    .with('preprints.org', () => 'Preprints.org')
                    .with('psyarxiv', () => 'PsyArXiv')
                    .with('research-square', () => 'Research Square')
                    .with('scielo', () => 'SciELO Preprints')
                    .with('science-open', () => 'ScienceOpen Preprints')
                    .with('socarxiv', () => 'SocArXiv')
                    .with('zenodo', () => 'Zenodo')
                    .exhaustive()}
                </dd>
              </div>
              ${match(preprint.id)
                .with(
                  { type: 'philsci' },
                  id => html`
                    <div>
                      <dt>Item ID</dt>
                      <dd>${id.value}</dd>
                    </div>
                  `,
                )
                .with(
                  { value: p.when(isDoi) },
                  id => html`
                    <div>
                      <dt>DOI</dt>
                      <dd class="doi" translate="no">${id.value}</dd>
                    </div>
                  `,
                )
                .exhaustive()}
            </dl>
          </header>

          ${preprint.abstract
            ? html`
                <h3>Abstract</h3>

                <div lang="${preprint.abstract.language}" dir="${getLangDir(preprint.abstract.language)}">
                  ${fixHeadingLevels(3, preprint.abstract.text)}
                </div>
              `
            : ''}

          <a href="${preprint.url.href}" class="button">Read the preprint</a>
        </article>
      </aside>

      <main id="prereviews">
        ${pipe(
          rapidPrereviews,
          RA.matchW(() => '', showRapidPrereviews),
        )}

        <h2>${reviews.length} PREreview${reviews.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, { id: preprint.id })}" class="button">Write a PREreview</a>

        <ol class="cards">
          ${reviews.map(showReview)}
        </ol>
      </main>
    `,
    skipLinks: [
      [html`Skip to preprint details`, '#preprint-details'],
      [html`Skip to PREreviews`, '#prereviews'],
    ],
    type: 'two-up',
    user,
  })
}

function showReview(review: Prereview) {
  return html`
    <li>
      <article aria-labelledby="prereview-${review.id}-title">
        <header>
          <h3 class="visually-hidden" id="prereview-${review.id}-title">
            PREreview by ${review.authors[0].name} ${review.authors.length > 1 ? 'et al.' : ''}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </h3>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(review.authors, RNEA.map(get('name')), formatList('en'))}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </div>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(
            3,
            rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5, stripTags: ['a'] })),
          )}
        </div>

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the PREreview by ${review.authors[0].name} ${review.authors.length > 1 ? 'et al.' : ''}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </span>
        </a>
      </article>
    </li>
  `
}

function showRapidPrereviews(rapidPrereviews: ReadonlyNonEmptyArray<RapidPrereview>): Html {
  return html`
    <h2>${rapidPrereviews.length} Rapid PREreview${rapidPrereviews.length !== 1 ? 's' : ''}</h2>

    <div class="byline">
      <span class="visually-hidden">Authored</span> by
      ${pipe(rapidPrereviews, RNEA.map(flow(get('author'), displayAuthor)), formatList('en'))}
    </div>

    <details>
      <summary><span>Where can I fill out a Rapid PREreview?</span></summary>

      <div>
        <p>
          We haven’t yet added the form to the new version of PREreview as we’re looking to improve how Rapid PREreviews
          work; if you could help, please <a href="mailto:contact@prereview.org">get in touch</a>.
        </p>
      </div>
    </details>

    <div role="region" aria-labelledby="rapid-prereviews-caption" tabindex="0">
      <table>
        <caption id="rapid-prereviews-caption" class="visually-hidden">
          Aggregated Rapid PREreviews
        </caption>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Question</span></th>
            <th scope="col">Yes</th>
            <th scope="col">Unsure</th>
            <th scope="col">N/A</th>
            <th scope="col">No</th>
          </tr>
        </thead>
        <tbody>
          ${pipe(
            [
              'novel',
              'future',
              'reproducibility',
              'methods',
              'coherent',
              'limitations',
              'ethics',
              'newData',
              'availableData',
              'availableCode',
              'recommend',
              'peerReview',
            ] as ReadonlyNonEmptyArray<keyof RapidPrereview['questions']>,
            RNEA.map(
              flow(
                I.bindTo('question'),
                I.bind('answers', ({ question }) => ({
                  yes: countRapidPrereviewResponses(rapidPrereviews, question, 'yes'),
                  unsure: countRapidPrereviewResponses(rapidPrereviews, question, 'unsure'),
                  na: countRapidPrereviewResponses(rapidPrereviews, question, 'na'),
                  no: countRapidPrereviewResponses(rapidPrereviews, question, 'no'),
                })),
              ),
            ),
            RNEA.map(
              ({ question, answers }) => html`
                <tr>
                  <th scope="row">${displayRapidPrereviewQuestion(question)}</th>
                  <td>
                    ${(answers.yes / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.unsure / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.na / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    ${(answers.no / rapidPrereviews.length).toLocaleString('en', {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              `,
            ),
          )}
        </tbody>
      </table>
    </div>
  `
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

function displayRapidPrereviewQuestion(question: keyof RapidPrereview['questions']): Html {
  return match(question)
    .with('availableCode', () => html`Is the code used in the manuscript available?`)
    .with('availableData', () => html`Are the data used in the manuscript available?`)
    .with('coherent', () => html`Are the principal conclusions supported by the data and analysis?`)
    .with('ethics', () => html`Have the authors adequately discussed ethical concerns?`)
    .with('future', () => html`Are the results likely to lead to future research?`)
    .with('limitations', () => html`Does the manuscript discuss limitations?`)
    .with('methods', () => html`Are the methods and statistics appropriate for the analysis?`)
    .with('newData', () => html`Does the manuscript include new data?`)
    .with('novel', () => html`Are the findings novel?`)
    .with('peerReview', () => html`Do you recommend this manuscript for peer review?`)
    .with('recommend', () => html`Would you recommend this manuscript to others?`)
    .with('reproducibility', () => html`Is sufficient detail provided to allow reproduction of the study?`)
    .exhaustive()
}

function countRapidPrereviewResponses<Q extends keyof RapidPrereview['questions']>(
  rapidPrereviews: ReadonlyArray<RapidPrereview>,
  question: Q,
  response: RapidPrereview['questions'][Q],
) {
  return rapidPrereviews.reduce(
    (total, rapidPrereview) => total + (rapidPrereview.questions[question] === response ? 1 : 0),
    0,
  )
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
