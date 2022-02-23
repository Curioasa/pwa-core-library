import { faHourglassEnd, faHourglassHalf, faHourglassStart } from '@fortawesome/free-solid-svg-icons'
import { handleAppResponse, IHttpService } from '../../services/http'
import { IWalletService } from '../../services/wallet'
import { showToast } from '../Feedback/Toast'
import { PreparedTx } from './types'
import { getPreparedTxRequest } from './api'
import { capitalizeFirstLetter } from '../../helpers'
import {
  Address,
  ContractFunction,
  GasLimit,
  SmartContract,
  TypedValue,
  Transaction,
  TransactionPayload,
  Balance,
  ChainID,
  ApiProvider,
  NetworkConfig,
  TransactionVersion,
} from '@elrondnetwork/erdjs'

type TxHooks = {
  onSigned?: (transaction: Transaction) => void
  onSent?: (transaction: Transaction) => void
  onSuccess?: (transaction: Transaction) => void
  onFailed?: () => void
}

export const buildTx = async (
  wallet: IWalletService,
  receiver: string,
  value: Balance,
  gasLimit: number,
  data?: (networkConfig: NetworkConfig) => TransactionPayload
) => {
  const networkConfig = NetworkConfig.getDefault()

  await networkConfig.sync(wallet.getProxy())

  const preparedData = data ? data(networkConfig) : undefined

  return new Transaction({
    data: preparedData,
    gasLimit: new GasLimit(gasLimit),
    receiver: new Address(receiver),
    value: value,
    chainID: new ChainID('T'),
    version: TransactionVersion.withDefaultVersion()
  })
}

export const callSmartContract = async (
  wallet: IWalletService,
  address: string,
  func: string,
  args: TypedValue[],
  gasLimit: number,
  value?: Balance,
  hooks?: TxHooks
) => {
  await NetworkConfig.getDefault().sync(wallet.getProxy())

  const sc = new SmartContract({ address: new Address(address) })
  const tx = sc.call({ func: new ContractFunction(func), gasLimit: new GasLimit(gasLimit), value: value || Balance.egld(0), args })

  await sendTx(wallet, tx, hooks)
}

export const sendPreparedTx = async (walletService: IWalletService, prepared: PreparedTx, hooks?: TxHooks) => {
  const tx = new Transaction({
    sender: Address.fromBech32(prepared.sender),
    receiver: Address.fromBech32(prepared.receiver),
    value: Balance.fromString(prepared.value),
    data: TransactionPayload.fromEncoded(prepared.data),
    gasLimit: new GasLimit(prepared.gasLimit),
    chainID: new ChainID(prepared.chainID),
  })

  await sendTx(walletService, tx, hooks)
}

export const fetchAndSendPreparedTx = async (
  http: IHttpService,
  wallet: IWalletService,
  preparedTxName: string,
  args: Record<string, any>,
  hooks: TxHooks
) => handleAppResponse(getPreparedTxRequest(http, preparedTxName, args), async (tx) => await sendPreparedTx(wallet, tx, hooks))

export const sendTx = async (wallet: IWalletService, tx: Transaction, hooks?: TxHooks) => {
  const providerId = wallet.getProviderId()
  if (providerId === 'web') {
    await wallet.signWebWalletTransaction(tx);
  } else {
  if (providerId === 'maiar_extension') {
    showToast('Please confirm in Maiar DeFi Wallet', 'vibe', faHourglassStart)
  } else if (providerId === 'maiar_app') {
    showToast('Please confirm in Maiar App', 'vibe', faHourglassStart)
  } else if (providerId === 'hardware') {
    showToast('Please confirm on Ledger', 'vibe', faHourglassStart)
  }
}

  const handleSignedEvent = (transaction: Transaction) => hooks?.onSigned && hooks.onSigned(transaction)

  const handleSentEvent = (transaction: Transaction) => {
    hooks?.onSent && hooks.onSent(transaction)
    showToast('Transaction sent ...', 'success', faHourglassHalf)
  }

  const handleSuccessEvent = (transaction: Transaction) =>
    hooks?.onSuccess ? hooks.onSuccess(transaction) : showToast('Transaction executed', 'success', faHourglassEnd)

  const handleErrorEvent = () => (hooks?.onFailed ? hooks.onFailed() : showToast('Transaction failed', 'error', faHourglassEnd))

  try {
    const signedTx = await wallet.signTransaction(tx)

    handleSignedEvent(signedTx)

    signedTx.onSent.on(({ transaction }) => handleSentEvent(transaction))

    const sentTx = await wallet.sendTransaction(signedTx)

    // erdjs has some internal issues: https://github.com/ElrondNetwork/elrond-sdk-erdjs/issues/96
    // original:
    // const finalizedTx = await sentTx.getAsOnNetwork(wallet.getProxy(), true, false, true)
    // workaround:
    const apiProvider = new ApiProvider(wallet.getConfig().ApiAddress, { timeout: 5000 }) as any
    const finalizedTx = await sentTx.getAsOnNetwork(apiProvider, true, false, true)
    // ^ workaround end

    const contractErrorResults = finalizedTx
      .getSmartContractResults()
      .getAllResults()
      // .filter((result) => !result.isSuccess()) // part of the above bug that returnCode is empty, comment back in when fixed
      .filter((result) => result.getReturnMessage() && !result.getReturnMessage().includes('too much gas provided')) // remove this when bug fixed

    if (contractErrorResults.length > 0) {
      throw contractErrorResults[0].getReturnMessage()
    }

    handleSuccessEvent(sentTx)
  } catch (e) {
    console.error(e)
    const message = (e instanceof Error ? e.message : e) as string
    handleErrorEvent()
    showToast(capitalizeFirstLetter(message), 'error')
  }
}

export const sendWebWalletTx = async (wallet: IWalletService, tx: Transaction, hooks?: TxHooks) => {
  if (wallet.getProviderId() === 'web') {
    await wallet.sendTransaction(tx);
  }
}