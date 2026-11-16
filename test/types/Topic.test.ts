import { describe, expect, it } from '../vitest.ts'
import * as _ from '../../src/types/Topic.ts'
import * as fc from '../fc.ts'

describe('isTopicId', () => {
  it.prop('with a topic ID', [fc.topicId()], ([id]) => {
    expect(_.isTopicId(id)).toBe(true)
  })

  it.prop(
    'with something else',
    [fc.string().filter(value => !(_.topicIds as ReadonlyArray<string>).includes(value))],
    ([value]) => {
      expect(_.isTopicId(value)).toBe(false)
    },
  )
})
