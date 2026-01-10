import { redirect } from 'next/navigation';

export default function Home() {
  // Redirecionar para dashboard se autenticado, senão para login
  redirect('/dashboard');
}
