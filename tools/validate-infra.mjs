import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
