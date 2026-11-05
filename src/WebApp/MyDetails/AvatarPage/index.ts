import type { Multipart } from 'effect/http'
import { Effect, type Result } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import type { CloudinaryAvatars } from '../../../ExternalInteractions/index.ts'
import { Avatars } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { FlashMessageResponse, type Response } from '../../Response/index.ts'
import * as AvatarForm from './AvatarForm.ts'
import { AvatarPage as CreatePage } from './AvatarPage.ts'

export const AvatarPage: Effect.Effect<Response, never, Locale> = Effect.gen(function* () {
  const locale = yield* Locale

  return CreatePage({ form: new AvatarForm.EmptyForm(), locale })
}).pipe(Effect.withSpan('MyDetails.AvatarPage'))

export const AvatarSubmission: (
  body: Result.Result<Multipart.Persisted, Multipart.MultipartError>,
) => Effect.Effect<Response, never, Avatars.Store | CloudinaryAvatars.CloudinaryAvatars | Locale | LoggedInUser> =
  Effect.fn('MyDetails.AvatarSubmission')(
    function* (body) {
      const form = AvatarForm.fromBody(body)

      if (form._tag === 'InvalidForm') {
        const locale = yield* Locale

        return CreatePage({ form, locale })
      }

      const user = yield* LoggedInUser

      yield* Avatars.save(user.orcid, form.avatar)

      return FlashMessageResponse({ location: format(Routes.myDetailsMatch.formatter, {}), message: 'avatar-changed' })
    },
    Effect.catchTag('AvatarUnavailable', () => HavingProblemsPage),
  )
