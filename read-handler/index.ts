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
  method: 'get',
  project: 'LinkShrink',
  url: '/s/:hash',
  version: '1.0',
  gen: true
})
  .allowOrigins([302, 500], '*')
  .respondsWithJsonObject(302, b => b.withString('value'))
  .respondsWithJsonObject(500, b => b.withString('message'))
  .respondsWithJsonObject(404, b => b.withString('message'))
  .processesEventWith(async(event, _) => {
    try {
      const hash = String(event.path.split('/').pop()).trim();
      const existing = await slim.getAll({ shrunk: {op: '=', value: hash } })
      if (existing.length > 0) {
        return {
          statusCode: 302,
          body: {
            value: existing[0].link
          }
        } as const
      } else {
        return {
          statusCode: 404,
          body: {
            message: 'not found'
          }
        } as const
      }
    } catch (e) {
      console.log('failed', e);
      return {
        statusCode: 500,
        body: {
          message: 'Failed to find link'
        }
      } as const
    }
  })