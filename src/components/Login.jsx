import { useState } from "react";
import { supabase } from "../lib/supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState("login");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    let error;

    if (modo === "login") {
      const res = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      error = res.error;
    } else {
      const res = await supabase.auth.signUp({ email, password: senha });
      error = res.error;
      if (!error) {
        setErro("Cadastro feito! Verifique seu email para confirmar.");
        setLoading(false);
        return;
      }
    }

    if (error) setErro(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          💰 Financeiro Familiar
        </h2>

        {/* Toggle login/cadastro */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          <button
            onClick={() => setModo("login")}
            className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition-colors ${
              modo === "login"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setModo("cadastro")}
            className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition-colors ${
              modo === "cadastro"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {erro && (
            <p
              className={`text-sm ${erro.includes("Cadastro") ? "text-green-600" : "text-red-500"}`}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
