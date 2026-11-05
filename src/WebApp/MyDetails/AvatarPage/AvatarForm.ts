import { Multipart } from 'effect/http'
import { Data, Match, pipe, Result, Schema } from 'effect'
import type { CloudinaryAvatars } from '../../../ExternalInteractions/index.ts'

export type AvatarForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class WrongType extends Data.TaggedError('WrongType') {}

export class TooBig extends Data.TaggedError('TooBig') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  avatar: Missing | WrongType | TooBig
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  avatar: CloudinaryAvatars.AvatarFile
}> {}

const AvatarFieldSchema = Schema.Struct({ avatar: Multipart.SingleFileSchema })

export const fromBody = (
  body: Result.Result<Multipart.Persisted, Multipart.MultipartError>,
): InvalidForm | CompletedForm => {
  if (Result.isFailure(body)) {
    return new InvalidForm({
      avatar: pipe(
        Match.value(body.failure.reason._tag),
        Match.whenOr('FileTooLarge', 'FieldTooLarge', 'BodyTooLarge', 'InternalError', () => new TooBig()),
        Match.whenOr('TooManyParts', 'Parse', () => new Missing()),
        Match.exhaustive,
      ),
    })
  }

  const fields = Schema.decodeUnknownResult(AvatarFieldSchema)(body.success)

  if (Result.isFailure(fields)) {
    return new InvalidForm({ avatar: new Missing() })
  }

  const { avatar } = fields.success

  return pipe(
    Match.value(avatar.contentType),
    Match.whenOr('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp', mimetype => {
      return new CompletedForm({ avatar: { path: avatar.path, mimetype } })
    }),
    Match.orElse(() => new InvalidForm({ avatar: new WrongType() })),
  )
}
