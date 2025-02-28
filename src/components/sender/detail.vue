<template>
  <o-box-content class="detailBody" style="width: 34.5rem">
    <div class="ProceedContent">
      <div class="topItem">
        <div
          style="
            width: 2rem;
            height: 2rem;
            margin-bottom: 0.2rem;
            position: absolute;
            left: 1rem;
          "
          @click="closerButton"
        >
          <svg-icon
            style="width: 1.5rem; height: 1.5rem"
            iconName="back"
          ></svg-icon>
        </div>
        Detail
      </div>
      <div
        style="width: 100%; height: 0.2rem; background: var(--default-black)"
      ></div>
      <div
        v-for="item in proceedData"
        :key="item.title"
        :class="
          item.descInfo && item.descInfo.length > 0
            ? 'contentItem_status'
            : 'contentItem'
        "
      >
        <span style="font-weight: 600; margin-right: 1rem">{{
          item.title
        }}</span>
        <span v-if="item.desc || item.descInfo" class="right">{{
          item.desc
        }}</span>
        <loading v-else class="right" width="1.2rem" height="1.2rem"></loading>
      </div>
      <div class="chainDataContent">
        <div>
          <div class="s14 wbold bottomsep" style="line-height: 2rem">
            {{ FromChainName }}
          </div>
          <div class="bottomsep" style="height: 3rem">
            <svg-icon
              style="width: 3rem; height: 3rem"
              iconName="history_4"
            ></svg-icon>
          </div>
          <div class="explore s14 wlighter bottomsep" @click="goToExplorFrom">
            {{ FromTx }}
          </div>
          <div class="swithBtn s12" @click="switchNetWork('from')">
            Switch Network
          </div>
        </div>
        <div>
          <div class="s14 wbold bottomsep" style="line-height: 2rem">
            {{ toChainName }}
          </div>
          <div class="bottomsep" style="height: 3rem">
            <svg-icon
              v-if="this.detailData.state === 0"
              style="width: 3rem; height: 3rem"
              iconName="history_4"
            ></svg-icon>
            <svg-icon
              v-else-if="this.detailData.state === 1"
              style="width: 3rem; height: 3rem"
              iconName="history_2"
            ></svg-icon>
            <svg-icon
              v-else
              style="width: 3rem; height: 3rem"
              iconName="history_error"
            ></svg-icon>
          </div>
          <div class="explore s14 wlighter bottomsep" @click="goToExplorTo">
            {{ ToTx }}
          </div>
          <div class="swithBtn s12" @click="switchNetWork('to')">
            Switch Network
          </div>
        </div>
        <div :class="this.detailData.state !== 1 ? 'no_procee' : 'procee'">
          <div class="k-line k-line-1"></div>
          <div class="k-line k-line-2"></div>
          <div class="k-line k-line-3"></div>
          <div class="k-line k-line-4"></div>
          <div class="k-line k-line-5"></div>
        </div>
      </div>
      <!-- <div style="margin-top:1.5rem;display: flex;flex-direction: column;">
        <orbiterBtn style="align-self: flex-end;"
                  width='12rem'
                  height='2.8rem'
                  @click="reportError">Report Error</orbiterBtn>
      </div> -->
      <div class="bottomSep"></div>
    </div>
  </o-box-content>
</template>

<script>
import util from '../../util/util'
import { Loading } from '../'
import Middle from '../../util/middle/middle'

export default {
  name: 'Detail',
  props: {
    detailData: {
      type: Object,
    },
  },
  components: {
    Loading,
  },
  data() {
    return {}
  },
  computed: {
    FromChainName() {
      return (
        'From ' +
        util.chainName(
          this.detailData.fromChainID,
          this.$env.localChainID_netChainID[this.detailData.fromChainID]
        )
      )
    },
    toChainName() {
      return (
        'To ' +
        util.chainName(
          this.detailData.toChainID,
          this.$env.localChainID_netChainID[this.detailData.toChainID]
        )
      )
    },
    FromTx() {
      return `Tx:${util.shortAddress(this.detailData.fromTxHash)}`
    },
    ToTx() {
      if (this.detailData.state !== 0) {
        return 'View on Explore'
      } else {
        return `Tx:${util.shortAddress(this.detailData.toTxHash)}`
      }
    },
    proceedData() {
      return [
        {
          title: 'Timestamp',
          desc: util.transferTimeStampToTime(this.detailData.sortTimeStamp),
        },
        {
          title: 'Value',
          desc:
            this.detailData.userAmount.toString() +
            ' ' +
            this.detailData.tokenName,
        },
      ]
    },
  },
  watch: {},
  mounted() {},
  methods: {
    switchNetWork(e) {
      let chainID
      if (e === 'from') {
        chainID = this.detailData.fromChainID
      } else {
        chainID = this.detailData.toChainID
      }
      this.addChainNetWork(chainID)
    },
    goToExplorFrom() {
      let txid = this.detailData.fromTxHash
      let url = this.$env.txExploreUrl[this.detailData.fromChainID] + txid
      window.open(url, '_blank')
    },
    goToExplorTo() {
      if (this.detailData.state !== 0) {
        let url =
          this.$env.accountExploreUrl[this.detailData.toChainID] +
          this.$store.state.web3.coinbase
        window.open(url, '_blank')
      } else {
        let txid = this.detailData.toTxHash
        let url = this.$env.txExploreUrl[this.detailData.toChainID] + txid
        window.open(url, '_blank')
      }
    },
    closerButton() {
      Middle.$emit('showHistory', true)
      this.$emit('stateChanged', '4')
    },
    reportError() {
      console.log('reportError')
    },
    addChainNetWork(useChainID) {
      var that = this
      var chain = util.getChainInfo(
        this.$env.localChainID_netChainID[useChainID]
      )
      const switchParams = {
        chainId: util.toHex(chain.chainId),
      }
      window.ethereum
        .request({
          method: 'wallet_switchEthereumChain',
          params: [switchParams],
        })
        .then(() => {
          // switch success
          util.showMessage('switch success', 'success')
        })
        .catch((error) => {
          console.log(error)
          if (error.code === 4902) {
            // need add net
            const params = {
              chainId: util.toHex(chain.chainId), // A 0x-prefixed hexadecimal string
              chainName: chain.name,
              nativeCurrency: {
                name: chain.nativeCurrency.name,
                symbol: chain.nativeCurrency.symbol, // 2-6 characters long
                decimals: chain.nativeCurrency.decimals,
              },
              rpcUrls: chain.rpc,
              blockExplorerUrls: [
                chain.explorers &&
                chain.explorers.length > 0 &&
                chain.explorers[0].url
                  ? chain.explorers[0].url
                  : chain.infoURL,
              ],
            }
            window.ethereum
              .request({
                method: 'wallet_addEthereumChain',
                params: [params, that.$store.state.web3.coinbase],
              })
              .then(() => {})
              .catch((error) => {
                console.log(error)
                util.showMessage(error.message, 'error')
              })
          } else {
            util.showMessage(error.message, 'error')
          }
        })
    },
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.detailBody {
  margin: 4.2rem auto;
  max-height: calc(
    100vh - 8.4rem - var(--top-nav-height) - var(--bottom-nav-height)
  );
  max-height: calc(
    var(--vh, 1vh) * 100 - 8.4rem - var(--top-nav-height) -
      var(--bottom-nav-height)
  );
  overflow-y: scroll;
  .ProceedContent {
    margin: 0.5rem 1rem 1rem;
    position: relative;
    .topItem {
      width: 100%;
      height: 2rem;
      font-size: 2rem;
      font-weight: bold;
      line-height: 2rem;
      color: var(--default-black);
      text-align: center;
      padding: 0 1rem;
      margin-bottom: 1rem;
    }
    .contentItem {
      width: 100%;
      font-size: 1.4rem;
      line-height: 2rem;
      color: var(--default-black);
      margin: 2rem auto 0 auto;
      align-items: center;
      justify-content: space-between;
      display: flex;
      .right {
        color: #e85e24;
        text-align: right;
        font-weight: lighter;
      }
    }
    .contentItem_status {
      width: 100%;
      font-size: 1.4rem;
      line-height: 2rem;
      color: var(--default-black);
      margin: 2rem auto 0 auto;
      // align-items: center;
      display: flex;
    }
    .chainDataContent {
      margin: 1.5rem auto 0;
      width: 90%;
      position: relative;
      display: flex;
      flex-direction: row;
      color: #18191f;
      justify-content: space-between;
      text-align: center;
      .explore {
        text-decoration: underline;
      }
      .explore:hover {
        color: #e85e24;
      }
      .bottomsep {
        margin-bottom: 0.5rem;
      }
      .procee {
        position: absolute;
        display: flex;
        height: 3rem;
        max-width: 8rem;
        top: 2.5rem;
        left: 0;
        right: 0;
        margin: auto;
        text-align: left;
        align-items: center;
        .k-line {
          display: inline-block;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 0.5rem;
          background-color: #e85e24;
          opacity: 0;
        }
        @keyframes k-loading {
          0% {
            transform: translateX(-2rem);
            opacity: 0;
          }
          100% {
            transform: translateX(6rem);
            opacity: 1;
          }
        }
        .k-line-1 {
          animation: k-loading linear 1.5s 0s infinite;
        }
        .k-line-2 {
          animation: k-loading linear 1.5s 0.3s infinite;
        }
        .k-line-3 {
          animation: k-loading linear 1.5s 0.6s infinite;
        }
        .k-line-4 {
          animation: k-loading linear 1.5s 0.9s infinite;
        }
        .k-line-5 {
          animation: k-loading linear 1.5s 1.2s infinite;
        }
      }
      .no_procee {
        position: absolute;
        height: 0.2rem;
        max-width: 8rem;
        top: 4rem;
        left: 0;
        right: 0;
        margin: auto;
        text-align: center;
        border-top: 0.2rem dashed #e85e24;
      }
      .swithBtn {
        width: 11rem;
        height: 2.6rem;
        line-height: 2.6rem;
        border-radius: 1.6rem;
        border-width: 0.1rem 0.1rem 0.2rem 0.1rem;
        border-color: #18191f;
        border-style: solid;
        background: radial-gradient(at 50% 0, #ffece6, #fff0d6);
        // background-color: #ffece6;
      }
    }
    .bottomSep {
      margin: 2rem auto 3rem;
      width: 100%;
      box-sizing: border-box;
      background-color: #ffece6;
      height: 0.2rem;
      border-top: 0.2rem dashed rgba(24, 25, 31, 0.2);
    }
  }
}
</style>
