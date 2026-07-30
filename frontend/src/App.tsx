import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DocumentDetailPage } from './pages/DocumentDetailPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { UploadPage } from './pages/UploadPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </Layout>
  )
}
