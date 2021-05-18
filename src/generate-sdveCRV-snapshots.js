const {JsonRpcProvider} = require('@ethersproject/providers');
const Aigle = require('aigle');
const {BigNumber} = require('@ethersproject/bignumber');
const {Contract} = require('@ethersproject/contracts');
const groupBy = require('lodash/groupBy');
const orderBy = require('lodash/orderBy');
const fs = require('fs');

require('dotenv').config();

const ABI = [
  {
    anonymous: false,
    inputs: [
      {indexed: true, internalType: 'address', name: 'from', type: 'address'},
      {indexed: true, internalType: 'address', name: 'to', type: 'address'},
      {indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256'}
    ],
    name: 'Transfer',
    type: 'event'
  }
];

const PROVIDER = `https://eth-mainnet.alchemyapi.io/v2/<ALCHEMY_API_KEY>`;
const SDVECRV = '0x478bBC744811eE8310B461514BDc29D03739084D';
const MASTERCHEF = '0xfEA5E213bbD81A8a94D0E1eDB09dBD7CEab61e1c';

const provider = new JsonRpcProvider(PROVIDER);

const sum = (arr = []) => {
  return arr
    .filter(x => x.to !== MASTERCHEF && x.from !== MASTERCHEF)
    .reduce((acc, curr) => acc.add(curr.amount), BigNumber.from(0));
};

const getList = async blocks => {
  const contract = new Contract(SDVECRV, ABI, provider);
  const events = await contract.queryFilter('Transfer');

  Aigle.resolve(blocks).eachSeries(async block => {
    console.log(`Handling tx where block < ${block}`);

    const transfers = events
      .map(event => {
        const [from, to, amount] = event.args;
        const block = event.blockNumber;
        return {from, to, amount, block};
      })
      .filter(x => x.block <= block);

    const IN = groupBy(transfers, 'to');
    const OUT = groupBy(transfers, 'from');

    const supply = Object.keys(IN).reduce((acc, address) => {
      const input = sum(IN[address]);
      const output = sum(OUT[address]);
      const balance = input.sub(output);
      return acc.add(balance);
    }, BigNumber.from(0));

    const result = Object.keys(IN).map(address => {
      const input = sum(IN[address]);
      const output = sum(OUT[address]);
      const balance = input.sub(output);

      return {
        address: address.toLocaleLowerCase(),
        balance: balance.toString(),
        percent: (balance / supply) * 100
      };
    });

    const ordered = orderBy(result, 'percent', 'desc').filter(
      x => parseInt(x.balance) > 0
    );

    fs.writeFileSync(
      `snapshots/${block}-sdveCRV-holders.json`,
      JSON.stringify(ordered),
      'UTF-8'
    );
  });
};

//https://github.com/ellipsis-finance/vecrv-airdrop/tree/master/distributions

getList([
  12059299, // 18/03
  12150245, // 01/04
  12195833, // 08/04
  12241312, // 15/04
  12286712, // 22/04
  12332010, // 29/04
  12377381, // 06/05
  12422661 // 13/05,
]);
