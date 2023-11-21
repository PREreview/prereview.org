import { format } from 'fp-ts-routing'
import type { Eq } from 'fp-ts/Eq'
import * as R from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { match } from 'ts-pattern'
import { type Html, type PlainText, html, rawHtml } from './html'
import * as assets from './manifest.json'
import {
  aboutUsMatch,
  clubsMatch,
  codeOfConductMatch,
  ediaStatementMatch,
  fundingMatch,
  homeMatch,
  howToUseMatch,
  liveReviewsMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  partnersMatch,
  peopleMatch,
  privacyPolicyMatch,
  reviewsMatch,
  trainingsMatch,
} from './routes'
import type { User } from './user'
import type { UserOnboarding } from './user-onboarding'

export interface FathomEnv {
  readonly fathomId?: string
}

export interface PhaseEnv {
  readonly phase?: {
    readonly tag: string
    readonly text: Html
  }
}

export interface Page {
  readonly title: PlainText
  readonly type?: 'two-up' | 'streamline'
  readonly content: Html
  readonly skipLinks?: ReadonlyArray<[Html, string]>
  readonly current?:
    | 'about-us'
    | 'clubs'
    | 'code-of-conduct'
    | 'edia-statement'
    | 'funding'
    | 'home'
    | 'how-to-use'
    | 'live-reviews'
    | 'my-details'
    | 'partners'
    | 'people'
    | 'privacy-policy'
    | 'reviews'
    | 'trainings'
  readonly js?: ReadonlyArray<Exclude<Assets<'.js'>, 'skip-link.js'>>
  readonly user?: User
  readonly userOnboarding?: UserOnboarding
}

export interface TemplatePageEnv {
  templatePage: (page: Page) => Html
}

export const templatePage = (page: Page) => R.asks(({ templatePage }: TemplatePageEnv) => templatePage(page))

export function page({
  title,
  type,
  content,
  skipLinks = [],
  current,
  js = [],
  user,
  userOnboarding,
}: Page): R.Reader<FathomEnv & PhaseEnv, Html> {
  const scripts = pipe(js, RA.uniq(stringEq()), RA.concatW(skipLinks.length > 0 ? ['skip-link.js' as const] : []))

  return R.asks(
    ({ fathomId, phase }) => html`
      <!doctype html>
      <html lang="en" dir="ltr">
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>${title}${current !== 'home' ? ' | PREreview' : ''}</title>

        ${scripts.map(file => html` <script src="${assets[file].path}" type="module"></script>`)}

        <link href="${assets['style.css']}" rel="stylesheet" />

        ${scripts.flatMap(
          flow(
            file => assets[file].preload as ReadonlyArray<string>,
            RA.map(preload => html` <link href="${preload}" rel="preload" fetchpriority="low" as="script" />`),
          ),
        )}
        ${typeof fathomId === 'string'
          ? html` <script src="https://cdn.usefathom.com/script.js" data-site="${fathomId}" defer></script>`
          : ''}

        <link rel="icon" href="${assets['favicon.ico']}" sizes="32x32" />
        <link rel="icon" href="${assets['favicon.svg']}" type="image/svg+xml" />

        <body ${rawHtml(type === 'two-up' ? `class="${type}"` : '')}>
          ${skipLinks.length > 0
            ? html` <skip-link>${skipLinks.map(([text, link]) => html`<a href="${link}">${text}</a>`)}</skip-link>`
            : ''}

          <div class="contents">
            <header>
              ${current === 'home'
                ? html`
                    <div class="giving-tuesday">
                      <span>Help us hit our $10K&nbsp;target!</span>

                      <span
                        ><span>Support open community-driven peer&nbsp;review</span>
                        <a href="https://donorbox.org/prereview" class="forward">Donate</a></span
                      >
                    </div>
                  `
                : ''}

              <div class="navigation">
                ${phase
                  ? html`
                      <div class="phase-banner">
                        <strong class="tag">${phase.tag}</strong>
                        <span>${phase.text}</span>
                      </div>
                    `
                  : ''}
                ${user || type !== 'streamline'
                  ? html`
                      <nav>
                        <ul>
                          ${type !== 'streamline'
                            ? html`
                                <li><a href="https://content.prereview.org/">Blog</a></li>
                                <li>
                                  <a
                                    href="${format(aboutUsMatch.formatter, {})}"
                                    ${current === 'about-us' ? html`aria-current="page"` : ''}
                                    >About</a
                                  >
                                </li>
                              `
                            : ''}
                          ${user && type !== 'streamline'
                            ? html` <li>
                                <a
                                  href="${format(myDetailsMatch.formatter, {})}"
                                  ${current === 'my-details' ? html`aria-current="page"` : ''}
                                  >My
                                  details${match(userOnboarding)
                                    .with(
                                      { seenMyDetailsPage: false },
                                      () =>
                                        html` <span role="status"
                                          ><span class="visually-hidden">New notification</span></span
                                        >`,
                                    )
                                    .otherwise(() => '')}</a
                                >
                              </li>`
                            : ''}
                          ${user ? html` <li><a href="${format(logOutMatch.formatter, {})}">Log out</a></li>` : ''}
                          ${!user && current === 'home'
                            ? html` <li><a href="${format(logInMatch.formatter, {})}">Log in</a></li>`
                            : ''}
                        </ul>
                      </nav>
                    `
                  : ''}
              </div>

              <div class="header">
                <div class="logo">
                  <a href="${format(homeMatch.formatter, {})}" ${current === 'home' ? html`aria-current="page"` : ''}>
                    <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                  </a>
                </div>

                ${type !== 'streamline'
                  ? html`
                      <nav>
                        <ul>
                          <li>
                            <a
                              href="${format(reviewsMatch.formatter, { page: 1 })}"
                              ${current === 'reviews' ? html`aria-current="page"` : ''}
                              >Reviews</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(trainingsMatch.formatter, {})}"
                              ${current === 'trainings' ? html`aria-current="page"` : ''}
                              >Trainings</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(liveReviewsMatch.formatter, {})}"
                              ${current === 'live-reviews' ? html`aria-current="page"` : ''}
                              >Live Reviews</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(clubsMatch.formatter, {})}"
                              ${current === 'clubs' ? html`aria-current="page"` : ''}
                              >Clubs</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(partnersMatch.formatter, {})}"
                              ${current === 'partners' ? html`aria-current="page"` : ''}
                              >Partners</a
                            >
                          </li>
                        </ul>
                      </nav>
                    `
                  : ''}
              </div>
            </header>

            ${content}
          </div>

          <footer>
            ${type !== 'streamline'
              ? html`
                  <div>
                    <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                  </div>

                  <div>
                    Learn about upcoming events and updates.
                    <a href="https://prereview.civicrm.org/civicrm/mailing/url?u=17&qid=30" class="forward"
                      >Subscribe to our newsletter</a
                    >
                  </div>

                  <div>
                    Come join the conversation!
                    <a href="https://bit.ly/PREreview-Slack" class="forward">Join our Slack Community</a>
                  </div>

                  <ul aria-label="Support links">
                    <li><a href="https://donorbox.org/prereview">Donate</a></li>
                    <li>
                      <a
                        href="${format(peopleMatch.formatter, {})}"
                        ${current === 'people' ? html`aria-current="page"` : ''}
                        >People</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(fundingMatch.formatter, {})}"
                        ${current === 'funding' ? html`aria-current="page"` : ''}
                        >How we’re funded</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(codeOfConductMatch.formatter, {})}"
                        ${current === 'code-of-conduct' ? html`aria-current="page"` : ''}
                        >Code of Conduct</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(ediaStatementMatch.formatter, {})}"
                        ${current === 'edia-statement' ? html`aria-current="page"` : ''}
                        >EDIA Statement</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(privacyPolicyMatch.formatter, {})}"
                        ${current === 'privacy-policy' ? html`aria-current="page"` : ''}
                        >Privacy Policy</a
                      >
                    </li>
                    <li><a href="https://content.prereview.org/">Blog</a></li>
                    <li>
                      <a
                        href="${format(howToUseMatch.formatter, {})}"
                        ${current === 'how-to-use' ? html`aria-current="page"` : ''}
                        >How to use</a
                      >
                    </li>
                  </ul>

                  <ul class="contacts" aria-label="Contact us">
                    <li>
                      <span class="visually-hidden">Email us at</span>
                      <a href="mailto:contact@prereview.org" class="email" translate="no">contact@prereview.org</a>
                    </li>
                    <li>
                      <a href="https://twitter.com/PREreview_" class="twitter" translate="no">@PREreview_</a>
                      <span class="visually-hidden">on Twitter</span>
                    </li>
                    <li>
                      <a href="https://mas.to/@prereview" class="mastodon" translate="no">@prereview@mas.to</a>
                      <span class="visually-hidden">on Mastodon</span>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/company/prereview/" class="linked-in" translate="no"
                        >PREreview</a
                      >
                      <span class="visually-hidden">on LinkedIn</span>
                    </li>
                    <li>
                      <a href="https://github.com/PREreview" class="github" translate="no">PREreview</a>
                      <span class="visually-hidden">on GitHub</span>
                    </li>
                  </ul>
                `
              : ''}

            <small>
              All content is available under a Creative&nbsp;Commons
              <a href="https://creativecommons.org/licenses/by/4.0/" rel="license"
                >Attribution&nbsp;4.0 International license</a
              >, except where otherwise stated.
            </small>
          </footer>
        </body>
      </html>
    `,
  )
}

function stringEq<A>(): Eq<A> {
  return s.Eq as Eq<A>
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
