import React from "react";
import "./Login.css";

function Login() {
  return (
    <div className="login-page">
      <div className="login-left">
        <header className="login-header">
          <div className="logo-icon">◐</div>
          <h1 className="logo-text">
            Vote<span>Hub</span>
          </h1>
        </header>

        <div className="login-content">
          <h2>
       <h2>
  ¿Estás listo para votar y
  <br />
  hacer un cambio?
</h2>
            <br />
            
          </h2>

          <form className="login-form">
            <input type="text" placeholder="NOMBRE" />
            <input type="text" placeholder="CÉDULA" />
            <button type="submit">INICIAR SESIÓN</button>
          </form>
        </div>
      </div>

      <div className="login-right">
        <img
          src="src/assets/Mano.png"
          alt="Votación"
        />
        <div className="right-overlay"></div>
      </div>
    </div>
  );
}

export default Login;