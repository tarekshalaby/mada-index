// Airtable Custom Extension entry point.
//
// This file replaces main.tsx for the extension build.
// Vite config: vite.extension.config.ts
// Build command: npm run build:extension
// Dev server:   npm run dev:extension   (point Airtable to http://localhost:5174)
//
// Architecture:
//   • initializeBlock() is the SDK equivalent of ReactDOM.createRoot().render()
//   • SdkDataProvider wraps App and populates the module-level cache in
//     adapter-sdk.ts, so all views see live base data through the same API
//   • All views continue to import from '../data/adapter' — the Vite plugin
//     in vite.extension.config.ts redirects those imports to adapter-sdk at
//     build time.  No view file needs to change.

import { initializeBlock }  from '@airtable/blocks/ui'
import { SdkDataProvider }  from './data/SdkProvider'
import App                  from './App'
import './index.css'

function Extension() {
  return (
    <SdkDataProvider>
      <App />
    </SdkDataProvider>
  )
}

initializeBlock(() => <Extension />)
