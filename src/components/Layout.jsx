import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main fade-in">
        {children}
      </main>
      <Footer />
    </div>
  )
}
