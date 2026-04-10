import React from "react";
import "./Login.css";

function Login() {
  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-content">
          <h2 className="login-title">
            ¿Estás listo para votar y
            <br />
            hacer un cambio?
          </h2>

          <form className="login-form">
            <input type="text" placeholder="Nombre" />
            <input type="text" placeholder="Cédula" />
            <button type="submit">Iniciar sesión</button>
          </form>
        </div>
      </div>

      <div className="login-right">
        <img
          src="src/assets/Votando.jpg"
          alt="Votación"
        />
        <div className="right-overlay"></div>
      </div>
    </div>
  );
}

export default Login;