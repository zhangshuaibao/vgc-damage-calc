# VGC Damage Calculator (React Frontend)

This is a React-based frontend for a Pokémon VGC Damage Calculator. It provides a user-friendly interface for calculating damage in Pokémon battles, designed with responsive layouts for various devices.

## Features

- **Comprehensive Damage Calculation**: Supports full damage calculation mechanics for VGC battles.
- **Responsive Design**: Optimized for both desktop and mobile usage.
- **Note**: When deployed independently, the feature to fetch real-time usage statistics is not available. However, all core calculation features remain fully functional.

## Local JSON API

Build and start the local calculation API:

```bash
npm run api:build
npm run api
```

Deployment is split into two services:

- `docker-run.sh` keeps deploying the web calculator service. The container is
  bound to `127.0.0.1:8800`.
- `api/docker-run-api.sh` deploys the standalone API service. The container is
  bound to `127.0.0.1:8801`.

Configure the upstream proxy so `/calc` routes to port `8800` and `/calc/api`
routes to port `8801`.

The API accepts POST requests at `/calc/api` or `/calc/api/calculate`.

POST JSON to `http://127.0.0.1:8787/calc/api` locally:

```json
{
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
}
```

The response includes raw damage rolls, damage range, percent range, move/full descriptions, KO chance, and normalized attacker/defender data.

## Credits

This project incorporates code from the following MIT-licensed repositories (located in the `vendor` directory):

- [smogon/damage-calc](https://github.com/smogon/damage-calc)
- [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown)

We strictly adhere to the open-source protocols of these upstream projects.

## License

This project is licensed under the **MIT License**.

## Contributing

### Bug Reports

If you encounter any bugs or unexpected behavior, please submit an issue at:
[https://github.com/radiantwf/vgc-damage-calc/issues](https://github.com/radiantwf/vgc-damage-calc/issues)

### Translation / Localization

The project supports multiple languages, with language files located in `public/locales`.

Please note that due to limited language proficiency, existing translations may contain errors. We highly encourage the community to help improve these translations.

- **Found a translation error?** Please submit an issue or a pull request.
- **Want to add a new language?** Contributions are welcome!
