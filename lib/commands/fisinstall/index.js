const child_process = require('child_process');

async function fisinstall({ projectDir, components }) {
  child_process.execSync(`npx fis3 install ${components}`, {
    stdio: 'inherit',
    cwd: projectDir,
  });
}

module.exports = fisinstall;
