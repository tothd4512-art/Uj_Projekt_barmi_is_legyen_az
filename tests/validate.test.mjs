import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidAppId, isValidVersion, sanitizeFileName, isSafeZipEntry } from '../server/validate.mjs';

test('appId accepts reverse-domain identifiers', () => {
  assert.equal(isValidAppId('hu.buildmuhely.app'), true);
  assert.equal(isValidAppId('com.example.my_app'), true);
});

test('appId rejects invalid identifiers', () => {
  assert.equal(isValidAppId('app'), false);
  assert.equal(isValidAppId('hu..app'), false);
  assert.equal(isValidAppId('hu.1app'), false);
  assert.equal(isValidAppId('hu/app'), false);
  assert.equal(isValidAppId(''), false);
});

test('version accepts semver-like values', () => {
  assert.equal(isValidVersion('1.0.0'), true);
  assert.equal(isValidVersion('2.3.4-beta.1'), true);
  assert.equal(isValidVersion('1.0'), false);
  assert.equal(isValidVersion('abc'), false);
});

test('sanitizeFileName keeps safe characters', () => {
  assert.equal(sanitizeFileName('Hello Világ!'), 'Hello_Vilag');
  assert.equal(sanitizeFileName('../../evil'), 'evil');
  assert.equal(sanitizeFileName(''), 'alkalmazas');
});

test('zip entries reject traversal and absolute paths', () => {
  assert.equal(isSafeZipEntry('index.html'), true);
  assert.equal(isSafeZipEntry('assets/app.js'), true);
  assert.equal(isSafeZipEntry('../evil'), false);
  assert.equal(isSafeZipEntry('a/../../evil'), false);
  assert.equal(isSafeZipEntry('/etc/passwd'), false);
  assert.equal(isSafeZipEntry('C:\\evil'), false);
  assert.equal(isSafeZipEntry('a\\b'), false);
});
