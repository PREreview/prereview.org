import type * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'

export type Result = ReadonlyArray<Uuid.Uuid>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>): Result => []
