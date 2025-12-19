import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Struct } from 'effect'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/GetSlackUser/UsersProfileGetResponseToSlackUser.ts'
import * as fc from '../../../fc.ts'

test.prop([fc.nonEmptyString(), fc.url(), fc.slackUserId().map(Struct.get('userId'))])(
  'UsersProfileGetResponseToSlackUser',
  (name, image, userId) => {
    const actual = _.UsersProfileGetResponseToSlackUser({ realName: name, image48: image }, userId)

    expect(actual).toStrictEqual({
      name,
      image,
      profile: new URL(`https://prereviewcommunity.slack.com/team/${userId}`),
    })
  },
)
