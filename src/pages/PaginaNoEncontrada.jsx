import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { House } from '@gravity-ui/icons';

export default function PaginaNoEncontrada() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-dvh w-full justify-center items-center px-8 gap-6">
      <h1 className="text-accent text-9xl">404</h1>

      <p className="text-center text-sm text-foreground/80">
        La página que buscas no existe o fue movida. Verifica la URL o regresa
        al inicio.
      </p>
      <Button onPress={() => navigate("/")}>
        <House />
        Ir al inicio
      </Button>
    </div>
  );
}
