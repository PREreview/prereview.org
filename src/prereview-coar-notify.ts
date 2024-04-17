import * as TE from 'fp-ts/TaskEither'

export const publishToPrereviewCoarNotifyInbox = (): TE.TaskEither<'unavailable', void> => TE.left('unavailable')
