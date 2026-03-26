import React from "react";
import "./Voting.css";

const parties = [
  {
    id: 1,
    name: "Partido PAC",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqXyElwIRSdGc9gRMq0cDKTDUemBjT0CUvJg&s",
    bg: "white",
  },
  {
    id: 2,
    name: "Partido Liberación",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZsEK3xn5OdYyoZg8sM-mY74lqX2M6O-bo_g&s",
    bg: "#0f7a4b",
  },
  {
    id: 3,
    name: "Frente Amplio",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5eti0pkDJ4CGtEEzeZbZ4RL6yeTWX5WVKrg&s",
    bg: "#f3d000",
  },
  {
    id: 4,
    name: "Unidad",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzmAx6xx56CK3bs7ml0K_jnC5VR0trwsLCOQ&s",
    bg: "white",
  },
];

function Voting() {
  const handleVote = (party) => {
    alert(`Has votado por ${party}`);
  };

  return (
    <div className="voting-page">
      <header className="voting-header">
        <h1>Bienvenido [nombre], realiza tu voto</h1>
        <div className="logo-text">VoteHub</div>
      </header>

      <main className="voting-content">
        <div className="cards-container">
          {parties.map((party) => (
            <div className="party-card" key={party.id}>
              <div
                className="party-image-box"
                style={{ backgroundColor: party.bg }}
              >
                <img src={party.image} alt={party.name} />
              </div>

              <div className="party-info">
                <p>{party.name}</p>
                <button onClick={() => handleVote(party.name)}>Votar</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="voting-footer">
        <p>Estudiantes de Apps 2026</p>
        <img
          src="https://complejoeducativocit.ed.cr/wp-content/uploads/2025/08/Complejo-Educativo-CIT.png"
          alt="CTP"
          style={{ width: "55px", height: "55px", objectFit: "contain" }}
        />
      </footer>
    </div>
  );
}

export default Voting;