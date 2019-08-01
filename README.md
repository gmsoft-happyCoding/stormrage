# stormrage

[![npm version](https://img.shields.io/npm/v/stormrage.svg?style=flat-square)](https://www.npmjs.com/package/stormrage)

gmsoft frontend cli

![Illidan Stormrage](img/Illidan%20Stormrage.jpg)

# install

`npm i stormrage -g`

## sub-commit

- `init` 用于根据模板初始化项目
- `start [project]`  启动调试
- `devbuild [project]` 启动组件项目开发编译, 用于和app的联调
- `test [project]`  启动测试
- `bad | deploy [project]`  编译部署
- `genapi [project]`  生成api代码
- `docz [project]`  启动docz调试

### usage

---

#### `npx stormrage init`

option:
* `-s, --no-start` 生成后不自动启动项目

> 模板使用了内部的服务器, 请配置你的 hosts 文件:
>
> (stormrage 会尝试自动设置, 如果设置失败, 请手动设置以下规则)
>
> - 192.168.2.11 cdn.gmsoftdev.com
> - 192.168.2.11 registry.gmsoftdev.com
> - 192.168.2.12 registry.gmsofttest.com

---

#### `npx stormrage start [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:
* `-p, --package <package>`  react项目为mono仓库时, 指定启动的package
* `--port <port>`  react项目启动端口号, 默认 app: 3000, components: 3030

---

#### `npx stormrage devbuild [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:
* `--port <port>` react项目启动端口号, 默认 3030
* `--pick` 选择需要发布的组件, 组件项目有效

---

#### `npx stormrage test [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:
* `-p, --package <package>`  react项目为mono仓库时, 指定测试的package

---

#### `npx stormrage bad [project]` or `npx stormrage deploy [project]`

###### project - 指定项目, 未指定时默认为当前目录
option:
* `-p, --package <package>` react项目为mono仓库时, 指定要发布的package
* `-d, --dest <path>` 发布结果存放位置, 默认为 *d:/发布结果*
* `--no-doc` 不生成组件文档
* `--pick` 选择需要发布的组件, 组件项目有效
* `--svn <url>` 通过svn url指定需要发布的项目, 优先级高于 `[project]`

---

#### `npx stormrage genapi [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:
* `-p, --package <package>`  react项目为mono仓库时, 指定需要生成api代码的package

---

#### `npx stormrage test [project]`

###### project - 指定项目, 未指定时默认为当前目录

option:
* `-p, --package <package>`  react项目为mono仓库时, 指定启动的package