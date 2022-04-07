import { AWSFunction } from '@functions/aws-function-type';
import { handlerPath } from '@libs/handler-resolver';

const main: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      s3: {
        bucket: 'pharmacy-upload',
        event: 's3:ObjectCreated:*',
        existing: true
      },
    },
  ],
  layers: [
    {
      Ref: 'ClamavLambdaLayer'
    }
  ],
  memorySize: 2048,
  timeout: 120,
  name: ''
};
export default main;
