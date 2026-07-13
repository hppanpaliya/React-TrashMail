import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { UserPlus, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import IconButton from "../../ui/IconButton";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signup, user, loading } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signup(username, password, inviteCode);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 pt-10 sm:pt-16">
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass rounded-3xl p-6 shadow-card sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-card">
            <UserPlus aria-hidden="true" className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">Create Account</h1>
          <p className="mt-1 text-[13px] text-muted">Join TrashMail with your invite code</p>
        </div>

        {error && (
          <motion.div
            initial={reduceMotion ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            role="alert"
          >
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Input
            label="Username"
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            label="Password"
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            trailing={
              <IconButton label={showPassword ? "Hide password" : "Show password"} size="sm" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </IconButton>
            }
          />
          <Input
            label="Invite Code"
            id="inviteCode"
            name="inviteCode"
            required
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Creating account…" : "Sign Up"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline focus-ring rounded">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
