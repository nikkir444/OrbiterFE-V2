<template>
  <div class="dialog-bg" v-if="dialog.addLiquidityDialogVisible">
    <div class="add-liquidity-dialog">
      <div class="add-liquidity-title">
        Add Liquidity
        <SvgIconThemed
          @click.native="closeAddLiquidityDialog"
          class="toolbox-close"
          iconName="close"
        />
      </div>
      <div class="add-liquidity-content">
        <div class="liquidity-network">
          <span class="liquidity-item" @click="selectNetwork">Network</span>
          <div class="liquidity-value" @click="showNetworkPopupClick">
            <div style="display: flex">
              <svg-icon
                :iconName="showChainIcon(poolNetworkOrTokenConfig.toChainId)"
                style="width: 2.4rem; height: 2.4rem; margin-right: 0.4rem"
              ></svg-icon>
              <span>{{
                showChainName(
                  poolNetworkOrTokenConfig.toChainId,
                  $env.localChainID_netChainID[
                    poolNetworkOrTokenConfig.toChainId
                  ]
                )
              }}</span>
            </div>

            <SvgIconThemed
              v-if="poolNetworkOrTokenConfig.NetworkArray.length > 1"
            />
          </div>
        </div>
        <div class="liquidity-token">
          <span class="liquidity-item">Token</span>
          <div class="liquidity-value">
            <div class="topItem">
              <div class="left">
                <TokenSelect
                  :datas="tokens()"
                  v-model="destChainInfo.tokenName"
                  @input="selectedTokenChange"
                />
              </div>
              <span class="right right-value">Amount</span>
            </div>
            <div class="bottomItem">
              <div class="left">
                Balance:
                <CommLoading
                  v-if="accountBalanceLoading"
                  style="left: 0.3rem; top: 0.2rem"
                  width="1.2rem"
                  height="1.2rem"
                />
                <span v-else>{{ accountBalance }}</span>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <input
                  type="text"
                  v-model="transferValue"
                  class="right"
                  :maxlength="18"
                  placeholder="at least 0.001"
                />
                <el-button @click="fromMax" class="maxBtn" style>Max</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="add-liquidity-buttom">
        <span
          :class="['option-button', { Loading: isLoading }]"
          @click="isLoading ? '' : confirmAddLiquidity()"
        >
          <template v-if="!isLoading"> Confirm and Add Liquidity </template>
          <template v-else>
            <loading
              style="margin: auto"
              loadingColor="white"
              width="2rem"
              height="2rem"
            ></loading>
          </template>
        </span>
      </div>
    </div>
    <CommDialog ref="SelectNetworkPopupRef">
      <div slot="PoperContent" style="width: 100%">
        <ChainSelect
          :ChainData="poolNetworkOrTokenConfig.NetworkArray"
          :selectData="poolNetworkOrTokenConfig.toChainId"
          v-on:closeSelect="closeNetworkPopupClick()"
          v-on:getNetworkInfo="getNewNetworkInfo"
        />
      </div>
    </CommDialog>
  </div>
</template>

<script>
import { ethers, constants } from 'ethers'
import { mapState, mapMutations, mapGetters } from 'vuex'
import { SvgIconThemed, CommLoading } from '../'
import ChainSelect from '../Select/ChainSelect'
import TokenSelect from '../Select/TokenSelect'
import CommDialog from './CommDialog'
import {
  getCoinContractInstance,
  getDTokenContractInstance,
} from '../../util/constants/contract/getContract'
import util from '../../util/util'
import transferCalculate from '../../util/transfer/transferCalculate'
export default {
  name: 'AddLiquidityDialog',
  props: {
    destChainInfo: {
      type: Object,
      default: null,
    },
  },
  components: {
    SvgIconThemed,
    ChainSelect,
    TokenSelect,
    CommDialog,
    CommLoading,
  },
  computed: {
    ...mapState([
      'web3',
      'dialog',
      'poolNetworkOrTokenConfig',
      'transferData',
      'contractAddress',
    ]),
    ...mapGetters(['realSelectMakerInfo', 'isLogin']),
    accountBalance() {
      return this.Balance
    },
    accountBalanceLoading() {
      if (this.accountBalance === null) {
        return true
      }
      return false
    },
  },
  watch: {
    'web3.coinbase': function (newValue, oldValue) {
      if (!newValue || newValue === '0x') {
        this.Balance = 0
      }
      if (oldValue !== newValue && newValue !== '0x') {
        this.Balance = null
        this.getBalance(
          this.web3.coinbase,
          this.poolNetworkOrTokenConfig.toChainId,
          this.contractAddress.coinAddress[this.destChainInfo.tokenName][
            this.poolNetworkOrTokenConfig.toChainId
          ],
          this.destChainInfo.tokenName,
          this.$env.precision[this.destChainInfo.tokenName]
        ).then((v) => {
          if (v) {
            this.Balance = v
          }
        })
      } else {
        this.Balance = 0
      }
    },
    'transferData.selectTokenInfo': function (newValue) {
      this.poolNetworkOrTokenConfig.makerInfoList.filter((makerInfo) => {
        if (
          (makerInfo.c1ID === this.transferData.fromChainID &&
            makerInfo.c2ID === this.transferData.toChainID &&
            makerInfo.tName === newValue.token) ||
          (makerInfo.c2ID === this.transferData.fromChainID &&
            makerInfo.c1ID === this.transferData.toChainID &&
            makerInfo.tName === newValue.token)
        ) {
          this.updateTransferMakerInfo(makerInfo)
        }
      })
    },
    destChainInfo: {
      handler(newValue) {
        this.selectedTokenChange(newValue.tokenName)
        this.getBalance(
          this.web3.coinbase,
          this.poolNetworkOrTokenConfig.toChainId,
          this.contractAddress.coinAddress[this.destChainInfo.tokenName][
            this.poolNetworkOrTokenConfig.toChainId
          ],
          this.destChainInfo.tokenName,
          this.$env.precision[this.destChainInfo.tokenName]
        ).then((v) => {
          if (v) {
            this.Balance = v
          }
        })
      },

      deep: true,
    },
  },
  data() {
    return {
      transferValue: '',
      c1Balance: null,
      c2Balance: null,
      Balance: null,
      isLoading: false,
    }
  },
  mounted() {
    setInterval(() => {
      if (this.destChainInfo && this.isLogin) {
        this.getBalance(
          this.web3.coinbase,
          this.poolNetworkOrTokenConfig.toChainId,
          this.contractAddress.coinAddress[this.destChainInfo.tokenName][
            this.poolNetworkOrTokenConfig.toChainId
          ],
          this.destChainInfo.tokenName,
          this.$env.precision[this.destChainInfo.tokenName]
        ).then((v) => {
          if (v) {
            this.Balance = v
          }
        })
      }
    }, 5 * 1000)
  },
  methods: {
    ...mapMutations([
      'updateTransferMakerInfo',
      'setDialogVisible',
      'updatePoolNetworkOrTokenConfig',
      'updateLiquidityDataStatus',
      'updateTransferTokenInfo',
    ]),
    // open selectNetwork
    showNetworkPopupClick() {
      this.$refs.SelectNetworkPopupRef.showCustom()
    },
    // close selectNetwork
    closeNetworkPopupClick() {
      this.$refs.SelectNetworkPopupRef.maskClick()
    },
    // open selectToken
    showTokenPopupClick() {
      this.$refs.SelectTokenPopupRef.showCustom()
    },
    // close selectToken
    closeTokenPopupClick() {
      this.$refs.SelectTokenPopupRef.maskClick()
    },
    closeAddLiquidityDialog() {
      this.transferValue = ''
      this.setDialogVisible({
        type: 'addLiquidityDialogVisible',
        value: false,
      })
    },
    selectNetwork() {
      this.showNetworkPopupClick()
    },
    selectToken() {
      this.showTokenPopupClick()
    },
    getNewNetworkInfo(info) {
      this.destChainInfo.localID = info.localID
      this.$emit('updateTokens', info)
    },
    showChainName(localChainID, netChainID) {
      return util.chainName(localChainID, netChainID)
    },
    showChainIcon(localChainID) {
      return util.chainIcon(localChainID)
    },
    userMinPrice() {
      return this.realSelectMakerInfo.value.minPrice
    },
    fromMax() {
      this.transferValue = this.accountBalance.toString()
    },
    tokens() {
      return this.poolNetworkOrTokenConfig.tokenInfoArray.map((v) => {
        return {
          ...v,
          icon: v.icon || 'tokenLogo',
          label: v.token,
          value: v.token,
          iconType: 'img',
        }
      })
    },
    selectedTokenChange(e) {
      let newTokenInfo = this.poolNetworkOrTokenConfig.tokenInfoArray.find(
        (item) => item.token === e
      )
      this.updateTransferTokenInfo(newTokenInfo)
    },
    async getBalance(
      makerAddress,
      chainId,
      tokenAddress,
      tokenName,
      precision
    ) {
      try {
        if (!makerAddress) {
          return ''
        }

        const response = await transferCalculate.getTransferBalance(
          chainId,
          tokenAddress,
          tokenName,
          makerAddress
        )
        return (response / 10 ** precision).toFixed(6)
      } catch (error) {
        console.log(error)
      }
    },
    async confirmAddLiquidity() {
      this.isLoading = true
      const signer = this.web3.provider.getSigner()
      const isETH =
        this.realSelectMakerInfo.t1Address === constants.AddressZero
          ? true
          : false
      try {
        await util.ensureMetamaskNetwork(
          this.$env.localChainID_netChainID[
            this.poolNetworkOrTokenConfig.toChainId
          ]
        )
        let coinInstance
        if (!isETH) {
          coinInstance = getCoinContractInstance(
            this.destChainInfo.tokenName,
            this.poolNetworkOrTokenConfig.toChainId,
            signer
          )
        }

        const dTokenInstance = getDTokenContractInstance(
          this.destChainInfo.tokenName,
          this.poolNetworkOrTokenConfig.toChainId,
          signer
        )
        const account = await signer.getAddress()
        let allowanceAmount
        let coinBalance
        if (!isETH) {
          allowanceAmount = await coinInstance.allowance(
            account,
            this.contractAddress.dTokenAddress[this.destChainInfo.tokenName][
              this.poolNetworkOrTokenConfig.toChainId
            ]
          )
          coinBalance = await coinInstance.balanceOf(account)
        } else {
          coinBalance = await signer.getBalance()
        }

        if (
          this.$decimal
            .parseToken(this.transferValue, this.destChainInfo.tokenName)
            .isZero()
        )
          return
        if (
          ethers.BigNumber.from(
            this.$decimal.parseToken(
              this.transferValue,
              this.destChainInfo.tokenName
            )
          ).lt(this.$decimal.parseToken('0.001', this.destChainInfo.tokenName))
        ) {
          util.showMessage(
            'The minimum amount you enter must be greater than or equal to 0.001',
            'warning'
          )
          return
        }
        if (
          ethers.BigNumber.from(
            this.$decimal.parseToken(
              this.transferValue,
              this.destChainInfo.tokenName
            )
          ).gt(coinBalance)
        ) {
          util.showMessage(
            'Your account balance is ' +
              this.$decimal.formatToken(
                coinBalance,
                this.destChainInfo.tokenName
              ) +
              ' ' +
              this.destChainInfo.tokenName,
            'warning'
          )
          return
        }
        if (
          !isETH &&
          ethers.BigNumber.from(allowanceAmount).lt(
            this.$decimal.parseToken(
              this.transferValue,
              this.destChainInfo.tokenName
            )
          )
        ) {
          await coinInstance.approve(
            this.contractAddress.dTokenAddress[this.destChainInfo.tokenName][
              this.poolNetworkOrTokenConfig.toChainId
            ],
            ethers.constants.MaxUint256
          )
        }
        let overrides = {
          from: account,
          gasLimit: 1000000,
        }
        isETH
          ? (overrides.value = this.$decimal.parseToken(
              this.transferValue,
              this.destChainInfo.tokenName
            ))
          : null
        try {
          this.updateLiquidityDataStatus({
            type: 'addLiquidityLoading',
            localID: this.destChainInfo.localID,
            tokenName: this.destChainInfo.tokenName,
          })
          let tx = await dTokenInstance.mint(
            this.$decimal.parseToken(
              this.transferValue,
              this.destChainInfo.tokenName
            ),
            overrides
          )
          this.$notify.success({
            title: tx.hash,
            duration: 3000,
          })
          this.closeAddLiquidityDialog()
          await tx.wait()
          util.showMessage('Add Liquidity Success', 'success')
          this.transferValue = ''
          this.$emit('updateLiquidity')
        } catch (error) {
          console.log('err', error)
          this.$notify.error({
            title: error.message,
            duration: 3000,
          })
        } finally {
          this.updateLiquidityDataStatus({
            type: 'addLiquidityLoading',
            localID: this.destChainInfo.localID,
            tokenName: this.destChainInfo.tokenName,
          })
        }
      } catch (error) {
        console.log('error', error)
        //
      } finally {
        this.isLoading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.dialog-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  .add-liquidity-dialog {
    @extend .dialog-bg;
    border-radius: 2rem;
    padding: 4.4rem 4rem;
    text-align: left;
    width: 61rem;
    height: 39.5rem;
    .add-liquidity-title {
      font: {
        family: 'Inter';
        style: normal;
        weight: 700;
        size: 2rem;
      }
      .toolbox-close {
        width: 1.5rem;
        height: 1.5rem;
        position: absolute;
        top: 4.4rem;
        right: 4rem;
        opacity: 0.8;
        cursor: pointer;
        &:hover {
          opacity: 0.4;
        }
      }
    }
    .add-liquidity-content {
      font: {
        family: 'Inter Regular';
        weight: 400;
        size: 1.4rem;
      }
      display: flex;
      flex-direction: column;
      line-height: 2rem;
      margin-top: 3rem;
      .liquidity-item {
        width: 20%;
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-size: 2rem;
        line-height: 2rem;

        /* identical to box height, or 100% */
        display: flex;
        align-items: center;
        letter-spacing: -0.01em;
      }
      .liquidity-network {
        display: flex;

        // width: 100%;
        .liquidity-value {
          border-radius: 1.2rem;
          padding: 0rem 0.6rem 0rem 2.6rem;

          width: 19rem;
          height: 4rem;
          position: relative;
          font-weight: 700;
          font-size: 1.6rem;
          line-height: 2.4rem;
          white-space: nowrap;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
      }
      .liquidity-token {
        display: flex;
        // width: 100%;
        .liquidity-value {
          width: 80%;
          margin-top: 2rem;
          height: 9.6rem;
          border-radius: 2rem;
          position: relative;
          padding: 2rem 2.6rem;
          font-weight: 400;
          font-size: 1.2rem;
          line-height: 2rem;

          .topItem {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: 'Inter Regular';
            .left {
              display: flex;
              width: 16.4rem;
              justify-content: space-between;
              padding: 0rem 0.6rem 0rem 0rem;
            }
          }

          .bottomItem {
            display: flex;
            justify-content: space-between;
            // margin-top: 1.2rem;
            align-items: center;

            .left {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-size: 1.2rem;
              line-height: 2rem;

              /* identical to box height, or 167% */
              display: flex;
              align-items: center;
              text-align: right;
              letter-spacing: -0.01em;
            }

            .right {
              width: 100%;
              // color: #df2e2d;
              text-align: right;
              border: 0;
              outline: 0rem;
              appearance: none;
              background-color: transparent;
              transition: all 0.2s ease 0s;
              flex-direction: row-reverse;
            }
            .right-value {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-size: 1.2rem;
              line-height: 2rem;

              /* identical to box height, or 167% */
              display: flex;
              align-items: center;
              text-align: right;
              letter-spacing: -0.01em;
            }

            input {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 700;
              font-size: 2.6rem;
              line-height: 2.4rem;

              /* identical to box height, or 92% */
              display: flex;
              align-items: center;
              text-align: right;
            }

            input::placeholder {
              color: rgba(51, 51, 51, 0.2);
              font-family: 'Inter';
              font-style: normal;
              font-weight: 700;
              font-size: 2.6rem;
              line-height: 2.4rem;

              /* identical to box height, or 92% */
              display: flex;
              align-items: center;
              text-align: right;
            }

            .maxBtn {
              font-weight: 400;
              font-size: 1.4rem;
              line-height: 2rem;
              cursor: pointer;
              border: none;
              background: transparent;
              text-align: right;
              padding: 0;
              margin-left: 0.8rem;
              font-family: 'Inter Regular';
            }
          }
        }
      }
      .maker-link {
        margin-top: 2rem;
        color: #df2e2d;
      }
      .maker-link:hover {
        text-decoration: underline;
        cursor: pointer;
      }
      .maker-foot-btn {
        height: 5rem;
        box-shadow: inset 0rem -0.8rem 0rem rgba(0, 0, 0, 0.16);
        border-radius: 4rem;
        font-weight: 700;
        font-size: 2rem;
        line-height: 2rem;
        color: #fff;
        margin-top: 4rem;
        text-align: center;
        line-height: 5rem;
        font-family: 'Inter Bold';
      }
    }
    .add-liquidity-buttom {
      margin-top: 4rem;
      .option-button {
        width: 100%;
        height: 5rem;
        background: linear-gradient(90.46deg, #eb382d 4.07%, #bc3035 98.55%);
        box-shadow: inset 0rem -0.8rem 0rem rgba(0, 0, 0, 0.16);
        border-radius: 4rem;
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-size: 2rem;
        line-height: 2rem;

        /* identical to box height, or 100% */
        display: flex;
        align-items: center;
        text-align: center;
        letter-spacing: -0.01em;
        color: #ffffff;
        justify-content: center;
        &:hover {
          background: #ca2221;
        }
        &:active {
          background: linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.2),
              rgba(0, 0, 0, 0.2)
            ),
            linear-gradient(90.46deg, #eb382d 4.07%, #bc3035 98.55%);
          box-shadow: inset 0rem -0.8rem 0rem rgba(0, 0, 0, 0.16);
        }
        &.Loading {
          background: #ca2221;
        }
      }
    }
  }
}
</style>
