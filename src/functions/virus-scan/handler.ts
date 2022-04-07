import { middyfy } from '@libs/lambda';
import { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { exec } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';

const s3 = new AWS.S3();

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
			const scanStatus = exec(`clamscan --database=/opt/var/lib/clamav /tmp/${record.s3.object.key}`);
			console.log('scanStatus', scanStatus);

			await s3
				.putObjectTagging({
					Bucket: record.s3.bucket.name,
					Key: record.s3.object.key,
					Tagging: {
						TagSet: [
							{
								Key: 'pharmacy-clamav-status',
								Value: 'clean'
							}
						]
					}
				})
				.promise();
		} catch (err) {
			if (err.status === 1) {
				// tag as dirty, OR you can delete it
				await s3
					.putObjectTagging({
						Bucket: record.s3.bucket.name,
						Key: record.s3.object.key,
						Tagging: {
							TagSet: [
								{
									Key: 'pms-clamav-status',
									Value: 'dirty'
								}
							]
						}
					})
					.promise();
			}
		}

		// delete the temp file
		unlinkSync(`/tmp/${record.s3.object.key}`);
	};
}
export const main = middyfy(virusScan);
