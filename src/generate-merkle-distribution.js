const { defaultAbiCoder } = require("@ethersproject/abi");
const { BigNumber } = require("@ethersproject/bignumber");
const MerkleTree = require("./MerkleTree");
const { bufferToHex, keccak256 } = require('ethereumjs-util')
const fs = require('fs');

// used for multiplying bignumbers less than 1
const PRECISION = 1000000

// total amount of SDT that will be distributed
const totalSDT = BigNumber.from('12894000000000000000000')

// amount received by stakedao in each airdrop
const amountsReceived = [{
    block: 12059299,
    receivedAmount: BigNumber.from('0xc3d2ec2b18955be4e43')
  }, {
    block: 12150245,
    receivedAmount: BigNumber.from('0x11e21e599a5f45d631e9')
  }, {
    block: 12195833,
    receivedAmount: BigNumber.from('0x11954a6290cd70d98ff3')
  }, {
    block: 12241312,
    receivedAmount: BigNumber.from('0x117c6d34828ec3b7d4d7')
  }, {
    block: 12286712,
    receivedAmount: BigNumber.from('0x115fe8099fe3f5478865')
  }, {
    block: 12332010,
    receivedAmount: BigNumber.from('0x11771340cd2c375d34a8')
  }, {
    block: 12377381,
    receivedAmount: BigNumber.from('0x14233e60cb1ae458b178')
  }, {
    block: 12422661,
    receivedAmount: BigNumber.from('0x13f6db0a5420e69b7c31')
  }]

// total of all 8 drops, used to calculate ratio of reward per drop
const totalReceivedAmount = amountsReceived.reduce((sum, drop) => {
  return sum.add(drop.receivedAmount)
}, BigNumber.from(0))

// map to store user's share of total sdt drop amount
let aggregateUserShareMap = {}

// populate aggregateUserShareMap
amountsReceived.forEach(drop => {
  const dist = require(`../snapshots/${drop.block}-sdveCRV-holders.json`)
  const dropShare = drop.receivedAmount/totalReceivedAmount
  dist.forEach(user => {
    aggregateUserShareMap[user.address] = aggregateUserShareMap[user.address] || 0
    aggregateUserShareMap[user.address] = aggregateUserShareMap[user.address] + (user.percent/100 * dropShare)
  })
})

// prepare list of users with actual SDT drop amount and node hashes to prepare merkle tree
const finalUserList = Object.keys(aggregateUserShareMap).map((address, index) => {
  const amount = totalSDT
    .mul((aggregateUserShareMap[address] * PRECISION).toFixed(0))
    .div(PRECISION)

  const nodeHash = (keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'address', 'uint256'],
        [index, address, amount]
      )
    ))

  return {
    index,
    address,
    amount,
    nodeHash
  }
})

// make merkle tree from node hashes
const tree = new MerkleTree(finalUserList.map(share => share.nodeHash))

// prepare distribution having proof and readable values, to be written to file
const merkleDistribution = {
  merkleRoot: tree.getHexRoot(),
  tokenTotal: totalSDT.toString(),
  claims: finalUserList.map(user => {
    const hexNodeHash = bufferToHex(user.nodeHash)
    const proof = tree.getHexProof(hexNodeHash)

    return {
      ...user,
      amount: user.amount.toString(),
      nodeHash: hexNodeHash,
      proof
    }
  })
}

// write to a file
fs.writeFileSync(
  `merkle-distribution.json`,
  JSON.stringify(merkleDistribution),
  'UTF-8'
);
