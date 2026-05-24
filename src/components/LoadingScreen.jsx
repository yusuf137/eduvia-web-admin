import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ message = 'Yükleniyor…' }) {
  return (
    <div className="loading-screen">
      <Loader2 className="loading-screen__icon" size={36} />
      <p>{message}</p>
    </div>
  );
}
