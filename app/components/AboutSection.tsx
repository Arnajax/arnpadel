import { TRAINERS } from "../_lib/trainers";

export default function AboutSection() {
  return (
    <section className="about-section">
      <div className="about-section-inner">
        <h2 className="about-heading-main">Onze trainers</h2>
        <p className="about-subline">Persoonlijk, to-the-point en altijd afgestemd op jouw niveau.</p>
        <div className="about-trainers-grid">
          {TRAINERS.map((trainer) => (
            <div key={trainer.id} className="about-trainer-card">
              <div className="about-photo-wrap">
                <img
                  src={trainer.photoSrc}
                  alt={trainer.name}
                  className="about-photo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/arn-photo.jpg";
                  }}
                />
              </div>
              <div className="about-text">
                <p className="about-tagline">{trainer.role}</p>
                <h3 className="about-trainer-name">{trainer.name}</h3>
                {trainer.bio.map((para, i) => (
                  <p key={i} className="about-body">{para}</p>
                ))}
                {trainer.stats.length > 0 && (
                  <div className="about-stats">
                    {trainer.stats.map((stat) => (
                      <div key={stat.label} className="about-stat">
                        <span className="about-stat-label">{stat.label}</span>
                        <span className="about-stat-value">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .about-section {
          background: #f9f7f4;
          border-top: 1px solid #ece9e4;
          padding: 80px 20px;
        }
        .about-section-inner {
          max-width: 960px;
          margin: 0 auto;
        }
        .about-heading-main {
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 800;
          color: #1a1a2e;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
          text-align: center;
        }
        .about-subline {
          text-align: center;
          color: #6b7280;
          font-size: 0.97rem;
          margin: 0 0 48px;
        }
        .about-trainers-grid {
          display: flex;
          flex-direction: column;
          gap: 56px;
        }
        .about-trainer-card {
          display: flex;
          gap: 56px;
          align-items: flex-start;
        }
        .about-trainer-card:nth-child(even) {
          flex-direction: row-reverse;
        }
        .about-photo-wrap {
          flex-shrink: 0;
          width: 240px;
        }
        .about-photo {
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 16px;
          object-fit: cover;
          object-position: top center;
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
          margin: 0 0 8px;
        }
        .about-trainer-name {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          color: #1a1a2e;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }
        .about-body {
          font-size: 0.97rem;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 12px;
        }
        .about-stats {
          display: flex;
          gap: 0;
          margin-top: 28px;
          border-top: 1px solid #ece9e4;
          padding-top: 20px;
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
          .about-trainer-card,
          .about-trainer-card:nth-child(even) {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .about-photo-wrap {
            width: 100%;
            max-width: 180px;
            margin: 0 auto;
          }
          .about-text {
            text-align: center;
          }
          .about-stats {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
