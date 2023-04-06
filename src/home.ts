import { Doi, getRegistrant, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { InvalidE, getInput, invalidE } from './form'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import * as assets from './manifest.json'
import { getMethod, seeOther } from './middleware'
import { page } from './page'
import { PreprintId, fromUrl, parsePreprintDoi } from './preprint-id'
import { homeMatch, preprintMatch, reviewMatch } from './routes'

export type RecentPrereview = {
  readonly id: number
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly preprint: {
    readonly language: LanguageCode
    readonly title: Html
  }
}

interface GetRecentPrereviewsEnv {
  getRecentPrereviews: () => T.Task<ReadonlyArray<RecentPrereview>>
}

export interface DoesPreprintExistEnv {
  doesPreprintExist: (doi: PreprintId['doi']) => TE.TaskEither<'unavailable', boolean>
}

export const home = pipe(
  RM.fromMiddleware(getMethod),
  RM.ichain(method =>
    match(method)
      .with('POST', () => lookupPreprint)
      .otherwise(() => showHomePage),
  ),
)

const getRecentPrereviews = () =>
  pipe(
    RT.ask<GetRecentPrereviewsEnv>(),
    RT.chainTaskK(({ getRecentPrereviews }) => getRecentPrereviews()),
  )

const doesPreprintExist = (doi: PreprintId['doi']) =>
  pipe(
    RTE.ask<DoesPreprintExistEnv>(),
    RTE.chainTaskEitherK(({ doesPreprintExist }) => doesPreprintExist(doi)),
  )

const showHomePage = pipe(
  fromReaderTask(getRecentPrereviews()),
  chainReaderKW(recentPrereviews => createPage(E.right(undefined), recentPrereviews)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showHomeErrorPage = (lookupPreprint: SubmittedLookupPreprint) =>
  pipe(
    fromReaderTask(getRecentPrereviews()),
    chainReaderKW(recentPrereviews => createPage(lookupPreprint, recentPrereviews)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showUnknownPreprintPage = flow(
  fromReaderK(createUnknownPreprintPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedDoiPage = flow(
  fromReaderK(createUnsupportedDoiPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedUrlPage = flow(
  fromReaderK(createUnsupportedUrlPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showFailureMessage = pipe(
  RM.rightReader(failureMessage()),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

const UrlD = pipe(
  D.string,
  D.parse(s =>
    pipe(
      E.tryCatch(
        () => new URL(s.trim()),
        () => D.error(s, 'URL'),
      ),
      E.filterOrElse(
        url => url.protocol === 'http:' || url.protocol === 'https:',
        () => D.error(s, 'URL'),
      ),
    ),
  ),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parsePreprintDoi(s))),
)

const PreprintUrlD = pipe(
  UrlD,
  D.parse(url => E.fromOption(() => D.error(url, 'PreprintUrl'))(fromUrl(url))),
)

const LookupPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, PreprintUrlD),
  }),
  D.map(get('preprint')),
)

export const parseLookupPreprint = flow(
  LookupPreprintD.decode,
  E.mapLeft(
    flow(
      getInput('preprint'),
      O.chain(input =>
        pipe(
          parse(input),
          O.map(unsupportedDoiE),
          O.altW(() => pipe(O.fromEither(UrlD.decode(input)), O.map(unsupportedUrlE))),
          O.altW(() => O.some(invalidE(input))),
        ),
      ),
      O.getOrElseW(() => invalidE('')),
    ),
  ),
)

const lookupPreprint = pipe(
  RM.decodeBody(parseLookupPreprint),
  RM.chainFirstW(doi =>
    pipe(
      RM.fromReaderTaskEither(doesPreprintExist(doi)),
      RM.chainEitherKW(E.fromPredicate(identity, () => unknownPreprintE(doi))),
    ),
  ),
  RM.ichainMiddlewareK(doi => seeOther(format(preprintMatch.formatter, { doi }))),
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'UnknownPreprintE', actual: P.select() }, showUnknownPreprintPage)
      .with({ _tag: 'UnsupportedDoiE', actual: P.select() }, showUnsupportedDoiPage)
      .with({ _tag: 'UnsupportedUrlE', actual: P.select() }, showUnsupportedUrlPage)
      .with('unavailable', () => showFailureMessage)
      .otherwise(flow(E.left, showHomeErrorPage)),
  ),
)

interface UnknownPreprintE {
  readonly _tag: 'UnknownPreprintE'
  readonly actual: PreprintId['doi']
}

interface UnsupportedDoiE {
  readonly _tag: 'UnsupportedDoiE'
  readonly actual: Doi
}

interface UnsupportedUrlE {
  readonly _tag: 'UnsupportedUrlE'
  readonly actual: URL
}

const unknownPreprintE = (actual: PreprintId['doi']): UnknownPreprintE => ({
  _tag: 'UnknownPreprintE',
  actual,
})

const unsupportedDoiE = (actual: Doi): UnsupportedDoiE => ({
  _tag: 'UnsupportedDoiE',
  actual,
})

const unsupportedUrlE = (actual: URL): UnsupportedUrlE => ({
  _tag: 'UnsupportedUrlE',
  actual,
})

type SubmittedLookupPreprint = E.Either<InvalidE, Doi>
type UnsubmittedLookupPreprint = E.Right<undefined>
type LookupPreprint = SubmittedLookupPreprint | UnsubmittedLookupPreprint

function createPage(lookupPreprint: LookupPreprint, recentPrereviews: ReadonlyArray<RecentPrereview>) {
  const error = E.isLeft(lookupPreprint)

  return page({
    title: plainText`${error ? 'Error: ' : ''}PREreview`,
    content: html`
      <main id="main-content">
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(lookupPreprint)
                    ? html`
                        <li>
                          <a href="#preprint">
                            ${match(lookupPreprint.left)
                              .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <form method="post" action="${format(homeMatch.formatter, {})}" novalidate aria-labelledby="find-title">
          <div ${rawHtml(E.isLeft(lookupPreprint) ? 'class="error"' : '')}>
            <h1 id="find-title">Find and publish PREreviews</h1>

            <label for="preprint">Preprint DOI or URL</label>

            <p id="preprint-tip" role="note">
              A DOI is a unique identifier that you can find on the preprint. For example,
              <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
              <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
            </p>

            ${error
              ? html`
                  <div class="error-message" id="preprint-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(lookupPreprint.left)
                      .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="preprint"
              name="preprint"
              type="text"
              size="40"
              spellcheck="false"
              aria-describedby="preprint-tip"
              ${match(lookupPreprint)
                .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(lookupPreprint) ? 'aria-invalid="true" aria-errormessage="preprint-error"' : '')}
            />
          </div>

          <button>Continue</button>
        </form>

        ${pipe(
          recentPrereviews,
          RA.matchW(
            () => '',
            prereviews => html`
              <section aria-labelledby="recent-prereviews-title">
                <h2 id="recent-prereviews-title">Recent PREreviews</h2>

                <ol class="cards">
                  ${prereviews.map(
                    prereview => html`
                      <li>
                        <article>
                          <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                            ${formatList('en')(prereview.reviewers)} reviewed “<span
                              dir="${getLangDir(prereview.preprint.language)}"
                              lang="${prereview.preprint.language}"
                              >${prereview.preprint.title}</span
                            >”
                          </a>
                        </article>
                      </li>
                    `,
                  )}
                </ol>
              </section>

              <section aria-labelledby="funders-title">
                <h2 id="funders-title">Funders</h2>

                <ol class="logos">
                  <li>
                    <a href="https://sloan.org/grant-detail/8729">
                      <img
                        src="${assets['sloan.svg']}"
                        width="350"
                        height="190"
                        loading="lazy"
                        alt="Alfred P. Sloan Foundation"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://chanzuckerberg.com/">
                      <img
                        src="${assets['czi.svg']}"
                        width="192"
                        height="192"
                        loading="lazy"
                        alt="Chan Zuckerberg Initiative"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://elifesciences.org/">
                      <img src="${assets['elife.svg']}" width="129" height="44" loading="lazy" alt="eLife" />
                    </a>
                  </li>
                  <li>
                    <a href="https://wellcome.org/grant-funding/schemes/open-research-fund">
                      <img
                        src="${assets['wellcome.svg']}"
                        width="181"
                        height="181"
                        loading="lazy"
                        alt="Wellcome Trust"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://foundation.mozilla.org/">
                      <img
                        src="${assets['mozilla.svg']}"
                        width="280"
                        height="80"
                        loading="lazy"
                        alt="Mozilla Foundation"
                      />
                    </a>
                  </li>
                </ol>
              </section>
            `,
          ),
        )}
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function createUnknownPreprintPage(doi: PreprintId['doi']) {
  return page({
    title: plainText`Sorry, we don’t know this preprint`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t know this preprint</h1>

        <p>
          We think the DOI <q class="select-all" translate="no">${doi}</q> could be
          ${match(getRegistrant(doi))
            .with('1101', () => 'a bioRxiv or medRxiv')
            .with('1590', () => 'a SciELO')
            .with('14293', () => 'a ScienceOpen')
            .with('20944', () => 'a Preprints.org')
            .with('21203', () => 'a Research Square')
            .with('26434', () => 'a ChemRxiv')
            .with('31219', () => 'an OSF')
            .with('31222', () => 'a MetaArXiv')
            .with('31223', () => 'an EarthArXiv')
            .with('31224', () => 'an engrXiv')
            .with('31234', () => 'a PsyArXiv')
            .with('31235', () => 'a SocArXiv')
            .with('31730', () => 'an AfricArXiv')
            .with('32942', () => 'an EcoEvoRxiv')
            .with('35542', () => 'an EdArXiv')
            .with('48550', () => 'an arXiv')
            .exhaustive()}
          preprint, but we can’t find any details.
        </p>

        <p>If you typed the DOI, check it is correct.</p>

        <p>If you pasted the DOI, check you copied the entire address.</p>

        <p>
          If the DOI is correct or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(homeMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function createUnsupportedDoiPage() {
  return page({
    title: plainText`Sorry, we don’t support this DOI`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t support this DOI</h1>

        <p>
          We support preprints from AfricArXiv, arXiv, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv,
          medRxiv, MetaArXiv, OSF, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO, ScienceOpen and SocArXiv.
        </p>

        <p>
          If this DOI is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(homeMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function createUnsupportedUrlPage() {
  return page({
    title: plainText`Sorry, we don’t support this URL`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t support this URL</h1>

        <p>
          We support preprints from AfricArXiv, arXiv, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv,
          medRxiv, MetaArXiv, OSF, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO, ScienceOpen and SocArXiv.
        </p>

        <p>
          If this URL is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <p>Otherwise, if the preprint has a DOI, please try using that instead.</p>

        <a href="${format(homeMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function failureMessage() {
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
  })
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/87
function fromReaderTask<R, I = StatusOpen, A = never>(fa: RT.ReaderTask<R, A>): RM.ReaderMiddleware<R, I, I, never, A> {
  return r => M.fromTask(fa(r))
}
