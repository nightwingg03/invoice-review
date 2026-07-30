import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DocumentDetailPage } from './pages/DocumentDetailPage'
import { HeroPage } from './pages/HeroPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProcessingPage } from './pages/ProcessingPage'
import { ResultsPage } from './pages/ResultsPage'
import { ReviewPage } from './pages/ReviewPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HeroPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/results/:id" element={<ResultsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </Layout>
  )
}
