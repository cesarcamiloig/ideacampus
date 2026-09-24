function GoogleButton({ onClick, disabled }) {
  return (
    <button className="google-button" onClick={onClick} disabled={disabled}>
      Continuar con Google
    </button>
  );
}

export default GoogleButton;