# 外部导入敌我宝可梦队伍

计算器部署地址：

```text
https://pokestats.top/calc/
```

外部页面可以使用 Pokemon Showdown 的 packed team 格式，通过 URL hash 打开计算器并导入队伍。

## 打开方式

推荐使用固定窗口名打开：

```js
window.open(url, "vgc-damage-calculator");
```

这样可以复用已经打开的计算器窗口；如果没有已打开的计算器窗口，浏览器会新建一个标签页。

## URL 语法

### 导入己方队伍

无队伍侧标识时，默认导入己方：

```text
https://pokestats.top/calc/#${packed}
```

也可以显式使用 `1` 标识己方：

```text
https://pokestats.top/calc/#1${packed}
```

### 导入敌方队伍

使用 `2` 标识敌方：

```text
https://pokestats.top/calc/#2${packed}
```

### 同时导入己方和敌方

使用 `1` / `2` 分段：

```text
https://pokestats.top/calc/#1
${packed1}
2
${packed2}
```

实际拼接 URL 时需要对 hash 内容做 URL 编码：

```js
const url =
  "https://pokestats.top/calc/#" +
  encodeURIComponent(`1
${packed1}
2
${packed2}`);

window.open(url, "vgc-damage-calculator");
```

## packed team 格式

`${packed}` 使用 Pokemon Showdown 的 packed team 格式，与 `https://play.pokemonshowdown.com/teambuilder#${packed}` 兼容。

如果只有普通 pasteText，需要先转换成 packed team。字段顺序为：

```text
name|species|item|ability|moves|nature|evs|gender|ivs|shiny|level|misc
```

多个宝可梦之间使用 `]` 分隔。

常用字段说明：

```text
species: 宝可梦名，使用 Showdown ID 风格，例如 CharizardMegaY
item: 道具，例如 CharizarditeY
ability: 特性，例如 Blaze
moves: 招式列表，逗号分隔，例如 HeatWave,SolarBeam,WeatherBall,Protect
nature: 性格，例如 Modest
evs: HP,Atk,Def,SpA,SpD,Spe，逗号分隔，例如 14,,28,11,,13
ivs: HP,Atk,Def,SpA,SpD,Spe，逗号分隔；空值按 31 处理
level: 等级，例如 50
misc: 第 6 项为太晶属性，例如 ,,,,,Fire
```

如果需要导入太晶属性，请把太晶属性写在 `misc` 字段的第 6 项。前 5 项为空时，需要保留 5 个逗号。没有该项时，计算器不会导入或覆盖太晶属性：

```text
name|species|item|ability|moves|nature|evs|gender|ivs|shiny|level|,,,,,Fire
```

## 示例

只导入己方：

```js
const packed =
  "CharizardMegaY||CharizarditeY|Blaze|HeatWave,SolarBeam,WeatherBall,Protect|Modest|14,,28,11,,13||||50|,,,,,Fire";

window.open(
  "https://pokestats.top/calc/#" + encodeURIComponent(packed),
  "vgc-damage-calculator",
);
```

只导入敌方：

```js
const packed =
  "LopunnyMega||Lopunnite|CuteCharm|CloseCombat,GigaImpact,FakeOut,Encore|Jolly|5,29,,,,32||||50|,,,,,Fighting";

window.open(
  "https://pokestats.top/calc/#" + encodeURIComponent(`2${packed}`),
  "vgc-damage-calculator",
);
```

同时导入双方：

```js
const attackerPacked =
  "CharizardMegaY||CharizarditeY|Blaze|HeatWave,SolarBeam,WeatherBall,Protect|Modest|14,,28,11,,13||||50|,,,,,Fire";
const defenderPacked =
  "LopunnyMega||Lopunnite|CuteCharm|CloseCombat,GigaImpact,FakeOut,Encore|Jolly|5,29,,,,32||||50|,,,,,Fighting";

const hash = `1
${attackerPacked}
2
${defenderPacked}`;

window.open(
  "https://pokestats.top/calc/#" + encodeURIComponent(hash),
  "vgc-damage-calculator",
);
```

## 行为说明

导入会在计算器初始化完成后执行：先加载 formats 和宝可梦使用率，再导入 URL 中的队伍。

导入成功后，战场配置会重置为初始状态。

如果 URL 只包含己方队伍，只导入己方；如果只包含敌方队伍，只导入敌方。
