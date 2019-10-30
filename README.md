# stormrage

[![npm version](https://img.shields.io/npm/v/stormrage.svg?style=flat-square)](https://www.npmjs.com/package/stormrage)

gmsoft frontend cli

![Illidan Stormrage](img/Illidan%20Stormrage.jpg)

# install

`yarn global add stormrage`

> 如果安装后使用提示 stormrage 找不到
>
> 1. 执行 `yarn global bin`
> 2. 将输出结果加入到操作系统环境变量 `path` 中

## sub-commit

- `init` 用于根据模板初始化项目
- `start [project]` 启动调试
- `devbuild [project]` 启动组件项目开发编译, 用于和 app 的联调
- `test [project]` 启动测试
- `bad | deploy [project]` 编译部署
- `genapi [project]` 生成 api 代码
- `docz [project]` 启动 docz 调试
- `fisinstall | fi [components]` 使用 fis3 install 安装项目依赖

### usage

---

#### `stormrage init`

option:

- `-s, --no-start` 生成后不自动启动项目

> 模板使用了内部的服务器, 请配置你的 hosts 文件:
>
> (stormrage 会尝试自动设置, 如果设置失败, 请手动设置以下规则)
>
> - 192.168.2.11 cdn.gmsoftdev.com
> - 192.168.2.11 registry.gmsoftdev.com
> - 192.168.2.12 registry.gmsofttest.com

---

#### `stormrage start [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `-p, --package <package>` react 项目为 mono 仓库时, 指定启动的 package
- `--port <port>` react 项目启动端口号, 默认 app: 3000, components: 3030
- `-o, --output <path>` fis 项目的产出目录, 默认为 D:/debug-root, macOS 下为 ~/debug-root
- `-c, --clean` fis 项目启动调试前, 先清除编译缓存
- `--plugin-option <json>` fis 项目传递给插件的参数(must be a json)
-  `--env-file <fileName>` react项目指定环境变量配置文件(默认为 .env), *示例: .env.pro-xcj, 请设置为 --env-file pro-xcj*

---

#### `stormrage devbuild [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `--port <port>` react 项目启动端口号, 默认 3030
- `--pick` 选择需要发布的组件, 组件项目有效

---

#### `stormrage test [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `-p, --package <package>` react 项目为 mono 仓库时, 指定测试的 package

---

#### `stormrage bad [project]` or `stormrage deploy [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `-p, --package <package>` react 项目为 mono 仓库时, 指定要发布的 package
- `-d, --dest <path>` 发布结果存放位置, 默认为 _d:/发布结果_
- `--no-doc` 不生成组件文档
- `--pick` 选择需要发布的组件, 组件项目有效
- `--svn <url>` 通过 svn url 指定需要发布的项目, 优先级高于 `[project]`
- `--no-force-svn-checkout` 使用 svn 选项时, 若已有项目缓存, 不执行 checkout 操作, 直接使用缓存
- `--env <deployEnv>` 指定发布目标环境
- `--room <deployRoom>` 指定发布目标机房
- `--plugin-option <json>` fis 项目传递给插件的参数(must be a json)
-  `--env-file <fileName>` react项目指定环境变量配置文件(默认为 `${env}-${room}`), *eg: .env.pro-xcj, 请设置为 --env-file pro-xcj*
  

---

#### `stormrage genapi [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `-p, --package <package>` react 项目为 mono 仓库时, 指定需要生成 api 代码的 package

---

#### `stormrage docz [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:

- `-p, --package <package>` react 项目为 mono 仓库时, 指定启动的 package

---

#### `stormrage fisinstall [components]` or `stormrage fi [components]`

###### components - 需要安装的依赖

option:

- `-r, --root <project>` 指定项目根目录

---

### error code

```js
{
  // 解析 plugin-option 失败, 请检查校验是否是合法的json字符串
  PLUGIN_OPTION_ERROR: 1,
  // 拷贝配置文件到发布目录失败
  COPY_MACHINE_CONF_ERROR: 2,
  // 环境对应项目配置文件不存在
  NO_CONF_ERROR: 3,
  // 项目配置文件错误
  CONF_ERROR: 4,
  // 写应用部署信息文件失败
  WRITE_APP_CONF_ERROR: 5,
  // SVN相关操作失败
  SVN_ERROR: 6,
  // REACT_APP_DEPLOY_MACHINES 配置解析失败
  REACT_APP_DEPLOY_MACHINES_ERROR: 7,
  // build错误
  BUILD_ERROR: 8,
  // yarn未安装
  NO_YARN_ERROR: 9,
  // 生成zip文件错误
  ZIP_ERROR: 10,

  // 初始化模板下载失败
  DOWNLOAD_ERROR: 100,
  //
};

```
