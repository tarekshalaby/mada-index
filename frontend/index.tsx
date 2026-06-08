// Mada Index — Airtable Interface Extension entry point.
// Renders the full dashboard natively using the Interface Extensions SDK.
// Data comes from useRecords() hooks via SdkDataProvider — no REST calls, no iframe.

import { initializeBlock } from '@airtable/blocks/interface/ui'
import { SdkDataProvider } from './src/data/SdkProvider'
import App from './src/App'
import './mada.css'

function MadaIndex() {
  return (
    <SdkDataProvider>
      <App />
    </SdkDataProvider>
  )
}

initializeBlock({ interface: () => <MadaIndex /> })
