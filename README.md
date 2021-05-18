# EPS Airdrop distribution
Contains the scripts used to distribute the EPS airdrop received by StakeDAO Perpetual Passive CRV strategy.

## steps to generate merkle distribution

### Install dependencies
```
yarn
```

### Make snapshots of sdveCRV holders
Set alchemy key in `generate-sdveCRV-snapshots.js`
Run -
```
node ./src/generate-sdveCRV-snapshots.js
```

### Make merkle distribution
Set amount of SDT to be distributed in `generate-merkle-distribution.js`
Run -
```
node ./src/generate-merkle-distribution.js
```
