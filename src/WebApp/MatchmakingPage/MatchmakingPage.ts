import { type Html, html, plainText, rawHtml } from '../../html.ts'
import { match, P } from 'ts-pattern'
import { languageAttributesFor } from '../../Locales.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../../routes.ts'
import { Array, Option, pipe, flow } from 'effect'
import { isDoi, toUrl, type Doi } from '../../types/Doi.ts'
import { getServerName, type Preprint } from '../../Preprints/index.ts'
import type { PlainDate } from '../../types/Temporal.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { format } from 'fp-ts-routing'
import { ProfileId } from '../../types/index.ts'
import { renderDate } from '../../time.ts'

export type MatchedWork = Preprint & {
  requested: PlainDate
}

function displayAuthor({ name, orcid }: { name: Name; orcid?: OrcidId }) {
  if (orcid) {
    return html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}"
      class="orcid"
      dir="auto"
      >${name}</a
    >`
  }

  return html`<bdi>${name}</bdi>`
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

export const createMatchmakingPage = (input: Option.Option<Doi>, matchedWorks: ReadonlyArray<MatchedWork>) => {
  return PageResponse({
    title: plainText('Matchmaking'),
    main: html`
      <h1><span ${languageAttributesFor('en')}>Matchmaking</span></h1>

      <form method="post" action="${Routes.Matchmaking}" novalidate="">
        <div>
          <h2>
            <label id="doi-label" for="doi"><span ${languageAttributesFor('en')}>Enter your DOI</span></label>
          </h2>

          <input
            id="doi"
            name="doi"
            type="text"
            size="60"
            dir="ltr"
            spellcheck="false"
            value=${Option.getOrElse(input, () => '')}
          />
        </div>

        <button>
          <span ${languageAttributesFor('en')}
            >${Array.match(matchedWorks, { onNonEmpty: () => 'Update matches', onEmpty: () => 'Find matches' })}</span
          >
        </button>
      </form>

      ${Array.match(matchedWorks, {
        onNonEmpty: matchedWorks => html`
          <h2><span ${languageAttributesFor('en')}>Results</span></h2>

          <ol>
            ${Array.map(
              matchedWorks,
              work => html`
                <li>
                  <article>
                    <header>
                      <h3 ${languageAttributesFor(work.title.language)}>${work.title.text}</h3>
                      <div class="byline">
                        <span ${languageAttributesFor('en')}
                          ><span class="visually-hidden">Authored</span> by
                          ${pipe(work.authors, Array.map(displayAuthor), formatList('en'))}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Requested</span></dt>
                          <dd>${renderDate('en')(work.requested)}</dd>
                        </div>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Posted</span></dt>
                          <dd>${renderDate('en')(work.posted)}</dd>
                        </div>
                        <div>
                          <dt><span ${languageAttributesFor('en')}>Server</span></dt>
                          <dd>${getServerName(work.id)}</dd>
                        </div>
                        ${match(work.id)
                          .with(
                            { _tag: 'PhilsciPreprintId' },
                            id => html`
                              <div>
                                <dt><span ${languageAttributesFor('en')}>Item ID</span></dt>
                                <dd>${id.value}</dd>
                              </div>
                            `,
                          )
                          .with(
                            { value: P.when(isDoi) },
                            id => html`
                              <div>
                                <dt translate="no">DOI</dt>
                                <dd>
                                  <a href="${toUrl(id.value).href}" class="doi" dir="auto" translate="no"
                                    >${id.value}</a
                                  >
                                </dd>
                              </div>
                            `,
                          )
                          .exhaustive()}
                      </dl>
                    </header>
                    ${work.abstract ? html`<div ${languageAttributesFor(work.abstract.language)}>${work.abstract.text}</div>` : ''}
                  </article>
                </li>
              `,
            )}
          </ol>
        `,
        onEmpty: () => '',
      })}
    `,
    canonical: Routes.Matchmaking,
  })
}
