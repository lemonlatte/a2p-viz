const axios = require("axios")

async function getTraders() {
  try {
    let result = await axios.get("https://a2p.bitmark.com/s/api/traders")
    return result.data.traders
  } catch (error) {
    console.log(error)
  }
}

async function parseTxs() {
  let totalTxs = [];
  let txMap = []
  let traders = await getTraders()
  for (let i = 0; i < traders.length; i++) {
    let owner = traders[i].account_number
    let result = await axios.get("https://api.bitmark.com/v1/txs?owner=" + owner)
    let txs = result.data.txs
    if (txs.length === 0) {
      continue
    }
    for (let j in txs) {
      totalTxs.push(txs[j])
      txMap[txs[j].id] = txs[j]
    }
  }

  return {
    txs: totalTxs,
    txMap: txMap
  }
}


async function main() {
  let txSummary = await parseTxs()
  txSummary.txs.sort((a, b) => a.block_number - b.block_number)
  let issues = txSummary.txs.filter((e) => e.id === e.bitmark_id)
  let transfers = txSummary.txs.filter((e) => e.previous_id != null)

  for (let j in transfers) {
    let prevTxId = transfers[j].previous_id
    transfers[j].previous_owner = txSummary.txMap[prevTxId].owner
  }

  let exchangePair = [];
  while (transfers.length > 0) {
    let trade1 = transfers.shift()
    let coTradeItemIndex = transfers.findIndex((e) => e.owner === trade1.previous_owner && e.previous_owner === trade1.owner)
    let trade2 = transfers.splice(coTradeItemIndex, 1)[0]

    exchangePair.push([trade1, trade2])
  }

  let initData = {};

  for (let j in issues) {
    let owner = issues[j].owner
    let assetId = issues[j].asset_id
    let bitmarkId = issues[j].bitmark_id

    let ownerBitmarks = initData[owner] || {};
    ownerBitmarks[bitmarkId] = {
      color: "#" + assetId.slice(0, 6)
    }
    initData[owner] = ownerBitmarks
  }

  console.log(JSON.stringify({
    "initData": initData,
    "exchangePair": exchangePair
  }, null, 2))
}

main()
