# VGC 伤害计算 API

该 API 用于计算一个攻击方宝可梦使用一个招式攻击一个防御方宝可梦时的伤害结果。计算逻辑使用项目内置的 Smogon damage-calc 数据与机制。

## 接口地址

支持以下路径：

| 方法     | 路径                    | 说明                           |
| -------- | ----------------------- | ------------------------------ |
| `POST` | `/calc/api`           | 推荐计算接口。                 |
| `POST` | `/calc/api/`          | 推荐计算接口，兼容结尾 `/`。 |
| `POST` | `/calc/api/calculate` | 计算接口别名。                 |
| `GET`  | `/calc/api/health`    | 健康检查。                     |

线上调用示例：

```bash
curl -X POST 'https://pokestats.top/calc/api/' \
  -H 'Content-Type: application/json' \
  -d '{
    "gen": 9,
    "attacker": {
      "name": "Flutter Mane",
      "level": 50,
      "ability": "Protosynthesis",
      "item": "Choice Specs",
      "nature": "Modest",
      "evs": { "spa": 252 }
    },
    "defender": {
      "name": "Amoonguss",
      "level": 50,
      "nature": "Calm",
      "evs": { "hp": 252, "spd": 252 }
    },
    "move": { "name": "Moonblast" },
    "field": { "gameType": "Doubles" }
  }'
```

## 请求体

请求体必须是 JSON object。

顶层字段：

| 字段         | 类型           | 必填 | 默认值                        | 说明                             |
| ------------ | -------------- | ---- | ----------------------------- | -------------------------------- |
| `gen`      | number         | 否   | `9`                         | 世代编号。                       |
| `attacker` | Pokemon object | 是   | 无                            | 攻击方宝可梦。                   |
| `defender` | Pokemon object | 是   | 无                            | 防御方宝可梦。                   |
| `move`     | Move object    | 是   | 无                            | 攻击方使用的招式。               |
| `field`    | Field object   | 否   | `{ "gameType": "Doubles" }` | 场地、天气、空间、双方场地效果。 |

## Pokemon Object

`attacker` 和 `defender` 使用同一套结构。`name` 与 `species` 至少提供一个。

| 字段              | 类型          | 必填                     | 默认值                       | 说明                                                                                                                           |
| ----------------- | ------------- | ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`          | string        | 是，除非提供 `species` | 无                           | 宝可梦名称，例如 `"Flutter Mane"`。                                                                                          |
| `species`       | string        | 是，除非提供 `name`    | 无                           | 宝可梦名称别名。                                                                                                               |
| `level`         | number        | 否                       | `50`                       | 等级。                                                                                                                         |
| `ability`       | string        | 否                       | 计算库的物种默认特性         | 特性名称。                                                                                                                     |
| `abilityOn`     | boolean       | 否                       | `false`                    | 部分机制需要的特性激活状态。                                                                                                   |
| `item`          | string        | 否                       | 无                           | 携带道具。`"(No Item)"` 会被当作无道具。                                                                                     |
| `nature`        | string        | 否                       | `"Serious"`                | 性格名称。                                                                                                                     |
| `teraType`      | string        | 否                       | 无                           | 太晶属性。除非 `isTera` 严格等于 `false`，否则会传入计算器。                                                               |
| `isTera`        | boolean       | 否                       | 提供 `teraType` 时等同启用 | 设置为 `false` 时忽略 `teraType`。                                                                                         |
| `curHP`         | number        | 否                       | 最大 HP                      | 当前 HP。                                                                                                                      |
| `currentHP`     | number        | 否                       | 最大 HP                      | `curHP` 的别名；如果两者都提供，优先使用 `curHP`。                                                                         |
| `evs`           | Stats object  | 否                       | 全部 `0`                   | 努力值。                                                                                                                       |
| `ivs`           | Stats object  | 否                       | 全部 `31`                  | 个体值。                                                                                                                       |
| `boosts`        | Boosts object | 否                       | 全部 `0`                   | 能力阶级。`hp` 会被忽略。                                                                                                    |
| `status`        | string        | 否                       | 无                           | 异常状态，例如 `"brn"`、`"par"`、`"psn"`、`"tox"`、`"slp"`、`"frz"`。                                              |
| `isDynamaxed`   | boolean       | 否                       | `false`                    | 是否极巨化。                                                                                                                   |
| `dynamaxLevel`  | number        | 否                       | 计算库默认值                 | 极巨化等级。                                                                                                                   |
| `alliesFainted` | number        | 否                       | 无                           | 已倒下队友数量，用于仆刀将军等机制。                                                                                           |
| `boostedStat`   | string        | 否                       | 无                           | 古代活性、夸克充能等强化的能力。可用值：`"atk"`、`"def"`、`"spa"`、`"spd"`、`"spe"`。`"inactive"` 会被当作未启用。 |
| `moves`         | string[]      | 否                       | `[]`                       | 写入宝可梦对象的招式列表元数据。实际计算使用顶层 `move.name`，不是这里的数组。                                               |
| `baseStats`     | Stats object  | 否                       | 物种种族值                   | 覆盖物种种族值。                                                                                                               |
| `overrides`     | object        | 否                       | 无                           | 透传给底层计算库的 Pokemon override object。如果提供了 `baseStats`，则忽略该字段。                                           |

Stats object 支持的键：

| 键      | 说明 |
| ------- | ---- |
| `hp`  | HP   |
| `atk` | 攻击 |
| `def` | 防御 |
| `spa` | 特攻 |
| `spd` | 特防 |
| `spe` | 速度 |

Boosts object 支持 `atk`、`def`、`spa`、`spd`、`spe`。如果传入 `hp`，服务端会删除它。

## Move Object

`name` 与 `move` 至少提供一个。

| 字段                       | 类型    | 必填                  | 默认值       | 说明                                                                                                          |
| -------------------------- | ------- | --------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `name`                   | string  | 是，除非提供 `move` | 无           | 招式名称，例如 `"Moonblast"`。                                                                              |
| `move`                   | string  | 是，除非提供 `name` | 无           | 招式名称别名。                                                                                                |
| `ability`                | string  | 否                    | 攻击方特性   | 招式转换、特殊机制使用的特性上下文。                                                                          |
| `item`                   | string  | 否                    | 攻击方道具   | 招式转换、特殊机制使用的道具上下文。                                                                          |
| `species`                | string  | 否                    | 攻击方物种   | 招式转换、特殊机制使用的物种上下文。                                                                          |
| `useZ`                   | boolean | 否                    | `false`    | 按 Z 招式计算，前提是该招式支持。                                                                             |
| `isZ`                    | boolean | 否                    | `false`    | `useZ` 的别名。                                                                                             |
| `useMax`                 | boolean | 否                    | `false`    | 按极巨招式计算，前提是该招式支持。                                                                            |
| `isMax`                  | boolean | 否                    | `false`    | `useMax` 的别名。                                                                                           |
| `isCrit`                 | boolean | 否                    | `false`    | 强制会心一击。                                                                                                |
| `criticalHit`            | boolean | 否                    | `false`    | `isCrit` 的别名。                                                                                           |
| `isStellarFirstUse`      | boolean | 否                    | `false`    | 星晶太晶首次使用标记。                                                                                        |
| `hits`                   | number  | 否                    | 招式默认值   | 覆盖多段攻击命中次数。                                                                                        |
| `timesUsed`              | number  | 否                    | 招式默认值   | 用于根据使用次数变化的招式。                                                                                  |
| `timesUsedWithMetronome` | number  | 否                    | 招式默认值   | 节拍器道具相关的使用次数。                                                                                    |
| `bp`                     | number  | 否                    | 招式基础威力 | 覆盖招式威力。                                                                                                |
| `basePower`              | number  | 否                    | 招式基础威力 | `bp` 的别名。                                                                                               |
| `overrides`              | object  | 否                    | 无           | 透传给底层计算库的 Move override object。如果提供 `bp` 或 `basePower`，会合并为 `overrides.basePower`。 |

## Field Object

所有字段均可选。未在表内列出的字段也会透传给底层计算库的 Field 构造器。

| 字段                | 类型        | 默认值        | 说明                                                                                                                               |
| ------------------- | ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `gameType`        | string      | `"Doubles"` | 对战类型，通常为 `"Singles"` 或 `"Doubles"`。                                                                                  |
| `terrain`         | string      | 无            | 场地，例如 `"Electric"`、`"Grassy"`、`"Misty"`、`"Psychic"`。                                                              |
| `weather`         | string      | 无            | 天气，例如 `"Sun"`、`"Rain"`、`"Sand"`、`"Snow"`、`"Hail"`、`"Harsh Sunshine"`、`"Heavy Rain"`、`"Strong Winds"`。 |
| `isMagicRoom`     | boolean     | `false`     | 魔法空间。                                                                                                                         |
| `isWonderRoom`    | boolean     | `false`     | 奇妙空间。                                                                                                                         |
| `isGravity`       | boolean     | `false`     | 重力。                                                                                                                             |
| `isAuraBreak`     | boolean     | `false`     | 气场破坏。                                                                                                                         |
| `isFairyAura`     | boolean     | `false`     | 妖精气场。                                                                                                                         |
| `isDarkAura`      | boolean     | `false`     | 暗黑气场。                                                                                                                         |
| `isBeadsOfRuin`   | boolean     | `false`     | 灾祸之玉。                                                                                                                         |
| `isSwordOfRuin`   | boolean     | `false`     | 灾祸之剑。                                                                                                                         |
| `isTabletsOfRuin` | boolean     | `false`     | 灾祸之简。                                                                                                                         |
| `isVesselOfRuin`  | boolean     | `false`     | 灾祸之鼎。                                                                                                                         |
| `attackerSide`    | Side object | `{}`        | 攻击方一侧的场地效果。                                                                                                             |
| `defenderSide`    | Side object | `{}`        | 防御方一侧的场地效果。                                                                                                             |

## Side Object

所有字段均可选。部分效果同时支持底层计算库字段名和更易读的别名。

| 字段               | 类型    | 默认值    | 说明                                   |
| ------------------ | ------- | --------- | -------------------------------------- |
| `spikes`         | number  | `0`     | 撒菱层数。                             |
| `steelsurge`     | boolean | `false` | 超极巨钢铁阵法。                       |
| `vinelash`       | boolean | `false` | 超极巨灰飞鞭灭。                       |
| `wildfire`       | boolean | `false` | 超极巨地狱灭焰。                       |
| `cannonade`      | boolean | `false` | 超极巨水炮轰灭。                       |
| `volcalith`      | boolean | `false` | 超极巨岩阵以待。                       |
| `isSR`           | boolean | `false` | 隐形岩。                               |
| `stealthRock`    | boolean | `false` | `isSR` 的别名。                      |
| `isReflect`      | boolean | `false` | 反射壁。                               |
| `reflect`        | boolean | `false` | `isReflect` 的别名。                 |
| `isLightScreen`  | boolean | `false` | 光墙。                                 |
| `lightScreen`    | boolean | `false` | `isLightScreen` 的别名。             |
| `isProtected`    | boolean | `false` | 守住状态。                             |
| `protect`        | boolean | `false` | `isProtected` 的别名。               |
| `isSeeded`       | boolean | `false` | 寄生种子。                             |
| `leechSeed`      | boolean | `false` | `isSeeded` 的别名。                  |
| `isSaltCured`    | boolean | `false` | 盐腌状态。                             |
| `saltCure`       | boolean | `false` | `isSaltCured` 的别名。               |
| `isForesight`    | boolean | `false` | 识破状态。                             |
| `foresight`      | boolean | `false` | `isForesight` 的别名。               |
| `isTailwind`     | boolean | `false` | 顺风。                                 |
| `tailwind`       | boolean | `false` | `isTailwind` 的别名。                |
| `isHelpingHand`  | boolean | `false` | 帮助。                                 |
| `helpingHand`    | boolean | `false` | `isHelpingHand` 的别名。             |
| `isFlowerGift`   | boolean | `false` | 花之礼。                               |
| `flowerGift`     | boolean | `false` | `isFlowerGift` 的别名。              |
| `isPowerTrick`   | boolean | `false` | 力量戏法。                             |
| `powerTrick`     | boolean | `false` | `isPowerTrick` 的别名。              |
| `isFriendGuard`  | boolean | `false` | 友情防守。                             |
| `friendGuard`    | boolean | `false` | `isFriendGuard` 的别名。             |
| `isAuroraVeil`   | boolean | `false` | 极光幕。                               |
| `auroraVeil`     | boolean | `false` | `isAuroraVeil` 的别名。              |
| `isBattery`      | boolean | `false` | 蓄电池。                               |
| `battery`        | boolean | `false` | `isBattery` 的别名。                 |
| `isPowerSpot`    | boolean | `false` | 能量点。                               |
| `powerSpot`      | boolean | `false` | `isPowerSpot` 的别名。               |
| `isSteelySpirit` | boolean | `false` | 钢之意志。                             |
| `steelySpirit`   | boolean | `false` | `isSteelySpirit` 的别名。            |
| `isSwitching`    | string  | 无        | 底层计算库的换下状态，例如 `"out"`。 |

## 成功响应

成功响应格式：

```json
{
  "ok": true,
  "result": {
    "damage": [57, 58, 58, 60, 60, 61, 62, 63, 63, 64, 66, 67],
    "range": [57, 67],
    "percentRange": [25.79, 30.32],
    "moveDesc": "25.7 - 30.3%",
    "fullDesc": "252+ SpA Choice Specs Flutter Mane Moonblast vs. 252 HP / 252+ SpD Amoonguss: 57-67 (25.7 - 30.3%) -- guaranteed 4HKO",
    "kochance": {
      "chance": 1,
      "n": 4,
      "text": "guaranteed 4HKO"
    },
    "rawDesc": {},
    "attacker": {},
    "defender": {},
    "move": {},
    "field": {}
  }
}
```

顶层响应字段：

| 字段       | 类型    | 说明                          |
| ---------- | ------- | ----------------------------- |
| `ok`     | boolean | 是否成功。成功时为 `true`。 |
| `result` | object  | 计算结果主体。                |

`result` 字段说明：

| 字段             | 类型                            | 说明                                                                                                                |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `damage`       | number\| number[] \| number[][] | 底层计算库返回的原始伤害。多数普通攻击为 16 个随机伤害 roll 的数组；固定伤害可能是 number；多段攻击可能是嵌套数组。 |
| `range`        | `[number, number]`            | 总伤害最小值与最大值。                                                                                              |
| `percentRange` | `[number, number]`            | 总伤害占防御方最大 HP 的百分比范围，保留两位小数。                                                                  |
| `moveDesc`     | string                          | 仅伤害范围描述，例如 `"25.7 - 30.3%"`。                                                                           |
| `fullDesc`     | string                          | 完整英文计算描述，包含攻击方配置、招式、防御方配置、伤害范围和击杀概率。                                            |
| `kochance`     | object                          | 击杀概率信息，来自底层计算库。                                                                                      |
| `rawDesc`      | object                          | 底层计算库用于生成描述的原始上下文。                                                                                |
| `attacker`     | Pokemon summary object          | 规范化后的攻击方摘要。                                                                                              |
| `defender`     | Pokemon summary object          | 规范化后的防御方摘要。                                                                                              |
| `move`         | Move summary object             | 规范化后的招式摘要。                                                                                                |
| `field`        | object                          | 实际参与计算的场地对象。                                                                                            |

`kochance` 字段说明：

| 字段       | 类型   | 说明                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------ |
| `chance` | number | 达成对应 `n` 次击倒的概率，范围通常为 `0` 到 `1`。例如 `1` 表示 100%。 |
| `n`      | number | 需要几次攻击击倒，例如 `1` 表示 OHKO，`2` 表示 2HKO。                      |
| `text`   | string | 英文击杀概率描述，例如 `"guaranteed 4HKO"`。                                 |

`attacker` 与 `defender` 摘要字段：

| 字段         | 类型               | 说明                                         |
| ------------ | ------------------ | -------------------------------------------- |
| `name`     | string             | 传入或计算库使用的宝可梦名称。               |
| `species`  | string             | 物种名称。                                   |
| `level`    | number             | 等级。                                       |
| `ability`  | string             | 实际计算使用的特性。                         |
| `item`     | string\| undefined | 实际计算使用的道具。无道具时可能不存在。     |
| `nature`   | string             | 性格。                                       |
| `types`    | string[]           | 当前物种属性。                               |
| `stats`    | Stats object       | 实际参与计算的当前能力值。                   |
| `rawStats` | Stats object       | 未经过临时战斗修正的能力值。                 |
| `curHP`    | number             | 当前 HP。未传当前 HP 时为最大 HP。           |
| `maxHP`    | number             | 最大 HP；极巨化时会反映极巨化 HP。           |
| `boosts`   | Boosts object      | 实际计算使用的能力阶级。                     |
| `status`   | string\| undefined | 异常状态。无异常时可能不存在。               |
| `teraType` | string\| undefined | 实际计算使用的太晶属性。未太晶时可能不存在。 |

`move` 摘要字段：

| 字段             | 类型                | 说明                                                             |
| ---------------- | ------------------- | ---------------------------------------------------------------- |
| `name`         | string              | 实际计算使用的招式名称。Z 招式或极巨招式可能会变成转换后的名称。 |
| `originalName` | string              | 原始传入的招式名称。                                             |
| `type`         | string              | 实际计算使用的招式属性。                                         |
| `category`     | string              | 招式分类，通常为 `"Physical"`、`"Special"` 或 `"Status"`。 |
| `bp`           | number              | 实际计算使用的威力。                                             |
| `hits`         | number              | 实际计算使用的命中次数。                                         |
| `isCrit`       | boolean             | 是否按会心计算。                                                 |
| `useZ`         | boolean\| undefined | 是否请求按 Z 招式计算。                                          |
| `useMax`       | boolean\| undefined | 是否请求按极巨招式计算。                                         |

`field` 响应字段：

| 字段                | 类型               | 说明                             |
| ------------------- | ------------------ | -------------------------------- |
| `gameType`        | string             | 实际计算使用的对战类型。         |
| `terrain`         | string\| undefined | 实际计算使用的场地。             |
| `weather`         | string\| undefined | 实际计算使用的天气。             |
| `isMagicRoom`     | boolean            | 魔法空间。                       |
| `isWonderRoom`    | boolean            | 奇妙空间。                       |
| `isGravity`       | boolean            | 重力。                           |
| `isAuraBreak`     | boolean            | 气场破坏。                       |
| `isFairyAura`     | boolean            | 妖精气场。                       |
| `isDarkAura`      | boolean            | 暗黑气场。                       |
| `isBeadsOfRuin`   | boolean            | 灾祸之玉。                       |
| `isSwordOfRuin`   | boolean            | 灾祸之剑。                       |
| `isTabletsOfRuin` | boolean            | 灾祸之简。                       |
| `isVesselOfRuin`  | boolean            | 灾祸之鼎。                       |
| `attackerSide`    | Side object        | 实际计算使用的攻击方侧场地效果。 |
| `defenderSide`    | Side object        | 实际计算使用的防御方侧场地效果。 |

响应中的 `attackerSide` 与 `defenderSide` 是底层 `Side` 对象，常见字段包括：

| 字段               | 类型               | 说明             |
| ------------------ | ------------------ | ---------------- |
| `spikes`         | number             | 撒菱层数。       |
| `steelsurge`     | boolean            | 超极巨钢铁阵法。 |
| `vinelash`       | boolean            | 超极巨灰飞鞭灭。 |
| `wildfire`       | boolean            | 超极巨地狱灭焰。 |
| `cannonade`      | boolean            | 超极巨水炮轰灭。 |
| `volcalith`      | boolean            | 超极巨岩阵以待。 |
| `isSR`           | boolean            | 隐形岩。         |
| `isReflect`      | boolean            | 反射壁。         |
| `isLightScreen`  | boolean            | 光墙。           |
| `isProtected`    | boolean            | 守住状态。       |
| `isSeeded`       | boolean            | 寄生种子。       |
| `isSaltCured`    | boolean            | 盐腌状态。       |
| `isForesight`    | boolean            | 识破状态。       |
| `isTailwind`     | boolean            | 顺风。           |
| `isHelpingHand`  | boolean            | 帮助。           |
| `isFlowerGift`   | boolean            | 花之礼。         |
| `isPowerTrick`   | boolean            | 力量戏法。       |
| `isFriendGuard`  | boolean            | 友情防守。       |
| `isAuroraVeil`   | boolean            | 极光幕。         |
| `isBattery`      | boolean            | 蓄电池。         |
| `isPowerSpot`    | boolean            | 能量点。         |
| `isSteelySpirit` | boolean            | 钢之意志。       |
| `isSwitching`    | string\| undefined | 换下状态。       |

`rawDesc` 是底层计算库生成描述时使用的上下文对象，字段会随机制变化。常见字段包括：

| 字段                                                 | 说明                                       |
| ---------------------------------------------------- | ------------------------------------------ |
| `attackerName` / `defenderName`                  | 描述中使用的攻击方、防御方名称。           |
| `moveName`                                         | 描述中使用的招式名称。                     |
| `moveBP`                                           | 描述中使用的招式威力，只有需要展示时出现。 |
| `moveType`                                         | 招式属性，只有需要展示时出现。             |
| `attackEVs` / `defenseEVs` / `HPEVs`           | 描述中展示的努力值片段。                   |
| `attackBoost` / `defenseBoost`                   | 描述中展示的能力阶级片段。                 |
| `attackerItem` / `defenderItem`                  | 描述中使用的道具。                         |
| `attackerAbility` / `defenderAbility`            | 描述中使用的特性。                         |
| `attackerTera` / `defenderTera`                  | 描述中使用的太晶属性。                     |
| `weather` / `terrain`                            | 描述中使用的天气、场地。                   |
| `isBurned`                                         | 攻击方烧伤是否影响描述。                   |
| `isCritical`                                       | 是否会心。                                 |
| `isReflect` / `isLightScreen` / `isAuroraVeil` | 墙类效果是否进入描述。                     |
| `isHelpingHand`                                    | 帮助是否进入描述。                         |

## 错误响应

错误响应格式：

```json
{
  "ok": false,
  "error": "bad_request",
  "message": "move.name is required"
}
```

错误字段说明：

| 字段        | 类型    | 说明                                                                             |
| ----------- | ------- | -------------------------------------------------------------------------------- |
| `ok`      | boolean | 是否成功。错误时为 `false`。                                                   |
| `error`   | string  | 错误类型。常见值：`"bad_request"`、`"method_not_allowed"`、`"not_found"`。 |
| `message` | string  | 具体错误原因。                                                                   |

## 其他说明

- 请求体最大 1 MiB，超过会被拒绝。
- 宝可梦、招式、道具、特性、性格、属性、天气、场地等名称必须匹配项目内置计算库数据。
- 数字字段会通过 `Number(...)` 解析；无法解析时使用本文档中的默认值。
- 布尔字段会按 JavaScript 的 `Boolean(...)` 转换；建议传标准 JSON boolean。
