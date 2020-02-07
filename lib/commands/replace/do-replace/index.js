const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const process = require('process');
const child_process = require('child_process');
const fis3 = require.resolve('fis3/bin/fis.js');
const errorCode = require('../../../errorCode');
const doZip = require('../../../utils/doZip');

async function run({ confPath, output, outputType }) {
  const fisConf = require.resolve('./fis-conf.js');

  const outputZip = outputType === 'zip' || output.endsWith('.zip');

  const tempDir = path.join(os.tmpdir(), 'stormrage-replace-release');

  if (outputZip) {
    fs.emptyDirSync(tempDir);
  }

  try {
    child_process.execSync(`node ${fis3} release --file ${fisConf} --root ${process.cwd()} -c`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        __context: JSON.stringify({
          confPath,
          // 如果需要生成zip, 先把结果产出到临时目录
          output: outputZip ? tempDir : output,
        }),
      },
    });

    // 输出zip文件
    if (outputZip) {
      const { dir, name } = path.parse(output);
      doZip(tempDir, dir, name);
    }
  } catch (e) {
    console.error(e);
    process.exit(errorCode.RUN_COMMAND_ERROR);
  }
}

module.exports = run;
