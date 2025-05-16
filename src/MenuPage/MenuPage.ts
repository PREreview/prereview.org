import { Option, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as Routes from '../routes.js'
import type { UserOnboarding } from '../user-onboarding.js'
import type { User } from '../user.js'

export const createMenuPage = ({
  locale,
  user,
  userOnboarding,
}: {
  locale: SupportedLocale
  user: Option.Option<User>
  userOnboarding: Option.Option<UserOnboarding>
}) => {
  const t = translate(locale, 'header')

  return PageResponse({
    title: plainText('Menu'),
    main: html`
      <h1 class="visually-hidden">Menu</h1>

      <div class="menu">
        <div>
          <h3>Get involved</h3>
          <ul>
            <li>
              <a href="${format(Routes.reviewsMatch.formatter, {})}">${t('menuReviews')()}</a>
              <p>See preprints with a PREreview.</p>
            </li>
            <li>
              <a href="${format(Routes.reviewRequestsMatch.formatter, {})}">${t('menuRequests')()}</a>
              <p>Help an author by reviewing their preprint.</p>
            </li>
            <li>
              <a href="${Routes.Clubs}">${t('menuClubs')()}</a>
              <p>Connect with like-minded peers.</p>
            </li>
            <li>
              <a href="${Routes.Trainings}">${t('menuTrainings')()}</a>
              <p>Learn about ethical and constructive peer review.</p>
            </li>
          </ul>
        </div>

        <div>
          <h3>Find out more</h3>
          <ul>
            <li>
              <a href="https://content.prereview.org/">${t('menuBlog')()}</a>
            </li>
            <li>
              <a href="${Routes.AboutUs}">${t('menuAboutUs')()}</a>
            </li>
            <li>
              <a href="${format(Routes.partnersMatch.formatter, {})}">${t('menuPartners')()}</a>
            </li>
            <li>
              <a href="https://donorbox.org/prereview">${t('menuDonate')()}</a>
            </li>
            <li>
              <a href="${Routes.LiveReviews}">${t('menuLiveReviews')()}</a>
            </li>
            <li>
              <a href="${Routes.Resources}">${t('menuResources')()}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3>My account</h3>
          <ul>
            ${Option.match(user, {
              onSome: () =>
                html` <li>
                    <a href="${format(Routes.myDetailsMatch.formatter, {})}"
                      >${t('menuMyDetails')()}${Option.match(
                        Option.filter(userOnboarding, Struct.get('seenMyDetailsPage')),
                        {
                          onSome: () => '',
                          onNone: () =>
                            html` <span role="status"
                              ><span class="visually-hidden">${t('menuNewNotification')()}</span></span
                            >`,
                        },
                      )}</a
                    >
                  </li>
                  <li>
                    <a href="${format(Routes.myPrereviewsMatch.formatter, {})}">${t('menuMyPrereviews')()}</a>
                  </li>
                  <li>
                    <a href="${format(Routes.logOutMatch.formatter, {})}">${t('menuLogOut')()}</a>
                  </li>`,
              onNone: () =>
                html` <li>
                  <a href="${format(Routes.logInMatch.formatter, {})}">${t('menuLogIn')()}</a>
                </li>`,
            })}
          </ul>
        </div>
      </div>
    `,
    canonical: Routes.Menu,
    current: 'menu',
  })
}
