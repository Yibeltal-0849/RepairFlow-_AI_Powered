import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css"

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: ""
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3777/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            password: form.password
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Registration failed."
        );
      }

      setMessage(
        "Account created successfully. Redirecting to login..."
      );

      setForm({
        full_name: "",
        email: "",
        password: "",
        confirm_password: ""
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-logo">
          <h1>REPAIRFLOW AI</h1>
          <p>Create your repair shop account</p>
        </div>

        {error && (
          <div className="register-error">
            {error}
          </div>
        )}

        {message && (
          <div className="register-success">
            {message}
          </div>
        )}

        <form
          className="register-form"
          onSubmit={handleSubmit}
        >

          <label>
            Full Name

            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </label>

          <label>
            Email

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 10 characters"
              required
            />
          </label>

          <label>
            Confirm Password

            <input
              type="password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </label>

          <button
            className="register-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        <div className="register-note">
          New accounts are created as technician accounts.
        </div>

        <div className="register-footer">
          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;