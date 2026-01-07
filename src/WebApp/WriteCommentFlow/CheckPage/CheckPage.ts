import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { type NonEmptyString, ProfileId, type Uuid } from '../../../types/index.ts'
import type { User } from '../../../user.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const CheckPage = ({
  competingInterests,
  comment,
  commentId,
  locale,
  persona,
  user,
}: {
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  comment: Html
  commentId: Uuid.Uuid
  locale: SupportedLocale
  persona: 'public' | 'pseudonym'
  user: User
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'checkTitle')()),
    nav: html` <a href="${Routes.WriteCommentCodeOfConduct.href({ commentId })}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.WriteCommentCheck.href({ commentId })}" novalidate>
          <h1>${translate(locale, 'write-comment-flow', 'checkTitle')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${translate(locale, 'write-comment-flow', 'checkYourDetailsHeading')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${translate(locale, 'write-comment-flow', 'publishedNameHeading')()}</span></dt>
                <dd>
                  ${pipe(
                    Match.value(persona),
                    Match.when(
                      'public',
                      () =>
                        html` <a
                          href="${format(Routes.profileMatch.formatter, {
                            profile: ProfileId.forOrcid(user.orcid),
                          })}"
                          class="orcid"
                          >${user.name}</a
                        >`,
                    ),
                    Match.when(
                      'pseudonym',
                      () =>
                        html` <a
                          href="${format(Routes.profileMatch.formatter, {
                            profile: ProfileId.forPseudonym(user.pseudonym),
                          })}"
                          >${user.pseudonym}</a
                        >`,
                    ),
                    Match.exhaustive,
                  )}
                </dd>
                <dd>
                  <a href="${Routes.WriteCommentChoosePersona.href({ commentId })}"
                    >${rawHtml(
                      translate(
                        locale,
                        'write-comment-flow',
                        'changeName',
                      )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    )}</a
                  >
                </dd>
              </div>
              <div>
                <dt><span>${translate(locale, 'write-comment-flow', 'competingInterestsHeading')()}</span></dt>
                <dd>
                  ${Option.getOrElse(competingInterests, () =>
                    translate(locale, 'write-comment-flow', 'noCompetingInterests')(),
                  )}
                </dd>
                <dd>
                  <a href="${Routes.WriteCommentCompetingInterests.href({ commentId })}"
                    >${rawHtml(
                      translate(
                        locale,
                        'write-comment-flow',
                        'changeCompetingInterests',
                      )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    )}</a
                  >
                </dd>
              </div>
            </dl>
          </div>
          <div class="summary-card">
            <div>
              <h2 id="comment-label">${translate(locale, 'write-comment-flow', 'checkYourCommentHeading')()}</h2>

              <a href="${Routes.WriteCommentEnterComment.href({ commentId })}"
                >${rawHtml(
                  translate(
                    locale,
                    'write-comment-flow',
                    'changeComment',
                  )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                )}</a
              >
            </div>

            <div aria-labelledby="comment-label" role="region" tabindex="0">${fixHeadingLevels(2, comment)}</div>
          </div>

          <h2>${translate(locale, 'write-comment-flow', 'nowPublishHeading')()}</h2>

          <p>
            ${rawHtml(
              translate(
                locale,
                'write-comment-flow',
                'nowPublishMessage',
              )({
                license: text => html`<a href="https://creativecommons.org/licenses/by/4.0/">${text}</a>`.toString(),
              }),
            )}
          </p>

          <button>${translate(locale, 'write-comment-flow', 'publishButton')()}</button>
        </form>
      </single-use-form>
    `,
    canonical: Routes.WriteCommentCheck.href({ commentId }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
