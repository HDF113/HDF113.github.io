import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container">
      <div className="empty-state">
        <div className="empty-state-icon">&#129323;</div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p className="text-muted mt-1">The page you are looking for does not exist.</p>
        <Link to="/" className="btn mt-2">Back Home</Link>
      </div>
    </div>
  )
}
