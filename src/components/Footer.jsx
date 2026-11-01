import { SITE_OWNER } from '../lib/supabase'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <span className="text-muted">
            &copy; {year} {SITE_OWNER}. All rights reserved.
          </span>
          <div className="footer-links">
            <a
              href={`https://github.com/${SITE_OWNER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
