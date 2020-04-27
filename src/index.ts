import { LambdaHandler, DynamoSlim } from 'lambda-toolkit-utilities'
import {DynamoDB} from 'aws-sdk';
import * as crypto from 'crypto';
const slim = new DynamoSlim('links', new DynamoDB({apiVersion: '2012-08-10'}))

interface ShrunkLink {
  link: string;
  shrunk: string;
  createdAt: number;
}

function digestToHash(s: string) {
  return crypto.createHash('md5').update(s).digest().slice(0, 6).toString('hex')
}

module.exports.handler = new LambdaHandler({
  method: 'post',
  project: 'LinkShrink',
  url: '/shrink',
  version: '1.0',
  gen: true
})
  .allowOrigins([200, 500], '*')
  .acceptsJsonObject(b => b.withString('value'))
  .respondsWithJsonObject(200, b => b.withString('value'))
  .respondsWithJsonObject(500, b => b.withString('message'))
  .processesEventWith(async(event, _) => {
    try {
      const toShrink = String(event.body.value).trim();
      const existing = await slim.getAll({ shrunk: {op: '=', value: digestToHash(toShrink) } })
      if (existing.length > 0) {
        return {
          statusCode: 200,
          body: {
            value: existing[0].shrunk
          }
        } as const
      }
      const fresh = {
        link: toShrink,
        shrunk: digestToHash(toShrink),
        createdAt: Date.now()
      }
      await slim.save([fresh])
      return {
        statusCode: 200,
        body: {
          value: fresh.shrunk,
        }
      } as const
    } catch (e) {
      console.log('failed', e);
      return {
        statusCode: 500,
        body: {
          message: 'Failed to shirink link'
        }
      } as const
    }
  })