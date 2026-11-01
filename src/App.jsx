import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import ArticlesList from './pages/ArticlesList'
import ArticleDetail from './pages/ArticleDetail'
import ArticleEditor from './pages/ArticleEditor'
import ProjectsList from './pages/ProjectsList'
import ProjectDetail from './pages/ProjectDetail'
import ProjectEditor from './pages/ProjectEditor'
import FilesList from './pages/FilesList'
import FileUpload from './pages/FileUpload'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Home */}
            <Route path="/" element={<Home />} />

            {/* Articles */}
            <Route path="/articles" element={<ArticlesList />} />
            <Route path="/articles/new" element={<ArticleEditor />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/articles/:slug/edit" element={<ArticleEditor />} />

            {/* Projects */}
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/new" element={<ProjectEditor />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/projects/:slug/edit" element={<ProjectEditor />} />

            {/* Files */}
            <Route path="/files" element={<FilesList />} />
            <Route path="/files/upload" element={<FileUpload />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
