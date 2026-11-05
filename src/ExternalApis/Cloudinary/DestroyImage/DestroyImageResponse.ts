import { Schema } from 'effect'

export const DestroyImageResponse = Schema.Struct({
  result: Schema.Literal('ok'),
})
