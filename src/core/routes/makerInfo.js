import thegraph from '../actions/thegraph'
export default {
  getMakerInfoFromGraph: function(req, next) {
    return new Promise((resolve, reject) => {
      thegraph
        .getMakerInfo(req, next)
        .then((response) => {
          resolve(response)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },
}
