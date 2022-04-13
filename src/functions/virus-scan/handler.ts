import { middyfy } from '@libs/lambda';
import { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';

const s3 = new AWS.S3();

const isDebug = () => process.env.LOG_LEVEL === 'debug';

const virusScan = async (event: S3Event) => {
	if (!event.Records) {
		console.log("Not an S3 event invocation!");
		return;
	}

	for (const record of event.Records) {
		if (!record.s3) {
			console.log("Not an S3 Record!");
			continue;
		}

		console.log('virusScan: ', record.s3.bucket.name, record.s3.object.key, record.s3.object);
		// get the file
		const s3Object = await s3
			.getObject({
				Bucket: record.s3.bucket.name,
				Key: record.s3.object.key
			})
			.promise();

		// write file to disk
		writeFileSync(`/tmp/${record.s3.object.key}`, s3Object.Body.toString());

		try {
			// scan it
			const scanStatus: SpawnSyncReturns<Buffer> = spawnSync('clamscan',
				['--database=/opt/var/lib/clamav', `/tmp/${record.s3.object.key}`], {
				stdio: 'pipe',
				encoding: 'buffer',
			});
			console.log('scanStatus', scanStatus);
			isDebug() && console.debug('stdout', scanStatus.stdout.toString());
			isDebug() && console.debug('stderr', scanStatus.stderr.toString());
			scanStatus.output.forEach(item => console.log(item && item.toString()));

			await s3
				.putObjectTagging({
					Bucket: record.s3.bucket.name,
					Key: record.s3.object.key,
					Tagging: {
						TagSet: [
							{
								Key: 'pharmacy-clamav-status',
								Value: scanStatus.status === 0 ? 'clean' : 'dirty'
							}
						]
					}
				})
				.promise();
		} catch (err) {
			console.error(err);
			// tag as dirty, OR you can delete it
			await s3
				.putObjectTagging({
					Bucket: record.s3.bucket.name,
					Key: record.s3.object.key,
					Tagging: {
						TagSet: [
							{
								Key: 'pharmacy-clamav-status',
								Value: 'dirty'
							}
						]
					}
				})
				.promise();
		}

		// delete the temp file
		unlinkSync(`/tmp/${record.s3.object.key}`);
	};
}
export const main = middyfy(virusScan);
