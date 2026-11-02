import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import ArticlesList from './pages/ArticlesList'
import ArticleDetail from './pages/ArticleDetail'
import ArticleEditor from './pages/ArticleEditor'
import OpenSource from './pages/OpenSource'
import Artworks from './pages/Artworks'
import Research from './pages/Research'
import Literature from './pages/Literature'
import Plans from './pages/Plans'
import FilesList from './pages/FilesList'
import FileUpload from './pages/FileUpload'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/articles" element={<ArticlesList />} />
            <Route path="/articles/new" element={<ArticleEditor />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/articles/:slug/edit" element={<ArticleEditor />} />
            <Route path="/opensource" element={<OpenSource />} />
            <Route path="/artworks" element={<Artworks />} />
            <Route path="/research" element={<Research />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/files" element={<FilesList />} />
            <Route path="/files/upload" element={<FileUpload />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
