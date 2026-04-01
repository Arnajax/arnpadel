export default function AboutSection() {
  return (
    <section className="about-section">
      <div className="about-inner">
        <div className="about-photo-wrap">
          <div className="about-photo-placeholder">
            <img src="/arn-photo.jpg" alt="Arn Braunschweiger" className="about-photo" />
          </div>
        </div>
        <div className="about-text">
          <p className="about-tagline">Top-150 Nederland · 6 jaar ervaring · Hoorn</p>
          <h2 className="about-heading">Over Arn</h2>
          <p className="about-body">
            Ik ben Arn Braunschweiger, padeltrainer in Hoorn en omgeving. Met 6 jaar
            ervaring en een notering in de Nederlandse top-150 help ik spelers van alle
            niveaus — van absolute beginners tot competitiespelers — hun spel naar een
            hoger niveau tillen.
          </p>
          <p className="about-body">
            Na mijn opleiding aan de Academie voor Lichamelijke Opvoeding heb ik ruime
            ervaring opgebouwd als trainer en instructeur. Mijn lessen zijn persoonlijk,
            to-the-point en altijd afgestemd op jouw niveau en doelen.
          </p>
          <div className="about-stats">
            <div className="about-stat">
              <span className="about-stat-value">Top 150</span>
              <span className="about-stat-label">Nederland ranking</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-value">6 jaar</span>
              <span className="about-stat-label">Ervaring</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-value">ALO</span>
              <span className="about-stat-label">Opgeleid</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .about-section {
          background: #f9f7f4;
          border-top: 1px solid #ece9e4;
          padding: 80px 20px;
        }
        .about-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          gap: 56px;
          align-items: flex-start;
        }
        .about-photo-wrap {
          flex-shrink: 0;
          width: 260px;
        }
        .about-photo-placeholder {
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 16px;
          overflow: hidden;
          background: #e0dbd4;
        }
        .about-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .about-text {
          flex: 1;
          min-width: 0;
        }
        .about-tagline {
          font-size: 0.7rem;
          font-weight: 700;
          color: #00a869;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 12px;
        }
        .about-heading {
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 800;
          color: #1a1a2e;
          margin: 0 0 20px;
          letter-spacing: -0.01em;
        }
        .about-body {
          font-size: 0.97rem;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 16px;
        }
        .about-stats {
          display: flex;
          gap: 0;
          margin-top: 32px;
          border-top: 1px solid #ece9e4;
          padding-top: 24px;
        }
        .about-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-right: 24px;
          border-right: 1px solid #ece9e4;
        }
        .about-stat:last-child {
          border-right: none;
          padding-right: 0;
          padding-left: 24px;
        }
        .about-stat:not(:first-child):not(:last-child) {
          padding-left: 24px;
        }
        .about-stat-value {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1a1a2e;
          line-height: 1;
        }
        .about-stat-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        @media (max-width: 680px) {
          .about-inner {
            flex-direction: column;
            gap: 32px;
          }
          .about-photo-wrap {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </section>
  );
}
