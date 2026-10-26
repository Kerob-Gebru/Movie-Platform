export default function Button({ children, variant = 'primary', type = 'button', onClick, disabled = false }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`button button-${variant}`}>{children}</button>;
}
