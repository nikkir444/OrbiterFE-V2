const BigNumber = require('bignumber.js')

const MAX_BITS = {
  eth: 256,
  arbitrum: 256,
  zksync: 35,
  polygon: 256,
  optimistic: 256
}

const CHAIN_INDEX = {
  1: 'eth',
  2: 'arbitrum',
  22: 'arbitrum',
  3: 'zksync',
  33: 'zksync',
  4: 'eth',
  5: 'eth',
  6: 'polygon',
  66: 'polygon',
  7: 'optimistic',
  77: 'optimistic'
}

const SIZE_OP = {
  P_NUMBER: 4
}

function isZKChain(chain) {
  if (chain === 3 || chain === 33 || chain === 'zksync') {
    return true
  }
  return false
}

function getToAmountFromUserAmount(userAmount, selectMakerInfo, isWei) {
  let toAmount_tradingFee = new BigNumber(userAmount).minus(
    new BigNumber(selectMakerInfo.tradingFee)
  )
  let gasFee = toAmount_tradingFee
    .multipliedBy(new BigNumber(selectMakerInfo.gasFee))
    .dividedBy(new BigNumber(1000))
  let digit = selectMakerInfo.precision === 18 ? 5 : 2
  let gasFee_fix = gasFee.decimalPlaces(digit, BigNumber.ROUND_UP)
  let toAmount_fee = toAmount_tradingFee.minus(gasFee_fix)
  if (!toAmount_fee || isNaN(toAmount_fee)) {
    return 0
  }
  if (isWei) {
    return toAmount_fee.multipliedBy(
      new BigNumber(10 ** selectMakerInfo.precision)
    )
  } else {
    return toAmount_fee
  }
}

function getTAmountFromRAmount(chain, amount, pText) {
  if (!isChainSupport(chain)) {
    return {
      state: false,
      error: 'The chain did not support'
    }
  }
  if (amount < 1) {
    return {
      state: false,
      error: "the token doesn't support that many decimal digits"
    }
  }
  if (pText.length > SIZE_OP.P_NUMBER) {
    return {
      state: false,
      error: 'the pText size invalid'
    }
  }

  let validDigit = AmountValidDigits(chain, amount) // 10 11
  var amountLength = amount.toString().length
  if (amountLength < SIZE_OP.P_NUMBER) {
    return {
      state: false,
      error: 'Amount size must be greater than pNumberSize'
    }
  }
  if (isZKChain(chain) && amountLength > validDigit) {
    let tAmount =
      amount.toString().slice(0, validDigit - pText.length) +
      pText +
      amount.toString().slice(validDigit)
    return {
      state: true,
      tAmount: tAmount
    }
  } else {
    let tAmount =
      amount.toString().slice(0, amountLength - pText.length) + pText
    return {
      state: true,
      tAmount: tAmount
    }
  }
}

function getToChainIDFromAmount(chain, amount) {
  let pText = getPTextFromTAmount(chain, amount)
  let toChainID
  if (pText.state) {
    toChainID = pText.pText
  } else {
    return null
  }
  if (toChainID > 9000) {
    return toChainID - 9000
  } else {
    return null
  }
}

function getPTextFromTAmount(chain, amount) {
  if (!isChainSupport(chain)) {
    return {
      state: false,
      error: 'The chain did not support'
    }
  }
  if (amount < 1) {
    return {
      state: false,
      error: "the token doesn't support that many decimal digits"
    }
  }

  let validDigit = AmountValidDigits(chain, amount) // 10 11
  var amountLength = amount.toString().length
  if (amountLength < SIZE_OP.P_NUMBER) {
    return {
      state: false,
      error: 'Amount size must be greater than pNumberSize'
    }
  }
  if (isZKChain(chain) && amountLength > validDigit) {
    let zkAmount = amount.toString().slice(0, validDigit)
    let op_text = zkAmount.slice(-SIZE_OP.P_NUMBER)
    return {
      state: true,
      pText: op_text
    }
  } else {
    let op_text = amount.toString().slice(-SIZE_OP.P_NUMBER)
    return {
      state: true,
      pText: op_text
    }
  }
}

function getRAmountFromTAmount(chain, amount) {
  let pText = ''
  for (let index = 0; index < SIZE_OP.P_NUMBER; index++) {
    pText = pText + '0'
  }
  if (!isChainSupport(chain)) {
    return {
      state: false,
      error: 'The chain did not support'
    }
  }
  if (amount < 1) {
    return {
      state: false,
      error: "the token doesn't support that many decimal digits"
    }
  }

  let validDigit = AmountValidDigits(chain, amount) // 10 11
  var amountLength = amount.toString().length
  if (amountLength < SIZE_OP.P_NUMBER) {
    return {
      state: false,
      error: 'Amount size must be greater than pNumberSize'
    }
  }
  if (isZKChain(chain) && amountLength > validDigit) {
    let rAmount =
      amount.slice(0, validDigit - SIZE_OP.P_NUMBER) +
      pText +
      amount.slice(validDigit)
    return {
      state: true,
      rAmount: rAmount
    }
  } else {
    let rAmount = amount.slice(0, amountLength - SIZE_OP.P_NUMBER) + pText
    return {
      state: true,
      rAmount: rAmount
    }
  }
}

function isChainSupport(chain) {
  if (typeof chain === 'number') {
    if (CHAIN_INDEX[chain] && MAX_BITS[CHAIN_INDEX[chain]]) {
      return true
    }
  } else if (typeof chain === 'string') {
    if (MAX_BITS[chain.toLowerCase()]) {
      return true
    }
  }
  return false
}

// 0 ~ (2 ** N - 1)
function AmountRegion(chain) {
  if (!isChainSupport(chain)) {
    return {
      error: 'The chain did not support'
    }
  }
  if (typeof chain === 'number') {
    let max = BigNumber(2 ** MAX_BITS[CHAIN_INDEX[chain]] - 1)
    return {
      min: BigNumber(0),
      max: max
    }
  } else if (typeof chain === 'string') {
    let max = BigNumber(2 ** MAX_BITS[chain.toLowerCase()] - 1)
    return {
      min: BigNumber(0),
      max: max
    }
  }
}

function AmountMaxDigits(chain) {
  let amountRegion = AmountRegion(chain)
  if (amountRegion.error) {
    return amountRegion
  }
  return amountRegion.max.toFixed().length
}

function AmountValidDigits(chain, amount) {
  let amountMaxDigits = AmountMaxDigits(chain)
  if (amountMaxDigits.error) {
    return amountMaxDigits.error
  }
  let amountRegion = AmountRegion(chain)

  let ramount = removeSidesZero(amount.toString())

  if (ramount.length > amountMaxDigits) {
    return 'amount is inValid'
  }
  if (ramount > amountRegion.max.toFixed()) {
    return amountMaxDigits - 1
  } else {
    return amountMaxDigits
  }
}

function removeSidesZero(param) {
  if (typeof param !== 'string') {
    return 'param must be string'
  }
  return param.replace(/^0+(\d)|(\d)0+$/gm, '$1$2')
}

function isAmountInRegion(amount, chain) {
  if (!isChainSupport(chain)) {
    return {
      state: false,
      error: 'The chain did not support'
    }
  }
  let amountRegion = AmountRegion(chain)
  if (amountRegion.error) {
    return false
  }
  if (
    BigNumber(amount).gte(amountRegion.min) &&
    BigNumber(amount).lte(amountRegion.max)
  ) {
    return true
  }
  return false
}

function pTextFormatZero(num) {
  if (String(num).length > SIZE_OP.P_NUMBER) return num
  return (Array(SIZE_OP.P_NUMBER).join(0) + num).slice(-SIZE_OP.P_NUMBER)
}

function isAmountValid(chain, amount) {
  if (!isChainSupport(chain)) {
    return {
      state: false,
      error: 'The chain did not support'
    }
  }
  if (amount < 1) {
    return {
      state: false,
      error: "the token doesn't support that many decimal digits"
    }
  }

  let validDigit = AmountValidDigits(chain, amount) // 10 11
  var amountLength = amount.toString().length
  if (amountLength < SIZE_OP.P_NUMBER) {
    return {
      state: false,
      error: 'Amount size must be greater than pNumberSize'
    }
  }

  let rAmount = amount
  if (isZKChain(chain)) {
    rAmount = removeSidesZero(amount.toString())
  }
  if (!isAmountInRegion(rAmount, chain)) {
    return {
      state: false,
      error: 'Amount exceeds the spending range'
    }
  }
  if (isZKChain(chain) && amountLength > validDigit) {
    let zkAmount = amount.toString().slice(0, validDigit)
    let op_text = zkAmount.slice(-SIZE_OP.P_NUMBER)
    if (Number(op_text) === 0) {
      return {
        state: true
      }
    }
    return {
      state: false,
      error: 'Insufficient number of flag bits'
    }
  } else {
    let op_text = amount.toString().slice(-SIZE_OP.P_NUMBER)
    if (Number(op_text) === 0) {
      return {
        state: true
      }
    }
    return {
      state: false,
      error: 'Insufficient number of flag bits'
    }
  }
}

/**
 * @param {number} precision
 */
function getDigitByPrecision(precision) {
  return precision === 18 ? 6 : 2
}

module.exports = {
  getPTextFromTAmount,
  getToChainIDFromAmount,
  isAmountValid,
  getTAmountFromRAmount,
  getRAmountFromTAmount,
  pTextFormatZero,
  isZKChain,
  getToAmountFromUserAmount,
  getDigitByPrecision
}
