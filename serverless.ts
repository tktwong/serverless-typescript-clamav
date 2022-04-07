import hello from '@functions/hello';
import virusScan from '@functions/virus-scan';
import type { AWS } from '@serverless/typescript';


const serverlessConfiguration: AWS = {
  service: 'serverless-typescript-clamav',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline'],
  provider: {
    name: 'aws',
    stage: '${opt:stage, \'dev\'}',
    region: 'ap-east-1',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: 'arn:aws:s3:::pharmacy-upload/*'
      }
    ]
  },

  // import the function via paths
  functions: { hello, virusScan },
  package: { exclude: ['node_modules/**', 'coverage/**'] },
  layers: {
    clamav: {
      path: 'layer'
    }
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;
