#!/usr/bin/env node

const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');

function main() {
  let pkg = JSON.parse(fs.readFileSync(`./package.json`, 'utf8'));
  const yarnlock = lockfile.parse(fs.readFileSync('yarn.lock', 'utf8'));

  let failures = 0;
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  };

  for (const dep of Object.keys(deps)) {
    if (deps[dep].match(/\:\.yalc/)) {
      console.log(`Don't check in yalc depdency ${dep}: ${deps[dep]}`);
      failures += 1;
    }
  }

  if (process.argv[2] === 'module') {
    try {
      child_process.execSync('git ls-files --error-unmatch yarn.lock');
      failures += 1;
      console.log("Don't check in yarn.lock for modules");
    } catch (e) {
      true;
    }
    return failures;
  } else if (process.argv[2] === 'service') {
    let yarndeps = new Set();
    for (const dep of Object.keys(yarnlock.object)) {
      let m = dep.match(/^@threekit\/(.*)\@(.*)/);
      if (m) {
        if (yarndeps.has(m[1])) {
          console.log(`@threekit/${m[1]} included multiple times in yarn.lock`);
          failures += 1;
        } else {
          yarndeps.add(m[1]);
        }
      }
    }

    for (const dir of fs.readdirSync('./node_modules/@threekit')) {
      let pkg2 = JSON.parse(
        fs.readFileSync(`./node_modules/@threekit/${dir}/package.json`, 'utf8')
      );

      for (const dep of Object.keys(pkg2.dependencies || {})) {
        if (deps[dep]) {
          console.log(
            `${dep} is a dependency in both our package.json and @threekit/${dir}'s.   Please move it into peerDependencies in @threekit/${dir}`
          );
          failures += 1;
        }
      }
    }

    return failures;
  } else {
    failures += 1;
    console.log('Usage: check_package_json (service|module)');
    return failures;
  }
}

process.exit(main());
