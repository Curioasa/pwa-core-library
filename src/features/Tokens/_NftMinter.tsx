import React, { SyntheticEvent, useState } from 'react'
import _NftMinterTagAdder from './_NftMinterTagAdder'
import { faAngleLeft, faPercentage, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MintableNft, NftCollectionAccount } from './types'
import { FileSelector } from '../Controls/FileSelector'
import { showToast } from '../Feedback/Toast'
import { Input } from '../Controls/Input'
import { Button } from '../Controls/Button'

const RoyaltiesDefaultPercent = 10

type Props = {
  collection: NftCollectionAccount
  onCreateRequest: (mintableNft: MintableNft) => void
  onGoBackRequest: () => void
  notice: any
}

const _NftMinter = (props: Props) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [royalties, setRoyalties] = useState<string>(RoyaltiesDefaultPercent.toString())
  const [tags, setTags] = useState<string[]>([])
  const [media, setMedia] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    if (!media) {
      showToast('No file uploaded', 'error')
      return
    }
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 5000)
    props.onCreateRequest({ collection: props.collection.ticker, name, description, royalties: +royalties, tags, media })
  }

  const sanitizeRoyaltiesInput = (input: string, previous: string): string => {
    if (input.length < 1) return ''
    if (+input / 100 > 1) return previous
    return Math.abs(parseFloat((+input).toFixed(2))).toString()
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4">
        <span className="highlight">Create</span> an NFT
      </h2>
      {props.notice && <div className="mb-2">{props.notice}</div>}
      <label htmlFor="name" className="pl-1 text-xl mb-2 text-gray-800">
        Name
      </label>
      <Input id="name" value={name} onChange={(val) => setName(val)} className="mb-4" required />
      <label htmlFor="description" className="pl-1 text-xl mb-2 text-gray-800">
        Description
      </label>
      <Input id="description" value={description} onChange={(val) => setDescription(val)} className="mb-6" />
      <div className="flex space-x-4 mb-4">
        <div className="w-1/2 bg-gray-50 p-4 rounded-xl">
          <label htmlFor="royalties" className="pl-1 text-xl mb-2 text-gray-800">
            Royalties
          </label>
          <Input
            id="royalties"
            icon={faPercentage}
            value={royalties}
            placeholder="10"
            onChange={(val) => setRoyalties((previous) => sanitizeRoyaltiesInput(val, previous))}
            min={0}
            max={100}
            required
            className="mb-1"
          />
        </div>
        <div className="w-1/2 bg-gray-50 p-4 rounded-xl">
          <_NftMinterTagAdder tags={tags} onUpdate={(tags) => setTags(tags)} />
        </div>
      </div>
      <div className="mb-4">
        <small className="block pl-1 text-gray-600 text-lg mb-2">
          Your will receive <strong>{royalties}%</strong> of any transaction involving this NFT.
        </small>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTags((current) => current.filter((t) => t !== tag))}
                className="flex items-center px-4 py-1 rounded-md font-medium bg-gray-200 text-gray-800 text-lg mr-2 mb-2"
              >
                {tag}
                <FontAwesomeIcon icon={faTimes} size="sm" className="inline-block ml-2 text-gray-800 opacity-75" />
              </button>
            ))}
          </div>
        )}
      </div>
      <FileSelector
        onSelect={(file) => setMedia(file)}
        onReset={() => setMedia(null)}
        allowedFilesDescription="PNG, JPG, GIF up to 10MB"
        className="mb-6"
      />
      <div className="flex items-center">
        <button onClick={() => props.onGoBackRequest()} className="w-1/2 text-xl text-center text-gray-500">
          <FontAwesomeIcon icon={faAngleLeft} className="text-gray-500 opacity-75 inline-block mr-2" />
          Go Back
        </button>
        <Button color="blue" className="w-1/2" loading={isLoading} submit>
          Create NFT
        </Button>
      </div>
    </form>
  )
}

export default _NftMinter
