import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mediaPrefixes } from './delivery-plan.mjs';
const read = async (name) =>
  JSON.parse(await fs.readFile(`infra/${name}.json`, 'utf8'));
const storage = await read('storage'),
  site = await read('site'),
  delivery = await read('delivery');
for (const name of ['ArchiveBucket', 'SiteBucket']) {
  const resource = storage.Resources[name],
    p = resource.Properties;
  assert.equal(resource.DeletionPolicy, 'Retain');
  assert.equal(resource.UpdateReplacePolicy, 'Retain');
  assert.deepEqual(p.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  });
  assert.equal(p.VersioningConfiguration.Status, 'Enabled');
  assert.equal(
    p.BucketEncryption.ServerSideEncryptionConfiguration[0]
      .ServerSideEncryptionByDefault.SSEAlgorithm,
    'AES256',
  );
  const policy =
    storage.Resources[name + 'Policy'].Properties.PolicyDocument.Statement;
  assert.ok(
    policy.some(
      (s) =>
        s.Effect === 'Deny' &&
        s.Condition?.Bool?.['aws:SecureTransport'] === 'false',
    ),
  );
}
// Replaced site versions expire after 30 days; the archive keeps every version.
const lifecycle = (name) =>
  storage.Resources[name].Properties.LifecycleConfiguration.Rules;
assert.ok(
  lifecycle('SiteBucket').some(
    (rule) =>
      rule.Status === 'Enabled' &&
      rule.NoncurrentVersionExpiration?.NoncurrentDays === 30,
  ),
);
assert.ok(
  !JSON.stringify(lifecycle('ArchiveBucket')).includes('Expiration'),
  'The archive bucket never expires versions',
);
assert.ok(
  !JSON.stringify(site).includes('s3-website'),
  'Use signed HTTPS origins',
);
assert.equal(
  site.Resources.OriginAccess.Properties.OriginAccessControlConfig
    .SigningBehavior,
  'always',
);
assert.equal(
  site.Resources.Distribution.Properties.DistributionConfig.DefaultCacheBehavior
    .ViewerProtocolPolicy,
  'redirect-to-https',
);
assert.equal(site.Resources.CachePolicy.Properties.CachePolicyConfig.MinTTL, 0);
// The access log keeps two weeks and never records who made a request.
const accessLog = site.Resources.AccessLogDelivery.Properties.RecordFields;
assert.ok(accessLog.includes('time-to-first-byte'));
assert.ok(
  !accessLog.some((field) => /^c-ip|x-forwarded-for|cs\(Cookie\)/.test(field)),
  'The access log records no client addresses or cookies',
);
assert.equal(site.Resources.AccessLogGroup.Properties.RetentionInDays, 14);
// A run of server errors reaches the projects-ops-alerts queue.
const alarm = site.Resources.Distribution5xxAlarm.Properties;
assert.equal(alarm.MetricName, '5xxErrorRate');
assert.match(
  alarm.AlarmActions[0]['Fn::Sub'],
  /:weekly-thing-librarian-alarms$/,
);
for (const [name, allowed] of [
  ['BuildRole', ['s3:GetObject']],
  [
    'DeploymentRole',
    [
      's3:GetObject',
      's3:PutObject',
      's3:ListBucket',
      's3:GetBucketLocation',
      'cloudfront:CreateInvalidation',
      'cloudfront:GetInvalidation',
      'cloudfront:GetDistribution',
    ],
  ],
]) {
  const p = delivery.Resources[name].Properties;
  const claim = p.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals;
  assert.equal(
    claim['token.actions.githubusercontent.com:aud'],
    'sts.amazonaws.com',
  );
  const main = 'repo:jthingelstad@5351/nnxyz@1417597840:ref:refs/heads/main';
  assert.deepEqual(
    claim['token.actions.githubusercontent.com:sub'],
    name === 'BuildRole'
      ? [main, 'repo:jthingelstad@5351/nnxyz@1417597840:pull_request']
      : main,
  );
  for (const s of p.Policies[0].PolicyDocument.Statement) {
    // Site deploys may not write published media (tools/delivery-plan.mjs).
    if (name === 'DeploymentRole' && s.Effect === 'Deny') {
      assert.deepEqual(s.Action, ['s3:PutObject']);
      assert.deepEqual(
        s.Resource.map((r) => r['Fn::Sub'].split('${SiteBucket}/')[1]),
        mediaPrefixes.map((prefix) => `${prefix}*`),
      );
      continue;
    }
    assert.equal(s.Effect, 'Allow');
    assert.ok(s.Action.every((a) => allowed.includes(a)));
    assert.notEqual(s.Resource, '*');
  }
}
const dataset = await read('dataset');
assert.match(
  dataset.key,
  new RegExp(`^datasets/${dataset.sha256}/collection\\.tar\\.gz$`),
);
assert.equal(dataset.restoredFiles, 11592);
const abstractDataset = await read('abstract-dataset');
assert.equal(abstractDataset.bucket, dataset.bucket);
assert.match(
  abstractDataset.key,
  new RegExp(
    `^datasets/abstract/${abstractDataset.sha256}/collection\\.tar\\.gz$`,
  ),
);
const abstractFiles = await fs.readFile(abstractDataset.manifestPath);
assert.equal(
  createHash('sha256').update(abstractFiles).digest('hex'),
  abstractDataset.manifestSHA256,
);
assert.equal(JSON.parse(abstractFiles).length, abstractDataset.restoredFiles);
assert.equal(abstractDataset.restoredFiles, 57);
const recovered = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
assert.deepEqual(
  JSON.parse(abstractFiles).map((entry) => [entry.projectPath, entry.sha256]),
  recovered.files.map((entry) => [entry.path, entry.sha256]),
);
console.log(
  'Private retained/versioned storage, HTTPS/OAC, bounded OIDC roles and immutable source snapshot validated.',
);
