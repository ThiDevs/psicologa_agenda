#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline/promises');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const extraArgs = process.argv.slice(2);
const startedAt = Date.now() - 5000;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    stdio: options.stdio || 'inherit',
    encoding: options.encoding,
    env: process.env,
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getBundleIdentifier() {
  const appConfig = readJson(path.join(projectRoot, 'app.json'));
  const bundleIdentifier = appConfig.expo?.ios?.bundleIdentifier;

  if (!bundleIdentifier) {
    throw new Error('Missing expo.ios.bundleIdentifier in app.json.');
  }

  return bundleIdentifier;
}

function getPhysicalIosDevices() {
  const outputPath = path.join(os.tmpdir(), `ios-devices-${process.pid}.json`);
  const result = run(
    'xcrun',
    ['devicectl', 'list', 'devices', '--json-output', outputPath, '--quiet'],
    { stdio: 'pipe', encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to list iOS devices with devicectl.');
  }

  const payload = readJson(outputPath);
  fs.rmSync(outputPath, { force: true });

  return (payload.result?.devices || []).filter((device) => {
    return (
      device.hardwareProperties?.platform === 'iOS' &&
      device.hardwareProperties?.reality === 'physical' &&
      device.connectionProperties?.pairingState === 'paired'
    );
  });
}

async function selectDevice(devices) {
  if (devices.length === 0) {
    throw new Error('No paired physical iOS device found. Connect and trust your iPhone, then try again.');
  }

  if (devices.length === 1) {
    return devices[0];
  }

  console.log('Select a physical iOS device:');
  devices.forEach((device, index) => {
    console.log(
      `${index + 1}. ${formatDevice(device)}`
    );
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question('Device number: ');
    const selected = Number(answer.trim());

    if (!Number.isInteger(selected) || selected < 1 || selected > devices.length) {
      throw new Error('Invalid device selection.');
    }

    return devices[selected - 1];
  } finally {
    rl.close();
  }
}

function formatDevice(device) {
  const name = device.deviceProperties?.name || device.identifier;
  const model = device.hardwareProperties?.marketingName || device.hardwareProperties?.productType || 'iPhone';
  const osVersion = device.deviceProperties?.osVersionNumber || 'unknown iOS';

  return `${name} (${model}, iOS ${osVersion})`;
}

function getBundleId(appPath) {
  const infoPlist = path.join(appPath, 'Info.plist');
  const result = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', infoPlist], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function findLatestBuiltApp(bundleIdentifier) {
  const derivedData = path.join(os.homedir(), 'Library/Developer/Xcode/DerivedData');
  const matches = [];

  function walk(dir, depth = 0) {
    if (depth > 7 || !fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);

      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name.endsWith('.app')) {
        const stats = fs.statSync(entryPath);

        if (stats.mtimeMs >= startedAt && getBundleId(entryPath) === bundleIdentifier) {
          matches.push({ path: entryPath, mtimeMs: stats.mtimeMs });
        }

        continue;
      }

      walk(entryPath, depth + 1);
    }
  }

  walk(derivedData);
  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0]?.path || null;
}

async function main() {
  const bundleIdentifier = getBundleIdentifier();
  const devices = getPhysicalIosDevices();
  const device = await selectDevice(devices);
  const udid = device.hardwareProperties?.udid || device.identifier;

  console.log(`Using physical iOS device: ${formatDevice(device)}`);

  run('defaults', ['write', 'com.apple.dt.Xcode', 'IDEBuildOperationMaxNumberOfConcurrentCompileTasks', '1'], {
    stdio: 'pipe',
  });

  const expoArgs = ['expo', 'run:ios', '--device', udid, '--no-bundler', ...extraArgs];
  const expoResult = run('npx', expoArgs);

  if (expoResult.status === 0) {
    return;
  }

  const appPath = findLatestBuiltApp(bundleIdentifier);

  if (!appPath) {
    process.exit(expoResult.status || 1);
  }

  console.log('Expo CLI could not install the app directly; falling back to xcrun devicectl.');

  const installResult = run('xcrun', [
    'devicectl',
    'device',
    'install',
    'app',
    '--device',
    device.identifier,
    appPath,
  ]);

  if (installResult.status !== 0) {
    process.exit(installResult.status || 1);
  }

  const launchResult = run('xcrun', [
    'devicectl',
    'device',
    'process',
    'launch',
    '--device',
    device.identifier,
    '--terminate-existing',
    bundleIdentifier,
  ]);

  if (launchResult.status !== 0) {
    console.warn('App installed, but it could not be launched automatically. Unlock the iPhone and open it manually.');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
