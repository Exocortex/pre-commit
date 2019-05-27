#!/usr/bin/env node

const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');

const pkg = require('./package.json');

async function main() {
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
    let pkg2 = require(`./node_modules/@threekit/${dir}/package.json`);

    for (const dep of Object.keys(pkg2.dependencies)) {
      if (deps[dep]) {
        console.log(
          `${dep} is a dependency in both our package.json and @threekit/${dir}'s.   Please move it into peerDependencies in @threekit/${dir}`
        );
        failures += 1;
      }
    }
  }

  return failures;
}

main().then(function(failures) {
  process.exit(failures);
});
